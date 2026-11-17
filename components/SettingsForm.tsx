"use client";

import { useActionState, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Check, Clock, Globe, Leaf, LocateFixed, Mail } from "lucide-react";
import { updateSettingsAction, type SettingsState } from "@/lib/actions";
import type { Settings } from "@/lib/types";

// Native-language labels: a picker lists each language in its own language.
const LANGUAGE_LABELS: Record<string, string> = { en: "English", es: "Español", de: "Deutsch", ko: "한국어" };

/**
 * Settings form (Phase 11). useActionState gives real "Saved" / error
 * feedback instead of a silent reload. Morning time is an HOUR select —
 * iOS ignores <input type=time step=3600>, and the cron is hourly anyway.
 */
export default function SettingsForm({
  settings,
  timezones,
  locales,
}: {
  settings: Pick<Settings, "id" | "email" | "email_enabled" | "morning_time" | "timezone" | "language" | "hemisphere">;
  timezones: string[];
  locales: readonly string[];
}) {
  const t = useTranslations("settings");
  const format = useFormatter();
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateSettingsAction, { status: "idle" });
  const [tz, setTz] = useState(settings.timezone);
  const tzRef = useRef<HTMLSelectElement>(null);
  const hour = Number(settings.morning_time.split(":")[0]);

  // Keep a stored value selectable even if it's not in the list (L20).
  const tzOptions = timezones.includes(tz) ? timezones : [tz, ...timezones];
  const langOptions = locales.includes(settings.language) ? locales : [settings.language, ...locales];

  function detectTimezone() {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected) setTz(detected);
    tzRef.current?.focus();
  }

  const card = "rounded-3xl border border-line bg-surface px-4 py-4 shadow-soft";
  const select =
    "mt-2 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-base outline-none ring-forest-500 focus:ring-2";

  return (
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="id" value={settings.id} />

      <div className={`${card} flex items-center gap-4`}>
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sprout-100">
          <Mail className="size-5 text-forest-700" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor="email" className="font-bold text-ink">
            {t("emailTitle")}
          </label>
          <input
            id="email"
            type="email"
            name="email"
            maxLength={254}
            defaultValue={settings.email ?? ""}
            placeholder={t("emailPlaceholder")}
            className="mt-1 w-full rounded-lg border-0 bg-transparent p-0 text-base text-muted outline-none placeholder:text-faint focus:ring-0"
          />
        </div>
        <label className="relative shrink-0 cursor-pointer">
          <span className="sr-only">{t("emailToggle")}</span>
          <input type="checkbox" name="email_enabled" defaultChecked={settings.email_enabled} className="peer sr-only" />
          <span className="block h-7 w-12 rounded-full bg-surface-sunken ring-1 ring-line transition-colors peer-checked:bg-forest-700 peer-checked:ring-0 peer-focus-visible:ring-2 peer-focus-visible:ring-forest-500 peer-focus-visible:ring-offset-2" />
          <span className="absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-soft transition-transform peer-checked:translate-x-5" />
        </label>
      </div>

      <div className={card}>
        <label htmlFor="morning_hour" className="flex items-center gap-2 text-sm font-bold text-forest-800">
          <Clock className="size-4" strokeWidth={2} />
          {t("morningTimeTitle")}
        </label>
        <p className="mt-0.5 text-sm text-muted">{t("morningTimeSubtitle")}</p>
        <select id="morning_hour" name="morning_hour" defaultValue={String(hour)} className={select}>
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>
              {format.dateTime(new Date(Date.UTC(2026, 0, 1, h)), { hour: "numeric", minute: "2-digit", timeZone: "UTC" })}
            </option>
          ))}
        </select>
      </div>

      <div className={card}>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="timezone" className="text-sm font-bold text-forest-800">
            {t("timezone")}
          </label>
          <button
            type="button"
            onClick={detectTimezone}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-forest-700 outline-none hover:bg-sprout-100 focus-visible:ring-2 focus-visible:ring-forest-500"
          >
            <LocateFixed className="size-3.5" strokeWidth={2.4} />
            {t("detectTimezone")}
          </button>
        </div>
        <select id="timezone" name="timezone" ref={tzRef} value={tz} onChange={(e) => setTz(e.target.value)} className={select}>
          {tzOptions.map((z) => (
            <option key={z} value={z}>
              {z.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className={card}>
        <label htmlFor="hemisphere" className="flex items-center gap-2 text-sm font-bold text-forest-800">
          <Leaf className="size-4" strokeWidth={2} />
          {t("hemisphere")}
        </label>
        <p className="mt-0.5 text-sm text-muted">{t("hemisphereHelp")}</p>
        <select id="hemisphere" name="hemisphere" defaultValue={settings.hemisphere ?? "north"} className={select}>
          <option value="north">{t("hemisphereNorth")}</option>
          <option value="south">{t("hemisphereSouth")}</option>
        </select>
      </div>

      <div className={card}>
        <label htmlFor="language" className="flex items-center gap-2 text-sm font-bold text-forest-800">
          <Globe className="size-4" strokeWidth={2} />
          {t("language")}
        </label>
        <select id="language" name="language" defaultValue={settings.language} className={select}>
          {langOptions.map((l) => (
            <option key={l} value={l}>
              {LANGUAGE_LABELS[l] ?? l}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="w-full rounded-full bg-forest-700 py-3.5 text-center text-sm font-bold text-white shadow-soft outline-none transition-transform focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? t("saving") : t("save")}
      </button>
      <p role="status" aria-live="polite" className="min-h-5 text-center text-sm font-semibold">
        {state.status === "saved" ? (
          <span key={state.at} className="animate-pop inline-flex items-center gap-1 text-forest-700">
            <Check className="size-4" strokeWidth={2.6} />
            {t("saved")}
          </span>
        ) : state.status === "error" ? (
          <span className="text-bloom-600">{t(`error_${state.error ?? "saveFailed"}`)}</span>
        ) : null}
      </p>
    </form>
  );
}
