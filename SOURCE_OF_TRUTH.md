# Source of Truth — Sprout

The living file map. **Consult before reading code; update the same breath as any
file change.** Status: 🟢 done · 🟡 shell/placeholder · ⚪ planned.

## Config & PWA
| File | Purpose | Status |
|---|---|---|
| `next.config.ts` | Image `remotePatterns` wildcard; `turbopack.root` pinned | 🟢 |
| `app/globals.css` | **Design system** — all color/type/radius tokens (`@theme`). Claude Design seam. | 🟢 |
| `app/layout.tsx` | Root layout: fonts, PWA metadata + full icon set, `viewport` theme-color, SW registration | 🟢 |
| `public/manifest.json` | PWA manifest — SVG + 192/512/maskable PNG icons | 🟢 |
| `public/sw.js` | Service worker — `push` + `notificationclick` only (no offline cache) | 🟢 |
| `public/icon.svg` | Source brand icon (gradient pot + two-tone leaves + droplet accent) | 🟢 |
| `public/icon-192.png`, `icon-512.png`, `apple-icon.png`, `badge.png`, `icon-maskable-512.png` | Rasterized icon set (generated) | 🟢 |
| `scripts/generate-icons.mjs` | Rasterizes `icon.svg` → the PNG set via `sharp`. Re-run: `npm run icons` | 🟢 |
| `components/ServiceWorkerRegister.tsx` | Client: registers `/sw.js` | 🟢 |

## App shell (route group `app/(app)/`)
| File | Purpose | Status |
|---|---|---|
| `app/(app)/layout.tsx` | Mobile column frame + `BottomNav` | 🟢 |
| `app/(app)/page.tsx` | **Today** dashboard — `getDueTasks()`, `ReminderCard` list or `EmptyState`. `force-dynamic`. | 🟢 |
| `app/(app)/garden/page.tsx` | Garden grid, real data via `getPlants()`. `force-dynamic`. | 🟢 |
| `app/(app)/add/page.tsx` | Camera entry — renders `AddPlantFlow` | 🟢 |
| `app/(app)/add/manual/page.tsx` | Species search → questions → save. `force-dynamic`. | 🟢 |
| `app/(app)/settings/page.tsx` | Real settings: `PushSubscribeButton`, email backup toggle + address, morning time (hour-only, rounded), timezone select (self-heals an out-of-list stored value instead of silently resetting it). `force-dynamic`. | 🟢 |
| `app/(app)/plant/[id]/page.tsx` | Full care sheet from live DB (join via FK). `force-dynamic`. | 🟢 |

## Components
| File | Purpose | Status |
|---|---|---|
| `components/BottomNav.tsx` | Fixed bottom nav + center Add FAB (active via `usePathname`) | 🟢 |
| `components/PageHeader.tsx` | Reusable screen header (eyebrow + title + action) | 🟢 |
| `components/EmptyState.tsx` | Illustrated empty-state card w/ optional CTA | 🟢 |
| `components/PlantIllustration.tsx` | 12 curated SVG variants (vine/monstera/snake/spider/broadleaf/fiddle/succulent/string/pilea/palm/herb/orchid/fern) + generic fallback | 🟢 |
| `components/PlantCard.tsx` | Garden grid card | 🟢 |
| `components/CareSection.tsx` | Reusable icon+title+body section on the care sheet | 🟢 |
| `components/DeleteButton.tsx` | Client confirm-guarded delete submit button | 🟢 |
| `components/ManualAddForm.tsx` | Species search/select, then renders `PlantQuestions`. Also the "which one is it?" fallback linked from AddPlantFlow's error/uncertain states. | 🟢 |
| `components/PlantQuestions.tsx` | Shared potted/soil/drainage/light/nickname/date question steps + submit button + hidden `care_species_id`/`photo_url` inputs. Used by both ManualAddForm and AddPlantFlow. | 🟢 |
| `components/AddPlantFlow.tsx` | Camera/upload → `/api/identify` → confidence gate (0.75: auto-confirm vs candidate chips) → `/api/care-profile` → `PlantQuestions` → save. Photo uploads to Storage in parallel with ID. | 🟢 |
| `components/ReminderCard.tsx` | Today task row: plant illustration/name, task icon+label, overdue flag, one-tap mark-done (`useFormStatus`-disabled while pending). Client component. | 🟢 |
| `components/PushSubscribeButton.tsx` | Tap-gated (iOS requirement) `Notification.requestPermission()` → `pushManager.subscribe()` → `/api/subscribe`. Self-heals `settings.push_enabled` to match real browser subscription state on mount, but only writes when it's actually out of sync (takes `initialEnabled` prop to compare against). | 🟢 |

