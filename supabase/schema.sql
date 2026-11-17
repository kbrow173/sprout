-- Sprout database schema. Run in the Supabase SQL editor (once).
-- Single-user app. The app talks to Supabase ONLY via the service-role key
-- (server-side), which bypasses RLS. RLS is enabled with no policies at the
-- bottom of this file so the public anon key can't read/write anything
-- (migration_007, L31).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- species_care: the care knowledge base. One row per species. Source of truth
-- for all care logic and reminder intervals. Rows are either seeded ('seed')
-- or generated on-demand by Claude ('claude') and cached back here.
-- ---------------------------------------------------------------------------
create table if not exists species_care (
  id uuid primary key default gen_random_uuid(),
  common_name text not null,
  scientific_name text not null unique,
  illustration_key text not null default 'generic',
  difficulty text not null default 'medium',      -- easy | medium | fussy
  light text not null default 'medium',           -- low | medium | bright
  water_days_summer int not null default 7,
  water_days_winter int not null default 14,
  humidity text not null default 'average',
  soil_recommendation text not null default 'Well-draining all-purpose potting mix.',
  rotate_days int not null default 14,
  repot_months int not null default 18,
  toxicity text not null default 'Unknown — keep away from curious pets.',
  propagation text not null default '',
  pruning text not null default '',
  harvesting text,                                 -- null unless the plant is harvested
  harvest_days int,                                -- null unless harvesting is set (herbs)
  dos jsonb not null default '[]'::jsonb,
  donts jsonb not null default '[]'::jsonb,
  source text not null default 'seed',             -- seed | claude
  created_at timestamptz not null default now()
);

create index if not exists species_care_scientific_idx
  on species_care (lower(scientific_name));
-- Case-insensitive uniqueness (migration_007, L33).
create unique index if not exists species_care_scientific_lower_uniq
  on species_care (lower(scientific_name));

