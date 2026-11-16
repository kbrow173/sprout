import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/*
  Untyped Supabase client + manual casts at call sites. We intentionally do NOT
  pass a hand-written Database generic to createClient — an incomplete generic
  makes `.update()` infer `never` (L2). Cast results to lib/types.ts instead.

  ONE client: service-role, server-only. It bypasses RLS, which is enabled
  with no policies (migration_007) so the public anon key can't touch data.
  There used to be an anon browserClient() too — never used, removed (L31).
  `server-only` makes an accidental client-component import a build error.
*/

let _server: SupabaseClient | null = null;

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `[sprout] Missing env var ${name}. Copy .env.local.example to .env.local and fill in your Supabase project values.`
    );
  }
  return value;
}

/** Service-role client for server-only code (actions, API routes, cron). */
export function serverClient(): SupabaseClient {
  if (_server) return _server;
  const url = required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const service = required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  _server = createClient(url, service, { auth: { persistSession: false } });
  return _server;
}
