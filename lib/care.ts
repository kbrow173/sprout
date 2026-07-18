import "server-only";
import { serverClient } from "@/lib/supabase";
import { getSettings } from "@/lib/settings";
import type { CareTaskType, Plant, SpeciesCare, WaterCheckStatus } from "@/lib/types";

/**
 * Reminder engine. Only water/rotate/repot/harvest get auto-scheduled —
 * pruning has no interval data in species_care (just descriptive text), so
 * it stays a read-only care-sheet section rather than a fake reminder.
 *
 * All "what day/season is it" logic is timezone-aware via settings.timezone
 * (fetched once per entry point, threaded through as a plain param) rather
 * than the server runtime's UTC clock — see LESSONS_LEARNED.md L11.
 *
 * WATERING IS ADAPTIVE (migration 005). Watering on a fixed calendar
 * overwaters plants — soil moisture, not a date, decides when to water. So a
 * water reminder is a *check* ("is it dry yet?"), and each plant learns its own
 * dry-out rhythm via `care_tasks.adjust_factor`: the effective interval is
 * `round(species_seasonal_days * adjust_factor)`, clamped >= 1. The species
 * value is only the starting guess; `recordWaterCheck` nudges the factor from
 * the user's "watered" / "still moist" feedback. Seasonal switching still works
 * because the base days the factor multiplies still change with the season.
 * rotate/repot/harvest stay pure calendar and keep adjust_factor at 1.0.
 */

const GROWING_SEASON_MONTHS = new Set([4, 5, 6, 7, 8, 9]); // Apr–Sep

// Adaptive-watering tuning. Kept conservative and clamped so feedback can
// only ever drift the schedule within safe rails, never runaway.
const FACTOR_MIN = 0.5; //   fastest a pot may be learned to dry (2x species rate)
const FACTOR_MAX = 2.5; //   slowest (species rate / 2.5)
const MOIST_GROW = 1.2; //   "still moist" -> dries slower than we thought
const EARLY_SHRINK = 0.85; // "watered" before it was due -> dries faster
const MOIST_RECHECK_FRACTION = 0.25; // after a moist check, re-check this soon...
const MOIST_RECHECK_MIN_DAYS = 2; //   ...but never sooner than this

function clampFactor(f: number): number {
  return Math.min(FACTOR_MAX, Math.max(FACTOR_MIN, f));
}

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

/**
 * Interval in days for a task type on this species, or null if it doesn't apply.
 * `adjustFactor` only affects water (each plant's learned dry-out multiplier);
 * it's ignored for the calendar-based task types.
 */
export function intervalDaysFor(
  type: CareTaskType,
  species: SpeciesCare,
  date: Date,
  timezone: string,
  adjustFactor = 1
): number | null {
  switch (type) {
    case "water":
      // Learned multiplier on the seasonal base, floored at 1 day so a tiny
      // factor can never produce a same-day-forever task.
      return Math.max(1, Math.round(waterIntervalDays(species, date, timezone) * adjustFactor));
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

/** The water task for a plant, for the care sheet's watering section. */
export interface WaterTaskInfo {
  id: string;
  interval_days: number;
  adjust_factor: number;
  next_due_at: string;
  last_done_at: string | null;
  last_checked_at: string | null;
  last_status: WaterCheckStatus | null;
}

/** The plant's water task (null if none — e.g. an old plant predating watering). */
export async function getWaterTaskForPlant(plantId: string): Promise<WaterTaskInfo | null> {
  const { data, error } = await serverClient()
    .from("care_tasks")
    .select("id, interval_days, adjust_factor, next_due_at, last_done_at, last_checked_at, last_status")
    .eq("plant_id", plantId)
    .eq("type", "water")
    .maybeSingle();
  if (error) throw new Error(`[sprout] getWaterTaskForPlant: ${error.message}`);
  return (data as WaterTaskInfo | null) ?? null;
}

/**
 * The interval Sprout currently expects for this pot, computed live from the
 * CURRENT season and the plant's learned factor — not the stored interval_days,
 * which can be a season stale (it's only recomputed when a check is logged).
 */
export async function expectedWaterIntervalDays(
  species: SpeciesCare,
  adjustFactor: number
): Promise<number> {
  const { timezone } = await getSettings();
  return intervalDaysFor("water", species, new Date(), timezone, adjustFactor)!;
}

export interface DueTask {
  id: string;
  type: CareTaskType;
  next_due_at: string;
  overdue: boolean;
  /** Result of the last moisture check on a water task — lets the card show a
   *  "you last found it still moist" hint on a re-check. Null / irrelevant for
   *  other task types. */
  last_status: WaterCheckStatus | null;
  plant: Pick<Plant, "id" | "nickname" | "common_name" | "illustration_key">;
}

/** Tasks due today or earlier (in settings.timezone), earliest (most overdue) first. */
export async function getDueTasks(): Promise<DueTask[]> {
  const { timezone } = await getSettings();
  const today = toDateOnly(new Date(), timezone);

  const { data, error } = await serverClient()
    .from("care_tasks")
    .select("id, type, next_due_at, last_status, plants(id, nickname, common_name, illustration_key)")
    .lte("next_due_at", today)
    .order("next_due_at", { ascending: true });

  if (error) throw new Error(`[sprout] getDueTasks: ${error.message}`);

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    type: CareTaskType;
    next_due_at: string;
    last_status: WaterCheckStatus | null;
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
      last_status: row.last_status,
      plant: row.plants,
    }));
}

