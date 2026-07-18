# Progress — Sprout

## Phase 0 — Foundation & Design System  🟡 in progress
Done:
- ✅ Next 16 + Tailwind v4 + TS scaffold (no `src/`, `@/*` alias)
- ✅ Design system tokens (white + forest/sprout green) in `globals.css`
- ✅ Distinctive fonts: Bricolage Grotesque (display) + Nunito (body)
- ✅ PWA: manifest, standalone display, theme-color, SVG icon
- ✅ Hand-written push service worker + registration (no Serwist)
- ✅ App shell: `(app)` route group, bottom nav + center Add FAB, 5 page shells
- ✅ Reusable `PageHeader` + `EmptyState`
- ✅ Data layer: `lib/types.ts`, `lib/supabase.ts` (untyped clients)
- ✅ `supabase/schema.sql` (all 5 tables + default settings row)
- ✅ Docs: CLAUDE.md, SOURCE_OF_TRUTH.md, discovery.md, plan.md, progress.md, LESSONS_LEARNED.md

Verification:
- ✅ `npm run build` clean (7 routes, TS passes)
- ✅ Dev render confirmed via DOM snapshot: Today greeting + empty state + bottom
  nav all present; console clean (no errors)
- ✅ Design tokens live: CTA = forest-700 `rgb(31,91,57)`, h1 = Bricolage Grotesque
  @ forest-800. (Screenshot tool times out on network-idle — used inspect/snapshot.)
- ✅ Self edge-case pass: removed 404-ing apple-icon ref; verified nav clears
  content; `/plant/[id]` renders for arbitrary ids.
- ✅ Real-world test checklist: `tests/phase-0-checklist.txt`

**Remaining — user action (unblocks Phase 1 data):** create Supabase project, run
`supabase/schema.sql`, copy `.env.local.example` → `.env.local` and fill Supabase
values. Shells render without it; live data needs it.

## Phase 1 — Garden & Care DB  ⚪ next
Seed `species_care` (~25–30), PlantIllustration SVG set, plants CRUD, garden grid,
plant care sheet reading seeded data.

## Phase 2 — Add-by-Photo + Claude  ⚪
## Phase 3 — Reminders & Dashboard  ⚪
## Phase 4 — Push + Email  ⚪
## Phase 5 — Polish & Deploy  🟡 in progress

### Post-Phase-0 addendum
- Redesigned `public/icon.svg` (gradient forest bg, two-tone leaves, water-droplet
  accent) and rasterized the full set via `scripts/generate-icons.mjs` (`npm run
  icons`, uses `sharp`): `icon-192.png`, `icon-512.png`, `apple-icon.png` (180,
  no rounding — iOS masks it), `badge.png`, and a safe-zone-padded
  `icon-maskable-512.png`. Wired into `manifest.json` + `layout.tsx` metadata.
  Debt from Phase 0 (SVG-only icons) is now closed.
- User ran `supabase/schema.sql` successfully — Supabase project + tables are live.

---
## Phase 1 — Garden & Care DB  ✅ complete
- ✅ 36 species seeded live (`scripts/run-seed.mjs`, `supabase/seed.sql` kept in sync)
- ✅ `PlantIllustration` — 12 curated SVG variants + generic fallback
- ✅ Manual add-a-plant flow: species search → potted/soil/drainage → light chips →
  nickname/date → server action save (`ManualAddForm` + `createPlantAction`).
  Doubles as the Phase 2 "which one is it?" confirmation step.
- ✅ Garden grid (`PlantCard`), full care sheet (`CareSection`s: watering, light,
  soil, rotate/repot, propagation, pruning, harvesting when applicable, toxicity,
  do's/don'ts), delete with confirm (`DeleteButton`)
- ✅ Data layer: `lib/species.ts`, `lib/plants.ts` (FK-embedded join), `lib/actions.ts`

**Verification — build + live, no mocks:**
- ✅ `npm run build` clean (TS passes, 3 routes now `ƒ` dynamic: garden, add/manual,
  plant/[id] — see LESSONS_LEARNED L4)
- ✅ Ran the seed against the real Supabase project: 28/28 rows inserted, then 8
  more herbs added on request (see addendum below) → 36/36 total
