/**
 * Passcode gate (Phase 8). Single-user app, so no accounts: one passcode in
 * the APP_PASSCODE env var. A device that enters it gets a long-lived
 * httpOnly cookie holding HMAC(passcode) — so changing the passcode in Vercel
 * instantly logs every device out.
 *
 * Unset APP_PASSCODE → gate OFF (the app keeps working before it's
 * configured). Set it in Vercel → Settings → Environment Variables.
 *
 * Pure Web Crypto, no Node-only APIs, so it runs in proxy.ts and server code.
 * See LESSONS_LEARNED.md L35.
 */

export const SESSION_COOKIE = "sprout_session";
/** Browsers cap cookie lifetime at ~400 days. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 400;

export function passcodeConfigured(): boolean {
  return Boolean(process.env.APP_PASSCODE);
}

export async function sessionTokenFor(passcode: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(passcode), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("sprout-session-v1"));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string compare (no early exit on the first differing char). */
export function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** True if the gate is off, or the cookie value is a valid session. */
export async function isValidSession(cookieValue: string | undefined): Promise<boolean> {
  const passcode = process.env.APP_PASSCODE;
  if (!passcode) return true;
  if (!cookieValue) return false;
  return safeEqual(cookieValue, await sessionTokenFor(passcode));
}

/** Reads the session cookie straight off a Request (route handlers). */
export async function requestHasSession(request: Request): Promise<boolean> {
  const header = request.headers.get("cookie") ?? "";
  const match = header.split(/;\s*/).find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  return isValidSession(match ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)) : undefined);
}

export function unauthorizedResponse(): Response {
  return Response.json({ error: "Locked — enter your passcode." }, { status: 401 });
}

/** Only same-origin app paths — never an open redirect. */
export function safeNextPath(raw: string | null | undefined): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/login") ? raw : "/";
}
