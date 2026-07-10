import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Difficulty, LightLevel } from "@/lib/types";

/*
  Claude client for plant ID (vision) + care-profile generation. Both calls
  force a tool call (tool_choice) instead of asking for prose JSON — this is
  the reliable way to get structured output back from the Messages API; a
  "please respond in JSON" prompt can drift or wrap the JSON in prose.
*/

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "[sprout] Missing ANTHROPIC_API_KEY in .env.local — needed for plant ID and care profiles."
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

const MODEL = "claude-sonnet-5";

/** Curated SVG variants PlantIllustration knows how to render. */
const ILLUSTRATION_KEYS = [
  "vine",
  "monstera",
  "snake",
  "spider",
  "broadleaf",
  "fiddle",
  "succulent",
  "string",
  "pilea",
  "palm",
  "herb",
  "orchid",
  "fern",
  "generic",
] as const;

export interface ClaudeIdentifyResult {
  /** False when the photo doesn't contain a plant Claude can identify at all. */
  is_plant: boolean;
  common_name: string;
  scientific_name: string;
  /** 0–1 model confidence. */
  confidence: number;
  candidates: { common_name: string; scientific_name: string }[];
}

/** Vision ID from a single plant photo. */
export async function identifyPlant(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
): Promise<ClaudeIdentifyResult> {
  const message = await client().messages.create({
    model: MODEL,
    max_tokens: 1024,
    tools: [
      {
        name: "identify_plant",
        description: "Report the identified houseplant species with a confidence score.",
        input_schema: {
          type: "object",
          properties: {
            is_plant: {
              type: "boolean",
              description: "False if the photo does not clearly contain a plant at all (e.g. a person, a room, an object).",
            },
            common_name: {
              type: "string",
              description: "Best-guess common name. If is_plant is false, use an empty string.",
            },
            scientific_name: {
              type: "string",
              description: "Best-guess scientific name. If is_plant is false, use an empty string.",
            },
            confidence: {
              type: "number",
              description:
                "0 to 1 — how confident you are in this exact species identification. 0 if is_plant is false.",
            },
            candidates: {
              type: "array",
              description:
                "Up to 2 alternate species this could plausibly be instead, ordered by likelihood, each with a distinct scientific_name. Empty if you're confident or if is_plant is false.",
              maxItems: 2,
              items: {
                type: "object",
                properties: {
                  common_name: { type: "string" },
                  scientific_name: { type: "string" },
                },
                required: ["common_name", "scientific_name"],
              },
            },
          },
          required: ["is_plant", "common_name", "scientific_name", "confidence", "candidates"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "identify_plant" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          {
            type: "text",
            text: "Identify the houseplant in this photo. Use identify_plant to report your answer.",
          },
        ],
      },
    ],
  });

  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("[sprout] identifyPlant: Claude did not return a tool_use block.");
  }

  const raw = toolUse.input as ClaudeIdentifyResult;

  // Defensive clamping — Claude's tool schema is a strong hint, not a guarantee.
  const confidence = Math.min(1, Math.max(0, raw.confidence ?? 0));
  const seen = new Set([raw.scientific_name.toLowerCase()]);
  const candidates = (raw.candidates ?? [])
    .filter((c) => {
      const key = c.scientific_name.toLowerCase();
      if (!c.scientific_name || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 2);

  return { ...raw, confidence, candidates };
}

export interface GeneratedCareProfile {
  common_name: string;
  scientific_name: string;
  illustration_key: (typeof ILLUSTRATION_KEYS)[number];
  difficulty: Difficulty;
  light: LightLevel;
  water_days_summer: number;
  water_days_winter: number;
  humidity: string;
  soil_recommendation: string;
  rotate_days: number;
  repot_months: number;
  toxicity: string;
  propagation: string;
  pruning: string;
  harvesting: string | null;
  /** Days between harvests. Null unless harvesting is set. */
  harvest_days: number | null;
  dos: string[];
  donts: string[];
}

/** Drafts a full care profile for a species not yet in species_care. */
export async function generateCareProfile(
  commonName: string,
  scientificName: string
): Promise<GeneratedCareProfile> {
  const message = await client().messages.create({
    model: MODEL,
    max_tokens: 2048,
    tools: [
      {
        name: "care_profile",
        description: "Report a complete houseplant care profile.",
        input_schema: {
          type: "object",
          properties: {
            common_name: { type: "string" },
            scientific_name: { type: "string" },
            illustration_key: {
              type: "string",
              enum: [...ILLUSTRATION_KEYS],
              description: "Closest matching curated illustration style for this plant's shape/growth habit.",
            },
            difficulty: { type: "string", enum: ["easy", "medium", "fussy"] },
            light: { type: "string", enum: ["low", "medium", "bright"] },
            water_days_summer: { type: "integer", description: "Days between waterings in growing season." },
            water_days_winter: { type: "integer", description: "Days between waterings in dormant season." },
            humidity: { type: "string" },
            soil_recommendation: { type: "string" },
            rotate_days: { type: "integer" },
            repot_months: { type: "integer" },
            toxicity: { type: "string" },
            propagation: { type: "string" },
            pruning: { type: "string" },
            harvesting: {
              type: ["string", "null"],
              description: "Only for edible/herb plants that are harvested; null otherwise.",
            },
            harvest_days: {
              type: ["integer", "null"],
              description: "Days between harvests. Only set if harvesting is set; null otherwise.",
            },
            dos: { type: "array", items: { type: "string" }, description: "3-5 short care tips." },
            donts: { type: "array", items: { type: "string" }, description: "2-4 short care warnings." },
          },
          required: [
            "common_name",
            "scientific_name",
            "illustration_key",
            "difficulty",
            "light",
            "water_days_summer",
            "water_days_winter",
            "humidity",
            "soil_recommendation",
            "rotate_days",
            "repot_months",
            "toxicity",
            "propagation",
            "pruning",
            "harvesting",
            "harvest_days",
            "dos",
            "donts",
          ],
        },
      },
    ],
    tool_choice: { type: "tool", name: "care_profile" },
    messages: [
      {
        role: "user",
        content: `Write a beginner-friendly houseplant care profile for "${commonName}" (${scientificName}). Use care_profile to report it.`,
      },
    ],
  });

  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("[sprout] generateCareProfile: Claude did not return a tool_use block.");
  }

  const raw = toolUse.input as GeneratedCareProfile;

  // Defensive clamp — the enum in the tool schema is a strong hint, not a guarantee.
  const illustrationKey = (ILLUSTRATION_KEYS as readonly string[]).includes(raw.illustration_key)
    ? raw.illustration_key
    : "generic";

  // harvest_days only means anything alongside a harvesting note.
  const harvestDays = raw.harvesting ? raw.harvest_days : null;

  return { ...raw, illustration_key: illustrationKey, harvest_days: harvestDays };
}