## Data & lib
| File | Purpose | Status |
|---|---|---|
| `lib/types.ts` | Domain types mirroring the schema | 🟢 |
| `lib/supabase.ts` | Untyped browser (anon) + server (service-role) clients | 🟢 |
| `lib/species.ts` | `getAllSpecies()`, `getSpeciesById()`, `getSpeciesByScientificName()` (case-insensitive, used by the care-profile cache check) — server-only reads | 🟢 |
| `lib/plants.ts` | `getPlants()`, `getPlantWithCare()` (FK-embedded join) — server-only reads | 🟢 |
| `lib/actions.ts` | `"use server"`: `createPlantAction` (writes `photo_url`, calls `generateCareTasksForPlant`), `deletePlantAction` (deletes the plant's Storage photo; `care_tasks` cleanup is a DB cascade), `uploadPlantPhoto`, `discardUploadedPhoto` (best-effort Storage cleanup), `markCareTaskDoneAction`, `updateSettingsAction` (morning_time rounded to the hour, timezone validated against the real IANA database not a hardcoded list, email format-checked; deliberately does NOT touch `push_enabled`), `setPushEnabledAction` (the only writer of `push_enabled`, driven by `PushSubscribeButton`) | 🟢 |
| `lib/anthropic.ts` | Claude client (`claude-sonnet-5`, tool-forced structured output): `identifyPlant` (vision → species/confidence/candidates), `generateCareProfile` (now includes `harvest_days`) | 🟢 |
| `lib/care.ts` | Reminder engine. Local-calendar date/season math via `Intl.DateTimeFormat`, timezone threaded through from `settings.timezone` (fetched once per entry point) rather than a hardcoded constant or server-runtime UTC — see L11. `intervalDaysFor` (water/rotate/repot/harvest; `prune` has no interval data), `generateCareTasksForPlant` (called once, on plant create), `getDueTasks` (today + overdue, flagged), `markCareTaskDone` (today + current-season interval; no-ops gracefully if the task/plant/species was deleted concurrently), `currentLocalDateAndHour` (used by the morning cron to decide "is it currently the user's morning?") | 🟢 |
| `lib/settings.ts` | `getSettings()` — the single settings row (schema.sql guarantees exactly one exists) | 🟢 |
| `lib/push.ts` | VAPID-configured `web-push`. `saveSubscription`/`removeSubscription`, `sendPushToAll(payload)` — sends to every stored subscription in parallel, prunes ones confirmed dead (404/410/400, or a DNS/connection failure) rather than retrying garbage forever (see L14) | 🟢 |
| `lib/email.ts` | `sendMorningEmail(to, tasks)` via Resend — returns `false` (doesn't throw) if `RESEND_API_KEY`/`REMINDER_EMAIL_FROM` aren't set, so callers can report accurate "did this actually send" status instead of assuming success | 🟢 |

## Database
| File | Purpose | Status |
|---|---|---|
| `supabase/schema.sql` | Tables: species_care (incl. `harvest_days`), plants, care_tasks, push_subscriptions, settings — **run on live project** | 🟢 |
| `supabase/seed.sql` | 36 seeded plant care profiles (28 houseplants + 10 kitchen herbs) — copy/paste path for the SQL editor. `harvest_days` values live in `migration_002_harvest_days.sql`, not this file (see its header note). | 🟢 |
| `supabase/migration_002_harvest_days.sql` | Adds `species_care.harvest_days` + backfills the 10 herbs — **run once on live project, confirmed done**. Idempotent. | 🟢 |
| `supabase/migration_003_morning_send_tracking.sql` | Adds `settings.last_morning_send_date` (the cron's atomic dedup-claim column) — **NOT YET run on live project, blocks `/api/cron/morning` from working at all** (it now fails loudly rather than silently skipping the guard — see L13). Idempotent. Already folded into `schema.sql` for fresh installs. | 🟡 **user action needed** |
| `scripts/run-seed.mjs` | Executable seeder (same 36 species as `seed.sql`, via supabase-js upsert since PostgREST has no raw-SQL exec) — **run on live project, confirmed working**. Keep both files in sync if a species is added. | 🟢 |
| `scripts/create-storage-bucket.mjs` | Creates the public `plant-photos` Storage bucket (JPEG/PNG/WebP/GIF, 8MB cap). Run once: `npm run storage:bucket`. Idempotent. | 🟢 |

## API routes (Phase 2+)
| File | Purpose | Status |
|---|---|---|
| `app/api/identify/route.ts` | POST photo (multipart, JPEG/PNG/WebP/GIF, 8MB cap) → Claude vision → `IdentifyResult` (0.75 confidence gate) | 🟢 |
| `app/api/care-profile/route.ts` | Fetch-or-generate care profile by scientific name; caches Claude-generated profiles to `species_care` (`source='claude'`) | 🟢 |
| `app/api/subscribe/route.ts` | POST validates a real `https://` push subscription shape and saves it; DELETE removes by endpoint. No auth (matches the app's private-URL model), but input is validated to prevent unbounded junk rows — see L14. | 🟢 |
| `app/api/cron/morning/route.ts` | Bearer `CRON_SECRET` auth. No-ops unless the current hour (in `settings.timezone`) matches `settings.morning_time`'s hour. Atomically claims the day via a conditional `settings.last_morning_send_date` update *before* sending (prevents a double-send race — see L13; **needs `migration_003` run first**). Sends push (if `push_enabled`) + email (if `email_enabled` + address set) independently — one failing doesn't block the other. | 🟢 |
| `.github/workflows/morning-cron.yml` | Hourly GitHub Actions schedule (not Vercel Cron — Hobby plan only allows once/day at a fixed UTC time, which drifts on DST) calling `/api/cron/morning` with the `CRON_SECRET` bearer token. Needs `APP_URL` + `CRON_SECRET` repo secrets set once deployed. | 🟢 |

## Docs & tests
`CLAUDE.md` · `AGENTS.md` (Next.js warning) · `discovery.md` · `plan.md` ·
`progress.md` · `LESSONS_LEARNED.md` · this file · `tests/phase-0-checklist.txt` ·
`tests/phase-1-checklist.txt` · `tests/phase-2-checklist.txt` · `tests/phase-3-checklist.txt` ·
`tests/phase-4-checklist.txt`.
