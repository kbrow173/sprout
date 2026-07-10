import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/*
  Untyped Supabase clients + manual casts at call sites. We intentionally do NOT
  pass a hand-written Database generic to createClient — an incomplete generic
  makes `.update()` infer `never` (see MEMORY.md). Cast query results to the
  types in lib/types.ts instead.

  Two clients:
   - browserClient(): anon key, safe for the client (no auth; private URL is the
     security boundary, matching the Wardrobe model).
   - serverClient(): service-role key, server-only (API routes, cron). Never
     import this into a client component.
*/

let _browser: SupabaseClient | null = null;
let _server: SupabaseClient | null = null;

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `[sprout] Missing env var ${name}. Copy .env.local.example to .env.local and fill in your Supabase project values.`
    );
  }
  return value;
}

/** Anon client for use in the browser / client components. */
export function browserClient(): SupabaseClient {
  if (_browser) return _browser;
  const url = required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );
  const anon = required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  _browser = createClient(url, anon, { auth: { persistSession: false } });
  return _browser;
}

/** Service-role client for server-only code (API routes, cron). */
export function serverClient(): SupabaseClient {
  if (_server) return _server;
  const url = required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );
  const service = required(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  _server = createClient(url, service, { auth: { persistSession: false } });
  return _server;
}
