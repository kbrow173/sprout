# Source of Truth — Sprout

The living file map. **Consult before reading code; update the same breath as any
file change.** Status: 🟢 done · 🟡 shell/placeholder or user action needed · ⚪ planned.

## Config, auth & PWA
| File | Purpose | Status |
|---|---|---|
| `next.config.ts` | Image `remotePatterns` restricted to the Supabase host (was an open proxy); `serverActions.bodySizeLimit: "2mb"` backstop (L25); `turbopack.root` pinned; `next-intl/plugin` → `i18n/request.ts` | 🟢 |
| `proxy.ts` | **Passcode gate** (Phase 8, L35). Next 16's renamed middleware. No valid `sprout_session` cookie → pages redirect to `/login?next=…`, API/Server Action POSTs get 401. Excludes static assets, PWA files (manifest, sw.js, icons), `/login`, and the two `CRON_SECRET` routes. No-op while `APP_PASSCODE` is unset. | 🟢 |
| `lib/auth.ts` | Gate primitives (Web Crypto, runs in proxy + server): cookie = HMAC-SHA256(`APP_PASSCODE`, "sprout-session-v1"), so rotating the passcode logs out every device; `isValidSession`, `requestHasSession` (route handlers), `safeEqual`, `safeNextPath` (no open redirect), `unauthorizedResponse` | 🟢 |
| `lib/auth-server.ts` | `requireSession()` — called first in **every** Server Action (defense in depth: Next docs say not to rely on proxy alone) | 🟢 |
| `lib/auth-actions.ts` | `"use server"`: `loginAction` (useActionState; 800ms delay on a wrong guess; 400-day httpOnly cookie), `logoutAction` ("Lock this device") | 🟢 |
| `app/login/page.tsx` + `components/LoginForm.tsx` | Passcode screen (outside the app shell). Redirects away if the gate is off or already unlocked. | 🟢 |
| `vitest.config.ts` | Vitest: `@` alias, runs `lib/**/*.test.ts`. `npm test` | 🟢 |
| `.github/workflows/ci.yml` | CI on push/PR: lint → typecheck → test → build (one retry for the Turbopack next/font flake, L34). actions v5. | 🟢 |
| `i18n/request.ts` | next-intl config: cookie locale (`NEXT_LOCALE`, no URL prefix), `LOCALES`/`DEFAULT_LOCALE` | 🟢 |
| `messages/{en,es,de,ko}.json` | **Every UI string** (Phase 9), 244 keys × 4, identical key sets, ICU plurals. Namespaces: nav, tasks, today, onboarding, garden, add, manualAdd, plantQuestions, plant, settings, push, email, errors, login. Stored light-location values stay English (care-math reads them); only labels translate. | 🟢 |
| `lib/server-i18n.ts` | `serverTranslator(locale, ns)` (next-intl `createTranslator`) for the cron's push + email, locale from `settings.language`; `appBaseUrl()` (APP_URL or Vercel's production URL) for email links | 🟢 |
| `app/globals.css` | **Design system** tokens (`@theme`). Phase 11 a11y: `faint` darkened to 4.5:1; text-only variants `bloom-600`, `sun-700`, `sky-700` (the -500s are for icons/fills). Claude Design seam. | 🟢 |
| `app/layout.tsx` | Root layout: fonts, PWA metadata, `viewport` (no `maximumScale` — pinch-zoom allowed, WCAG 1.4.4), SW registration, `NextIntlClientProvider` | 🟢 |
| `public/manifest.json` | PWA manifest — SVG + 192/512/maskable PNG icons | 🟢 |
| `public/sw.js` | Service worker — `push` (shows notification + sets app-icon badge from `data.badge`) + `notificationclick` (focus/open the deep link). No offline cache. | 🟢 |
| `public/icon.svg`, `icon-192.png`, `icon-512.png`, `apple-icon.png`, `badge.png`, `icon-maskable-512.png` | Brand icon + rasterized set (`npm run icons` via `scripts/generate-icons.mjs`) | 🟢 |
| `components/ServiceWorkerRegister.tsx` | Client: registers `/sw.js` | 🟢 |

