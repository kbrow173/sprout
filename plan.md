# Sprout — Indoor Plant Care PWA

## Context

Keegan wants a fun, simple, phone-installable web app to manage indoor plants. Core loop: **snap a photo → app identifies the plant → asks a few smart questions → adds it to your "garden" as a cute illustrated card → shows full care guidance → auto-builds a reminder schedule → nudges you every morning via phone notification (email backup).**

This is a greenfield project built to the **Commandments** (`memory/COMMANDMENTS.md`): Source of Truth first, plan-with-user, beautiful mobile-first UI, Edge Case Destroyer + real-world test checklist + Documentation Agent each phase. Design must "pop" (frontend-design skill), avoid generic AI aesthetics, and be **mostly white with a fun forest / light-green** accent. Code must leave clean seams for a later **Claude Design** front-end pass (design tokens, component-based, presentational components separated from data).

Decisions confirmed with user:
- **Notifications**: phone push (primary) + email (backup)
- **Illustrations**: curated SVG art library, mapped by plant type
- **Plant ID + care profiles**: **Claude (Anthropic API, `claude-sonnet-5` vision)** — one provider, no extra key, high-res vision, also drafts care profiles for plants not yet in our seeded DB. (Plant.id API is a documented drop-in upgrade if accuracy ever disappoints.)
- **Backend**: Supabase (Postgres + Storage) — required for server-side morning cron + photo storage; matches existing FullPantry/Wardrobe stack.

## Tech Stack

Mirrors FullPantry/Wardrobe (proven on this machine):
- **Next.js 16** (App Router) + **TypeScript**, no `src/` dir, `@/*` alias = `./*`
- **Tailwind v4** (CSS `@theme` in globals.css — **no** tailwind.config.ts)
- **Supabase** (`@supabase/supabase-js`, untyped client + manual casts — avoids the `never` inference gotcha)
- **Anthropic SDK** (`@anthropic-ai/sdk`), model `claude-sonnet-5`, adaptive thinking, vision
- **web-push** (VAPID) for iOS/Android Web Push + **Resend** for email backup
- **Lucide React** icons; custom SVG illustration set
- **Vercel** hosting + **Vercel Cron** for the daily 7am job

### PWA / Service Worker note (important)
FullPantry documented that **Serwist's webpack plugin conflicts with Next 16 Turbopack**. Push notifications only need a service worker with a `push` + `notificationclick` listener — not full offline caching. So we **hand-write `public/sw.js`** (registered manually on the client) instead of using Serwist. Avoids the conflict entirely and keeps the SW tiny and readable.

### iOS Web Push reality (researched)
- Works on iOS 16.4+ **only when the PWA is installed to the Home Screen** (`display: standalone` in manifest).
- `Notification.requestPermission()` **must** be called from a real tap handler (not on load).
- Subscription endpoint is Apple's push server; a **server-side cron** (Vercel Cron, daily) queries due tasks and sends via `web-push` + VAPID. Email backup via Resend from the same cron route.

## Data Model (Supabase Postgres)

- **`species_care`** — the seeded care database (source of truth for care logic). Keyed by scientific name. Columns: `common_name`, `scientific_name`, `difficulty`, `light` (low/medium/bright), `water_days_summer`, `water_days_winter`, `humidity`, `soil_recommendation`, `rotate_days`, `repot_months`, `toxicity`, `propagation` (text), `pruning` (text), `harvesting` (text|null), `dos` (jsonb[]), `donts` (jsonb[]), `source` (`seed` | `claude`). Claude-generated profiles for unknown plants are **written back here** so the second person to add that plant is instant.
- **`plants`** — a garden entry: `nickname`, `common_name`, `scientific_name`, `photo_url`, `illustration_key`, `potted` (bool), `has_drainage` (bool|null), `soil_mix` (text — user-given if potted, our recommendation if not), `light_location` (e.g. "south window"), `acquired_at`, `care_species_id` (fk → species_care), `notes`, `created_at`.
- **`care_tasks`** — reminder rows generated per plant from its care profile: `plant_id`, `type` (`water`|`rotate`|`prune`|`harvest`|`repot`), `interval_days`, `last_done_at`, `next_due_at`. Computed via a small helper; "done" bumps `last_done_at` and recomputes `next_due_at`.
- **`push_subscriptions`** — `endpoint`, `p256dh`, `auth`, `created_at`.
- **`settings`** — single row: `morning_time` (default 07:00), `timezone`, `email` (backup), `push_enabled`, `email_enabled`.

