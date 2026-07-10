# Lessons Learned — Sprout

Bugs, gotchas, and hard-won knowledge. One entry per lesson: what broke, why,
what I did wrong, how to prevent it.

## L1 — Serwist ✕ Next 16 Turbopack (avoided by design)
**Context:** Needed a service worker for Web Push. FullPantry documented that
`@serwist/next`'s webpack plugin conflicts with Next 16's Turbopack bundler.
**Decision:** Skip Serwist entirely. Push only needs a SW with `push` +
`notificationclick` listeners — hand-written `public/sw.js` registered manually.
**Prevention:** Don't reach for a PWA framework when a 40-line SW does the job.

## L2 — Supabase untyped client (`never` inference)
**Context:** `createClient<Database>()` with a hand-written `Database` generic makes
`.update({...})` infer `never` when the type shape is incomplete (from MEMORY.md).
**Decision:** `createClient()` untyped; cast results to `lib/types.ts` at call sites.

## L3 — Next 16 breaking changes
`params` is now a `Promise` — `const { id } = await params`. Route handlers use Web
`Request`/`Response`. `themeColor`/`viewport` moved out of `metadata` into a separate
`export const viewport: Viewport`. Read `node_modules/next/dist/docs/` before coding.

## L4 — Next 16 build-time prerendering vs. live DB pages
**Context:** `npm run build` failed on `/garden` and `/add/manual` with "Missing env
var" — Next 16 tries to statically prerender any page without dynamic segments by
default, even ones doing a plain Supabase fetch, so it ran the fetch at build time
with no env available.
**Decision:** Any page reading live Supabase data gets `export const dynamic =
"force-dynamic";` — correct anyway, since garden contents change per-request.
**Prevention:** Add `force-dynamic` to a data-fetching page the moment it's created,
not after a failed build.

## L5 — `server-only` package isn't bundled with Next
**Context:** Imported `import "server-only"` in `lib/species.ts`/`lib/plants.ts` to
guard against accidental client bundling — assumed it ships with Next. It doesn't;
it's a separate npm package.
**Decision:** `npm install server-only` explicitly.

