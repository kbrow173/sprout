import type { CareTaskType, Hemisphere, Plant, SpeciesCare, WaterCheckStatus } from "@/lib/types";

/**
 * Pure scheduling math for the reminder engine — no DB, no `server-only`, so
 * it's unit-testable (lib/care-math.test.ts). lib/care.ts does the I/O.
 *
 * All "what day/season is it" logic uses the user's CareClock (timezone +
 * hemisphere from settings), never the server's UTC clock — see L11, L36.
 */

/** The user's calendar: timezone for "what day is it", hemisphere for seasons. */
export interface CareClock {
  timezone: string;
  hemisphere: Hemisphere;
}

// Growing season = spring + summer. North Apr–Sep, south Oct–Mar (L36).
const GROWING_MONTHS: Record<Hemisphere, Set<number>> = {
  north: new Set([4, 5, 6, 7, 8, 9]),
  south: new Set([10, 11, 12, 1, 2, 3]),
};
/** Month the growing season (and repotting time) starts. */
const SEASON_START_MONTH: Record<Hemisphere, number> = { north: 4, south: 10 };

// Adaptive-watering tuning. Clamped so feedback can only drift the schedule
// within safe rails, never runaway.
export const FACTOR_MIN = 0.5; //   fastest a pot may be learned to dry (2x species rate)
export const FACTOR_MAX = 2.5; //   slowest (species rate / 2.5)
export const MOIST_GROW = 1.2; //   "still moist" -> dries slower than we thought
export const EARLY_SHRINK = 0.85; // "watered" before it was due -> dries faster
const MOIST_RECHECK_FRACTION = 0.25; // after a moist check, re-check this soon...
const MOIST_RECHECK_MIN_DAYS = 2; //   ...but never sooner than this

/** Hours after morning_time the cron may still send (late GitHub runs — L27). */
export const MORNING_WINDOW_HOURS = 3;
/** No feeding this soon after repotting — fresh mix has nutrients; roots are tender. */
export const FERTILIZE_PAUSE_AFTER_REPOT_DAYS = 42;
/** "Roots are fine" → look again at the next spring at least this far out
 *  (~6 months: a spring check lands next spring, not the one after). */
const ROOTS_OK_MIN_DAYS = 180;

