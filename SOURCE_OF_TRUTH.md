# Source of Truth — Sprout

The living file map. **Consult before reading code; update the same breath as any
file change.** Status: 🟢 done · 🟡 shell/placeholder · ⚪ planned.

## Config & PWA
| File | Purpose | Status |
|---|---|---|
| `next.config.ts` | Image `remotePatterns` restricted to the project's Supabase host (was `**` = open proxy); `serverActions.bodySizeLimit: "2mb"` backstop (L25); `turbopack.root` pinned; wraps config with `next-intl/plugin` pointed at `i18n/request.ts` | 🟢 |
| `vitest.config.ts` | Vitest: `@` alias, runs `lib/**/*.test.ts`. `npm test` | 🟢 |
| `.github/workflows/ci.yml` | CI on push/PR to main: lint → typecheck → test → build (placeholder env) | 🟢 |
| `i18n/request.ts` | next-intl config: cookie-based locale (`NEXT_LOCALE`, no URL prefix — see its own header comment for why), `LOCALES`/`DEFAULT_LOCALE` exports reused by the Settings language picker and `updateSettingsAction` | 🟢 |
| `messages/{en,es,de,ko}.json` | Message catalogs, one namespace per screen (`nav`, `today`, `garden`, `settings`, etc.) | 🟢 |
| `app/globals.css` | **Design system** — all color/type/radius tokens (`@theme`). Claude Design seam. | 🟢 |
| `app/layout.tsx` | Root layout: fonts, PWA metadata + full icon set, `viewport` theme-color, SW registration, `NextIntlClientProvider` (locale/messages from `getLocale()`/`getMessages()`) | 🟢 |
| `public/manifest.json` | PWA manifest — SVG + 192/512/maskable PNG icons | 🟢 |
| `public/sw.js` | Service worker — `push` + `notificationclick` only (no offline cache) | 🟢 |
| `public/icon.svg` | Source brand icon (gradient pot + two-tone leaves + droplet accent) | 🟢 |
| `public/icon-192.png`, `icon-512.png`, `apple-icon.png`, `badge.png`, `icon-maskable-512.png` | Rasterized icon set (generated) | 🟢 |
| `scripts/generate-icons.mjs` | Rasterizes `icon.svg` → the PNG set via `sharp`. Re-run: `npm run icons` | 🟢 |
| `components/ServiceWorkerRegister.tsx` | Client: registers `/sw.js` | 🟢 |

## App shell (route group `app/(app)/`)
| File | Purpose | Status |
|---|---|---|
| `app/(app)/layout.tsx` | Mobile column frame + `BottomNav` + `RefreshOnReturn` | 🟢 |
| `app/(app)/error.tsx` | In-app error boundary ("Something wilted" + retry + Go to Today). Next 16 prop is `unstable_retry`, not `reset`. Bottom nav stays visible. | 🟢 |
| `app/not-found.tsx` | Root 404 (unknown URL, deleted/invalid plant id) with link back to Garden | 🟢 |
| `app/(app)/loading.tsx`, `garden/`, `plant/[id]/`, `add/manual/`, `settings/` `loading.tsx` | Route-level loading skeletons | 🟢 |
| `app/(app)/page.tsx` | **Today** dashboard — `getDueTasks()`, `ReminderCard` list (staggered reveal). Zero-due-tasks shows one of TWO distinct empty states based on `getPlants().length`: garden-empty → onboarding CTA to `/add`; has-plants-nothing-due → "All caught up" reassurance CTA to `/garden` (conflating these was a bug — flagged by the user, fixed same session as adaptive watering). `getTranslations("today")`. `force-dynamic`. | 🟢 |
| `app/(app)/garden/page.tsx` | Garden grid, real data via `getPlants()`, `getTranslations("garden")`, staggered card reveal. `force-dynamic`. | 🟢 |
| `app/(app)/add/page.tsx` | Camera entry — renders `AddPlantFlow` | 🟢 |
| `app/(app)/add/manual/page.tsx` | Species search → questions → save. `force-dynamic`. | 🟢 |
| `app/(app)/settings/page.tsx` | Real settings, `getTranslations("settings")` (next-intl, server-side): `PushSubscribeButton`, email backup toggle + address, morning time (hour-only, rounded), timezone select (self-heals an out-of-list stored value), language picker (native-language labels, `en`/`es`/`de`/`ko`). `force-dynamic`. | 🟢 |
| `app/(app)/plant/[id]/page.tsx` | Full care sheet from live DB (join via FK). Non-UUID id → `notFound()` before querying; plant + water task fetched in parallel; "I watered it just now" uses `PendingSubmit` (L29). Watering section is **check-first**: "don't water on a clock", the plant's live current-season expected interval (via `expectedWaterIntervalDays`), the species summer/winter baseline, an always-shown how-to-check guide, and an "I watered it just now" off-schedule log (`recordWaterCheckAction`, feeds the shrink signal). Copy is English-only (this page isn't wired to next-intl). `force-dynamic`. | 🟢 |