Seed ~25–30 common houseplants (pothos, monstera, snake plant, ZZ, spider, peace lily, philodendron, fiddle-leaf fig, pilea, calathea, aloe + common succulents, jade, rubber plant, dracaena, string of pearls, basil/mint/herbs, orchid, English ivy, etc.) with researched intervals (watering by season, rotate ~2 wks, repot spring, propagation/pruning notes, toxicity).

## Follow-up Questions (researched)

After ID, ask only what changes care (kept short + fun):
1. **Potted?** → if **yes**: "What's your soil mix?" (free text, optional) + "Does the pot have drainage?"; if **no**: app **recommends** a mix from `species_care.soil_recommendation`.
2. **Where does it live?** light location picker (window direction or low/medium/bright) → tunes watering guidance.
3. Optional: **nickname**, **when you got it / last watered** (seeds the first reminder).
Claude returns a **confidence score + up-to-2 candidate species**; if low confidence, we surface a "Which one is it?" chip instead of guessing.

## Key Files

- `app/layout.tsx` — PWA metadata, manifest link, standalone theming, SW registration
- `public/manifest.json`, `public/sw.js` — installable PWA + push/notificationclick handlers
- `app/globals.css` — Tailwind v4 `@theme`: white base + forest/light-green tokens (`--color-forest-*`, `--color-sprout-*`) → **the seam for Claude Design later**
- `lib/supabase.ts` — untyped client + typed helpers
- `lib/anthropic.ts` — `claude-sonnet-5` client; `identifyPlant(imageBase64)` (vision → species + confidence + candidates) and `generateCareProfile(species)` (structured care JSON, cached to `species_care`)
- `lib/care.ts` — reminder engine (compute `next_due_at`, "due today" grouping, seasonal water interval)
- `lib/push.ts` — VAPID subscribe/unsubscribe + send helpers (`web-push`)
- `app/api/identify/route.ts` — POST photo → Claude vision (server-side; **block private IPs is N/A** here since we take uploads, but validate size/type)
- `app/api/care-profile/route.ts` — fetch-or-generate care profile
- `app/api/subscribe/route.ts` — store push subscription
- `app/api/cron/morning/route.ts` — **Vercel Cron** daily: gather due tasks → send push + email (Resend) → respects `settings`
- `app/(app)/` pages: `dashboard` (today's cute reminders), `garden` (grid of illustrated plant cards), `add` (camera/upload → ID → questions flow), `plant/[id]` (full care sheet: dos/donts, light, propagation, pruning/harvesting, schedule)
- `components/` — `PlantCard`, `PlantIllustration` (maps `illustration_key` → SVG), `AddPlantFlow`, `ReminderCard`, `BottomNav`, `CareSection`
- `components/illustrations/*` — curated SVG plant art set
- `vercel.json` — cron schedule (daily, converted to user's morning in UTC)
- Reuse existing conventions: `node node_modules/next/dist/bin/next dev` on Windows if npx shim misbehaves; `remotePatterns` wildcard for Supabase Storage images.

## Phased Build (per Commandments — each phase ends with Edge Case Destroyer → test checklist → Documentation Agent → Source of Truth update)

- **Phase 0 — Foundation & Design System**: Next 16 + Tailwind v4 scaffold, white + forest/green `@theme` tokens, bottom nav, page shells, PWA manifest + installability, Supabase project + tables + seed script. Create `SOURCE_OF_TRUTH.md`, `discovery.md`, `plan.md`, `progress.md`, `CLAUDE.md`, `LESSONS_LEARNED.md`.
- **Phase 1 — Garden & Care DB**: seed `species_care`, `plants` CRUD, garden grid with SVG illustration mapping, plant detail care sheet (reads seeded data).
- **Phase 2 — Add-by-Photo + Claude**: camera/upload UI → `/api/identify` (Sonnet 5 vision) → confidence/candidate handling → follow-up questions flow → potted/soil/drainage/light → save. Fetch-or-generate care profiles, cache to DB.
- **Phase 3 — Reminders & Dashboard**: `care.ts` engine, generate `care_tasks` per plant, "due today" dashboard with cute reminder cards + "mark done".
- **Phase 4 — Push + Email**: `sw.js` push handler, VAPID keys, subscribe flow (tap-gated), `/api/cron/morning`, Resend email backup, `settings` (time/timezone/toggles). Test on real iPhone (installed to Home Screen).
- **Phase 5 — Polish & Deploy**: frontend-design polish pass, animations/micro-interactions, empty states, i18n (English/Spanish-Spain/German/Korean — `next-intl`, cookie-based locale, no URL prefix, synced to `settings.language`), investigate + fix the Turbopack dev-server stale-route 404 (LESSONS_LEARNED.md L12), **performance pass — app feels slow/unreactive in production** (see below), final Commandments check. (Nice-to-haves to discuss: watering history log, health/photo journal, plant "mood" status, share card.)
  - Vercel + Supabase + Resend deploy: ✅ already done (2026-07-10) — live at
    https://sprout-ten-theta.vercel.app, GitHub Actions cron wired, verified
    end-to-end (see progress.md Phase 4).
  - **Performance note (2026-07-10):** user reports the deployed app feels
    slow/unreactive. Measured server TTFB on the live deployment: `/` ~0.7-0.9s,
    `/garden` ~0.5s, `/settings` ~0.3s — all real, not just perception.
    Suspect causes to investigate first: (1) every page route is
    `export const dynamic = "force-dynamic"`, so there's zero caching and every
    navigation pays a full Supabase round trip; (2) no `loading.tsx` per route
    segment, so navigations show nothing until the full server response
    resolves instead of an instant skeleton; (3) Vercel Hobby serverless cold
    starts; (4) possible Vercel/Supabase region mismatch adding cross-region
    latency to every DB call; (5) `lib/supabase.ts`'s client caching
    (`_server`/`_browser` module vars) doesn't help across cold serverless
    invocations. Start by checking Vercel/Supabase region alignment (cheap,
    high-impact if mismatched) and adding `loading.tsx` skeletons (cheap,
    directly addresses "unreactive" even before touching data-fetching).
  - **Resolved (2026-07-10):** region confirmed aligned (Supabase East US/N.
    Virginia, Vercel Hobby's fixed `iad1`/Washington DC — not the cause).
    Audited all `lib/*.ts` data fetching — no avoidable N+1s or waterfalls;
    `getDueTasks()`'s settings-then-tasks sequence is a genuine dependency
    (needs the timezone to compute "today"), not a bug. Added `loading.tsx`
    skeletons to every route segment (Today/Garden/plant detail/add-manual/
    Settings) so navigation shows an instant response instead of a frozen
    screen during the Supabase round trip — this was the main lever available
    without paying for Vercel Pro (which would allow disabling/tuning cold
    starts). Remaining residual latency is inherent Vercel Hobby serverless
    cold-start behavior.

## Verification

- **Local**: `preview_start` the dev server; walk the add-a-plant flow with a real houseplant photo; confirm ID + questions + save; confirm dashboard shows generated reminders; `preview_screenshot` before/after design.
- **Care engine**: unit-check `next_due_at` math (seasonal intervals, mark-done recompute) with a couple of seeded species.
- **Push**: subscribe on desktop Chrome first (verify `push_subscriptions` row + a test push), then install to iPhone Home Screen and confirm a real morning notification via a manual cron trigger. Resend email as fallback path.
- **Build gate**: `npx next build` clean before each phase is "done"; Edge Case Destroyer pass each phase.

## Open Question for Later (not blocking)
Confirm your morning notification time + timezone (default 7:00 AM local) when we reach Phase 4.
