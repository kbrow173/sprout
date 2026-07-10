import "server-only";
import { serverClient } from "@/lib/supabase";
import type { Plant, SpeciesCare } from "@/lib/types";

/** A garden plant with its species care profile embedded (one query, via FK). */
export type PlantWithCare = Plant & { species_care: SpeciesCare };

export async function getPlants(): Promise<Plant[]> {
  const { data, error } = await serverClient()
    .from("plants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`[sprout] getPlants: ${error.message}`);
  return (data ?? []) as Plant[];
}

/**
 * A plant plus its full species care profile, fetched in one round trip via
 * Supabase's embedded-resource select (relies on the plants.care_species_id
 * -> species_care.id foreign key in supabase/schema.sql).
 */
export async function getPlantWithCare(id: string): Promise<PlantWithCare | null> {
  const { data, error } = await serverClient()
    .from("plants")
    .select("*, species_care(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`[sprout] getPlantWithCare: ${error.message}`);
  if (!data) return null;
  return data as unknown as PlantWithCare;
}
