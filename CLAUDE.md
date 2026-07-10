# Sprout — Claude Instructions

> ⚠️ **Next.js 16 has breaking changes vs. training data.** Before writing framework
> code, read the relevant guide in `node_modules/next/dist/docs/` (see `AGENTS.md`).
> Confirmed gotchas: `params` is a `Promise` (await it); route handlers use Web
> `Request`/`Response`; `viewport`/`themeColor` go in a separate `viewport` export.

## The Commandments
**READ FIRST**: `C:\Users\keega\.claude\projects\C--Users-keega-Projects\memory\COMMANDMENTS.md`
33 non-negotiable rules. Consult at the START and END of every session.

## Source of Truth
**CONSULT BEFORE READING CODE**: `SOURCE_OF_TRUTH.md` (project root). Maps every file.

## Project
- **Name**: Sprout — indoor plant care PWA
- **What**: Snap a photo → identify plant → ask smart questions → cute illustrated
  garden card → full care guidance → auto reminder schedule → morning phone push
  (email backup).
- **Location**: `C:\Users\keega\Projects\sprout`

## Tech Stack
- Next.js 16.2 (App Router, Turbopack), TypeScript, no `src/` (`@/*` = `./*`)
- Tailwind v4 — CSS `@theme` in `app/globals.css`, **no** tailwind.config.ts
- Supabase (Postgres + Storage) — untyped client + manual casts (`never` gotcha)
- Anthropic SDK, model `claude-sonnet-5`, adaptive thinking, vision
- web-push (VAPID) + Resend (email backup)
- Lucide icons; curated SVG plant illustrations
- Vercel + Vercel Cron (daily morning job)

## Design System
- **Mostly white** canvas + **forest / light-green** (`forest-*`, `sprout-*` tokens)
- Playful, organic, NOT generic AI aesthetics. Distinctive type: Bricolage
  Grotesque (display) + Nunito (body).
- All tokens live in `app/globals.css` `:root` + `@theme` — **the seam for a later
  Claude Design pass**. Restyle the whole app from that one block.
- Mobile-first always. Bottom nav + center Add FAB.

## Key Decisions
- **No Serwist** — its webpack plugin conflicts with Next 16 Turbopack. Push uses a
  hand-written `public/sw.js` registered via `components/ServiceWorkerRegister.tsx`.
- iOS Web Push needs the PWA installed to Home Screen; permission must be requested
  from a tap handler; morning delivery is a Vercel Cron → `web-push` + Resend.
- Claude does both plant ID and care-profile generation; unknown plants are cached
  back into `species_care` (`source='claude'`). Plant.id is a documented upgrade.

## Workflow (Every Phase — the Commandments)
```
1. Consult Commandments  2. Consult Source of Truth  3. Plan with user
4. Implement  5. Edge Case Destroyer → fix → log lessons
6. Real-world test checklist (.txt)  7. User tests  8. Documentation Agent
9. Final Commandments check  10. Phase complete
```

## Key Docs
- `SOURCE_OF_TRUTH.md` — file map (update religiously)
- `discovery.md` — feature spec, schema, research
- `plan.md` — phased plan
- `progress.md` — phase tracking
- `LESSONS_LEARNED.md` — gotchas
