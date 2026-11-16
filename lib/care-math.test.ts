import { describe, expect, it } from "vitest";
import {
  addDaysToDateOnly,
  clampFactor,
  currentLocalDateAndHour,
  EARLY_SHRINK,
  FACTOR_MAX,
  FACTOR_MIN,
  inMorningWindow,
  intervalDaysFor,
  isGrowingSeason,
  localDatePlusDays,
  MOIST_GROW,
  morningWindowDate,
  planWaterCheck,
  toDateOnly,
} from "@/lib/care-math";
import type { SpeciesCare } from "@/lib/types";

const TZ = "America/Chicago";

const species = {
  water_days_summer: 7,
  water_days_winter: 14,
  rotate_days: 14,
  repot_months: 18,
  harvesting: null,
  harvest_days: null,
} as unknown as SpeciesCare;

describe("local calendar (L11)", () => {
  it("uses the user's date, not UTC, late in the evening", () => {
    // 21:00 Chicago (CDT, UTC-5) = 02:00 UTC next day.
    expect(toDateOnly(new Date("2026-07-11T02:00:00Z"), TZ)).toBe("2026-07-10");
  });

  it("season boundary follows the local month", () => {
    // 23:30 Mar 31 Chicago = 04:30 Apr 1 UTC — still March locally.
    expect(isGrowingSeason(new Date("2026-04-01T04:30:00Z"), TZ)).toBe(false);
    expect(isGrowingSeason(new Date("2026-04-01T12:00:00Z"), TZ)).toBe(true);
    expect(isGrowingSeason(new Date("2026-10-01T12:00:00Z"), TZ)).toBe(false);
  });

  it("normalizes local midnight to hour 0", () => {
    // 00:30 CDT
    expect(currentLocalDateAndHour(TZ, new Date("2026-07-10T05:30:00Z"))).toEqual({
      date: "2026-07-10",
      hour: 0,
    });
  });
});

