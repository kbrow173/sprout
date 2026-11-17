import "server-only";
import { createTranslator } from "next-intl";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/request";
import type { Locale } from "@/lib/types";

/**
 * Translator for code that runs outside a request's React tree — the
 * morning cron's push + email. The locale comes from settings.language
 * (there's no cookie in a GitHub Actions request).
 */
export async function serverTranslator(locale: string | null | undefined, namespace: string) {
  const loc: Locale = (LOCALES as string[]).includes(locale ?? "") ? (locale as Locale) : DEFAULT_LOCALE;
  const messages = (await import(`../messages/${loc}.json`)).default;
  return createTranslator({ locale: loc, messages, namespace });
}

/** Public base URL for links in emails. */
export function appBaseUrl(): string | null {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return null;
}
