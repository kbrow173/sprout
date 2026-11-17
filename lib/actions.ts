"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { serverClient } from "@/lib/supabase";
import { requireSession } from "@/lib/auth-server";
import { getSpeciesById } from "@/lib/species";
import { applyTaskAction, generateCareTasksForPlant, rebaseWaterPrior, recordWaterCheck, rescheduleSeasonalTasks, undoCareEvent } from "@/lib/care";
import { getSettings } from "@/lib/settings";
import { wateringPrior, type TaskAction } from "@/lib/care-math";
import { LOCALE_COOKIE, LOCALES, DEFAULT_LOCALE } from "@/i18n/request";
import type { Hemisphere, Locale, PotMaterial, PotSize, WaterCheckStatus } from "@/lib/types";

/*
  Every exported function here is a public POST endpoint (Server Action), so
  each one checks the session (L35) and validates every field itself (B4).
*/

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POT_MATERIALS: PotMaterial[] = ["plastic", "terracotta", "ceramic", "fabric"];
const POT_SIZES: PotSize[] = ["small", "medium", "large"];

/** Trimmed, length-capped text field; null when empty. */
function textField(formData: FormData, name: string, max: number): string | null {
  const value = String(formData.get(name) ?? "").trim().slice(0, max);
  return value || null;
}

