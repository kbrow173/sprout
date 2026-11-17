-- migration_008_care_depth.sql — Phase 10 (plant-care depth). Idempotent.
-- Run once in the Supabase SQL editor BEFORE deploying the Phase 10 code
-- (the code reads these columns).
--
-- Adds: fertilizing, pot details (watering priors), southern hemisphere,
-- care history (care_events) with undo snapshots, and CHECK constraints so
-- bad enum values can't get in. See LESSONS_LEARNED.md L36.

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

-- 6. Fertilize tasks for plants that already exist ----------------------------
-- In season: first feed in a week. Out of season: next April 1.
insert into care_tasks (plant_id, type, interval_days, next_due_at)
select p.id, 'fertilize', s.fertilize_days,
  case when extract(month from current_date) between 4 and 9
       then current_date + 7
       else make_date(extract(year from current_date)::int + case when extract(month from current_date) >= 10 then 1 else 0 end, 4, 1)
  end
from plants p
join species_care s on s.id = p.care_species_id
where s.fertilize_days is not null
on conflict (plant_id, type) do nothing;
