import "server-only";
import { serverClient } from "@/lib/supabase";
import type { SpeciesCare } from "@/lib/types";

/** Just what the manual-add picker needs — not every care field of every species. */
export type SpeciesSummary = Pick<SpeciesCare, "id" | "common_name" | "scientific_name" | "illustration_key" | "soil_recommendation">;

export async function getSpeciesSummaries(): Promise<SpeciesSummary[]> {
  const { data, error } = await serverClient()
    .from("species_care")
    .select("id, common_name, scientific_name, illustration_key, soil_recommendation")
    .order("common_name", { ascending: true });
  if (error) throw new Error(`[sprout] getSpeciesSummaries: ${error.message}`);
  return (data ?? []) as SpeciesSummary[];
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