- ✅ Full flow driven against the live dev server + real DB: searched species,
  selected Golden Pothos, toggled potted on/off (soil field swap confirmed),
  picked a light chip, filled nickname, submitted → redirected to a correctly
  populated care sheet (watering 9/18 days, soil, propagation, dos/don'ts all
  matched the seeded row) → appeared correctly on the Garden grid → deleted with
  confirm → back to empty state. Zero console errors at every step.
- ✅ Icon set confirmed serving 200: icon.svg, icon-192/512, apple-icon, badge,
  maskable-512, manifest.json
- ✅ Edge case: `/plant/<bogus-uuid>` → clean 404 inside the app shell, no crash
- ✅ Real-world test checklist: `tests/phase-1-checklist.txt`

### Post-Phase-0 addendum (icon work, done before Phase 1)
- Redesigned `public/icon.svg` (gradient forest bg, two-tone leaves, water-droplet
  accent) and rasterized the full set via `scripts/generate-icons.mjs` (`npm run
  icons`, uses `sharp`). Wired into `manifest.json` + `layout.tsx` metadata.
- User ran `supabase/schema.sql` successfully — Supabase project + tables live.
- User provided live Supabase credentials — `.env.local` now filled (gitignored).

### Post-Phase-1 addendum: more herbs
User flagged the herb lineup was thin (Basil + Mint only). Added 8 more kitchen
herbs — Rosemary, Thyme, Oregano, Parsley, Cilantro, Chives, Sage, Lemon Balm —
to both `supabase/seed.sql` and `scripts/run-seed.mjs` (10 herbs total now).
Verified: seed script ran clean (8 inserted, 36 total), build stayed clean,
Rosemary tested end-to-end live (search → select → save → full care sheet
including its Harvesting section → delete), zero console errors.

---
## Phase 2 — Add-by-Photo + Claude  ✅ complete
- ✅ `lib/anthropic.ts` — `claude-sonnet-5` client, tool-forced structured output
  for `identifyPlant` (vision → species/confidence/candidates/`is_plant`) and
  `generateCareProfile`. Defensive clamping on both (confidence range, candidate
  dedupe, `illustration_key` validated against the curated set).
- ✅ `app/api/identify/route.ts` — multipart photo upload, magic-byte sniffing
  (not just client-declared MIME type), 8MB cap, 0.75 confidence gate, clean
  422 when Claude reports `is_plant: false` instead of a fabricated guess.
- ✅ `app/api/care-profile/route.ts` — fetch-or-generate, cached to
  `species_care` (`source='claude'`); race-safe on concurrent identical inserts
  (unique-violation → re-fetch the winner).
- ✅ `components/AddPlantFlow.tsx` — camera (`capture="environment"`) + library
  picker → identify → confirm (auto-accept ≥0.75 or up to 3 candidate chips) →
  care-profile fetch → shared `PlantQuestions` → save. Photo uploads to
  Supabase Storage in parallel with ID; a request-token guard prevents a
  superseded photo pick from clobbering newer state; abandoned uploads
  (retake, "search manually", failed ID) are deleted from Storage in the
  background instead of left orphaned.
- ✅ `components/PlantQuestions.tsx` — extracted the potted/soil/drainage/
  light/nickname/date question steps out of `ManualAddForm` so both the manual
  and camera flows share one implementation.
- ✅ `scripts/create-storage-bucket.mjs` — public `plant-photos` bucket
  (`npm run storage:bucket`), JPEG/PNG/WebP/GIF only, 8MB cap.
- ✅ Design decision confirmed with user: `plants.photo_url` is stored for
  future use, but garden cards/detail pages keep rendering the curated SVG
  illustration — the original "never the raw photo" decision stands.

**Verification — build + live, no mocks:**
- ✅ `npm run build` clean (TS passes)
- ✅ End-to-end against the live dev server + real Supabase + real Claude API:
  uncertain-confidence photo → 3 candidate chips → picked one → care profile
  generated + cached → full question flow → saved → correct plant detail page
  → deleted. Separately confirmed the ≥0.75 auto-accept path with an
  unambiguous Monstera photo (95% confidence, skipped straight to confirm).
  Confirmed `is_plant: false` on a non-plant photo returns a clean 422, not a
  fabricated species. Confirmed care-profile cache hit is near-instant on a
  repeat lookup (0.4s vs several seconds for first generation).
