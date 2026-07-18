import "server-only";
import { serverClient } from "@/lib/supabase";
import { translateCareProfile } from "@/lib/anthropic";
import type { Locale, NonEnglishLocale, SpeciesCare, SpeciesCareTranslation } from "@/lib/types";

/**
 * Returns a species' care fields as they should display in `locale` —
 * unchanged for English (the canonical source), or overlaid with a cached
 * (or freshly Claude-translated, then cached) translation otherwise.
 * Mirrors the fetch-or-generate pattern used for care-profile generation
 * itself (app/api/care-profile/route.ts): cache hit is near-instant, cache
 * miss costs one Claude call and is cached back for next time.
 */
export async function getLocalizedSpeciesCare(
  species: SpeciesCare,
  locale: Locale
): Promise<SpeciesCare> {
  if (locale === "en") return species;
  const nonEnglish = locale as NonEnglishLocale;

  const { data: cached, error: cacheError } = await serverClient()
    .from("species_care_translations")
    .select("*")
    .eq("species_care_id", species.id)
    .eq("locale", nonEnglish)
    .maybeSingle();
  if (cacheError) throw new Error(`[sprout] getLocalizedSpeciesCare: ${cacheError.message}`);
  if (cached) return applyTranslation(species, cached as SpeciesCareTranslation);

  const translated = await translateCareProfile(
    {
      common_name: species.common_name,
      humidity: species.humidity,
      soil_recommendation: species.soil_recommendation,
      toxicity: species.toxicity,
      propagation: species.propagation,
      pruning: species.pruning,
      harvesting: species.harvesting,
      dos: species.dos,
      donts: species.donts,
    },
    nonEnglish
  );

  const { data: inserted, error: insertError } = await serverClient()
    .from("species_care_translations")
    .insert({ species_care_id: species.id, locale: nonEnglish, ...translated })
    .select("*")
    .single();

  if (insertError) {
    // Unique violation: another request translated this species+locale first.
    if (insertError.code === "23505") {
      const { data: winner } = await serverClient()
        .from("species_care_translations")
        .select("*")
        .eq("species_care_id", species.id)
        .eq("locale", nonEnglish)
        .maybeSingle();
      if (winner) return applyTranslation(species, winner as SpeciesCareTranslation);
    }
    throw new Error(`[sprout] getLocalizedSpeciesCare: ${insertError.message}`);
  }

  return applyTranslation(species, inserted as SpeciesCareTranslation);
}

function applyTranslation(species: SpeciesCare, translation: SpeciesCareTranslation): SpeciesCare {
  return {
    ...species,
    common_name: translation.common_name,
    humidity: translation.humidity,
    soil_recommendation: translation.soil_recommendation,
    toxicity: translation.toxicity,
    propagation: translation.propagation,
    pruning: translation.pruning,
    harvesting: translation.harvesting,
    dos: translation.dos,
    donts: translation.donts,
  };
}
