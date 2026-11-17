import "server-only";
import { serverClient } from "@/lib/supabase";
import { getSettings } from "@/lib/settings";
import {
  clampFactor,
  fertilizeDueAfterRepot,
  intervalDaysFor,
  nextDueFor,
  planTaskAction,
  planWaterCheck,
  seasonStartOnOrAfter,
  snapToGrowingSeason,
  toDateOnly,
  wateringPrior,
  type CareClock,
  type TaskAction,
  type TaskPatch,
  type TaskState,
} from "@/lib/care-math";
import type { CareEvent, CareTaskType, Hemisphere, Plant, Settings, SpeciesCare, WaterCheckStatus } from "@/lib/types";

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
 * Auto-scheduled: water (adaptive, moisture-checked — L21), rotate, repot (a
 * spring "check the roots" — L36), harvest (herbs), fertilize (growing season
 * only — L36). Pruning has no interval data, so it stays care-sheet text.
 *
 * Every user action is logged to care_events with a snapshot of the task's
 * previous state, which powers the plant history and one-tap undo (L36).
 */

const SCHEDULED_TASK_TYPES: CareTaskType[] = ["water", "rotate", "repot", "harvest", "fertilize"];
const TASK_COLUMNS = "adjust_factor, interval_days, next_due_at, last_done_at, last_checked_at, last_status";

export function clockOf(settings: Pick<Settings, "timezone" | "hemisphere">): CareClock {
  // `?? "north"` keeps pre-migration_008 rows working.
  return { timezone: settings.timezone, hemisphere: settings.hemisphere ?? "north" };
}

async function getClock(): Promise<CareClock> {
  return clockOf(await getSettings());
}

/**
 * Creates a plant's full set of care_tasks from its species profile. The
 * water task starts from the pot-based prior (wateringPrior), not 1.0.
 */
export async function generateCareTasksForPlant(
  plant: Pick<Plant, "id" | "potted" | "has_drainage" | "light_location" | "pot_material" | "pot_size">,
  species: SpeciesCare,
  seedFrom: Date = new Date()
): Promise<void> {
  const clock = await getClock();
  const today = toDateOnly(seedFrom, clock.timezone);
  const prior = wateringPrior(plant);

  const rows = SCHEDULED_TASK_TYPES.map((type) => {
    const factor = type === "water" ? prior : 1;
    const interval = intervalDaysFor(type, species, seedFrom, clock, factor);
    if (interval == null) return null;
    return {
      plant_id: plant.id,
      type,
      interval_days: interval,
      adjust_factor: factor,
      last_done_at: null as string | null,
      next_due_at: nextDueFor(type, interval, today, clock.hemisphere),
    };
  }).filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length === 0) return;

  const { error } = await serverClient().from("care_tasks").upsert(rows, { onConflict: "plant_id,type" });
  if (error) throw new Error(`[sprout] generateCareTasksForPlant: ${error.message}`);
}

/**
 * Pot details changed on the edit form → re-base the water factor on the new
 * prior while keeping what the plant has LEARNED (the ratio learned/oldPrior).
 */
export async function rebaseWaterPrior(plantId: string, oldPrior: number, newPrior: number): Promise<void> {
  if (oldPrior === newPrior) return;
  const { data } = await serverClient()
    .from("care_tasks")
    .select("id, adjust_factor")
    .eq("plant_id", plantId)
    .eq("type", "water")
    .maybeSingle();
  if (!data) return;
  const learned = ((data.adjust_factor as number) ?? 1) / (oldPrior || 1);
  await serverClient()
    .from("care_tasks")
    .update({ adjust_factor: clampFactor(learned * newPrior) })
    .eq("id", data.id);
}

/** All of a plant's scheduled tasks (care sheet "coming up" list). */
export interface PlantTaskInfo {
  id: string;
  type: CareTaskType;
  interval_days: number;
  adjust_factor: number;
  next_due_at: string;
  last_done_at: string | null;
  last_checked_at: string | null;
  last_status: string | null;
}

export async function getTasksForPlant(plantId: string): Promise<PlantTaskInfo[]> {
  const { data, error } = await serverClient()
    .from("care_tasks")
    .select(`id, type, ${TASK_COLUMNS}`)
    .eq("plant_id", plantId)
    .order("next_due_at", { ascending: true });
  if (error) throw new Error(`[sprout] getTasksForPlant: ${error.message}`);
  return (data ?? []) as PlantTaskInfo[];
}