- ✅ Edge Case Destroyer pass (`general-purpose` agent) found 1 critical
  (unguarded concurrent photo-pick race), 2 high (unvalidated
  `illustration_key`, orphaned Storage objects on abandoned flows), and 3
  medium (no `is_plant` escape hatch, unescaped ILIKE wildcards in the cache
  lookup, duplicate-candidate React key collision) — all fixed and
  re-verified live. A further self-caught bug during live retesting:
  `deletePlantAction` wasn't cleaning up the deleted plant's Storage photo —
  fixed. Logged as L7–L10 in `LESSONS_LEARNED.md`.
- ✅ Real-world test checklist: `tests/phase-2-checklist.txt`

### Note: i18n request (2026-07-09)
User asked for EN/ES-ES/DE/KO language switching in Settings. Decided with user:
deferred to Phase 5 (not bundled into Phase 2), `next-intl`, cookie-based locale
(no URL prefix), synced to a new `settings.language` column. See `plan.md` Phase 5.

---
## Phase 3 — Reminders & Dashboard  ✅ complete
- ✅ `species_care.harvest_days` — new nullable column (herbs only), added via
  `supabase/migration_002_harvest_days.sql` (user ran it live) + backfilled for
  the 10 seeded herbs. Also wired into `generateCareProfile`'s tool schema so
  future Claude-generated herb profiles get it too.
- ✅ `lib/care.ts` — the reminder engine. Auto-schedules **water** (seasonal),
  **rotate**, **repot**, and **harvest** (herbs only); **prune** stays
  read-only care-sheet text since `species_care` has no interval data for it
  (confirmed with user before building). Season = fixed Apr–Sep calendar
  months. Mark-done reschedules from **today + this species' current
  interval** (not the previous due date) — both confirmed with user upfront.
