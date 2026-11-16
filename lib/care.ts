import "server-only";
import { serverClient } from "@/lib/supabase";
import { getSettings } from "@/lib/settings";
import {
  intervalDaysFor,
  localDatePlusDays,
  planWaterCheck,
  toDateOnly,
} from "@/lib/care-math";
import type { CareTaskType, Plant, SpeciesCare, WaterCheckStatus } from "@/lib/types";

// Re-exported so existing callers keep importing from "@/lib/care".
export {
  currentLocalDateAndHour,
  inMorningWindow,
  intervalDaysFor,
  isGrowingSeason,
  morningWindowDate,
  waterIntervalDays,
} from "@/lib/care-math";

/**
 * Reminder engine — the DB side. The scheduling rules themselves are pure
 * functions in lib/care-math.ts (unit-tested).
 *
 * Only water/rotate/repot/harvest get auto-scheduled — pruning has no interval
 * data in species_care, so it stays a read-only care-sheet section.
 *
 * WATERING IS ADAPTIVE (migration 005, L21). A water reminder is a *check*
 * ("is it dry yet?"), and each pot learns its own dry-out rhythm via
 * `care_tasks.adjust_factor`. See planWaterCheck for the feedback rule.
 */

const SCHEDULED_TASK_TYPES: CareTaskType[] = ["water", "rotate", "repot", "harvest"];

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
      next_due_at: localDatePlusDays(seedFrom, interval, timezone),
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
 * which can be a season stale (L22).
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
   *  "you last found it still moist" hint on a re-check. */
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
  task: {
    id: string;
    type: CareTaskType;
    adjust_factor: number;
    next_due_at: string;
    last_done_at: string | null;
  };
  species: SpeciesCare;
}

/**
 * Loads a task with its plant's species profile in ONE round trip (embedded
 * care_tasks → plants → species_care via FKs), or null if any link was deleted
 * since the dashboard rendered — callers treat that as a quiet no-op.
 */
async function loadTaskContext(taskId: string, op: string): Promise<TaskContext | null> {
  const { data, error } = await serverClient()
    .from("care_tasks")
    .select("id, type, adjust_factor, next_due_at, last_done_at, plants(species_care(*))")
    .eq("id", taskId)
    .maybeSingle();
  if (error) throw new Error(`[sprout] ${op}: ${error.message}`);
  if (!data) return null;

  const row = data as unknown as {
    id: string;
    type: CareTaskType;
    adjust_factor: number | null;
    next_due_at: string;
    last_done_at: string | null;
    plants: { species_care: SpeciesCare | null } | null;
  };
  const species = row.plants?.species_care;
  if (!species) return null;

  return {
    task: {
      id: row.id,
      type: row.type,
      adjust_factor: row.adjust_factor ?? 1,
      next_due_at: row.next_due_at,
      last_done_at: row.last_done_at,
    },
    species,
  };
}

/**
 * Marks a NON-water task done now and reschedules it (today + this species'
 * current calendar interval). Water goes through `recordWaterCheck`.
 */
export async function markCareTaskDone(taskId: string): Promise<void> {
  const ctx = await loadTaskContext(taskId, "markCareTaskDone");
  if (!ctx) return;

  const { timezone } = await getSettings();
  const now = new Date();
  const interval = intervalDaysFor(ctx.task.type, ctx.species, now, timezone, ctx.task.adjust_factor);
  if (interval == null) return;

  const { error } = await serverClient()
    .from("care_tasks")
    .update({
      last_done_at: now.toISOString(),
      interval_days: interval,
      next_due_at: localDatePlusDays(now, interval, timezone),
    })
    .eq("id", taskId);
  if (error) throw new Error(`[sprout] markCareTaskDone: ${error.message}`);
}

/**
 * Records a moisture check on a water task and adapts its schedule (rule:
 * planWaterCheck). No-ops on a concurrently deleted task, and on a repeat
 * "watered" the same day. `at` is injectable for tests; defaults to now.
 */
export async function recordWaterCheck(
  taskId: string,
  status: WaterCheckStatus,
  at: Date = new Date()
): Promise<void> {
  const ctx = await loadTaskContext(taskId, "recordWaterCheck");
  if (!ctx) return;

  const { timezone } = await getSettings();
  const patch = planWaterCheck(ctx.task, ctx.species, status, at, timezone);
  if (!patch) return;

  const { error } = await serverClient().from("care_tasks").update(patch).eq("id", taskId);
  if (error) throw new Error(`[sprout] recordWaterCheck: ${error.message}`);
}
