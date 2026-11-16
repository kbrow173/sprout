import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, isValidSession } from "@/lib/auth";

/**
 * Guard for every Server Action. proxy.ts already blocks unauthenticated
 * requests, but Next's docs are explicit: Server Functions must check auth
 * themselves — a matcher change can silently drop proxy coverage (L35).
 */
export async function requireSession(): Promise<void> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await isValidSession(value))) throw new Error("Locked — enter your passcode.");
}