/** Next due date per plant (garden card status). */
export async function getNextDueByPlant(): Promise<Map<string, { next_due_at: string; type: CareTaskType }>> {
  const { data, error } = await serverClient()
    .from("care_tasks")
    .select("plant_id, type, next_due_at")
    .order("next_due_at", { ascending: true });
  if (error) throw new Error(`[sprout] getNextDueByPlant: ${error.message}`);
  const map = new Map<string, { next_due_at: string; type: CareTaskType }>();
  for (const row of (data ?? []) as { plant_id: string; type: CareTaskType; next_due_at: string }[]) {
    if (!map.has(row.plant_id)) map.set(row.plant_id, { next_due_at: row.next_due_at, type: row.type });
  }
  return map;
}

/** The current-season water interval for this pot (L22: recompute for "now"). */
export async function expectedWaterIntervalDays(species: SpeciesCare, adjustFactor: number): Promise<number> {
  return intervalDaysFor("water", species, new Date(), await getClock(), adjustFactor)!;
}

/** Today's local date in the user's timezone. */
export async function localToday(): Promise<string> {
  return toDateOnly(new Date(), (await getClock()).timezone);
}

export interface DueTask {
  id: string;
  type: CareTaskType;
  next_due_at: string;
  overdue: boolean;
  /** Result of the last check — water ("moist" hint) or repot. */
  last_status: string | null;
  plant: Pick<Plant, "id" | "nickname" | "common_name" | "illustration_key">;
}

/** Tasks due today or earlier (local), earliest (most overdue) first. */
export async function getDueTasks(): Promise<DueTask[]> {
  const { timezone } = await getClock();
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
    last_status: string | null;
    plants: DueTask["plant"] | null;
  }>;

  const dropped = rows.filter((row) => row.plants === null);
  if (dropped.length > 0) {
    console.error(`[sprout] getDueTasks: ${dropped.length} care_tasks row(s) with no matching plant`, dropped.map((r) => r.id));
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
  task: TaskState & { id: string; type: CareTaskType; plant_id: string };
  species: SpeciesCare;
}

/**
 * Loads a task with its plant's species profile in ONE round trip, or null if
 * any link was deleted since the page rendered — callers treat that as a no-op.
 */
async function loadTaskContext(taskId: string, op: string): Promise<TaskContext | null> {
  const { data, error } = await serverClient()
    .from("care_tasks")
    .select(`id, type, plant_id, ${TASK_COLUMNS}, plants(species_care(*))`)
    .eq("id", taskId)
    .maybeSingle();
  if (error) throw new Error(`[sprout] ${op}: ${error.message}`);
  if (!data) return null;

  const row = data as unknown as TaskContext["task"] & { plants: { species_care: SpeciesCare | null } | null };
  const species = row.plants?.species_care;
  if (!species) return null;
  const { plants: _plants, ...task } = row;
  void _plants;
  return { task: { ...task, adjust_factor: task.adjust_factor ?? 1 }, species };
}

function snapshot(task: TaskState): TaskState {
  return {
    adjust_factor: task.adjust_factor,
    interval_days: task.interval_days,
    next_due_at: task.next_due_at,
    last_done_at: task.last_done_at,
    last_checked_at: task.last_checked_at,
    last_status: task.last_status,
  };
}

/** Applies a patch and logs the event (with the pre-change snapshot for undo). */
async function applyAndLog(
  ctx: TaskContext,
  patch: TaskPatch,
  action: string,
  at: Date,
  extra: Record<string, unknown> = {}
): Promise<string | null> {
  const { error } = await serverClient().from("care_tasks").update(patch).eq("id", ctx.task.id);
  if (error) throw new Error(`[sprout] care_tasks update: ${error.message}`);

  const { data, error: logError } = await serverClient()
    .from("care_events")
    .insert({
      plant_id: ctx.task.plant_id,
      task_type: ctx.task.type,
      action,
      at: at.toISOString(),
      prev_state: { ...snapshot(ctx.task), ...extra },
    })
    .select("id")
    .single();
  // History is best-effort: a logging failure must not undo the real action.
  if (logError) {
    console.error("[sprout] care_events insert failed:", logError.message);
    return null;
  }
  return data.id as string;
}

/**
 * A non-water action from a task card: done / skip / snooze / roots_ok.
 * Repotting also pushes the next feed past the post-repot pause.
 * Returns the logged event id (for undo), or null if nothing changed.
 */
