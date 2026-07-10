-- Phase 3 migration: adds species_care.harvest_days (interval in days between
-- harvests, herbs only) and backfills it for the 10 seeded kitchen herbs.
-- Run once in the Supabase SQL editor. Safe to re-run — the ALTER is a no-op
-- if the column already exists, and the UPDATEs are idempotent by
-- scientific_name. Already folded into supabase/schema.sql for fresh installs.

alter table species_care add column if not exists harvest_days int;

update species_care set harvest_days = 5  where scientific_name = 'Ocimum basilicum';       -- Basil
update species_care set harvest_days = 7  where scientific_name = 'Mentha spicata';          -- Mint
update species_care set harvest_days = 14 where scientific_name = 'Salvia rosmarinus';       -- Rosemary
update species_care set harvest_days = 10 where scientific_name = 'Thymus vulgaris';         -- Thyme
update species_care set harvest_days = 10 where scientific_name = 'Origanum vulgare';        -- Oregano
update species_care set harvest_days = 7  where scientific_name = 'Petroselinum crispum';    -- Parsley
update species_care set harvest_days = 5  where scientific_name = 'Coriandrum sativum';      -- Cilantro
update species_care set harvest_days = 10 where scientific_name = 'Allium schoenoprasum';    -- Chives
update species_care set harvest_days = 14 where scientific_name = 'Salvia officinalis';      -- Sage
update species_care set harvest_days = 7  where scientific_name = 'Melissa officinalis';     -- Lemon Balm
