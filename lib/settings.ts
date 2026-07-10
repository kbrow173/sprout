import "server-only";
import { serverClient } from "@/lib/supabase";
import type { Settings } from "@/lib/types";

/** The single settings row. schema.sql guarantees exactly one row exists. */
export async function getSettings(): Promise<Settings> {
  const { data, error } = await serverClient().from("settings").select("*").limit(1).single();
  if (error) throw new Error(`[sprout] getSettings: ${error.message}`);
  return data as Settings;
}
