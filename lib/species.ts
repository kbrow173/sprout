import "server-only";
import { serverClient } from "@/lib/supabase";
import type { SpeciesCare } from "@/lib/types";

/**
 * The full species care library, alphabetized by common name. Small enough
 * (dozens of rows) to fetch in one call and filter client-side in the
 * manual-add species picker — no need for a search endpoint yet.
 */
export async function getAllSpecies(): Promise<SpeciesCare[]> {
  const { data, error } = await serverClient()
    .from("species_care")
    .select("*")
    .order("common_name", { ascending: true });

  if (error) throw new Error(`[sprout] getAllSpecies: ${error.message}`);
  return (data ?? []) as SpeciesCare[];
}

export async function getSpeciesById(id: string): Promise<SpeciesCare | null> {
  const { data, error } = await serverClient()
    .from("species_care")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`[sprout] getSpeciesById: ${error.message}`);
  return (data as SpeciesCare | null) ?? null;
}

/** Case-insensitive lookup, used by the Claude ID flow to check the cache. */
export async function getSpeciesByScientificName(
  scientificName: string
): Promise<SpeciesCare | null> {
  // Escape ILIKE wildcards (% _) so a scientific name containing them can't
  // over/under-match — this is an exact lookup, not a search.
  const escaped = scientificName.replace(/[\\%_]/g, (c) => `\\${c}`);

  const { data, error } = await serverClient()
    .from("species_care")
    .select("*")
    .ilike("scientific_name", escaped)
    .maybeSingle();

  if (error) throw new Error(`[sprout] getSpeciesByScientificName: ${error.message}`);
  return (data as SpeciesCare | null) ?? null;
}