## Components
| File | Purpose | Status |
|---|---|---|
| `components/BottomNav.tsx` | Fixed bottom nav + center Add FAB (active via `usePathname`), `useTranslations("nav")` | 🟢 |
| `components/PageHeader.tsx` | Reusable screen header (eyebrow + title + action) | 🟢 |
| `components/EmptyState.tsx` | Illustrated empty-state card w/ optional CTA | 🟢 |
| `components/PlantIllustration.tsx` | 19 curated SVG variants (vine/monstera/snake/spider/broadleaf/fiddle/succulent/string/pilea/palm/herb/basil/rosemary/thyme/parsley/chives/mint/orchid/fern) + generic fallback. `herb` is the generic fallback for herbs without their own variant (cilantro, oregano, etc.); the 6 named herbs each reflect real growth habit (round vs. pointed stacked leaf pairs for basil/mint, dense needle sprigs for rosemary, tall grass blades for chives, low wide mound vs. denser rounder clump for thyme/parsley) rather than sharing one icon — was a user-flagged bug (Phase 6.1). Pot rim color (`POT_RIM` = `#dce8de`) is deliberately NOT `SPROUT_100`/`SPROUT_200` — those match the `bg-sprout-100` circle every illustration sits on, so a same-color rim blends invisibly into its own backdrop and reads as a floating disconnected lid (also Phase 6.1). | 🟢 |
| `components/PlantCard.tsx` | Garden grid card. Optional `style` prop for a staggered grid-reveal `animationDelay` (see `app/(app)/garden/page.tsx`). | 🟢 |
| `components/CareSection.tsx` | Reusable icon+title+body section on the care sheet | 🟢 |
| `components/DeleteButton.tsx` | Client confirm-guarded delete submit button | 🟢 |
| `components/ManualAddForm.tsx` | Species search/select, then renders `PlantQuestions`. Also the "which one is it?" fallback linked from AddPlantFlow's error/uncertain states. If a typed query has no library match, a "Generate a care guide" button POSTs to `/api/care-profile` with just the typed name to resolve species not in `species_care`. | 🟢 |
| `components/PlantQuestions.tsx` | Shared potted/soil/drainage/light/nickname/date question steps + submit button + hidden `care_species_id`/`photo_url` inputs. Used by both ManualAddForm and AddPlantFlow. | 🟢 |
| `components/PendingSubmit.tsx` | Client submit button disabled while its form's Server Action is pending (`useFormStatus`) — drop into server-component forms | 🟢 |
| `components/RefreshOnReturn.tsx` | `router.refresh()` when the PWA returns to foreground after >60s (no reload button / pull-to-refresh in standalone) | 🟢 |
| `components/AddPlantFlow.tsx` | Camera/upload → `downscaleImage` (L25) → `/api/identify` → confidence gate (0.85: auto-confirm vs candidate chips) → `/api/care-profile` → `PlantQuestions` → save. Photo uploads to Storage in parallel with ID. | 🟢 |
| `components/ReminderCard.tsx` | Today task row. **Water tasks are moisture checks**: "Check soil" label, a "feel top 2″, water only if dry" tip, an expandable how-to-check guide (finger/chopstick/lift-pot), and two buttons — "Still moist" (ghost) / "Watered" (solid) → `recordWaterCheckAction`; shows a "last time it was still moist" hint from `last_status`. Non-water tasks keep the single one-tap mark-done (`markCareTaskDoneAction`). `useFormStatus`-disabled while pending. Optional `style` for staggered reveal. Client component. | 🟢 |
| `components/PushSubscribeButton.tsx` | **Per-device** push toggle (L26): reflects only this browser's subscription; no global flag. Tap-gated (iOS) `Notification.requestPermission()` → `pushManager.subscribe()` → `/api/subscribe` (unsubscribes locally if the save fails). Shows denied/error messages and an "Add to Home Screen first" hint in an iOS browser tab. | 🟢 |

