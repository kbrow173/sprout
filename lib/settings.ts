import "server-only";
import { cache } from "react";
import { serverClient } from "@/lib/supabase";
import type { Settings } from "@/lib/types";

/**
 * The single settings row. schema.sql guarantees exactly one row exists.
 * Wrapped in React `cache()` so the 2–3 callers in one request (page, care
 * engine, greeting) share one query instead of each hitting Supabase.
 */
export const getSettings = cache(async (): Promise<Settings> => {
  const { data, error } = await serverClient().from("settings").select("*").limit(1).single();
  if (error) throw new Error(`[sprout] getSettings: ${error.message}`);
  return data as Settings;
});
