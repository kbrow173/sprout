-- migration_007_rls.sql — lock tables to the service role. Idempotent.
--
-- WHY: RLS was never enabled, and the anon key is public by design (it ships
-- to the browser as NEXT_PUBLIC_SUPABASE_ANON_KEY). That let anyone holding it
-- read/write every table directly via PostgREST — including the reminder
-- email address and push endpoints. The app only ever talks to Supabase with
-- the service-role key (server-side), which BYPASSES RLS, so enabling RLS with
-- NO policies blocks anon/authenticated access and changes nothing for the app.
-- See LESSONS_LEARNED.md L31.
--
-- Run once in the Supabase SQL editor.

alter table species_care              enable row level security;
alter table species_care_translations enable row level security;
alter table plants                    enable row level security;
alter table care_tasks                enable row level security;
alter table push_subscriptions        enable row level security;
alter table settings                  enable row level security;

-- Case-insensitive uniqueness on species. The old unique constraint was
-- case-sensitive, so "Epipremnum aureum" and "Epipremnum Aureum" could both
-- be inserted, after which the case-insensitive lookup errors ("multiple
-- rows") for that species forever (L33). If this fails, find duplicates with:
--   select lower(scientific_name), count(*) from species_care group by 1 having count(*) > 1;
create unique index if not exists species_care_scientific_lower_uniq
  on species_care (lower(scientific_name));

-- Verify (expect rowsecurity = true for all six):
-- select tablename, rowsecurity from pg_tables
-- where schemaname = 'public'
--   and tablename in ('species_care','species_care_translations','plants',
--                     'care_tasks','push_subscriptions','settings');
