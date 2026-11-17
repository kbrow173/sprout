import { describe, expect, it } from "vitest";
import {
  addDaysToDateOnly,
  clampFactor,
  currentLocalDateAndHour,
  daysBetween,
  EARLY_SHRINK,
  FACTOR_MAX,
  FACTOR_MIN,
  fertilizeDueAfterRepot,
  inMorningWindow,
  intervalDaysFor,
  isGrowingSeason,
  localDatePlusDays,
  MOIST_GROW,
  morningWindowDate,
  nextDueFor,
  planTaskAction,
  planWaterCheck,
  seasonStartOnOrAfter,
  snapToGrowingSeason,
  toDateOnly,
  wateringPrior,
  type CareClock,
} from "@/lib/care-math";
import type { SpeciesCare } from "@/lib/types";

const TZ = "America/Chicago";
const NORTH: CareClock = { timezone: TZ, hemisphere: "north" };
const SOUTH: CareClock = { timezone: "Australia/Sydney", hemisphere: "south" };

const species = {
  water_days_summer: 7,
  water_days_winter: 14,
  rotate_days: 14,
  repot_months: 18,
  harvesting: null,
  harvest_days: null,
  fertilize_days: 21,
} as unknown as SpeciesCare;

describe("local calendar (L11)", () => {
  it("uses the user's date, not UTC, late in the evening", () => {
    expect(toDateOnly(new Date("2026-07-11T02:00:00Z"), TZ)).toBe("2026-07-10");
  });

  it("season boundary follows the local month", () => {
    expect(isGrowingSeason(new Date("2026-04-01T04:30:00Z"), NORTH)).toBe(false);
    expect(isGrowingSeason(new Date("2026-04-01T12:00:00Z"), NORTH)).toBe(true);
    expect(isGrowingSeason(new Date("2026-10-01T12:00:00Z"), NORTH)).toBe(false);
  });

  it("flips seasons in the southern hemisphere (L36)", () => {
    expect(isGrowingSeason(new Date("2026-07-15T02:00:00Z"), SOUTH)).toBe(false);
    expect(isGrowingSeason(new Date("2026-12-15T02:00:00Z"), SOUTH)).toBe(true);
  });

  it("normalizes local midnight to hour 0", () => {
    expect(currentLocalDateAndHour(TZ, new Date("2026-07-10T05:30:00Z"))).toEqual({ date: "2026-07-10", hour: 0 });
  });
});