## App shell (route group `app/(app)/`)
| File | Purpose | Status |
|---|---|---|
| `app/(app)/layout.tsx` | Mobile column frame + `BottomNav` + `RefreshOnReturn` | 🟢 |
| `app/(app)/error.tsx` | Error boundary ("Something wilted", retry via Next 16 `unstable_retry`; "Unlock" when the error is the passcode lock). Translated. | 🟢 |
| `app/not-found.tsx` | Root 404, translated | 🟢 |
| `app/(app)/loading.tsx`, `garden/`, `plant/[id]/`, `add/manual/`, `settings/` `loading.tsx` | Route-level loading skeletons | 🟢 |
| `app/(app)/page.tsx` | **Today**: no plants → `Onboarding`; plants but nothing due → "All caught up"; else `TodayList`. Local-hour greeting. | 🟢 |
| `app/(app)/garden/page.tsx` | Garden grid; each card gets a status chip ("Needs you today" / "Next in N days") from `getNextDueByPlant` | 🟢 |
| `app/(app)/add/page.tsx` | Camera entry — `AddPlantFlow` | 🟢 |
| `app/(app)/add/manual/page.tsx` | Library search → questions → save (`getSpeciesSummaries`, slim columns) | 🟢 |
| `app/(app)/settings/page.tsx` | Per-device push toggle, `SettingsForm`, "Lock this device" (only when a passcode is set). Full IANA timezone list via `Intl.supportedValuesOf`. | 🟢 |
| `app/(app)/plant/[id]/page.tsx` | Care sheet. Care text in the UI language via `getLocalizedSpeciesCare` (cached Claude translation; falls back to English on failure). Sections: **Coming up** (every task + when), Watering (check-first, live expected interval, how-to-check, "I watered it just now"), **Fertilizing** (interval, half/quarter strength, season note per hemisphere), Light, Soil, Rotate, Repot (spring root check), Propagation, Pruning, Harvesting, Toxicity, Do/Don't, **Notes**, **History**. Edit link. UUID guard. | 🟢 |
| `app/(app)/plant/[id]/edit/page.tsx` | Edit plant (nickname, notes, date, potted, drainage, pot material/size, light, soil) via `PlantQuestions mode="edit"` → `updatePlantAction` | 🟢 |

## Components
| File | Purpose | Status |
|---|---|---|
| `components/TodayList.tsx` | Today's tasks **grouped per plant** (one card, several rows). Water: Still moist / Watered + how-to-check. Repot: Roots are fine / Repotted. Others: Done. "…" menu: Remind me tomorrow / Skip this time. **Undo toast** (lives here because a card unmounts once done). Mirrors the due-plant count to the app-icon badge. Replaced `ReminderCard`. | 🟢 |
| `components/Onboarding.tsx` | First-run 3 steps: install (iOS Share → Add to Home Screen; hidden once installed), notifications, first plant | 🟢 |
| `components/BottomNav.tsx` | Fixed bottom nav + center Add FAB, translated; labels 12px | 🟢 |
| `components/PageHeader.tsx` | Screen header (eyebrow in `forest-600` for contrast) | 🟢 |
| `components/EmptyState.tsx` | Illustrated empty-state card w/ optional CTA | 🟢 |
| `components/PlantIllustration.tsx` | 19 curated SVG variants + generic fallback (see Phase 6.1 notes in progress.md: distinct herbs, `POT_RIM`) | 🟢 |
| `components/PlantCard.tsx` | Garden card + optional status chip and "due" dot | 🟢 |
| `components/CareSection.tsx` | Icon + title + body section on the care sheet | 🟢 |
| `components/DeleteButton.tsx` | Confirm-guarded delete, translated | 🟢 |
| `components/ManualAddForm.tsx` | Species search/select (aria-pressed rows) → `PlantQuestions`; "Generate a care guide" for names not in the library | 🟢 |
| `components/PlantQuestions.tsx` | Shared questions, **create + edit modes**: potted, soil, drainage, **pot material** (plastic/terracotta/glazed ceramic/fabric), **pot size**, light, nickname, date, notes (edit). Pending-aware submit. 16px inputs (no iOS zoom). Pot answers become the watering prior (L36). | 🟢 |
| `components/SettingsForm.tsx` | `useActionState` form with **Saved / error feedback**: email + toggle, morning **hour select** (iOS ignored `step=3600`), timezone + "Use my timezone", **hemisphere**, language | 🟢 |
| `components/PendingSubmit.tsx` | Submit button disabled while its Server Action runs | 🟢 |
| `components/RefreshOnReturn.tsx` | `router.refresh()` when the PWA returns after >60s | 🟢 |
| `components/AddPlantFlow.tsx` | Camera/upload → `downscaleImage` → `/api/identify` → confirm (0.85 gate) → `/api/care-profile` → `PlantQuestions` → save. Error text translated by HTTP status (server English never shown). | 🟢 |
| `components/PushSubscribeButton.tsx` | **Per-device** push toggle (L26), translated messages | 🟢 |

