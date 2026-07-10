-- Phase 4 migration: adds settings.last_morning_send_date, which the
-- /api/cron/morning route uses to avoid a duplicate push/email send if the
-- hourly GitHub Actions workflow is retried or manually re-run within the
-- same target hour. Run once in the Supabase SQL editor. Safe to re-run.
-- Already folded into supabase/schema.sql for fresh installs.

alter table settings add column if not exists last_morning_send_date date;