describe("calendar day math (L28)", () => {
  it("rolls months, years, and leap days", () => {
    expect(addDaysToDateOnly("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDaysToDateOnly("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToDateOnly("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDaysToDateOnly("2026-03-10", -10)).toBe("2026-02-28");
    expect(daysBetween("2026-03-01", "2026-03-10")).toBe(9);
  });

  it("is not off by one when the interval crosses a DST change", () => {
    const beforeSpring = new Date("2026-03-08T05:30:00Z");
    expect(toDateOnly(beforeSpring, TZ)).toBe("2026-03-07");
    expect(localDatePlusDays(beforeSpring, 1, TZ)).toBe("2026-03-08");
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
    expect(inMorningWindow(0, 23)).toBe(true);
    expect(inMorningWindow(2, 23)).toBe(false);
    expect(morningWindowDate("2026-07-11", 0, 23)).toBe("2026-07-10");
    expect(morningWindowDate("2026-07-10", 8, 7)).toBe("2026-07-10");
  });
});

describe("seasons (L36)", () => {
  it("finds the next season start", () => {
    expect(seasonStartOnOrAfter("2026-02-10", "north")).toBe("2026-04-01");
    expect(seasonStartOnOrAfter("2026-04-01", "north")).toBe("2026-04-01");
    expect(seasonStartOnOrAfter("2026-05-01", "north")).toBe("2027-04-01");
    expect(seasonStartOnOrAfter("2026-05-01", "south")).toBe("2026-10-01");
  });

  it("snaps only out-of-season dates", () => {
    expect(snapToGrowingSeason("2026-06-15", "north")).toBe("2026-06-15");
    expect(snapToGrowingSeason("2026-11-20", "north")).toBe("2027-04-01");
    expect(snapToGrowingSeason("2026-06-15", "south")).toBe("2026-10-01");
  });
});

describe("intervalDaysFor", () => {
  const summer = new Date("2026-07-01T12:00:00Z");
  const winter = new Date("2026-01-15T12:00:00Z");

  it("applies the season and learned factor to water", () => {
    expect(intervalDaysFor("water", species, summer, NORTH)).toBe(7);
    expect(intervalDaysFor("water", species, winter, NORTH)).toBe(14);
    expect(intervalDaysFor("water", species, summer, NORTH, 1.5)).toBe(11);
  });

  it("never returns a same-day interval", () => {
    const bad = { ...species, water_days_summer: 0, rotate_days: 0, repot_months: 0, fertilize_days: 1 } as SpeciesCare;
    expect(intervalDaysFor("water", bad, summer, NORTH, 0.5)).toBe(1);
    expect(intervalDaysFor("rotate", bad, summer, NORTH)).toBe(1);
    expect(intervalDaysFor("repot", bad, summer, NORTH)).toBe(30);
    expect(intervalDaysFor("fertilize", bad, summer, NORTH)).toBe(7);
  });

  it("only schedules what applies", () => {
    expect(intervalDaysFor("harvest", species, summer, NORTH)).toBeNull();
    expect(intervalDaysFor("fertilize", { ...species, fertilize_days: null } as SpeciesCare, summer, NORTH)).toBeNull();
    expect(intervalDaysFor("prune", species, summer, NORTH)).toBeNull();
  });
});

describe("nextDueFor — per-type rules", () => {
  it("fertilize never lands in winter", () => {
    expect(nextDueFor("fertilize", 21, "2026-06-01", "north")).toBe("2026-06-22");
    expect(nextDueFor("fertilize", 21, "2026-09-20", "north")).toBe("2027-04-01");
  });

  it("repot lands on a spring check", () => {
    // 18 months ≈ 547d → due ~2027-12; biased 120d early → spring 2027? No: Aug 2027 → next spring 2028.
    const due = nextDueFor("repot", 547, "2026-02-01", "north");
    expect(due.slice(5)).toBe("04-01");
    expect(daysBetween("2026-02-01", due)).toBeGreaterThan(300);
  });

  it("other tasks are today + interval", () => {
    expect(nextDueFor("rotate", 14, "2026-01-01", "north")).toBe("2026-01-15");
  });
});

describe("planTaskAction", () => {
  const at = new Date("2026-07-10T15:00:00Z");

  it("snooze → tomorrow, nothing else", () => {
    expect(planTaskAction("rotate", "snooze", species, at, NORTH)).toEqual({ next_due_at: "2026-07-11" });
    expect(planTaskAction("water", "snooze", species, at, NORTH)).toEqual({ next_due_at: "2026-07-11" });
  });

  it("done logs last_done_at; skip doesn't", () => {
    expect(planTaskAction("rotate", "done", species, at, NORTH)!.last_done_at).toBe(at.toISOString());
    const skip = planTaskAction("rotate", "skip", species, at, NORTH)!;
    expect(skip.last_done_at).toBeUndefined();
    expect(skip.next_due_at).toBe("2026-07-24");
  });

  it("roots_ok only applies to repot and pushes to next spring", () => {
    expect(planTaskAction("rotate", "roots_ok", species, at, NORTH)).toBeNull();
    expect(planTaskAction("repot", "roots_ok", species, at, NORTH)!.next_due_at).toBe("2027-04-01");
    // Checked on the spring day itself → next year's spring, not today.
    const spring = new Date("2026-04-01T15:00:00Z");
    expect(planTaskAction("repot", "roots_ok", species, spring, NORTH)!.next_due_at).toBe("2027-04-01");
  });

  it("water must go through planWaterCheck", () => {
    expect(planTaskAction("water", "done", species, at, NORTH)).toBeNull();
  });

  it("fertilize waits after repotting", () => {
    expect(fertilizeDueAfterRepot("2026-07-12", "2026-07-10", "north")).toBe("2026-08-21");
    expect(fertilizeDueAfterRepot("2026-09-01", "2026-08-25", "north")).toBe("2027-04-01");
  });
});

describe("wateringPrior (L36)", () => {
  const base = { potted: true, has_drainage: true, light_location: "Medium light", pot_material: null, pot_size: null };

  it("is neutral by default", () => {
    expect(wateringPrior(base)).toBe(1);
  });

  it("no drainage and low light wait longer; sun, terracotta, small pot dry faster", () => {
    expect(wateringPrior({ ...base, has_drainage: false })).toBe(1.25);
    expect(wateringPrior({ ...base, light_location: "Low light" })).toBe(1.2);
    expect(wateringPrior({ ...base, light_location: "Bright direct sun", pot_material: "terracotta", pot_size: "small" })).toBe(0.6);
  });

  it("stays inside its band", () => {
    expect(wateringPrior({ ...base, has_drainage: false, light_location: "Low light", pot_material: "ceramic", pot_size: "large" })).toBe(1.6);
  });
});

describe("planWaterCheck — adaptive watering", () => {
  const at = new Date("2026-07-10T15:00:00Z");
  const base = { adjust_factor: 1, next_due_at: "2026-07-10", last_done_at: null };

  it("moist → grows the factor and re-checks soon", () => {
    const p = planWaterCheck(base, species, "moist", at, NORTH)!;
    expect(p.adjust_factor).toBeCloseTo(MOIST_GROW);
    expect(p.next_due_at).toBe("2026-07-12");
    expect(p.last_done_at).toBeUndefined();
  });

  it("watered on time → keeps the factor", () => {
    const p = planWaterCheck(base, species, "watered", at, NORTH)!;
    expect(p.adjust_factor).toBe(1);
    expect(p.next_due_at).toBe("2026-07-17");
  });

  it("watered early → shrinks the factor", () => {
    const p = planWaterCheck({ ...base, next_due_at: "2026-07-14" }, species, "watered", at, NORTH)!;
    expect(p.adjust_factor).toBeCloseTo(EARLY_SHRINK);
  });

  it("a second 'watered' the same local day is a no-op (L29)", () => {
    expect(planWaterCheck({ ...base, last_done_at: "2026-07-10T13:00:00Z" }, species, "watered", at, NORTH)).toBeNull();
  });

  it("'watered' yesterday evening (local) still counts", () => {
    expect(planWaterCheck({ ...base, last_done_at: "2026-07-10T03:00:00Z" }, species, "watered", at, NORTH)).not.toBeNull();
  });

  it("factor stays inside its rails", () => {
    let f = 1;
    for (let i = 0; i < 20; i++) f = planWaterCheck({ ...base, adjust_factor: f }, species, "moist", at, NORTH)!.adjust_factor!;
    expect(f).toBe(FACTOR_MAX);
    expect(clampFactor(0.01)).toBe(FACTOR_MIN);
  });
});
