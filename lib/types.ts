/**
 * Domain types for Sprout. These mirror the Supabase tables (see
 * supabase/schema.sql) and are the shared contract between the data layer,
 * API routes, and UI. Kept hand-written and untyped-at-the-client per the
 * Supabase `never`-inference gotcha (see MEMORY.md / LESSONS_LEARNED.md).
 */

export type LightLevel = "low" | "medium" | "bright";
export type Difficulty = "easy" | "medium" | "fussy";
export type CareTaskType = "water" | "rotate" | "prune" | "harvest" | "repot";
export type ProfileSource = "seed" | "claude";
export type Locale = "en" | "es" | "de" | "ko";
/** Locales that need translation — species_care itself already IS English. */
export type NonEnglishLocale = Exclude<Locale, "en">;

/** A care profile for a species — the source of truth for care logic. */
export interface SpeciesCare {
  id: string;
  common_name: string;
  scientific_name: string;
  /** Stable key for the curated SVG illustration set (see PlantIllustration). */
  illustration_key: string;
  difficulty: Difficulty;
  light: LightLevel;
  /** Days between waterings — tuned by growing season. */
  water_days_summer: number;
  water_days_winter: number;
  humidity: string;
  soil_recommendation: string;
  /** How often to rotate for even growth (days). */
  rotate_days: number;
  /** Roughly how often to consider repotting (months). */
  repot_months: number;
  toxicity: string;
  propagation: string;
  pruning: string;
  /** Null when the plant isn't harvested (most houseplants). */
  harvesting: string | null;
  /** Days between harvests. Null unless `harvesting` is set. */
  harvest_days: number | null;
  dos: string[];
  donts: string[];
  source: ProfileSource;
  created_at: string;
}

/** Cached Claude translation of a species' free-text fields into one locale. */
export interface SpeciesCareTranslation {
  id: string;
  species_care_id: string;
  locale: NonEnglishLocale;
  common_name: string;
  humidity: string;
  soil_recommendation: string;
  toxicity: string;
  propagation: string;
  pruning: string;
  harvesting: string | null;
  dos: string[];
  donts: string[];
  created_at: string;
}

/** The translatable subset of fields, shared between SpeciesCare and its translations. */
export type TranslatableCareFields = Pick<
  SpeciesCare,
  "common_name" | "humidity" | "soil_recommendation" | "toxicity" | "propagation" | "pruning" | "harvesting" | "dos" | "donts"
>;

/** A plant in the user's garden. */
export interface Plant {
  id: string;
  nickname: string | null;
  common_name: string;
  scientific_name: string;
  photo_url: string | null;
  illustration_key: string;
  potted: boolean;
  has_drainage: boolean | null;
  /** User-supplied mix if potted; our recommendation otherwise. */
  soil_mix: string | null;
  light_location: string | null;
  acquired_at: string | null;
  care_species_id: string;
  notes: string | null;
  created_at: string;
}

/** A generated reminder for a specific plant. */
export interface CareTask {
  id: string;
  plant_id: string;
  type: CareTaskType;
  interval_days: number;
  last_done_at: string | null;
  next_due_at: string; // ISO date
}

/** Web Push subscription persisted for the morning cron. */
export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

/** Single-row app settings. */
export interface Settings {
  id: string;
  morning_time: string; // "07:00"
  timezone: string; // IANA, e.g. "America/Chicago"
  email: string | null;
  push_enabled: boolean;
  email_enabled: boolean;
  /** Local date (in `timezone`) the morning digest last ran — dedupe guard. */
  last_morning_send_date: string | null;
  language: Locale;
}

/** Shape returned by the Claude vision identify endpoint. */
export interface IdentifyResult {
  common_name: string;
  scientific_name: string;
  /** One short sentence on the visible features the ID was based on — shown as a sanity check. */
  key_features: string;
  /** 0–1 model confidence. */
  confidence: number;
  /** Up to 2 alternates — populated whenever a plausible look-alike exists, not just when uncertain. */
  candidates: { common_name: string; scientific_name: string }[];
  /** True when we should ask the user to confirm which candidate. */
  uncertain: boolean;
}