-- ---------------------------------------------------------------------------
-- species_care_translations: on-demand Claude-translated cache of a species'
-- free-text care fields into a non-English UI language. species_care itself
-- stays the single canonical (English) source — this is purely an additive
-- cache, one row per (species, locale), populated the first time that
-- species' care sheet is viewed in that language. Numeric/enum fields
-- (difficulty, light, *_days, *_months, illustration_key) aren't language-
-- dependent and are never duplicated here.
-- ---------------------------------------------------------------------------
create table if not exists species_care_translations (
  id uuid primary key default gen_random_uuid(),
  species_care_id uuid not null references species_care (id) on delete cascade,
  locale text not null,                            -- es | de | ko (never 'en' — that's species_care itself)
  common_name text not null,
  humidity text not null,
  soil_recommendation text not null,
  toxicity text not null,
  propagation text not null,
  pruning text not null,
  harvesting text,
  dos jsonb not null default '[]'::jsonb,
  donts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (species_care_id, locale)
);

-- ---------------------------------------------------------------------------
-- plants: entries in the user's garden.
-- ---------------------------------------------------------------------------
create table if not exists plants (
  id uuid primary key default gen_random_uuid(),
  nickname text,
  common_name text not null,
  scientific_name text not null,
  photo_url text,
  illustration_key text not null default 'generic',
  potted boolean not null default true,
  has_drainage boolean,
  soil_mix text,
  light_location text,
  acquired_at date,
  care_species_id uuid not null references species_care (id),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- care_tasks: generated reminders per plant.
-- ---------------------------------------------------------------------------
create table if not exists care_tasks (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references plants (id) on delete cascade,
  type text not null,                              -- water | rotate | prune | harvest | repot
  interval_days int not null,
  last_done_at timestamptz,                        -- last actually watered/done
  next_due_at date not null,
  -- Adaptive watering (migration 005). Only `water` uses these; other task
  -- types leave them at defaults. Effective water interval =
  -- round(species_seasonal_days * adjust_factor), clamped >= 1. Feedback tunes
  -- the factor so each pot learns its own dry-out rhythm — see lib/care.ts.
  adjust_factor real not null default 1.0,         -- >1 dries slower, <1 faster
  last_checked_at timestamptz,                     -- last moisture check (may not have watered)
  last_status text,                                -- 'watered' | 'moist' | null
  unique (plant_id, type)
);

create index if not exists care_tasks_due_idx on care_tasks (next_due_at);

-- ---------------------------------------------------------------------------
-- push_subscriptions: Web Push endpoints for the morning cron.
-- ---------------------------------------------------------------------------
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- settings: single-row app config.
-- ---------------------------------------------------------------------------
create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  morning_time text not null default '07:00',
  timezone text not null default 'America/Chicago',
  email text,
  push_enabled boolean not null default true,
  email_enabled boolean not null default true,
  -- Local date (in `timezone`) the morning digest last ran. Guards against a
  -- duplicate send if the GitHub Actions cron is retried/re-run within the
  -- same target hour.
  last_morning_send_date date,
  -- UI language: en | es | de | ko. Cookie is the runtime source (no URL
  -- prefix); this column is the persisted/synced copy.
  language text not null default 'en'
);

insert into settings (morning_time, timezone)
select '07:00', 'America/Chicago'
where not exists (select 1 from settings);

-- ---------------------------------------------------------------------------
-- Row Level Security: on, no policies → anon/authenticated get nothing; the
-- server's service-role key bypasses it (migration_007).
-- ---------------------------------------------------------------------------
alter table species_care              enable row level security;
alter table species_care_translations enable row level security;
alter table plants                    enable row level security;
alter table care_tasks                enable row level security;
alter table push_subscriptions        enable row level security;
alter table settings                  enable row level security;

-- ===========================================================================
-- Phase 10 (migration_008): fertilizing, pot details, hemisphere, care history,
-- CHECK constraints. Re-runnable. The fertilize backfill below is a no-op here
-- (runs before seeding); seed.sql / run-seed.mjs carry fertilize_days.
-- ===========================================================================
-- 1. Fertilizing -------------------------------------------------------------
alter table species_care add column if not exists fertilize_days int;

-- Liquid feed at half strength (quarter for lean feeders) during the growing
-- season. Days between feeds, per species. Only fills rows not set yet.
update species_care s set fertilize_days = v.days
from (values
  ('Epipremnum aureum', 21), ('Philodendron hederaceum', 21),
  ('Epipremnum aureum ''Marble Queen''', 21), ('Hedera helix', 21),
  ('Monstera adansonii', 21), ('Monstera deliciosa', 21),
  ('Dracaena trifasciata', 42), ('Zamioculcas zamiifolia', 42),
  ('Chlorophytum comosum', 21), ('Spathiphyllum wallisii', 42),
  ('Calathea orbifolia', 28), ('Maranta leuconeura', 28),
  ('Anthurium andraeanum', 28), ('Ficus lyrata', 21), ('Ficus elastica', 28),
  ('Aloe vera', 60), ('Crassula ovata', 42), ('Echeveria elegans', 42),
  ('Curio rowleyanus', 42), ('Ceropegia woodii', 28),
  ('Pilea peperomioides', 28), ('Dracaena marginata', 28),
  ('Dypsis lutescens', 28), ('Chamaedorea elegans', 28),
  ('Ocimum basilicum', 14), ('Mentha spicata', 21), ('Salvia rosmarinus', 42),
  ('Thymus vulgaris', 42), ('Origanum vulgare', 42),
  ('Petroselinum crispum', 21), ('Coriandrum sativum', 21),
  ('Allium schoenoprasum', 28), ('Salvia officinalis', 42),
  ('Melissa officinalis', 28), ('Phalaenopsis amabilis', 14),
  ('Nephrolepis exaltata', 28)
) as v(name, days)
where s.scientific_name = v.name and s.fertilize_days is null;

-- Claude-generated species without a value: a safe monthly default.
update species_care set fertilize_days = 28 where fertilize_days is null and source = 'claude';

-- 2. Pot details --------------------------------------------------------------
alter table plants add column if not exists pot_material text;
alter table plants add column if not exists pot_size text;

-- 3. Hemisphere ---------------------------------------------------------------
alter table settings add column if not exists hemisphere text not null default 'north';

-- 4. Care history -------------------------------------------------------------
create table if not exists care_events (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references plants (id) on delete cascade,
  task_type text not null,
  action text not null,           -- watered | moist | done | skipped | snoozed | repotted | roots_ok
  at timestamptz not null default now(),
  prev_state jsonb                -- care_tasks fields before the action (undo)
);
create index if not exists care_events_plant_idx on care_events (plant_id, at desc);
alter table care_events enable row level security;

-- 5. CHECK constraints (drop-then-add keeps this re-runnable) -----------------
alter table species_care drop constraint if exists species_care_difficulty_chk;
alter table species_care add constraint species_care_difficulty_chk check (difficulty in ('easy','medium','fussy'));
alter table species_care drop constraint if exists species_care_light_chk;
alter table species_care add constraint species_care_light_chk check (light in ('low','medium','bright'));
alter table species_care drop constraint if exists species_care_source_chk;
alter table species_care add constraint species_care_source_chk check (source in ('seed','claude'));

alter table care_tasks drop constraint if exists care_tasks_type_chk;
alter table care_tasks add constraint care_tasks_type_chk check (type in ('water','rotate','prune','harvest','repot','fertilize'));
alter table care_tasks drop constraint if exists care_tasks_status_chk;
alter table care_tasks add constraint care_tasks_status_chk check (last_status is null or last_status in ('watered','moist','repotted','roots_ok'));

alter table plants drop constraint if exists plants_pot_material_chk;
alter table plants add constraint plants_pot_material_chk check (pot_material is null or pot_material in ('plastic','terracotta','ceramic','fabric'));
alter table plants drop constraint if exists plants_pot_size_chk;
alter table plants add constraint plants_pot_size_chk check (pot_size is null or pot_size in ('small','medium','large'));

alter table settings drop constraint if exists settings_language_chk;
alter table settings add constraint settings_language_chk check (language in ('en','es','de','ko'));
alter table settings drop constraint if exists settings_hemisphere_chk;
alter table settings add constraint settings_hemisphere_chk check (hemisphere in ('north','south'));

alter table care_events drop constraint if exists care_events_type_chk;
alter table care_events add constraint care_events_type_chk check (task_type in ('water','rotate','prune','harvest','repot','fertilize'));

-- settings is a single-row table: enforce it.
create unique index if not exists settings_single_row on settings ((true));

