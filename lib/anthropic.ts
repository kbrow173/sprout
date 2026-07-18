import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Difficulty, LightLevel, NonEnglishLocale, TranslatableCareFields } from "@/lib/types";

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
  "basil",
  "rosemary",
  "thyme",
  "parsley",
  "chives",
  "mint",
  "orchid",
  "fern",
  "generic",
] as const;

export interface ClaudeIdentifyResult {
  /** False when the photo doesn't contain a plant Claude can identify at all. */
  is_plant: boolean;
  /** One short sentence on the visible features the ID was based on — surfaced to the user as a sanity check. */
  key_features: string;
  common_name: string;
  scientific_name: string;
  /** 0–1 model confidence. */
  confidence: number;
  candidates: { common_name: string; scientific_name: string }[];
}

const IDENTIFY_SYSTEM_PROMPT = `You are an expert horticulturist identifying houseplants from a single phone photo for a home plant-care app. Take this seriously: a wrong species means the app recommends the wrong watering schedule, light needs, and toxicity warning to a real person.

Houseplants are frequently confused with a close look-alike or a differently-cared-for cousin — for example Monstera deliciosa vs. adansonii vs. Rhaphidophora tetrasperma, Epipremnum (pothos) vs. Philodendron hederaceum, Calathea vs. Maranta vs. Stromanthe, peace lily vs. Chinese evergreen, and the huge range of near-identical succulents and cacti. Before naming a species, look closely at leaf shape, margin, venation, arrangement, and growth habit, and deliberately check your answer against its most likely look-alike. Report a calibrated confidence rather than defaulting to a high round number out of habit — most real phone photos of a look-alike-prone plant deserve a mid-range score, not 0.9+.`;

/** Vision ID from a single plant photo. */
export async function identifyPlant(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
): Promise<ClaudeIdentifyResult> {
  const message = await client().messages.create({
    model: MODEL,
    max_tokens: 1024,
    temperature: 0.4,
    system: IDENTIFY_SYSTEM_PROMPT,
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
            key_features: {
              type: "string",
              description:
                "Before naming the species: 1-2 sentences on the specific visible features you're using — leaf shape, margin, venation, arrangement, growth habit, stem/petiole detail, any visible flowers. Empty string if is_plant is false.",
            },
            common_name: {
              type: "string",
              description: "Best-guess common name. If is_plant is false, use an empty string.",
            },
            scientific_name: {
              type: "string",
              description: "Best-guess scientific name. If is_plant is false, use an empty string.",
            },
            look_alike_check: {
              type: "string",
              description:
                "Name the single species most commonly confused with your answer, and the specific visible feature in THIS photo that confirms it's not that species instead. If there truly is no common look-alike, say so explicitly. Empty string if is_plant is false.",
            },
            confidence: {
              type: "number",
              description:
                "Calibrated 0-1 probability the exact species is correct, given the look-alike check. Anchors: 0.9-1.0 = distinctive features visible, no plausible confusion remains. 0.7-0.89 = confident, but the look-alike above can't be fully ruled out from this photo. 0.4-0.69 = a genuine toss-up between 2+ plausible species. Below 0.4 = largely guessing (poor photo, juvenile plant, or an unusually ambiguous species). 0 if is_plant is false.",
            },
            candidates: {
              type: "array",
              description:
                "1-2 other species this could plausibly be instead, ordered by likelihood, each with a distinct scientific_name. Always include the look-alike named above if there is one, even when fairly confident in the main answer — only leave empty for a genuinely distinctive plant with no real confusion risk, or if is_plant is false.",
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
          required: ["is_plant", "key_features", "common_name", "scientific_name", "look_alike_check", "confidence", "candidates"],
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
  // A malformed/truncated tool_use block can omit any string field, so nothing
  // here may assume scientific_name/common_name exist before calling .toLowerCase().
  const confidence = Math.min(1, Math.max(0, raw.confidence ?? 0));
  const scientificName = raw.scientific_name ?? "";
  const commonName = raw.common_name ?? "";
  const seen = new Set([scientificName.toLowerCase()]);
  const candidates = (raw.candidates ?? [])
    .filter((c) => {
      const key = (c.scientific_name ?? "").toLowerCase();
      if (!c.scientific_name || !c.common_name || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 2);

  return {
    ...raw,
    scientific_name: scientificName,
    common_name: commonName,
    confidence,
    candidates,
  };
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

const LOCALE_NAMES: Record<NonEnglishLocale, string> = {
  es: "Spanish (Spain — es-ES, not Latin American Spanish)",
  de: "German",
  ko: "Korean",
};

/**
 * Translates a species' free-text care fields (the parts a human wrote/reads,
 * not the numeric intervals or enums) into the target UI locale. species_care
 * itself stays canonical English; this powers the on-demand
 * species_care_translations cache (see lib/translations.ts).
 */
export async function translateCareProfile(
  fields: TranslatableCareFields,
  locale: NonEnglishLocale
): Promise<TranslatableCareFields> {
  const message = await client().messages.create({
    model: MODEL,
    max_tokens: 2048,
    tools: [
      {
        name: "translated_care_profile",
        description: "Report the translated houseplant care text.",
        input_schema: {
          type: "object",
          properties: {
            common_name: { type: "string", description: "The common plant name, localized/translated naturally — not a literal word-for-word translation if a standard local name exists." },
            humidity: { type: "string" },
            soil_recommendation: { type: "string" },
            toxicity: { type: "string" },
            propagation: { type: "string" },
            pruning: { type: "string" },
            harvesting: { type: ["string", "null"] },
            dos: { type: "array", items: { type: "string" } },
            donts: { type: "array", items: { type: "string" } },
          },
          required: [
            "common_name",
            "humidity",
            "soil_recommendation",
            "toxicity",
            "propagation",
            "pruning",
            "harvesting",
            "dos",
            "donts",
          ],
        },
      },
    ],
    tool_choice: { type: "tool", name: "translated_care_profile" },
    messages: [
      {
        role: "user",
        content: `Translate this houseplant care text into ${LOCALE_NAMES[locale]}. Keep the same
meaning, tone (warm, beginner-friendly), and list lengths — translate naturally,
not literally. Use translated_care_profile to report it.

${JSON.stringify(fields, null, 2)}`,
      },
    ],
  });

  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("[sprout] translateCareProfile: Claude did not return a tool_use block.");
  }

  const raw = toolUse.input as TranslatableCareFields;
  // A source with no harvesting note should never translate into one.
  const harvesting = fields.harvesting ? raw.harvesting : null;

  return { ...raw, harvesting };
}