export async function applyTaskAction(taskId: string, action: TaskAction, at: Date = new Date()): Promise<string | null> {
  const ctx = await loadTaskContext(taskId, "applyTaskAction");
  if (!ctx) return null;
  const clock = await getClock();
  const patch = planTaskAction(ctx.task.type, action, ctx.species, at, clock);
  if (!patch) return null;

  const label =
    action === "done" ? (ctx.task.type === "repot" ? "repotted" : "done") : action === "skip" ? "skipped" : action === "snooze" ? "snoozed" : action;
  // Repotting pauses feeding. The fertilize task's old date rides along in the
  // event snapshot (as _feed) so Undo restores it too (L39).
  let feed: { id: string; next_due_at: string } | null = null;
  if (ctx.task.type === "repot" && action === "done") {
    const { data } = await serverClient()
      .from("care_tasks")
      .select("id, next_due_at")
      .eq("plant_id", ctx.task.plant_id)
      .eq("type", "fertilize")
      .maybeSingle();
    feed = (data as { id: string; next_due_at: string } | null) ?? null;
  }

  const eventId = await applyAndLog(ctx, patch, label, at, feed ? { _feed: feed } : {});

  if (feed) {
    const today = toDateOnly(at, clock.timezone);
    await serverClient()
      .from("care_tasks")
      .update({ next_due_at: fertilizeDueAfterRepot(feed.next_due_at, today, clock.hemisphere) })
      .eq("id", feed.id);
  }
  return eventId;
}

/** Records a moisture check on a water task (rule: planWaterCheck). */
export async function recordWaterCheck(taskId: string, status: WaterCheckStatus, at: Date = new Date()): Promise<string | null> {
  const ctx = await loadTaskContext(taskId, "recordWaterCheck");
  if (!ctx) return null;
  const patch = planWaterCheck(ctx.task, ctx.species, status, at, await getClock());
  if (!patch) return null;
  return applyAndLog(ctx, patch, status, at);
}

/**
 * Undo: restores the task to the snapshot taken before `eventId` and deletes
 * the event. Only the NEWEST event for that task can be undone — restoring an
 * older snapshot would silently erase the actions logged after it.
 */
export async function undoCareEvent(eventId: string): Promise<boolean> {
  const { data: ev } = await serverClient().from("care_events").select("*").eq("id", eventId).maybeSingle();
  const event = ev as CareEvent | null;
  if (!event || !event.prev_state) return false;

  const { data: newest } = await serverClient()
    .from("care_events")
    .select("id")
    .eq("plant_id", event.plant_id)
    .eq("task_type", event.task_type)
    .order("at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (newest?.id !== event.id) return false;

  const { _feed, ...taskState } = event.prev_state as Record<string, unknown> & {
    _feed?: { id: string; next_due_at: string };
  };
  const { error } = await serverClient()
    .from("care_tasks")
    .update(taskState)
    .eq("plant_id", event.plant_id)
    .eq("type", event.task_type);
  if (error) throw new Error(`[sprout] undoCareEvent: ${error.message}`);
  if (_feed?.id && _feed.next_due_at) {
    await serverClient().from("care_tasks").update({ next_due_at: _feed.next_due_at }).eq("id", _feed.id);
  }
  await serverClient().from("care_events").delete().eq("id", event.id);
  return true;
}

/** A plant's recent history, newest first. */
export async function getCareHistory(plantId: string, limit = 25): Promise<CareEvent[]> {
  const { data, error } = await serverClient()
    .from("care_events")
    .select("id, plant_id, task_type, action, at")
    .eq("plant_id", plantId)
    .order("at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`[sprout] getCareHistory: ${error.message}`);
  return (data ?? []) as CareEvent[];
}

/**
 * After the hemisphere setting changes, move every fertilize task into the
 * new growing season and every repot check onto the new spring start —
 * otherwise north-hemisphere dates keep firing in the southern autumn (L39).
 */
export async function rescheduleSeasonalTasks(hemisphere: Hemisphere): Promise<void> {
  const { data, error } = await serverClient()
    .from("care_tasks")
    .select("id, type, next_due_at")
    .in("type", ["fertilize", "repot"]);
  if (error) throw new Error(`[sprout] rescheduleSeasonalTasks: ${error.message}`);
  for (const row of (data ?? []) as { id: string; type: CareTaskType; next_due_at: string }[]) {
    const next =
      row.type === "fertilize" ? snapToGrowingSeason(row.next_due_at, hemisphere) : seasonStartOnOrAfter(row.next_due_at, hemisphere);
    if (next !== row.next_due_at) {
      await serverClient().from("care_tasks").update({ next_due_at: next }).eq("id", row.id);
    }
  }
}
