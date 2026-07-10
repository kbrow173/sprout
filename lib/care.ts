import "server-only";
import { serverClient } from "@/lib/supabase";
import { getSettings } from "@/lib/settings";
import type { CareTaskType, Plant, SpeciesCare } from "@/lib/types";

/**
 * Reminder engine. Only water/rotate/repot/harvest get auto-scheduled —
 * pruning has no interval data in species_care (just descriptive text), so
 * it stays a read-only care-sheet section rather than a fake reminder.
 *
 * All "what day/season is it" logic is timezone-aware via settings.timezone
 * (fetched once per entry point, threaded through as a plain param) rather
 * than the server runtime's UTC clock — see LESSONS_LEARNED.md L11.
 */

const GROWING_SEASON_MONTHS = new Set([4, 5, 6, 7, 8, 9]); // Apr–Sep

function localDateParts(date: Date, timezone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function isGrowingSeason(date: Date, timezone: string): boolean {
  return GROWING_SEASON_MONTHS.has(localDateParts(date, timezone).month);
}

export function waterIntervalDays(species: SpeciesCare, date: Date, timezone: string): number {
  return isGrowingSeason(date, timezone) ? species.water_days_summer : species.water_days_winter;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateOnly(date: Date, timezone: string): string {
  const { year, month, day } = localDateParts(date, timezone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Current local date ("YYYY-MM-DD") + hour (0-23) in the given timezone. Used by the morning cron to decide "is it currently the user's morning time?" without being fooled by DST or server-runtime UTC. */
export function currentLocalDateAndHour(timezone: string, date: Date = new Date()): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hourPart = parts.find((p) => p.type === "hour")!.value;
  // "24" shows up at local midnight with hour12:false in some environments — normalize to 0.
  const hour = Number(hourPart) % 24;
  return { date: toDateOnly(date, timezone), hour };
}

const SCHEDULED_TASK_TYPES: CareTaskType[] = ["water", "rotate", "repot", "harvest"];

/** Interval in days for a task type on this species, or null if it doesn't apply. */
export function intervalDaysFor(
  type: CareTaskType,
  species: SpeciesCare,
  date: Date,
  timezone: string
): number | null {
  switch (type) {
    case "water":
      return waterIntervalDays(species, date, timezone);
    case "rotate":
      return species.rotate_days;
    case "repot":
      // Floored — bad/misgenerated data (e.g. repot_months <= 0) would
      // otherwise produce a same-day-forever task that mark-done can't clear.
      return Math.max(30, Math.round(species.repot_months * 30.4));
    case "harvest":
      return species.harvesting && species.harvest_days ? species.harvest_days : null;
    case "prune":
      return null;
  }
}

/** Creates a plant's full set of care_tasks from its species profile. */
export async function generateCareTasksForPlant(
  plantId: string,
  species: SpeciesCare,
  seedFrom: Date = new Date()
): Promise<void> {
  const { timezone } = await getSettings();

  const rows = SCHEDULED_TASK_TYPES.map((type) => {
    const interval = intervalDaysFor(type, species, seedFrom, timezone);
    if (interval == null) return null;
    return {
      plant_id: plantId,
      type,
      interval_days: interval,
      last_done_at: null as string | null,
      next_due_at: toDateOnly(addDays(seedFrom, interval), timezone),
    };
  }).filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length === 0) return;

  const { error } = await serverClient()
    .from("care_tasks")
    .upsert(rows, { onConflict: "plant_id,type" });
  if (error) throw new Error(`[sprout] generateCareTasksForPlant: ${error.message}`);
}

export interface DueTask {
  id: string;
  type: CareTaskType;
  next_due_at: string;
  overdue: boolean;
  plant: Pick<Plant, "id" | "nickname" | "common_name" | "illustration_key">;
}

/** Tasks due today or earlier (in settings.timezone), earliest (most overdue) first. */
export async function getDueTasks(): Promise<DueTask[]> {
  const { timezone } = await getSettings();
  const today = toDateOnly(new Date(), timezone);

  const { data, error } = await serverClient()
    .from("care_tasks")
    .select("id, type, next_due_at, plants(id, nickname, common_name, illustration_key)")
    .lte("next_due_at", today)
    .order("next_due_at", { ascending: true });

  if (error) throw new Error(`[sprout] getDueTasks: ${error.message}`);

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    type: CareTaskType;
    next_due_at: string;
    plants: DueTask["plant"] | null;
  }>;

  const dropped = rows.filter((row) => row.plants === null);
  if (dropped.length > 0) {
    // Shouldn't happen — plants.id has ON DELETE CASCADE onto care_tasks.
    // Logged so a broken invariant (bad migration, RLS gap) isn't silent.
    console.error(
      `[sprout] getDueTasks: ${dropped.length} care_tasks row(s) with no matching plant`,
      dropped.map((r) => r.id)
    );
  }

  return rows
    .filter((row): row is typeof row & { plants: DueTask["plant"] } => row.plants !== null)
    .map((row) => ({
      id: row.id,
      type: row.type,
      next_due_at: row.next_due_at,
      overdue: row.next_due_at < today,
      plant: row.plants,
    }));
}

/**
 * Marks a task done now and reschedules it (today + this species' current
 * interval). No-ops quietly if the task/plant/species has been deleted
 * since the dashboard was rendered (e.g. deleted in another tab) — that's
 * not exceptional, the card is just about to disappear on next reload.
 */
export async function markCareTaskDone(taskId: string): Promise<void> {
  const { data: task, error: taskError } = await serverClient()
    .from("care_tasks")
    .select("id, type, plant_id")
    .eq("id", taskId)
    .maybeSingle();
  if (taskError) throw new Error(`[sprout] markCareTaskDone: ${taskError.message}`);
  if (!task) return;

  const { data: plant, error: plantError } = await serverClient()
    .from("plants")
    .select("care_species_id")
    .eq("id", task.plant_id)
    .maybeSingle();
  if (plantError) throw new Error(`[sprout] markCareTaskDone: ${plantError.message}`);
  if (!plant) return;

  const { data: species, error: speciesError } = await serverClient()
    .from("species_care")
    .select("*")
    .eq("id", plant.care_species_id)
    .maybeSingle();
  if (speciesError) throw new Error(`[sprout] markCareTaskDone: ${speciesError.message}`);
  if (!species) return;

  const { timezone } = await getSettings();
  const now = new Date();
  const interval = intervalDaysFor(task.type as CareTaskType, species as SpeciesCare, now, timezone);
  if (interval == null) return; // task type has no interval to reschedule from (shouldn't occur)

  const { error: updateError } = await serverClient()
    .from("care_tasks")
    .update({
      last_done_at: now.toISOString(),
      interval_days: interval,
      next_due_at: toDateOnly(addDays(now, interval), timezone),
    })
    .eq("id", taskId);
  if (updateError) throw new Error(`[sprout] markCareTaskDone: ${updateError.message}`);
}