export function clampFactor(f: number): number {
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

function monthOf(ymd: string): number {
  return Number(ymd.slice(5, 7));
}

export function isGrowingSeason(date: Date, clock: CareClock): boolean {
  return GROWING_MONTHS[clock.hemisphere].has(localDateParts(date, clock.timezone).month);
}

export function isGrowingSeasonDate(ymd: string, hemisphere: Hemisphere): boolean {
  return GROWING_MONTHS[hemisphere].has(monthOf(ymd));
}

export function waterIntervalDays(species: SpeciesCare, date: Date, clock: CareClock): number {
  return isGrowingSeason(date, clock) ? species.water_days_summer : species.water_days_winter;
}

/** The user's local calendar date ("YYYY-MM-DD") for an instant. */
export function toDateOnly(date: Date, timezone: string): string {
  const { year, month, day } = localDateParts(date, timezone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Adds whole calendar days to a "YYYY-MM-DD" string.
 *
 * WHY on the date string, not the instant: the old code added 24h per day to
 * a timestamp (in the server's UTC clock) and then took the local date. When
 * the span crosses a DST change that's off by one. Calendar math has no clock. L28.
 */
export function addDaysToDateOnly(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (both "YYYY-MM-DD"). */
export function daysBetween(a: string, b: string): number {
  const ms = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(b) - ms(a)) / 86_400_000);
}

/** Local calendar date `days` after `date`, in `timezone`. */
export function localDatePlusDays(date: Date, days: number, timezone: string): string {
  return addDaysToDateOnly(toDateOnly(date, timezone), days);
}

/** The first growing-season start date (Apr 1 / Oct 1) on or after `ymd`. */
export function seasonStartOnOrAfter(ymd: string, hemisphere: Hemisphere): string {
  const startMonth = SEASON_START_MONTH[hemisphere];
  const year = Number(ymd.slice(0, 4));
  const thisYear = `${year}-${String(startMonth).padStart(2, "0")}-01`;
  return ymd <= thisYear ? thisYear : `${year + 1}-${String(startMonth).padStart(2, "0")}-01`;
}

/** `ymd` if it's in the growing season, else the next season start. */
export function snapToGrowingSeason(ymd: string, hemisphere: Hemisphere): string {
  return isGrowingSeasonDate(ymd, hemisphere) ? ymd : seasonStartOnOrAfter(ymd, hemisphere);
}

/** Current local date ("YYYY-MM-DD") + hour (0-23) in the given timezone. */
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

/**
 * Is `currentHour` inside the send window that opens at `morningHour`?
 * Wraps past midnight, so a 23:00 setting still gets its full catch-up window.
 */
export function inMorningWindow(currentHour: number, morningHour: number): boolean {
  return (currentHour - morningHour + 24) % 24 < MORNING_WINDOW_HOURS;
}

/**
 * The local date a morning send BELONGS to — the day its window opened. A
 * 23:00 window caught at 00:30 belongs to yesterday.
 */
export function morningWindowDate(currentDate: string, currentHour: number, morningHour: number): string {
  return currentHour < morningHour ? addDaysToDateOnly(currentDate, -1) : currentDate;
}

/**
 * Interval in days for a task type on this species, or null if it doesn't apply.
 * `adjustFactor` only affects water (each plant's learned dry-out multiplier).
 */
export function intervalDaysFor(
  type: CareTaskType,
  species: SpeciesCare,
  date: Date,
  clock: CareClock,
  adjustFactor = 1
): number | null {
  switch (type) {
    case "water":
      // Floored at 1 day so a tiny factor/bad data can never produce a
      // same-day-forever task.
      return Math.max(1, Math.round(waterIntervalDays(species, date, clock) * adjustFactor));
    case "rotate":
      return Math.max(1, species.rotate_days);
    case "repot":
      // Floored — bad data (repot_months <= 0) would otherwise nag forever.
      return Math.max(30, Math.round(species.repot_months * 30.4));
    case "harvest":
      return species.harvesting && species.harvest_days ? Math.max(1, species.harvest_days) : null;
    case "fertilize":
      return species.fertilize_days ? Math.max(7, species.fertilize_days) : null;
    case "prune":
      return null;
  }
}

/**
 * When a task should first/next come due, given it was just done (or the
 * plant just added) on `today`. Encodes the per-type domain rules:
 *   - fertilize: only in the growing season (snaps winter dates to spring) — L36
 *   - repot: a spring "check the roots" — lands on the season start nearest
 *     its due time (biased a few months early), never a random winter date
 *   - everything else: today + interval
 */
export function nextDueFor(type: CareTaskType, interval: number, today: string, hemisphere: Hemisphere): string {
  if (type === "fertilize") return snapToGrowingSeason(addDaysToDateOnly(today, interval), hemisphere);
  if (type === "repot") return nearestSeasonStart(addDaysToDateOnly(today, interval), today, hemisphere);
  return addDaysToDateOnly(today, interval);
}

/**
 * The season start (Apr 1 / Oct 1) closest to `target` (preferring the earlier
 * one by up to 3 months), at least 30 days
 * after `today` — so a repot check lands on the nearest spring, not always the
 * later one (an October add used to skip a whole year — L39).
 */
export function nearestSeasonStart(target: string, today: string, hemisphere: Hemisphere): string {
  const after = seasonStartOnOrAfter(target, hemisphere);
  const before = seasonStartOnOrAfter(addDaysToDateOnly(target, -365), hemisphere);
  const earliest = addDaysToDateOnly(today, 30);
  // Biased up to ~3 months early: a slightly early root check is harmless, a
  // late one means a rootbound plant.
  if (before >= earliest && daysBetween(before, target) <= daysBetween(target, after) + 90) return before;
  return after;
}

/**
 * Starting multiplier on the species watering interval, from what the user
 * told us about the pot (L36). The adaptive loop takes over from here.
 *   - no drainage hole → water sits → dries slower
 *   - more light → dries faster; low light → slower
 *   - terracotta/fabric breathe → faster; glazed ceramic → a touch slower
 *   - small pots dry faster than big ones
 * Kept inside a narrow band — a prior is a nudge, not a verdict.
 */
export function wateringPrior(
  plant: Pick<Plant, "potted" | "has_drainage" | "light_location" | "pot_material" | "pot_size">
): number {
  let f = 1;
  if (plant.potted && plant.has_drainage === false) f *= 1.25;
  const light = (plant.light_location ?? "").toLowerCase();
  // "indirect" must be tested first: "bright indirect light" also contains
  // "direct", which gave every bright-indirect plant the direct-sun factor (L39).
  if (light.includes("indirect")) f *= 0.9;
  else if (light.includes("direct")) f *= 0.8;
  else if (light.includes("bright")) f *= 0.9;
  else if (light.includes("low")) f *= 1.2;
  if (plant.potted) {
    if (plant.pot_material === "terracotta" || plant.pot_material === "fabric") f *= 0.85;
    else if (plant.pot_material === "ceramic") f *= 1.05;
    if (plant.pot_size === "small") f *= 0.85;
    else if (plant.pot_size === "large") f *= 1.15;
  }
  return Math.round(Math.min(1.6, Math.max(0.6, f)) * 100) / 100;
}

/** Fields of a care_tasks row that actions change — also the undo snapshot. */
export interface TaskState {
  adjust_factor: number;
  interval_days: number;
  next_due_at: string;
  last_done_at: string | null;
  last_checked_at: string | null;
  last_status: string | null;
}

export type TaskPatch = Partial<TaskState>;

export type WaterTaskState = Pick<TaskState, "adjust_factor" | "next_due_at" | "last_done_at">;

/**
 * The adaptive-watering feedback rule:
 *   - "moist"   → dries SLOWER than thought: grow the factor, re-check soon.
 *   - "watered" → if BEFORE it was due, it dried FASTER: shrink the factor.
 *                 On-time/late keeps it. Reschedule a full interval out.
 * Returns null for a repeat "watered" on the same local day (L29).
 */
export function planWaterCheck(
  task: WaterTaskState,
  species: SpeciesCare,
  status: WaterCheckStatus,
  at: Date,
  clock: CareClock
): (TaskPatch & { last_status: WaterCheckStatus }) | null {
  const today = toDateOnly(at, clock.timezone);
  const nowIso = at.toISOString();
  const factor = task.adjust_factor;

  if (status === "moist") {
    const newFactor = clampFactor(factor * MOIST_GROW);
    const interval = intervalDaysFor("water", species, at, clock, newFactor)!;
    const recheck = Math.max(MOIST_RECHECK_MIN_DAYS, Math.round(interval * MOIST_RECHECK_FRACTION));
    return {
      adjust_factor: newFactor,
      interval_days: interval,
      next_due_at: addDaysToDateOnly(today, recheck),
      last_checked_at: nowIso,
      last_status: "moist",
    };
  }

  if (task.last_done_at && toDateOnly(new Date(task.last_done_at), clock.timezone) === today) {
    return null;
  }

  const wateredEarly = today < task.next_due_at;
  const newFactor = wateredEarly ? clampFactor(factor * EARLY_SHRINK) : factor;
  const interval = intervalDaysFor("water", species, at, clock, newFactor)!;
  return {
    adjust_factor: newFactor,
    interval_days: interval,
    next_due_at: addDaysToDateOnly(today, interval),
    last_checked_at: nowIso,
    last_status: "watered",
    last_done_at: nowIso,
  };
}

/** Non-water actions a user can take on a task card. */
export type TaskAction = "done" | "skip" | "snooze" | "roots_ok";

/**
 * Plans a non-water action. Returns null when the action doesn't apply.
 *   - done:     reschedule from today (per-type rules in nextDueFor)
 *   - skip:     same reschedule, but nothing was actually done (no last_done_at)
 *   - snooze:   tomorrow
 *   - roots_ok: repot check where the roots were fine → next spring, ~1y out
 */
export function planTaskAction(
  type: CareTaskType,
  action: TaskAction,
  species: SpeciesCare,
  at: Date,
  clock: CareClock
): TaskPatch | null {
  const today = toDateOnly(at, clock.timezone);
  if (action === "snooze") return { next_due_at: addDaysToDateOnly(today, 1) };
  if (action === "roots_ok") {
    if (type !== "repot") return null;
    return {
      next_due_at: seasonStartOnOrAfter(addDaysToDateOnly(today, ROOTS_OK_MIN_DAYS), clock.hemisphere),
      last_checked_at: at.toISOString(),
      last_status: "roots_ok",
    };
  }
  if (type === "water") return null; // water goes through planWaterCheck
  const interval = intervalDaysFor(type, species, at, clock);
  if (interval == null) return null;
  const patch: TaskPatch = { interval_days: interval, next_due_at: nextDueFor(type, interval, today, clock.hemisphere) };
  if (action === "done") {
    patch.last_done_at = at.toISOString();
    if (type === "repot") patch.last_status = "repotted";
  }
  return patch;
}

/** After repotting: push a fertilize due date out past the no-feed pause. */
export function fertilizeDueAfterRepot(currentDue: string, today: string, hemisphere: Hemisphere): string {
  const earliest = addDaysToDateOnly(today, FERTILIZE_PAUSE_AFTER_REPOT_DAYS);
  return snapToGrowingSeason(currentDue > earliest ? currentDue : earliest, hemisphere);
}

/** Fertilizer strength note: lean feeders get quarter strength. */
export function fertilizeStrength(illustrationKey: string): "quarter" | "half" {
  return ["succulent", "string", "orchid", "snake", "rosemary", "thyme"].includes(illustrationKey) ? "quarter" : "half";
}
