"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  passcodeConfigured,
  safeEqual,
  safeNextPath,
  sessionTokenFor,
} from "@/lib/auth";

export interface LoginState {
  error: string | null;
}

/** Login form action (useActionState). Slow on failure to blunt guessing. */
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const passcode = process.env.APP_PASSCODE;
  const next = safeNextPath(String(formData.get("next") ?? ""));
  if (!passcode) redirect(next);

  const attempt = String(formData.get("passcode") ?? "");
  if (!attempt || !safeEqual(attempt, passcode)) {
    await new Promise((r) => setTimeout(r, 800));
    return { error: "wrong" };
  }

  (await cookies()).set(SESSION_COOKIE, await sessionTokenFor(passcode), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect(next);
}

/** "Lock this device" in Settings. */
export async function logoutAction(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect(passcodeConfigured() ? "/login" : "/");
}