## L6 — Supabase JS has no raw-SQL execution
**Context:** Wanted one script to run `supabase/seed.sql` programmatically for
verification. `supabase-js` only talks PostgREST (table CRUD) — there's no
"run this .sql file" method from the client library.
**Decision:** `scripts/run-seed.mjs` re-expresses the same seed data as JS objects
and upserts via `.from(...).upsert(...)`. `seed.sql` stays as the copy-paste path
for the SQL editor. **Two copies of the data — keep them in sync** if a species is
added or edited (noted in SOURCE_OF_TRUTH.md and both files' headers).

## L7 — Claude vision doesn't accept HEIC
**Context:** Built `identifyPlant` assuming HEIC (the default iPhone photo format)
would work like any other image type. The Anthropic SDK's image content block only
accepts `image/jpeg`, `image/png`, `image/webp`, `image/gif` — a HEIC upload fails
TypeScript compilation, not just a runtime error.
**Decision:** Restricted `/api/identify`'s accepted types to those four. Safari
re-encodes camera/library photos to JPEG on `<input type=file>` upload, which
covers the common case, but a third-party photo picker or Android camera app could
still hand us something else — the route returns a clean 400 either way, not a crash.
**Prevention:** Check a vision API's accepted MIME types before assuming "any image
format" works, especially for iOS-first flows.

## L8 — Forced tool_choice is a hint schema, not a guarantee
**Context:** Edge Case Destroyer pass on Phase 2 found that `tool_choice: {type:
"tool", ...}` reliably gets *a* JSON object matching the schema's required keys and
types, but doesn't enforce `enum` constraints, numeric ranges, or cross-field
uniqueness — Claude can still emit an `illustration_key` outside the curated set, a
`confidence` doing something odd, or duplicate `candidates`.
**Decision:** Added defensive clamping in `lib/anthropic.ts` after every tool_use
call: confidence clamped to [0,1], candidates deduped, illustration_key validated
against the allowed set (falls back to "generic"). Also added an explicit
`is_plant` boolean to the identify schema so Claude has a real way to say "there's
no plant here" instead of being forced into a fabricated low-confidence guess.
**Prevention:** Treat a tool schema's `enum`/range/uniqueness constraints as
prompt-level hints. Validate anything that gets persisted to the DB or used as a
lookup key server-side, same as any other untrusted input.

## L9 — Client-driven parallel async work needs a request-token guard
**Context:** `AddPlantFlow` kicks off the Storage upload and the Claude identify
call in parallel as soon as a photo is picked. If the user retakes/reselects before
either resolves, both the old and new calls are in flight with no way to tell which
result belongs to which photo — a stale response landing last would silently
overwrite the current state (and could point `photo_url` at the wrong image).
**Decision:** A `requestIdRef` counter is bumped on every new pick; every async
callback checks `requestId === requestIdRef.current` before calling `setState`, and
a superseded upload is deleted from Storage in the background instead of orphaned.
**Prevention:** Any client component that fires an async request per user action
(not per mount) needs a request-token or `AbortController` guard the moment a second
trigger of that action is possible — don't wait for a bug report to add it.

## L10 — Deleting a row doesn't delete its Storage object for free
**Context:** Found while self-testing Phase 2 (not by the Edge Case Destroyer pass
— caught it live): saved a plant with a photo, deleted it via `deletePlantAction`,
then checked the `plant-photos` bucket — the object was still there. Deleting the
`plants` row has no relationship to the Storage object it points to; Supabase
doesn't cascade that automatically.
**Decision:** `deletePlantAction` now reads `photo_url` before deleting the row,
extracts the Storage path from the public URL, and calls the same
`discardUploadedPhoto` helper used for abandoned add-flow uploads.
**Prevention:** Whenever a DB row references a Storage object, the delete path for
that row needs an explicit Storage cleanup step — it's never implicit.

## L11 — `Date.toISOString()`/`getMonth()` are UTC, not the user's calendar
**Context:** Edge Case Destroyer pass on Phase 3 (`lib/care.ts`) found that
`toDateOnly()` (`date.toISOString().slice(0,10)`) and `isGrowingSeason()`
(`date.getMonth()`) both read UTC/server-runtime time, not the user's local
calendar (`settings.timezone`, default `America/Toronto`, UTC-4/-5). Verified live
at the moment this was fixed: at 8:48pm Chicago time, `toISOString()` already said
"tomorrow" (past UTC midnight) while the user's actual local date was still
"today." Vercel serverless functions run in UTC, so this isn't a local-dev-only
quirk — it would misfire in production for the entire evening/night window, every
day, for any US/Canada user.
**Decision:** Added a `localDateParts()` helper using
`Intl.DateTimeFormat(..., { timeZone: "America/Toronto" })` and routed both
`toDateOnly()` and `isGrowingSeason()` through it. Hardcoded to the one fixed zone
(matching `settings.timezone`'s default) rather than reading the DB per call —
per-user timezone isn't wired up anywhere else yet (Settings is still a Phase 4
shell), so this fixes the actual bug without half-building a feature.
**Prevention:** Never use `Date.toISOString()`, `getMonth()`, `getDate()`, etc. for
"what day is it for the user" logic — they're UTC/server-local, not user-local.
Always go through `Intl.DateTimeFormat` with an explicit `timeZone`, even a
hardcoded one, the moment "today" or "this month" matters to a user-facing date
boundary (reminders, "due today," season/quarter cutoffs).

## L12 — Turbopack dev server stale-route 404 after a long-running session (open, needs Phase 5 fix)
**Context:** During Phase 3 self-testing, `npm run dev` had been running across
many file edits/HMR reloads over the session. `/add/manual` — a route that
definitely exists on disk and had loaded fine earlier — started returning a clean
server-side 404 with no error logged. A full server restart (`preview_stop` +
`preview_start`, i.e. kill and re-run `npm run dev`) fixed it instantly with zero
code changes.
**Status: NOT YET ROOT-CAUSED.** Working theory: Turbopack's route manifest can
get out of sync with the filesystem after a long dev session with many HMR
rebuilds, particularly with `turbopack.root` pinned (`next.config.ts`) away from
the default inferred root. Not confirmed.
**Action for Phase 5 (polish pass):** Investigate properly — reproduce
deliberately (long dev session, many edits, then hit an existing route), check if
it's a known Next 16/Turbopack issue upstream, and either find a real fix or at
minimum document the restart workaround clearly so it's not mistaken for an app
bug during future testing. Flagged in `plan.md` Phase 5.
**Prevention (for now):** If a route that definitely exists 404s with no server
error logged, restart the dev server before assuming it's a code bug.

## L13 — A read-then-write dedup guard is a TOCTOU race; only an atomic conditional write is safe
**Context:** Edge Case Destroyer pass on Phase 4 found that `/api/cron/morning`'s
original dedup guard read `settings.last_morning_send_date`, decided whether to
send, then wrote the new date at the very end. Two overlapping invocations within
the same target hour (a GitHub Actions retry, or a manual `workflow_dispatch` run
landing near the scheduled tick — both enabled in the workflow) could both read
"not sent today," both pass, and both send — a duplicate push + email.
**Decision:** Replaced the read-then-branch with a single atomic conditional
`UPDATE ... WHERE last_morning_send_date IS NULL OR != today RETURNING id`,
executed *before* any sending. Only the invocation that actually flips the row
"claims" the send; a concurrent second invocation affects zero rows and skips.
No advisory lock or separate mutex table needed — the conditional update IS the
lock.
**Prevention:** Any "has this already happened today/this run" guard that reads a
flag then writes it later is a race by construction. If two callers can plausibly
overlap, the check-and-claim has to be one atomic write, not read-then-write.

## L14 — An unauthenticated write endpoint needs its own resource-exhaustion guard, even in a "no-auth by design" app
**Context:** `/api/subscribe` has no auth, matching this app's stated model
(private URL is the security boundary — same as every other route). But the Edge
Case Destroyer pointed out a sharper problem than "no auth": with only a
type-shape check, anyone who found the URL could POST unlimited fake
`push_subscriptions` rows, and `sendPushToAll` only pruned on a confirmed 404/410
from the push service — a garbage/unreachable endpoint has no status code at all,
so it would be retried forever, every single day, growing unbounded.
**Decision:** Added real `https://` URL validation on POST (rejects non-URLs and
`http://`), and broadened pruning in `sendPushToAll` to also cover `400` (push
service rejected the subscription as invalid) and DNS/connection failures
(`ENOTFOUND`/`ECONNREFUSED` — a nonexistent/refusing host is permanently dead,
not transient).
**Prevention:** "No auth, private URL" is an acceptable model for who-can-call-it,
but it doesn't automatically make an endpoint safe from junk/resource-exhaustion —
that's a separate question (can a caller cause unbounded state growth or unbounded
retries?) worth asking independently for every unauthenticated write path.
