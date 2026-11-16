import type { CareTaskType, SpeciesCare, WaterCheckStatus } from "@/lib/types";

/**
 * Pure scheduling math for the reminder engine — no DB, no `server-only`, so
 * it's unit-testable (lib/care-math.test.ts). lib/care.ts does the I/O and
 * re-exports what callers need.
 *
 * All "what day/season is it" logic is timezone-aware (settings.timezone),
 * never the server runtime's UTC clock — see LESSONS_LEARNED.md L11.
 */

const GROWING_SEASON_MONTHS = new Set([4, 5, 6, 7, 8, 9]); // Apr–Sep

// Adaptive-watering tuning. Kept conservative and clamped so feedback can
// only ever drift the schedule within safe rails, never runaway.
export const FACTOR_MIN = 0.5; //   fastest a pot may be learned to dry (2x species rate)
export const FACTOR_MAX = 2.5; //   slowest (species rate / 2.5)
export const MOIST_GROW = 1.2; //   "still moist" -> dries slower than we thought
export const EARLY_SHRINK = 0.85; // "watered" before it was due -> dries faster
const MOIST_RECHECK_FRACTION = 0.25; // after a moist check, re-check this soon...
const MOIST_RECHECK_MIN_DAYS = 2; //   ...but never sooner than this

/** Hours after morning_time the cron may still send (late GitHub runs — L27). */
export const MORNING_WINDOW_HOURS = 3;

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

export function isGrowingSeason(date: Date, timezone: string): boolean {
  return GROWING_SEASON_MONTHS.has(localDateParts(date, timezone).month);
}

export function waterIntervalDays(species: SpeciesCare, date: Date, timezone: string): number {
  return isGrowingSeason(date, timezone) ? species.water_days_summer : species.water_days_winter;
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
 * the span crosses a DST change that's off by one — 23:30 the night before
 * spring-forward + 24h lands at 00:30 two days later; 00:30 on fall-back day
 * + 24h lands at 23:30 the SAME day. Calendar math on Y-M-D has no clock. L28.
 */
export function addDaysToDateOnly(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Local calendar date `days` after `date`, in `timezone`. */
export function localDatePlusDays(date: Date, days: number, timezone: string): string {
  return addDaysToDateOnly(toDateOnly(date, timezone), days);
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
 * 23:00 window caught at 00:30 belongs to yesterday; claiming "today" there
 * would block today's own send later.
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
  timezone: string,
  adjustFactor = 1
): number | null {
  switch (type) {
    case "water":
      // Floored at 1 day so a tiny factor/bad data can never produce a
      // same-day-forever task.
      return Math.max(1, Math.round(waterIntervalDays(species, date, timezone) * adjustFactor));
    case "rotate":
      return Math.max(1, species.rotate_days);
    case "repot":
      // Floored — bad/misgenerated data (e.g. repot_months <= 0) would
      // otherwise produce a same-day-forever task that mark-done can't clear.
      return Math.max(30, Math.round(species.repot_months * 30.4));
    case "harvest":
      return species.harvesting && species.harvest_days ? Math.max(1, species.harvest_days) : null;
    case "prune":
      return null;
  }
}

export interface WaterTaskState {
  adjust_factor: number;
  next_due_at: string;
  last_done_at: string | null;
}

export interface WaterCheckPatch {
  adjust_factor: number;
  interval_days: number;
  next_due_at: string;
  last_checked_at: string;
  last_status: WaterCheckStatus;
  last_done_at?: string;
}

/**
 * The adaptive-watering feedback rule, as a pure function:
 *
 *   - "moist"   → pot dries SLOWER than we thought: grow the factor, re-check
 *                 soon (a fraction of the interval). Nothing was watered.
 *   - "watered" → if BEFORE it was due, it dried FASTER: shrink the factor.
 *                 On-time/late keeps it. Reschedule a full interval out.
 *
 * Returns null for a repeat "watered" on the same local day — a double-tap
 * (or a second "I watered it just now") must not shrink the factor again.
 * Without this guard, repeated taps ratcheted it to FACTOR_MIN (L29).
 */
export function planWaterCheck(
  task: WaterTaskState,
  species: SpeciesCare,
  status: WaterCheckStatus,
  at: Date,
  timezone: string
): WaterCheckPatch | null {
  const today = toDateOnly(at, timezone);
  const nowIso = at.toISOString();
  const factor = task.adjust_factor;

  if (status === "moist") {
    const newFactor = clampFactor(factor * MOIST_GROW);
    const interval = intervalDaysFor("water", species, at, timezone, newFactor)!;
    const recheck = Math.max(MOIST_RECHECK_MIN_DAYS, Math.round(interval * MOIST_RECHECK_FRACTION));
    return {
      adjust_factor: newFactor,
      interval_days: interval,
      next_due_at: addDaysToDateOnly(today, recheck),
      last_checked_at: nowIso,
      last_status: "moist",
    };
  }

  if (task.last_done_at && toDateOnly(new Date(task.last_done_at), timezone) === today) {
    return null;
  }

  // YYYY-MM-DD strings sort chronologically.
  const wateredEarly = today < task.next_due_at;
  const newFactor = wateredEarly ? clampFactor(factor * EARLY_SHRINK) : factor;
  const interval = intervalDaysFor("water", species, at, timezone, newFactor)!;
  return {
    adjust_factor: newFactor,
    interval_days: interval,
    next_due_at: addDaysToDateOnly(today, interval),
    last_checked_at: nowIso,
    last_status: "watered",
    last_done_at: nowIso,
  };
}
