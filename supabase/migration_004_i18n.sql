-- Phase 5 migration: adds settings.language (UI language: en|es|de|ko) and
-- species_care_translations (on-demand Claude-translated cache of a
-- species' free-text care fields — species_care itself stays canonical
-- English). Run once in the Supabase SQL editor. Safe to re-run. Already
-- folded into supabase/schema.sql for fresh installs.

alter table settings add column if not exists language text not null default 'en';

create table if not exists species_care_translations (
  id uuid primary key default gen_random_uuid(),
  species_care_id uuid not null references species_care (id) on delete cascade,
  locale text not null,
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
