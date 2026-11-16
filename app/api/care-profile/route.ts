import { serverClient } from "@/lib/supabase";
import { getSpeciesByScientificName } from "@/lib/species";
import { generateCareProfile } from "@/lib/anthropic";
import type { SpeciesCare } from "@/lib/types";

export const runtime = "nodejs";

// Caps keep a junk/huge string out of the Claude prompt and the shared
// species library (this endpoint is unauthenticated — see audit B1/B4).
const MAX_COMMON = 80;
const MAX_SCIENTIFIC = 120;

/**
 * Fetch-or-generate a care profile. Cache hits (seeded or previously
 * Claude-generated) return instantly; misses ask Claude to draft one and write
 * it back to species_care so the next lookup is a cache hit.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const commonName = typeof body?.common_name === "string" ? body.common_name.trim() : "";
  const scientificName = typeof body?.scientific_name === "string" ? body.scientific_name.trim() : "";

  if (!commonName) {
    return Response.json({ error: "common_name is required." }, { status: 400 });
  }
  if (commonName.length > MAX_COMMON || scientificName.length > MAX_SCIENTIFIC) {
    return Response.json({ error: "That name is too long." }, { status: 400 });
  }

  if (scientificName) {
    const cached = await getSpeciesByScientificName(scientificName);
    if (cached) return Response.json(cached satisfies SpeciesCare);
  }

  try {
    const generated = await generateCareProfile(commonName, scientificName || undefined);

    // Name-only lookups ("devil's ivy") often resolve to a species already in
    // the library. Check by the RESOLVED scientific name before inserting —
    // previously this hit the unique constraint and the race-recovery lookup
    // used the empty request name, so the user got a 502 (L30).
    const existing = await getSpeciesByScientificName(generated.scientific_name);
    if (existing) return Response.json(existing);

    const { data, error } = await serverClient()
      .from("species_care")
      .insert({ ...generated, source: "claude" })
      .select("*")
      .single();

    if (error) {
      // Unique violation — another request cached the same species first.
      if (error.code === "23505") {
        const raceWinner = await getSpeciesByScientificName(generated.scientific_name);
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
