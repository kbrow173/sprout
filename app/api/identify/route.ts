import { identifyPlant } from "@/lib/anthropic";
import type { IdentifyResult } from "@/lib/types";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
// Claude vision doesn't accept HEIC; Safari re-encodes camera/library photos
// to JPEG on upload for <input type=file>, so this covers what actually arrives.
type SupportedMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
const ALLOWED_TYPES = new Set<SupportedMediaType>(["image/jpeg", "image/png", "image/webp", "image/gif"]);
/**
 * Below this, ask the user to confirm which candidate it is. Set above the
 * "confident but a look-alike can't be fully ruled out" band (see the
 * confidence anchors in identifyPlant's tool schema) so a merely-plausible
 * guess gets a one-tap confirmation instead of silently setting the wrong
 * care schedule; genuinely distinctive plants (0.9+) still auto-confirm.
 */
const CONFIDENCE_THRESHOLD = 0.85;

/**
 * Sniffs the actual file signature instead of trusting the client-declared
 * MIME type, which is trivially spoofable (renamed file, hand-built
 * FormData) and would otherwise waste a paid vision call on garbage input.
 */
function sniffImageType(bytes: Uint8Array): SupportedMediaType | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  const photo = formData.get("photo");

  if (!(photo instanceof File)) {
    return Response.json({ error: "No photo provided." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(photo.type as SupportedMediaType)) {
    return Response.json(
      { error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF." },
      { status: 400 }
    );
  }
  if (photo.size === 0 || photo.size > MAX_BYTES) {
    return Response.json(
      { error: photo.size === 0 ? "That photo looks empty — try again." : "Photo is too large (max 8MB)." },
      { status: 400 }
    );
  }

  const buffer = await photo.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const mediaType = sniffImageType(bytes);
  if (!mediaType) {
    return Response.json(
      { error: "That doesn't look like a valid JPEG, PNG, WebP, or GIF file." },
      { status: 400 }
    );
  }

  const base64 = Buffer.from(buffer).toString("base64");

  try {
    const identified = await identifyPlant(base64, mediaType);
    if (!identified.is_plant) {
      return Response.json(
        { error: "Couldn't find a plant in that photo. Try a clearer, closer shot or search manually." },
        { status: 422 }
      );
    }
    // Explicit whitelist, not a spread — identified also carries look_alike_check
    // (Claude's internal reasoning aid, lib/anthropic.ts), which isn't part of the
    // public IdentifyResult contract and shouldn't leak into the response.
    const result: IdentifyResult = {
      common_name: identified.common_name,
      scientific_name: identified.scientific_name,
      key_features: identified.key_features,
      confidence: identified.confidence,
      candidates: identified.candidates,
      uncertain: identified.confidence < CONFIDENCE_THRESHOLD,
    };
    return Response.json(result);
  } catch (err) {
    console.error("[sprout] /api/identify:", err);
    return Response.json(
      { error: "Couldn't identify that plant. Try a clearer photo or search manually." },
      { status: 502 }
    );
  }
}
