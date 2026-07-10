# Discovery — Sprout

## Vision
A fun, simple, phone-installable app to care for indoor plants. Core loop:
**snap a photo → identify → answer 2–3 quick questions → cute illustrated garden
card → full care guidance → auto reminder schedule → morning phone push (email
backup).** Mostly white with a fun forest/light-green personality.

## Confirmed decisions
- Notifications: **phone push (primary) + email backup**.
- Illustrations: **curated SVG library**, mapped by plant type (not AI-generated,
  not the raw photo). Keeps it fast, consistent, offline, easy to restyle.
- Plant ID + care profiles: **Claude Sonnet 5 vision** (one provider, high-res
  vision, drafts profiles for unknown plants). Plant.id = documented upgrade path.
- Backend: **Supabase** (needed for server-side morning cron + photo storage).

## Follow-up questions after ID (research-backed, kept short)
1. **Potted?**
   - Yes → "What soil mix?" (free text, optional) + "Drainage hole?" (yes/no).
   - No → app **recommends** a mix from `species_care.soil_recommendation`.
2. **Where does it live?** light location (window direction, or low/medium/bright)
   → tunes watering guidance.
3. Optional: **nickname**, **acquired / last-watered date** (seeds first reminder).
Claude returns confidence + up to 2 candidates; low confidence → "which one?" chip.

## Care research (intervals feeding the reminder engine)
- Watering is **seasonal**: growing season (spring/summer) more frequent, dormant
  (fall/winter) less. Store `water_days_summer` + `water_days_winter`.
- Examples: pothos 7–14d summer / ~14–21d winter; monstera 7–10d; snake plant
  14–28d (very drought-tolerant, overwatering kills). Succulents/ZZ long intervals.
- **Rotate** ~every 2 weeks for even growth.
- **Repot** in spring when rootbound; ~every 12–24 months depending on species.
- **Harvest** only for edibles/herbs (basil, mint) — null for most houseplants.
- Toxicity flagged (many popular houseplants are pet-toxic).

## iOS Web Push reality (researched)
- Works iOS 16.4+ **only when installed to the Home Screen** (`display: standalone`).
- `Notification.requestPermission()` **must** be called from a real tap handler.
- Delivery is server-driven: Vercel Cron (daily) → query due `care_tasks` →
  `web-push` (VAPID) to stored subscriptions + Resend email fallback.
- Delivery rate on iOS ~70–85% (vs ~90–95% Android) — hence the email backup.

## Data model
See `supabase/schema.sql`. Tables: `species_care` (care KB), `plants` (garden),
`care_tasks` (reminders), `push_subscriptions`, `settings` (single row).

## Nice-to-haves (post-MVP, to discuss)
Watering history log · photo/health journal · plant "mood" status · share card.