## Data & lib
| File | Purpose | Status |
|---|---|---|
| `lib/types.ts` | Domain types mirroring the schema | 🟢 |
| `lib/supabase.ts` | `server-only`. Single untyped service-role client (`serverClient`). Anon `browserClient` removed (was unused; RLS now blocks anon — L31) | 🟢 |
| `lib/image.ts` | Client `downscaleImage(file)` — 1568px long edge, JPEG 0.85, EXIF-rotated; falls back to the original on decode failure (L25) | 🟢 |
| `lib/species.ts` | `getAllSpecies()`, `getSpeciesById()`, `getSpeciesByScientificName()` (case-insensitive, used by the care-profile cache check) — server-only reads | 🟢 |
| `lib/plants.ts` | `getPlants()`, `getPlantWithCare()` (FK-embedded join) — server-only reads | 🟢 |
| `lib/actions.ts` | `"use server"`: `createPlantAction` (writes `photo_url`, calls `generateCareTasksForPlant`), `deletePlantAction` (deletes the plant's Storage photo; `care_tasks` cleanup is a DB cascade), `uploadPlantPhoto`, `discardUploadedPhoto` (best-effort Storage cleanup), `markCareTaskDoneAction` (non-water tasks), `recordWaterCheckAction` (water: validates `status` = watered/moist, calls `recordWaterCheck`; optional same-origin `redirect_to` for the plant page's "I watered it just now", open-redirect-guarded), `updateSettingsAction` (morning_time rounded to the hour, timezone validated against the real IANA database not a hardcoded list, email format-checked, language validated against `i18n/request.ts`'s `LOCALES` and written to both the DB and the `NEXT_LOCALE` cookie next-intl reads, revalidates the root layout so the switch is immediate; deliberately does NOT touch `push_enabled`), `setPushEnabledAction` REMOVED (push is per-device, L26). Phase 7: all `createPlantAction` fields length-capped, `acquired_at` format-checked, `photo_url` must point at our Storage origin; `uploadPlantPhoto` checks type/size; `discardUploadedPhoto` only deletes `<uuid>.<ext>` paths. | 🟢 |
| `lib/anthropic.ts` | Claude client (`claude-sonnet-5`): `identifyPlant` (vision → species/calibrated confidence/candidates; adaptive thinking + `tool_choice: "auto"` — forced tool_choice is incompatible with thinking, so the tool call is prompt-enforced instead; system prompt forces a look-alike check + `key_features` reasoning before the answer), `generateCareProfile` (includes `harvest_days`; `scientificName` is optional — omitted when resolving a manually-typed name with no confirmed ID, e.g. species missing from the seeded library). `ILLUSTRATION_KEYS` is the enum Claude picks from for `illustration_key` — MUST stay in sync with `PlantIllustration.tsx`'s variant list (currently 6 named herbs + generic `herb` fallback, Phase 6.1). | 🟢 |
| `lib/care-math.ts` | **Pure** scheduling rules (no DB, unit-tested): local date/season, `addDaysToDateOnly`/`localDatePlusDays` (calendar math, DST-safe — L28), `intervalDaysFor`, `inMorningWindow` (cron catch-up window — L27), `planWaterCheck` (adaptive feedback rule; null on a same-day repeat "watered" — L29), factor constants | 🟢 |
| `lib/care-math.test.ts` | Vitest suite for care-math: TZ/season boundaries, DST crossings, window, interval floors, water feedback + rails | 🟢 |
| `lib/care.ts` | Reminder engine — DB side; rules live in `lib/care-math.ts` (re-exports `currentLocalDateAndHour`, `inMorningWindow`, `intervalDaysFor`, …). `loadTaskContext` is one embedded select (task → plant → species). Local-calendar date/season math via `Intl.DateTimeFormat`, timezone threaded through from `settings.timezone` (fetched once per entry point) rather than a hardcoded constant or server-runtime UTC — see L11. **Watering is adaptive & moisture-driven, NOT calendar** (see L19): effective water interval = `round(species_seasonal_days × care_tasks.adjust_factor)` clamped ≥1; each pot learns its own dry-out rhythm. `intervalDaysFor` (water applies the learned factor; rotate/repot/harvest stay calendar; `prune` has no interval), `recordWaterCheck` (the two-button "watered"/"moist" feedback loop — grows/shrinks `adjust_factor` within `FACTOR_MIN/MAX` rails, re-checks soon after a moist result), `markCareTaskDone` (non-water done + reschedule; factor-aware defensively), `getWaterTaskForPlant` + `expectedWaterIntervalDays` (care-sheet watering section — live current-season estimate, not stale `interval_days`), `generateCareTasksForPlant` (once, on plant create), `getDueTasks` (today + overdue, flagged, carries `last_status`), `currentLocalDateAndHour` (morning cron) | 🟢 |
| `lib/settings.ts` | `getSettings()` — the single settings row, wrapped in React `cache()` (one query per request) | 🟢 |
| `lib/translations.ts` | `getLocalizedSpeciesCare(species, locale)` — fetch-or-generate-and-cache a species' free-text care fields translated into a non-English locale (`species_care_translations`); English stays canonical, untouched | 🟢 |
| `lib/push.ts` | VAPID-configured `web-push`. `saveSubscription`/`removeSubscription`, `sendPushToAll(payload)` → `{sent, pruned, failed}`; returns early (no VAPID needed) with zero subscriptions; sends to every stored subscription in parallel with a 12h `TTL` (stale morning nudges expire), prunes ones confirmed dead (404/410/400, or a DNS/connection failure) rather than retrying garbage forever (see L14) | 🟢 |
| `lib/email.ts` | `sendMorningEmail(to, tasks)` via Resend — returns `false` (doesn't throw) if `RESEND_API_KEY`/`REMINDER_EMAIL_FROM` aren't set, so callers can report accurate "did this actually send" status instead of assuming success. Water rows read "Check soil (water if dry)", not a blind "Water". | 🟢 |

## Database
| File | Purpose | Status |
|---|---|---|
| `supabase/schema.sql` | Tables: species_care (incl. `harvest_days`), plants, care_tasks (incl. adaptive-watering `adjust_factor`/`last_checked_at`/`last_status`), push_subscriptions, settings — **run on live project** | 🟢 |
| `supabase/seed.sql` | 36 seeded plant care profiles (28 houseplants + 10 kitchen herbs) — copy/paste path for the SQL editor. `harvest_days` values live in `migration_002_harvest_days.sql`, not this file (see its header note). | 🟢 |
| `supabase/migration_002_harvest_days.sql` | Adds `species_care.harvest_days` + backfills the 10 herbs — **run once on live project, confirmed done**. Idempotent. | 🟢 |
| `supabase/migration_003_morning_send_tracking.sql` | Adds `settings.last_morning_send_date` (the cron's atomic dedup-claim column) — **NOT YET run on live project, blocks `/api/cron/morning` from working at all** (it now fails loudly rather than silently skipping the guard — see L13). Idempotent. Already folded into `schema.sql` for fresh installs. | 🟡 **user action needed** |
| `supabase/migration_004_i18n.sql` | Adds `settings.language` + `species_care_translations` table. Run on live project (confirmed in progress.md Phase 5). Idempotent. Folded into `schema.sql`. | 🟢 |
| `supabase/migration_005_adaptive_watering.sql` | Adds `care_tasks.adjust_factor` / `last_checked_at` / `last_status` for moisture-driven adaptive watering, and pulls existing water tasks in to re-check within ~2 days. Idempotent. Already folded into `schema.sql` for fresh installs. Run on live project, confirmed working. | 🟢 |
| `supabase/migration_006_herb_illustrations.sql` | Data-only backfill: gives basil/rosemary/thyme/parsley/chives/mint their own `illustration_key` (was all `'herb'`) on both `species_care` and the denormalized `plants.illustration_key`. Idempotent (guarded by `illustration_key = 'herb'`). Run on live project, confirmed working (verified via DOM inspection — distinct element counts per species). | 🟢 |
| `supabase/migration_007_rls.sql` | Enables RLS (no policies) on all 6 tables — blocks the public anon key; service role bypasses (L31). Adds unique index on `lower(scientific_name)` (L33). Idempotent. Folded into `schema.sql`. **NOT YET run on live project.** | 🟡 **user action needed** |
| `scripts/run-seed.mjs` | Executable seeder (same 36 species as `seed.sql`, via supabase-js upsert since PostgREST has no raw-SQL exec) — **run on live project, confirmed working**. Keep both files in sync if a species is added. | 🟢 |
| `scripts/create-storage-bucket.mjs` | Creates the public `plant-photos` Storage bucket (JPEG/PNG/WebP/GIF, 8MB cap). Run once: `npm run storage:bucket`. Idempotent. | 🟢 |

## API routes (Phase 2+)
| File | Purpose | Status |
|---|---|---|
| `app/api/identify/route.ts` | POST photo (multipart, JPEG/PNG/WebP/GIF, 8MB cap) → Claude vision → `IdentifyResult` (0.85 confidence gate) | 🟢 |
| `app/api/care-profile/route.ts` | Fetch-or-generate care profile. `scientific_name` optional; names capped (80/120 chars). After generating, re-checks the cache by Claude's **resolved** scientific name before inserting, so synonyms ("devil's ivy") return the existing species instead of 502 (L30). Caches new profiles to `species_care` (`source='claude'`); generated numbers clamped ≥1 in `generateCareProfile`. | 🟢 |
| `app/api/subscribe/route.ts` | POST validates a real `https://` push subscription shape and saves it; DELETE removes by endpoint. No auth (matches the app's private-URL model), but input is validated to prevent unbounded junk rows — see L14. | 🟢 |
| `app/api/cron/morning/route.ts` | Bearer `CRON_SECRET` auth. Sends on the first run inside a 3h window opening at `morning_time` (in `settings.timezone`) — catch-up for late GitHub runs (L27). Atomically claims the day *before* sending (L13; needs `migration_003`). Push to every subscription (no global flag — L26) + email (if enabled + address) independently. Title counts distinct plants. Window wraps midnight; claim keyed by the window's opening date (`morningWindowDate`). Releases the claim on ANY failure after it (throw, or all channels failing incl. all-transient push) so the next run retries (L32). | 🟢 |
| `app/api/push/test/route.ts` | Bearer `CRON_SECRET` auth (reuses the cron secret, not a separate one). Manual dev trigger — sends one fixed test push to every registered subscription immediately, bypassing the morning-hour gate AND the "must have due tasks" gate that `/api/cron/morning` has. For confirming push actually works without waiting for either condition. | 🟢 |
| `.github/workflows/morning-cron.yml` | Hourly GitHub Actions schedule at minute 17 (not `:00`, GitHub's busiest slot) calling `/api/cron/morning` with the `CRON_SECRET` bearer. Secrets passed via `env:`, not inlined into shell. GitHub disables schedules after 60 days of repo inactivity — re-enable in the Actions tab. Needs `APP_URL` + `CRON_SECRET` repo secrets. | 🟢 |

## Docs & tests
`CLAUDE.md` · `AGENTS.md` (Next.js warning) · `discovery.md` · `plan.md` ·
`progress.md` · `LESSONS_LEARNED.md` · this file · `tests/phase-0-checklist.txt` ·
`tests/phase-1-checklist.txt` · `tests/phase-2-checklist.txt` · `tests/phase-3-checklist.txt` ·
`tests/phase-4-checklist.txt` · `tests/phase-5-checklist.txt` ·
`tests/phase-6-checklist.txt` · `tests/phase-7-checklist.txt`.
