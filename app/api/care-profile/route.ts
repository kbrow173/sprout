import { serverClient } from "@/lib/supabase";
import { getSpeciesByScientificName } from "@/lib/species";
import { generateCareProfile } from "@/lib/anthropic";
import type { SpeciesCare } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Fetch-or-generate a care profile by scientific name. Cache hits (seeded or
 * previously Claude-generated) return instantly; misses ask Claude to draft
 * one and write it back to species_care so the next lookup is a cache hit.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const commonName = typeof body?.common_name === "string" ? body.common_name.trim() : "";
  const scientificName = typeof body?.scientific_name === "string" ? body.scientific_name.trim() : "";

  if (!commonName || !scientificName) {
    return Response.json({ error: "common_name and scientific_name are required." }, { status: 400 });
  }

  const cached = await getSpeciesByScientificName(scientificName);
  if (cached) {
    return Response.json(cached satisfies SpeciesCare);
  }

  try {
    const generated = await generateCareProfile(commonName, scientificName);

    const { data, error } = await serverClient()
      .from("species_care")
      .insert({ ...generated, source: "claude" })
      .select("*")
      .single();

    if (error) {
      // Unique violation on scientific_name — another request cached it first.
      if (error.code === "23505") {
        const raceWinner = await getSpeciesByScientificName(scientificName);
        if (raceWinner) return Response.json(raceWinner);
      }
      throw new Error(error.message);
    }

    return Response.json(data as SpeciesCare);
  } catch (err) {
    console.error("[sprout] /api/care-profile:", err);
    return Response.json(
      { error: "Couldn't generate a care profile for that plant. Try again in a moment." },
      { status: 502 }
    );
  }
}