## Data & lib
| File | Purpose | Status |
|---|---|---|
| `lib/types.ts` | Domain types: + `fertilize` task type, `Hemisphere`, `PotMaterial`, `PotSize`, `CareEvent`, `SpeciesCare.fertilize_days`, `Plant.pot_material/pot_size`, `Settings.hemisphere` | 🟢 |
| `lib/supabase.ts` | `server-only` service-role client. RLS blocks the anon key (L31). | 🟢 |
| `lib/image.ts` | Client `downscaleImage` (1568px, JPEG, EXIF-rotated, white behind transparency) | 🟢 |
| `lib/species.ts` | `getSpeciesSummaries` (picker), `getSpeciesById`, `getSpeciesByScientificName` (case-insensitive) | 🟢 |
| `lib/plants.ts` | `getPlants`, `getPlantWithCare` (FK-embedded) | 🟢 |
| `lib/actions.ts` | `"use server"`, every action `requireSession()` + validates its own input. `createPlantAction` (pot fields → prior), `updatePlantAction` (re-bases prior), `deletePlantAction`, `uploadPlantPhoto`, `discardUploadedPhoto`, **`performTaskAction` / `performWaterCheck` / `undoAction`** (called from TodayList; return event ids), `recordWaterCheckAction` (plant-page form), `updateSettingsAction(prev, formData)` → `SettingsState` (hour, timezone, email, language, hemisphere) | 🟢 |
| `lib/anthropic.ts` | Claude (`claude-sonnet-5`): `identifyPlant` (vision, adaptive thinking, `max_tokens` 16000 — thinking counts against it, L37), `generateCareProfile` (+ `fertilize_days`, all numbers clamped), `translateCareProfile`. `ILLUSTRATION_KEYS` must match `PlantIllustration.tsx`. | 🟢 |
| `lib/care-math.ts` | **Pure** scheduling rules (unit-tested), all on a `CareClock {timezone, hemisphere}`: local dates (L11), DST-safe day math (L28), seasons per hemisphere, `seasonStartOnOrAfter` / `snapToGrowingSeason`, `intervalDaysFor` (+ fertilize), `nextDueFor` (fertilize in season only; repot → spring check), `planWaterCheck` (L21, L29), `planTaskAction` (done/skip/snooze/roots_ok), `fertilizeDueAfterRepot` (6-week pause), `wateringPrior` (pot → starting factor), `fertilizeStrength`, `inMorningWindow` / `morningWindowDate` (L27) | 🟢 |
| `lib/care-math.test.ts`, `lib/auth.test.ts` | Vitest: 30 scheduling tests + 5 gate tests | 🟢 |
| `lib/care.ts` | Reminder engine, DB side. `clockOf(settings)`, `generateCareTasksForPlant(plant, species)` (5 task types; water starts at the prior), `rebaseWaterPrior`, `applyTaskAction` / `recordWaterCheck` (log to `care_events` with a pre-change snapshot; repot pushes the next feed), `undoCareEvent` (newest event per task only), `getDueTasks`, `getTasksForPlant`, `getNextDueByPlant`, `getCareHistory`, `expectedWaterIntervalDays` (L22), `localToday` | 🟢 |
| `lib/settings.ts` | `getSettings()`, React `cache()` | 🟢 |
| `lib/translations.ts` | `getLocalizedSpeciesCare(species, locale)` — fetch-or-translate-and-cache care text (`species_care_translations`). Now used by the plant page. | 🟢 |
| `lib/push.ts` | `sendPushToAll(payload)` → `{sent, pruned, failed}`; payload carries `url` (deep link) + `badge`; 12h TTL; prunes dead endpoints (L14) | 🟢 |
| `lib/email.ts` | `sendMorningEmail(to, tasks, locale)` — branded HTML, translated, links to each plant + "Open Sprout" (needs `APP_URL` or Vercel's production URL); returns false if Resend isn't configured | 🟢 |

## Database
| File | Purpose | Status |
|---|---|---|
| `supabase/schema.sql` | Full schema for fresh installs, incl. everything through migration_008 | 🟢 |
| `supabase/seed.sql` / `scripts/run-seed.mjs` | 36 species (28 houseplants + 10 herbs) incl. `fertilize_days`. Keep both in sync. | 🟢 |
| `supabase/migration_002` … `_006` | harvest_days, morning send tracking, i18n, adaptive watering, herb illustrations | 🟢 (003: see progress.md) |
| `supabase/migration_007_rls.sql` | RLS on all tables + case-insensitive unique species index (L31, L33). Run live, verified. | 🟢 |
| `supabase/migration_008_care_depth.sql` | **Phase 10**: `species_care.fertilize_days` (+ per-species backfill), `plants.pot_material/pot_size`, `settings.hemisphere`, `care_events` table (RLS on), CHECK constraints on enum columns, single-row `settings`, fertilize tasks for existing plants. Idempotent. **Must run before deploying Phase 10 code.** | 🟡 **user action needed** |
| `scripts/create-storage-bucket.mjs` | Creates the `plant-photos` bucket (`npm run storage:bucket`) | 🟢 |

## API routes
| File | Purpose | Status |
|---|---|---|
| `app/api/identify/route.ts` | Photo → Claude vision → `IdentifyResult`. Session-checked. | 🟢 |
| `app/api/care-profile/route.ts` | Fetch-or-generate care profile; dedupes on the resolved name (L30). Session-checked. | 🟢 |
| `app/api/subscribe/route.ts` | Save/remove a push subscription. Session-checked. | 🟢 |
| `app/api/cron/morning/route.ts` | `CRON_SECRET`. 3h catch-up window + once-per-day claim, released on failure (L27, L32). Push + email **in `settings.language`**; deep link to the plant when only one needs care; badge = due-plant count. | 🟢 |
| `app/api/push/test/route.ts` | `CRON_SECRET`. Sends one test push now. | 🟢 |
| `.github/workflows/morning-cron.yml` | Hourly at :17 → cron route. Needs `APP_URL` + `CRON_SECRET` repo secrets. | 🟢 |

## Docs & tests
`CLAUDE.md` · `AGENTS.md` · `discovery.md` · `plan.md` · `progress.md` · `LESSONS_LEARNED.md` ·
this file · `tests/phase-0-checklist.txt` … `tests/phase-7-checklist.txt` · `tests/phase-8-11-checklist.txt`.