describe("calendar day math (L28)", () => {
  it("rolls months, years, and leap days", () => {
    expect(addDaysToDateOnly("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDaysToDateOnly("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToDateOnly("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDaysToDateOnly("2026-03-10", -10)).toBe("2026-02-28");
  });

  it("is not off by one when the interval crosses a DST change", () => {
    // 23:30 CST Mar 7; spring-forward is Mar 8 (23h day). +24h of clock time
    // would land at 00:30 Mar 9 — the old addDays bug.
    const beforeSpring = new Date("2026-03-08T05:30:00Z");
    expect(toDateOnly(beforeSpring, TZ)).toBe("2026-03-07");
    expect(localDatePlusDays(beforeSpring, 1, TZ)).toBe("2026-03-08");

    // 00:30 CDT Nov 1; fall-back is Nov 1 (25h day). +24h would land at
    // 23:30 Nov 1 — same day, a reminder that never moves forward.
    const beforeFall = new Date("2026-11-01T05:30:00Z");
    expect(toDateOnly(beforeFall, TZ)).toBe("2026-11-01");
    expect(localDatePlusDays(beforeFall, 1, TZ)).toBe("2026-11-02");
  });
});

describe("morning send window (L27)", () => {
  it("opens at the morning hour and allows a short catch-up", () => {
    expect(inMorningWindow(6, 7)).toBe(false);
    expect(inMorningWindow(7, 7)).toBe(true);
    expect(inMorningWindow(9, 7)).toBe(true);
    expect(inMorningWindow(10, 7)).toBe(false);
  });

  it("wraps past midnight and claims the date the window opened", () => {
    expect(inMorningWindow(23, 23)).toBe(true);
    expect(inMorningWindow(0, 23)).toBe(true);
    expect(inMorningWindow(1, 23)).toBe(true);
    expect(inMorningWindow(2, 23)).toBe(false);
    expect(inMorningWindow(22, 23)).toBe(false);
    expect(morningWindowDate("2026-07-11", 0, 23)).toBe("2026-07-10");
    expect(morningWindowDate("2026-07-10", 23, 23)).toBe("2026-07-10");
    expect(morningWindowDate("2026-07-10", 8, 7)).toBe("2026-07-10");
  });
});

describe("intervalDaysFor", () => {
  const summer = new Date("2026-07-01T12:00:00Z");
  const winter = new Date("2026-01-15T12:00:00Z");

  it("applies the season and learned factor to water", () => {
    expect(intervalDaysFor("water", species, summer, TZ)).toBe(7);
    expect(intervalDaysFor("water", species, winter, TZ)).toBe(14);
    expect(intervalDaysFor("water", species, summer, TZ, 1.5)).toBe(11);
  });

  it("never returns a same-day interval", () => {
    const bad = { ...species, water_days_summer: 0, rotate_days: 0, repot_months: 0 } as SpeciesCare;
    expect(intervalDaysFor("water", bad, summer, TZ, 0.5)).toBe(1);
    expect(intervalDaysFor("rotate", bad, summer, TZ)).toBe(1);
    expect(intervalDaysFor("repot", bad, summer, TZ)).toBe(30);
  });

  it("only schedules harvest for harvestable plants; never prune", () => {
    expect(intervalDaysFor("harvest", species, summer, TZ)).toBeNull();
    const herb = { ...species, harvesting: "Pinch tops", harvest_days: 10 } as SpeciesCare;
    expect(intervalDaysFor("harvest", herb, summer, TZ)).toBe(10);
    expect(intervalDaysFor("prune", species, summer, TZ)).toBeNull();
  });
});

describe("planWaterCheck — adaptive watering", () => {
  const at = new Date("2026-07-10T15:00:00Z"); // 10:00 CDT, Jul 10
  const base = { adjust_factor: 1, next_due_at: "2026-07-10", last_done_at: null };

  it("moist → grows the factor and re-checks soon, without logging a watering", () => {
    const p = planWaterCheck(base, species, "moist", at, TZ)!;
    expect(p.adjust_factor).toBeCloseTo(MOIST_GROW);
    expect(p.next_due_at).toBe("2026-07-12"); // max(2, round(8 * 0.25))
    expect(p.last_done_at).toBeUndefined();
    expect(p.last_status).toBe("moist");
  });

  it("watered on time → keeps the factor, full interval out", () => {
    const p = planWaterCheck(base, species, "watered", at, TZ)!;
    expect(p.adjust_factor).toBe(1);
    expect(p.next_due_at).toBe("2026-07-17");
    expect(p.last_done_at).toBe(at.toISOString());
  });

  it("watered early → shrinks the factor", () => {
    const p = planWaterCheck({ ...base, next_due_at: "2026-07-14" }, species, "watered", at, TZ)!;
    expect(p.adjust_factor).toBeCloseTo(EARLY_SHRINK);
  });

  it("a second 'watered' the same local day is a no-op (L29)", () => {
    const earlierToday = { ...base, next_due_at: "2026-07-17", last_done_at: "2026-07-10T13:00:00Z" };
    expect(planWaterCheck(earlierToday, species, "watered", at, TZ)).toBeNull();
  });

  it("'watered' yesterday evening (local) still counts as a new watering", () => {
    // 22:00 CDT Jul 9 = 03:00Z Jul 10 — same UTC date, different local date.
    const yesterday = { ...base, last_done_at: "2026-07-10T03:00:00Z" };
    expect(planWaterCheck(yesterday, species, "watered", at, TZ)).not.toBeNull();
  });

  it("factor stays inside its rails under repeated feedback", () => {
    let f = 1;
    for (let i = 0; i < 20; i++) f = planWaterCheck({ ...base, adjust_factor: f }, species, "moist", at, TZ)!.adjust_factor;
    expect(f).toBe(FACTOR_MAX);
    expect(clampFactor(0.01)).toBe(FACTOR_MIN);
  });
});