- ✅ `createPlantAction` now calls `generateCareTasksForPlant` right after
  insert, seeded from *today* (not `acquired_at` — Sprout doesn't know the
  plant's actual last-watered date, so backdating tasks would be a guess).
- ✅ `markCareTaskDoneAction` + `ReminderCard` — one-tap mark-done, disabled
  while pending (`useFormStatus`) to prevent a double-tap race.
- ✅ `app/(app)/page.tsx` — the Today dashboard: tasks due today **and**
  overdue, overdue ones flagged, sorted most-overdue-first.

**Verification — build + live, no mocks:**
- ✅ `npm run build` clean (TS passes)
- ✅ End-to-end against the live dev server + real Supabase: added Basil
  (harvestable) → confirmed all 4 task types generated with correct intervals
  → backdated tasks in the DB to simulate elapsed time → dashboard correctly
  showed "due today" vs "overdue" (sorted, flagged) → marked water done →
  confirmed it disappeared from Today and rescheduled to today+interval →
  deleted the plant → confirmed `care_tasks` cascade-deleted with it.
- ✅ Edge Case Destroyer pass (`general-purpose` agent) found 1 critical, 1
  high, and 5 medium/low issues — all fixed and re-verified live:
  - **Critical (L11):** `toDateOnly()`/`isGrowingSeason()` used
    `Date.toISOString()`/`getMonth()` (UTC/server-runtime), not the user's
    local calendar — reminders would silently drift a day for most US/Canada
    timezones, especially once deployed to Vercel (UTC runtime). Caught live:
    at 8:48pm Chicago time, the buggy code already thought it was tomorrow.
    Fixed with an `Intl.DateTimeFormat`-based helper pinned to
    `America/Toronto`; re-verified the same live moment now computes the
    correct date.
  - **High:** `markCareTaskDone`'s 3 sequential queries threw an unhandled
    error if the plant was deleted concurrently (e.g. another tab). Fixed to
    no-op gracefully; re-verified live by deleting a plant out from under a
    still-rendered card and confirming a clean resolution, no crash.
  - **Medium/low:** floored the repot interval (bad `repot_months` data could
    otherwise produce a same-day-forever nag), added a disabled-while-pending
    guard on mark-done (double-tap), and added logging if `getDueTasks` ever
    has to drop an orphaned row. Left the "watering interval can shift on a
    late mark-done near a season boundary" behavior as-is — it's a direct
    consequence of the "today + current interval" design already agreed with
    the user, not a bug.
  - Logged as L11 in `LESSONS_LEARNED.md`.
- ✅ Real-world test checklist: `tests/phase-3-checklist.txt`

---
## Phase 4 — Push + Email  ✅ code complete, ⚠️ 3 manual steps before it's live
Decided with user upfront: timezone is **America/Chicago** (real, not a
placeholder — schema default, `lib/care.ts`, and the live settings row all
updated); the daily trigger is a free **hourly GitHub Actions workflow**
calling `/api/cron/morning` (not Vercel Cron — Hobby plan only allows once/day
at a fixed UTC time, which drifts on DST, and the user doesn't want to pay for
Pro or needs a custom domain); the route itself decides "is it actually
morning" by checking `settings.timezone` + `settings.morning_time`, so the
send time is correct local time year-round with no schedule to hand-adjust;
both push and email always send independently (their own toggle each) rather
than email-only-as-fallback (Web Push doesn't reliably report delivery back
to the server, so "fallback on failure" isn't reliably detectable anyway).

- ✅ `settings.timezone` is now load-bearing, not decorative: `lib/care.ts`'s
  entire date/season engine threads it through from `getSettings()` instead
  of a hardcoded constant (closes the gap Phase 3's L11 fix deliberately left
  open, now that Settings is a real, editable page).
- ✅ `lib/push.ts` / `lib/email.ts` / `lib/settings.ts` — VAPID web-push,
  Resend (graceful no-op, not a throw, until a real API key is added), the
  single settings row.
- ✅ `app/api/subscribe/route.ts`, `app/api/cron/morning/route.ts` — see
  Source of Truth for behavior; both hardened during the Edge Case Destroyer
  pass (below).
- ✅ `components/PushSubscribeButton.tsx` + rewritten `app/(app)/settings/page.tsx`
  — tap-gated subscribe (iOS requirement), email/time/timezone form.
- ✅ `.github/workflows/morning-cron.yml` — hourly trigger.
- ✅ VAPID keys + `CRON_SECRET` generated and written to `.env.local`.

**Verification — build + live, no mocks:**
- ✅ `npm run build` clean (TS passes)
- ✅ Settings page: saved email/time/timezone, confirmed persisted; confirmed
  the push toggle and the rest of the form no longer stomp on each other
  (see bug below).
- ✅ `/api/cron/morning`: verified auth rejection (missing/wrong bearer →
  401), the "not morning time yet" skip (hour mismatch), and a full run with
  a real due task (correct push/email attempt, accurate status reporting).
- ✅ `/api/subscribe`: verified shape + `https://`-only validation live
  (garbage string, `http://`, and a valid-shaped endpoint all behaved
  correctly).
- ✅ Push subscribe itself (`Notification.requestPermission()` →
  `pushManager.subscribe()`) **could not be exercised in this environment** —
  `Notification.permission` is `"denied"` with no real user to grant it in
  headless browser automation. The code path was verified to fail gracefully
  (no crash, no-ops on denial) but the actual grant → subscribe → receive
  chain needs your real device. See the test checklist.
- ✅ **Self-caught bug during live testing** (not the Edge Case Destroyer —
  found by actually clicking Save): `updateSettingsAction`'s form had no
  field for `push_enabled`, so `formData.get("push_enabled")` was always
  `null` — every single Save silently reset push notifications to *off*,
  even if the user was already subscribed. Fixed by giving `push_enabled`
  exactly one writer (`setPushEnabledAction`, driven by the actual
  subscribe/unsubscribe result), and removing it entirely from the main
  settings form's update payload.
- ✅ Edge Case Destroyer pass (`general-purpose` agent) found 1 critical, 1
  high, and 4 medium/low issues — all fixed and re-verified live:
  - **Critical:** the cron's dedup guard was read-then-write, a TOCTOU race —
    two overlapping invocations (GitHub Actions retry/manual re-run) within
    the same target hour could both pass and both send. Fixed to a single
    atomic conditional `UPDATE ... WHERE last_morning_send_date IS NULL OR
    != today`, executed *before* any sending — re-verified the route now
    fails loudly (not silently) without `migration_003`, confirming the
    claim logic is actually load-bearing.
  - **High:** `/api/subscribe` had no real endpoint validation and
    `sendPushToAll` only pruned on 404/410 — a garbage endpoint would be
    retried forever, unbounded. Fixed: real `https://` URL validation on
    POST (verified live: garbage strings and `http://` both correctly
    rejected, a valid-shaped endpoint correctly saved), and pruning broadened
    to cover 400 and DNS/connection failures.
  - **Medium:** the timezone `<select>` only offered 6 hardcoded options —
    a stored value outside that list would silently render as the first
    option, and the next Save would silently overwrite the real timezone.
    Fixed with a dynamic extra `<option>` for out-of-list values, and
    switched the server-side validation from a hardcoded array to a real
    IANA-timezone check. Re-verified live: set `Asia/Tokyo` directly in the
    DB, confirmed the page showed it correctly (not Chicago), saved without
    touching the field, confirmed it was still `Asia/Tokyo` after.
  - **Medium:** the morning-time picker implied minute precision the hourly
    cron trigger can't honor (a `07:30` setting would fire at the 7:00 tick,
    silently ignoring the minutes). Fixed by rounding to the hour on save
    plus explicit UI copy explaining the hourly granularity.
  - **Low:** no email format validation on the settings form (server actions
    are directly POST-able, so the `type="email"` input's validation was
    client-side only); added a server-side regex check. Also fixed
    `PushSubscribeButton`'s self-heal effect writing on every single Settings
    page mount even when nothing had changed — now only writes on an actual
    mismatch between the real subscription state and `settings.push_enabled`.
  - Logged as L13–L14 in `LESSONS_LEARNED.md`.
- ✅ Real-world test checklist: `tests/phase-4-checklist.txt` (includes the
  real-iPhone steps only the user can run)

**⚠️ Three manual steps before this phase is actually live:**
1. Run `supabase/migration_003_morning_send_tracking.sql` in the Supabase SQL
   editor (same pattern as Phase 3's harvest_days migration) — `/api/cron/morning`
   currently 500s without it, by design (fails loudly rather than silently
   skipping the double-send guard).
2. Add a real `RESEND_API_KEY` + verified `REMINDER_EMAIL_FROM` to `.env.local`
   (and to Vercel's env vars once deployed) — email currently no-ops.
3. Once deployed to Vercel, set the `APP_URL` and `CRON_SECRET` repo secrets
   on GitHub so `.github/workflows/morning-cron.yml` can actually reach the
   app.

## Phase 5 — Polish & Deploy  🟡 in progress
Triggered by the user hitting three real issues live: the morning cron had been
failing every hour (12 consecutive GitHub Actions failure emails), plant ID felt
inaccurate, and the plant illustrations read as too abstract/generic.

- ✅ **Cron failures diagnosed**: root cause was never a code bug — `APP_URL` and
  `CRON_SECRET` GitHub repo secrets (Phase 4's manual step 3, above) were never
  set, so `curl` in `.github/workflows/morning-cron.yml` hit a malformed empty
  URL and failed in 2-4 seconds every run, silently (`-sf` swallows the response
  body). Hardened the workflow to fail loudly instead: checks both secrets are
  non-empty up front, captures HTTP status + response body, and only exits 0 on
  a genuine `<400` response. The actual fix (setting the two secrets, and
  confirming the app is deployed) is a user action — walked through live during
  this session, including discovering the Vercel deployment already existed
  (`sprout-ten-theta.vercel.app`, Status: Ready) but nothing had been redeployed
  since env vars changed.
- ✅ **Plant ID accuracy**: `identifyPlant` (`lib/anthropic.ts`) had a one-line
  prompt and trusted a self-reported confidence score with no calibration
  guidance — LLM confidence self-reports skew high regardless of true certainty.
  Added a system prompt requiring a `key_features` description and an explicit
  `look_alike_check` (name the most commonly confused species, state the visible
  feature that rules it out) before the final answer, calibration anchors on the
  confidence field, and `temperature: 0.4`. `candidates` are now populated
  whenever a real look-alike exists, not just below the confidence gate.
  `CONFIDENCE_THRESHOLD` raised 0.75 → 0.85 (`app/api/identify/route.ts`) so a
  "confident but unruled-out look-alike" case asks instead of silently guessing.
  `AddPlantFlow`'s `ConfirmStep` can now show alternates on "not quite" without
  forcing a full retake, using the same candidate list.
- ✅ **Illustration redesign**: rebuilt all 14 `PlantIllustration` variants —
  the old set was too abstract (e.g. "herb" was 5 identical circles, "monstera"
  a plain blob with punched white circles, "spider" five straight lines).
  Prototyped standalone (rendered via `sharp` to PNG for visual review — the
  Browser pane's screenshot/zoom tool was hanging on infra unrelated to the
  page, per L15) before porting into the component. Found and fixed a real bug
  along the way: trailing/draping variants (string-of-pearls, a succulent
  rosette resting on the rim, a vine's crown) were rendering completely
  invisible because `<Pot />` drew *after* `<Leaves />` and fully covered any
  leaf content positioned over the rim. Swapped the render order (pot first)
  — see L15.
- ✅ **Settings toggle inconsistency**: `PushSubscribeButton`'s knob was
  missing the `left-0.5` base position that the (correct) email-backup toggle
  right below it has, so it rendered ~2px short of flush-right when on — see
  L17.
- ✅ **L18 resolved — false alarm**: the earlier `display:none`-wrapper
  finding on `/settings` was a Browser-pane testing artifact (direct URL
  `navigate()` vs. a real link click), not an i18n or app bug. Reproduced on
  every route, not just Settings; a real click-driven navigation always
  rendered correctly. No `next-intl` involvement.
- ✅ **L12 root-caused**: Turbopack's persistent dev filesystem cache
  (`experimental.turbopackFileSystemCacheForDev`, on by default since Next
  16.1) matches known upstream reports of a stale/corrupted cache serving
  wedged output with no error. Fix when it recurs: delete `.next` and
  restart (a plain restart alone may not clear a disk-persisted cache).
- ✅ **i18n completed**: `app/(app)/settings/page.tsx` now uses
  `getTranslations("settings")` (was hardcoded English) and has a language
  picker (native-language labels, `en`/`es`/`de`/`ko`). `updateSettingsAction`
  validates + persists `settings.language` and sets the `NEXT_LOCALE` cookie
  next-intl reads, revalidating the root layout so the switch applies
  immediately, not just on next unrelated navigation.
  - ✅ **Migration run, verified end-to-end live**: switched to Español,
    confirmed the whole app (nav, Settings labels, all form text) switched
    immediately, no reload needed; hard-reloaded and confirmed
    `settings.language` persisted correctly; switched back to English,
    confirmed it reverted cleanly. Second Edge Case Destroyer pass on this
    round found 1 medium (language `<select>` missing the same stale-value
    fallback the timezone `<select>` has) — fixed, logged as L20.
- ✅ **Polish pass**: staggered pop-in for the Garden grid and Today's
  reminder list (`PlantCard`/`ReminderCard` take an optional `style` prop,
  `animationDelay` computed from index, capped past 10 items) — one
  orchestrated reveal instead of everything popping in at once. Kept the
  existing design language, no redesign.
- ✅ `npx tsc --noEmit` clean after every code change this phase.
- ✅ Edge Case Destroyer pass (`general-purpose` agent) on the four fixes
  above found 1 high, 1 medium, 2 low issues — all fixed:
  - **High:** `identifyPlant`'s defensive clamping (L8) only covered
    `confidence` — a malformed tool_use block missing `scientific_name`
    would throw instead of degrading gracefully. Now every string field
    defaults to `""` before use.
  - **Medium:** cron workflow's new error reporting had no `curl --max-time`
    (a hung endpoint blocks ~6h instead of failing fast) and mishandled a
    pre-connection failure (empty `$http_code` broke the integer check).
  - **Low x2:** `/api/identify` was spreading Claude's internal
    `look_alike_check` field into the public response (now an explicit
    whitelist); a candidate with an empty `common_name` could render a
    blank confirm button (now filtered).
  - Logged as L19 in `LESSONS_LEARNED.md`.
- ✅ Real-world test checklist: `tests/phase-5-checklist.txt`