function enumField<T extends string>(formData: FormData, name: string, allowed: readonly T[]): T | null {
  const value = String(formData.get(name) ?? "");
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function dateField(formData: FormData, name: string): string | null {
  const raw = textField(formData, name, 10);
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function requireUuid(value: unknown, what: string): string {
  const s = String(value ?? "");
  if (!UUID.test(s)) throw new Error(`Invalid ${what}.`);
  return s;
}

function isOwnStorageUrl(url: string): boolean {
  try {
    return new URL(url).origin === new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return false;
  }
}

/** Pot answers shared by create + edit. Not potted → no pot details. */
function potFields(formData: FormData) {
  const potted = formData.get("potted") === "true";
  return {
    potted,
    has_drainage: potted ? formData.get("has_drainage") === "on" : null,
    pot_material: potted ? enumField(formData, "pot_material", POT_MATERIALS) : null,
    pot_size: potted ? enumField(formData, "pot_size", POT_SIZES) : null,
    light_location: textField(formData, "light_location", 60),
  };
}

/**
 * Saves a new plant. Denormalizes common_name/scientific_name/illustration_key
 * so a plant keeps its identity even if the species record changes.
 */
export async function createPlantAction(formData: FormData): Promise<void> {
  await requireSession();
  const species = await getSpeciesById(requireUuid(formData.get("care_species_id"), "plant species"));
  if (!species) throw new Error("That plant species could not be found.");

  const pot = potFields(formData);
  const rawPhoto = textField(formData, "photo_url", 500);
  const photoUrl = rawPhoto && storagePathFromPublicUrl(rawPhoto) && isOwnStorageUrl(rawPhoto) ? rawPhoto : null;
  const soilInput = textField(formData, "soil_mix", 200) ?? "";

  const { data, error } = await serverClient()
    .from("plants")
    .insert({
      nickname: textField(formData, "nickname", 60),
      common_name: species.common_name,
      scientific_name: species.scientific_name,
      illustration_key: species.illustration_key,
      photo_url: photoUrl,
      ...pot,
      soil_mix: pot.potted ? soilInput || species.soil_recommendation : species.soil_recommendation,
      acquired_at: dateField(formData, "acquired_at"),
      care_species_id: species.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(`[sprout] createPlant: ${error.message}`);

  // Seeded from today, not acquired_at — we don't know the real last-watered
  // date, so "care starts now" is the honest default. Water starts from the
  // pot-based prior (L36).
  await generateCareTasksForPlant({ id: data.id as string, ...pot }, species);

  revalidatePath("/garden");
  revalidatePath("/");
  redirect(`/plant/${data.id}`);
}

/** Edit form on the plant page. Pot changes re-base the watering prior. */
export async function updatePlantAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = requireUuid(formData.get("id"), "plant id");

  const { data: before, error: readError } = await serverClient()
    .from("plants")
    .select("potted, has_drainage, light_location, pot_material, pot_size")
    .eq("id", id)
    .maybeSingle();
  if (readError) throw new Error(`[sprout] updatePlant: ${readError.message}`);
  if (!before) redirect("/garden");

  const pot = potFields(formData);
  const { error } = await serverClient()
    .from("plants")
    .update({
      nickname: textField(formData, "nickname", 60),
      notes: textField(formData, "notes", 1000),
      acquired_at: dateField(formData, "acquired_at"),
      // Not potted → the soil input isn't rendered; keep what's stored (L39).
      ...(pot.potted ? { soil_mix: textField(formData, "soil_mix", 200) } : {}),
      ...pot,
    })
    .eq("id", id);
  if (error) throw new Error(`[sprout] updatePlant: ${error.message}`);

  await rebaseWaterPrior(id, wateringPrior(before as Parameters<typeof wateringPrior>[0]), wateringPrior(pot));

  revalidatePath(`/plant/${id}`);
  revalidatePath("/garden");
  revalidatePath("/");
  redirect(`/plant/${id}`);
}

export interface UploadedPhoto {
  url: string;
  /** Storage object path — needed to delete the object if the flow is abandoned. */
  path: string;
}

const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

/** Uploads a captured/chosen plant photo to Storage, returns its public URL + path. */
export async function uploadPlantPhoto(formData: FormData): Promise<UploadedPhoto> {
  await requireSession();
  const photo = formData.get("photo");
  if (!(photo instanceof File)) throw new Error("No photo provided.");
  const ext = PHOTO_TYPES[photo.type];
  if (!ext) throw new Error("Unsupported photo type.");
  if (photo.size === 0 || photo.size > MAX_PHOTO_BYTES) throw new Error("Photo is empty or too large.");

  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await serverClient().storage.from("plant-photos").upload(path, photo, { contentType: photo.type, upsert: false });
  if (error) throw new Error(`[sprout] uploadPlantPhoto: ${error.message}`);

  const { data } = serverClient().storage.from("plant-photos").getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/** Best-effort cleanup for a photo uploaded but never attached to a saved plant. */
export async function discardUploadedPhoto(path: string): Promise<void> {
  await requireSession();
  // Only the flat "<uuid>.<ext>" names uploadPlantPhoto creates (".jpeg" too:
  // uploads before Phase 7 used the raw MIME subtype).
  if (!path || !/^[0-9a-f-]{36}\.(jpe?g|png|webp|gif)$/i.test(path)) return;
  await serverClient().storage.from("plant-photos").remove([path]);
}

export async function deletePlantAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = requireUuid(formData.get("id"), "plant id");

  const { data: plant } = await serverClient().from("plants").select("photo_url").eq("id", id).maybeSingle();
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

const TASK_ACTIONS: TaskAction[] = ["done", "skip", "snooze", "roots_ok"];

/**
 * Today-card action: done / skip / snooze / roots_ok. Returns the logged
 * event id so the card can offer Undo (L36), or null if nothing changed.
 */
export async function performTaskAction(taskId: string, action: TaskAction): Promise<string | null> {
  await requireSession();
  if (!TASK_ACTIONS.includes(action)) throw new Error("Invalid action.");
  const eventId = await applyTaskAction(requireUuid(taskId, "task id"), action);
  revalidatePath("/");
  revalidatePath("/garden");
  return eventId;
}

/** Today-card water check ("Watered" / "Still moist"). Returns event id for Undo. */
export async function performWaterCheck(taskId: string, status: WaterCheckStatus): Promise<string | null> {
  await requireSession();
  if (status !== "watered" && status !== "moist") throw new Error("Invalid water-check status.");
  const eventId = await recordWaterCheck(requireUuid(taskId, "task id"), status);
  revalidatePath("/");
  revalidatePath("/garden");
  return eventId;
}

/** Undo the most recent action on a task (L36). */
export async function undoAction(eventId: string): Promise<boolean> {
  await requireSession();
  const ok = await undoCareEvent(requireUuid(eventId, "event id"));
  revalidatePath("/");
  revalidatePath("/garden");
  return ok;
}

/**
 * Form version for the plant page ("I watered it just now"), which is a
 * server component. Same-origin `redirect_to` only (open-redirect guard).
 */
export async function recordWaterCheckAction(formData: FormData): Promise<void> {
  await requireSession();
  const status = String(formData.get("status") ?? "");
  if (status !== "watered" && status !== "moist") throw new Error("Invalid water-check status.");
  await recordWaterCheck(requireUuid(formData.get("task_id"), "task id"), status);

  revalidatePath("/");
  const redirectTo = String(formData.get("redirect_to") ?? "").trim();
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

export interface SettingsState {
  status: "idle" | "saved" | "error";
  /** Message key in the `settings` namespace. */
  error?: "invalidTime" | "invalidTimezone" | "invalidEmail" | "saveFailed";
  /** Bumps on every save so the "Saved" note re-animates. */
  at?: number;
}

/** Settings form (useActionState) — returns Saved/error instead of throwing. */
export async function updateSettingsAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireSession();
  const id = requireUuid(formData.get("id"), "settings id");

  // Hour select ("7") or legacy time input ("07:30") — either way, rounded to
  // the hour: the cron runs hourly, so minutes can't be honored.
  const rawHour = String(formData.get("morning_hour") ?? formData.get("morning_time") ?? "7").split(":")[0];
  const hour = Number(rawHour);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return { status: "error", error: "invalidTime" };
  const morningTime = `${String(hour).padStart(2, "0")}:00`;

  const timezone = String(formData.get("timezone") ?? "America/Chicago").trim();
  if (!isValidTimezone(timezone)) return { status: "error", error: "invalidTimezone" };

  const emailInput = String(formData.get("email") ?? "").trim();
  if (emailInput && (emailInput.length > 254 || !EMAIL_PATTERN.test(emailInput))) {
    return { status: "error", error: "invalidEmail" };
  }

  const rawLanguage = String(formData.get("language") ?? DEFAULT_LOCALE);
  const language: Locale = (LOCALES as string[]).includes(rawLanguage) ? (rawLanguage as Locale) : DEFAULT_LOCALE;
  const hemisphere: Hemisphere = formData.get("hemisphere") === "south" ? "south" : "north";
  const previousHemisphere = (await getSettings()).hemisphere ?? "north";

  // push_enabled is intentionally NOT set — push is per-device (L26).
  const { error } = await serverClient()
    .from("settings")
    .update({
      morning_time: morningTime,
      timezone,
      email: emailInput || null,
      email_enabled: formData.get("email_enabled") === "on",
      language,
      hemisphere,
    })
    .eq("id", id);
  if (error) {
    console.error("[sprout] updateSettings:", error.message);
    return { status: "error", error: "saveFailed" };
  }
  if (hemisphere !== previousHemisphere) await rescheduleSeasonalTasks(hemisphere);

  // next-intl reads locale from this cookie; revalidate the root layout so
  // the whole app switches language immediately.
  (await cookies()).set(LOCALE_COOKIE, language, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
  return { status: "saved", at: Date.now() };
}