interface TaskContext {
  task: { id: string; type: CareTaskType; adjust_factor: number; next_due_at: string };
  species: SpeciesCare;
}

/**
 * Loads a task with its plant's species profile, or null if the task, its
 * plant, or its species has been deleted since the dashboard was rendered
 * (e.g. deleted in another tab) — callers treat that as a quiet no-op, the
 * card is just about to disappear on next reload.
 */
async function loadTaskContext(taskId: string, op: string): Promise<TaskContext | null> {
  const { data: task, error: taskError } = await serverClient()
    .from("care_tasks")
    .select("id, type, plant_id, adjust_factor, next_due_at")
    .eq("id", taskId)
    .maybeSingle();
  if (taskError) throw new Error(`[sprout] ${op}: ${taskError.message}`);
  if (!task) return null;

  const { data: plant, error: plantError } = await serverClient()
    .from("plants")
    .select("care_species_id")
    .eq("id", task.plant_id)
    .maybeSingle();
  if (plantError) throw new Error(`[sprout] ${op}: ${plantError.message}`);
  if (!plant) return null;

  const { data: species, error: speciesError } = await serverClient()
    .from("species_care")
    .select("*")
    .eq("id", plant.care_species_id)
    .maybeSingle();
  if (speciesError) throw new Error(`[sprout] ${op}: ${speciesError.message}`);
  if (!species) return null;

  return {
    task: {
      id: task.id,
      type: task.type as CareTaskType,
      adjust_factor: (task.adjust_factor as number) ?? 1,
      next_due_at: task.next_due_at as string,
    },
    species: species as SpeciesCare,
  };
}

/**
 * Marks a NON-water task done now and reschedules it (today + this species'
 * current calendar interval). Water goes through `recordWaterCheck` instead,
 * which is moisture-driven. Kept factor-aware defensively so it still behaves
 * if ever handed a water task. No-ops quietly on a concurrently-deleted task.
 */
export async function markCareTaskDone(taskId: string): Promise<void> {
  const ctx = await loadTaskContext(taskId, "markCareTaskDone");
  if (!ctx) return;

  const { timezone } = await getSettings();
  const now = new Date();
  const interval = intervalDaysFor(ctx.task.type, ctx.species, now, timezone, ctx.task.adjust_factor);
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

/**
 * Records a moisture check on a water task and adapts its schedule. This is the
 * heart of adaptive watering — the user tells us what the soil was actually
 * like, and the plant's learned dry-out multiplier (`adjust_factor`) drifts
 * toward its true rhythm:
 *
 *   - "moist"   → soil wasn't dry yet, so this pot dries SLOWER than we thought.
 *                 Grow the factor and re-check soon (a fraction of the interval),
 *                 without logging a watering.
 *   - "watered" → the user watered. If they watered BEFORE it was due, the pot
 *                 dried FASTER than predicted, so shrink the factor. On-time or
 *                 late (they just got to it) leaves the factor alone. Reschedule
 *                 a full (newly-scaled) interval out.
 *
 * No-ops quietly if the task/plant/species was deleted concurrently.
 * `at` is injectable for tests; defaults to now.
 */
export async function recordWaterCheck(
  taskId: string,
  status: WaterCheckStatus,
  at: Date = new Date()
): Promise<void> {
  const ctx = await loadTaskContext(taskId, "recordWaterCheck");
  if (!ctx) return;

  const { timezone } = await getSettings();
  const today = toDateOnly(at, timezone);
  const nowIso = at.toISOString();
  const factor = ctx.task.adjust_factor;

  let newFactor: number;
  let nextDueDays: number;
  const patch: Record<string, unknown> = { last_checked_at: nowIso, last_status: status };

  if (status === "moist") {
    newFactor = clampFactor(factor * MOIST_GROW);
    const interval = intervalDaysFor("water", ctx.species, at, timezone, newFactor)!;
    nextDueDays = Math.max(MOIST_RECHECK_MIN_DAYS, Math.round(interval * MOIST_RECHECK_FRACTION));
    patch.interval_days = interval;
    // Deliberately NOT touching last_done_at — nothing was watered.
  } else {
    // Watered early (before due) means it dried faster than predicted. Compare
    // date-only strings (YYYY-MM-DD sorts chronologically). On-time/late: keep.
    const wateredEarly = today < ctx.task.next_due_at;
    newFactor = wateredEarly ? clampFactor(factor * EARLY_SHRINK) : factor;
    nextDueDays = intervalDaysFor("water", ctx.species, at, timezone, newFactor)!;
    patch.interval_days = nextDueDays;
    patch.last_done_at = nowIso;
  }

  patch.adjust_factor = newFactor;
  patch.next_due_at = toDateOnly(addDays(at, nextDueDays), timezone);

  const { error } = await serverClient().from("care_tasks").update(patch).eq("id", taskId);
  if (error) throw new Error(`[sprout] recordWaterCheck: ${error.message}`);
}
