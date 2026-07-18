-- Migration 005: adaptive, moisture-check-based watering.
--
-- WHY: watering on a fixed calendar is horticulturally wrong and overwaters
-- plants (the #1 houseplant killer). Soil moisture — not a date — decides when
-- to water. This migration turns the water reminder from a *command* ("Water X")
-- into a *check* ("is X dry yet?"), and lets each plant learn its own real
-- dry-out rhythm from the user's feedback instead of trusting the species-level
-- guess forever.
--
-- HOW: a per-task learned multiplier. Effective water interval =
--   round(species_seasonal_days * adjust_factor), clamped >= 1.
-- The species value stays the *starting guess*; feedback nudges adjust_factor:
--   "still moist" -> dries slower -> factor grows; "watered early" -> dries
--   faster -> factor shrinks. Seasonal summer/winter switching still works
--   automatically because the base days it multiplies still change with season.
--
-- Only `water` tasks use these columns. rotate/repot/harvest stay pure calendar
-- (genuinely time-based), so their adjust_factor just stays 1.0 and is ignored.
--
-- Idempotent. Run once on the live project. Already folded into schema.sql for
-- fresh installs.

-- Per-plant learned multiplier on the species' seasonal water interval.
-- 1.0 = trust the species default; >1 = this pot dries slower; <1 = faster.
alter table care_tasks
  add column if not exists adjust_factor real not null default 1.0;

-- When the plant was last *checked* (moisture felt), regardless of whether it
-- was watered. Distinct from last_done_at, which stays "last actually watered".
alter table care_tasks
  add column if not exists last_checked_at timestamptz;

-- Result of the last check: 'watered' | 'moist' | null (never checked yet).
-- Drives the "you last found it still moist" hint on a re-check card.
alter table care_tasks
  add column if not exists last_status text;

-- Existing water tasks were scheduled on the old fixed interval and could be
-- weeks out. Pull them in so the learning loop starts within a couple of days
-- instead of waiting out a full stale cycle. Only water; other task types are
-- left exactly where they are. `least(...)` never pushes a task later than it
-- already is (an already-overdue task keeps its earlier date).
update care_tasks
  set next_due_at = least(next_due_at, (now() at time zone 'utc')::date + 2)
  where type = 'water';
