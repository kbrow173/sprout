import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import type { Locale } from "@/lib/types";

export const LOCALE_COOKIE = "NEXT_LOCALE";
export const LOCALES: Locale[] = ["en", "es", "de", "ko"];
export const DEFAULT_LOCALE: Locale = "en";

/**
 * Cookie-based locale, deliberately with no URL prefix (no /en, /es routes) —
 * this is a single-user PWA, not a multi-market site indexed by search
 * engines, so per-locale URLs buy nothing and would complicate every Link
 * and redirect in the app for no benefit.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = (LOCALES as string[]).includes(raw ?? "") ? (raw as Locale) : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
