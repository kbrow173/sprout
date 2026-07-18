-- Sprout database schema. Run in the Supabase SQL editor (once).
-- Single-user app, no auth: security is the private project URL + anon key,
-- matching the Wardrobe model. RLS is left permissive on purpose.

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
  last_done_at timestamptz,
  next_due_at date not null,
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
