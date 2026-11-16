"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { serverClient } from "@/lib/supabase";
import { getSpeciesById } from "@/lib/species";
import { generateCareTasksForPlant, markCareTaskDone, recordWaterCheck } from "@/lib/care";
import { LOCALE_COOKIE, LOCALES, DEFAULT_LOCALE } from "@/i18n/request";
import type { Locale, WaterCheckStatus } from "@/lib/types";

/**
 * Manual add-a-plant flow (Phase 1 stand-in for the Phase 2 camera flow — and
 * the same species-confirmation step that Claude's low-confidence path will
 * reuse). Denormalizes common_name/scientific_name/illustration_key onto the
 * plant row so a plant keeps its identity even if the species record changes.
 */
export async function createPlantAction(formData: FormData): Promise<void> {
  const careSpeciesId = String(formData.get("care_species_id") ?? "");
  if (!careSpeciesId) {
    throw new Error("Please choose a plant from the list before saving.");
  }

  const species = await getSpeciesById(careSpeciesId);
  if (!species) throw new Error("That plant species could not be found.");

  // Server Actions are directly POST-able, so every field is validated here,
  // not just in the form (audit B4).
  const potted = formData.get("potted") === "true";
  const hasDrainage = potted ? formData.get("has_drainage") === "on" : null;
  const nickname = textField(formData, "nickname", 60);
  const lightLocation = textField(formData, "light_location", 60);
  const rawAcquired = textField(formData, "acquired_at", 10);
  const acquiredAt = rawAcquired && /^\d{4}-\d{2}-\d{2}$/.test(rawAcquired) ? rawAcquired : null;
  // Only accept a photo URL that points into OUR Storage bucket.
  const rawPhoto = textField(formData, "photo_url", 500);
  const photoUrl = rawPhoto && storagePathFromPublicUrl(rawPhoto) && isOwnStorageUrl(rawPhoto) ? rawPhoto : null;

  // If not potted, or the user left soil blank, fall back to our recommendation.
  const soilInput = textField(formData, "soil_mix", 200) ?? "";
  const soilMix = potted ? soilInput || species.soil_recommendation : species.soil_recommendation;

  const { data, error } = await serverClient()
    .from("plants")
    .insert({
      nickname,
      common_name: species.common_name,
      scientific_name: species.scientific_name,
      illustration_key: species.illustration_key,
      photo_url: photoUrl,
      potted,
      has_drainage: hasDrainage,
      soil_mix: soilMix,
      light_location: lightLocation,
      acquired_at: acquiredAt,
      care_species_id: species.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(`[sprout] createPlant: ${error.message}`);

  // Seeded from today (when it joined Sprout), not acquired_at — we don't
  // know the plant's actual last-watered/rotated/repotted date, so "care
  // starts now" is the honest default rather than guessing backdated tasks.
  await generateCareTasksForPlant(data.id, species);

  revalidatePath("/garden");
  revalidatePath("/");
  redirect(`/plant/${data.id}`);
}

/** Trimmed, length-capped text field; null when empty. */
function textField(formData: FormData, name: string, max: number): string | null {
  const value = String(formData.get(name) ?? "").trim().slice(0, max);
  return value || null;
}

function isOwnStorageUrl(url: string): boolean {
  try {
    return new URL(url).origin === new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return false;
  }
}

const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export interface UploadedPhoto {
  url: string;
  /** Storage object path — needed to delete the object if the flow is abandoned. */
  path: string;
}

/** Uploads a captured/chosen plant photo to Storage, returns its public URL + path. */
export async function uploadPlantPhoto(formData: FormData): Promise<UploadedPhoto> {
  const photo = formData.get("photo");
  if (!(photo instanceof File)) throw new Error("No photo provided.");
  const ext = PHOTO_TYPES[photo.type];
  if (!ext) throw new Error("Unsupported photo type.");
  if (photo.size === 0 || photo.size > MAX_PHOTO_BYTES) throw new Error("Photo is empty or too large.");

  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await serverClient()
    .storage.from("plant-photos")
    .upload(path, photo, { contentType: photo.type, upsert: false });
  if (error) throw new Error(`[sprout] uploadPlantPhoto: ${error.message}`);

  const { data } = serverClient().storage.from("plant-photos").getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/** Best-effort cleanup for a photo uploaded but never attached to a saved plant. */
export async function discardUploadedPhoto(path: string): Promise<void> {
  // Only the flat "<uuid>.<ext>" names uploadPlantPhoto creates — this action
  // is callable directly, so don't let it delete arbitrary bucket paths.
  // (".jpeg" too: uploads before Phase 7 used the raw MIME subtype.)
  if (!path || !/^[0-9a-f-]{36}\.(jpe?g|png|webp|gif)$/i.test(path)) return;
  await serverClient().storage.from("plant-photos").remove([path]);
}

export async function deletePlantAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing plant id.");

  const { data: plant } = await serverClient()
    .from("plants")
    .select("photo_url")
    .eq("id", id)
    .maybeSingle();

  const { error } = await serverClient().from("plants").delete().eq("id", id);
  if (error) throw new Error(`[sprout] deletePlant: ${error.message}`);

  const photoPath = storagePathFromPublicUrl(plant?.photo_url);
  if (photoPath) await discardUploadedPhoto(photoPath);

  revalidatePath("/garden");
  revalidatePath("/");
  redirect("/garden");
}

/** Extracts the `plant-photos` object path from a Supabase public URL, if any. */
function storagePathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = "/plant-photos/";
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

export async function markCareTaskDoneAction(formData: FormData): Promise<void> {
  const taskId = String(formData.get("task_id") ?? "");
  if (!taskId) throw new Error("Missing task id.");

  await markCareTaskDone(taskId);

  revalidatePath("/");
}

/**
 * Records a moisture check on a water task (the two-button "Watered" /
 * "Still moist" flow, and the plant page's off-schedule "Log watering").
 * `status` is validated rather than trusted so a malformed form can't write a
 * junk `last_status`. `redirect_to` lets the plant page bounce back to itself.
 */
export async function recordWaterCheckAction(formData: FormData): Promise<void> {
  const taskId = String(formData.get("task_id") ?? "");
  if (!taskId) throw new Error("Missing task id.");

  const rawStatus = String(formData.get("status") ?? "");
  if (rawStatus !== "watered" && rawStatus !== "moist") {
    throw new Error("Invalid water-check status.");
  }
  const status: WaterCheckStatus = rawStatus;

  await recordWaterCheck(taskId, status);

  revalidatePath("/");
  const redirectTo = String(formData.get("redirect_to") ?? "").trim();
  // Only same-origin app paths — never trust an arbitrary redirect target from
  // a form field (open-redirect guard), even in a single-user app.
  if (redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
    revalidatePath(redirectTo);
    redirect(redirectTo);
  }
}

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateSettingsAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing settings id.");

  const rawMorningTime = String(formData.get("morning_time") ?? "07:00").trim();
  if (!/^\d{2}:\d{2}$/.test(rawMorningTime)) throw new Error("Invalid morning time.");
  // Rounded to the hour — the cron trigger is hourly, so minutes can't be
  // honored; storing the un-rounded value would silently promise precision
  // the app doesn't deliver.
  const morningTime = `${rawMorningTime.split(":")[0]}:00`;

  const timezone = String(formData.get("timezone") ?? "America/Chicago").trim();
  // Validated against the real IANA database (not a hardcoded list) so a
  // pre-existing or not-yet-in-the-dropdown value the <select> round-trips
  // as an extra option still saves correctly instead of being rejected.
  if (!isValidTimezone(timezone)) throw new Error("Invalid timezone.");

  const emailInput = String(formData.get("email") ?? "").trim();
  if (emailInput && !EMAIL_PATTERN.test(emailInput)) throw new Error("Invalid email address.");
  const email = emailInput || null;
  const emailEnabled = formData.get("email_enabled") === "on";

  const rawLanguage = String(formData.get("language") ?? DEFAULT_LOCALE);
  const language: Locale = (LOCALES as string[]).includes(rawLanguage) ? (rawLanguage as Locale) : DEFAULT_LOCALE;

  // push_enabled is intentionally NOT set here. Push is per-device now: a
  // device is "on" iff it has a push_subscriptions row (see L26).
  const { error } = await serverClient()
    .from("settings")
    .update({
      morning_time: morningTime,
      timezone,
      email,
      email_enabled: emailEnabled,
      language,
    })
    .eq("id", id);
  if (error) throw new Error(`[sprout] updateSettings: ${error.message}`);

  // next-intl reads locale from this cookie (i18n/request.ts) — without
  // setting it here, the DB value would save but the UI wouldn't actually
  // switch language until some other request happened to set the cookie.
  (await cookies()).set(LOCALE_COOKIE, language, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  // Revalidate the root layout too, not just /settings — locale/messages are
  // read in app/layout.tsx, a parent of every route, and only revalidating
  // /settings would leave the rest of the app showing the old language until
  // an unrelated cache miss happened to refresh it.
  revalidatePath("/", "layout");
}
