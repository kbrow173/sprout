import { Bell, Mail, Clock, Globe } from "lucide-react";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/PageHeader";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import { getSettings } from "@/lib/settings";
import { updateSettingsAction } from "@/lib/actions";
import { LOCALES } from "@/i18n/request";

export const dynamic = "force-dynamic";

const TIMEZONES = [
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Toronto", label: "Eastern (Toronto)" },
  { value: "UTC", label: "UTC" },
];

// Native-language labels — a language picker lists each option in its own
// language (so a Korean speaker can find "한국어" without already reading
// English), not translated into whatever's currently selected.
const LANGUAGE_LABELS: Record<(typeof LOCALES)[number], string> = {
  en: "English",
  es: "Español",
  de: "Deutsch",
  ko: "한국어",
};

export default async function SettingsPage() {
  const settings = await getSettings();
  const t = await getTranslations("settings");

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} />

      <section className="space-y-3">
        <SettingRow
          icon={<Bell className="size-5 text-forest-700" strokeWidth={2} />}
          title={t("pushTitle")}
          subtitle={t("pushSubtitle")}
          trailing={<PushSubscribeButton initialEnabled={settings.push_enabled} />}
        />
      </section>

      <form action={updateSettingsAction} className="mt-3 space-y-3">
        <input type="hidden" name="id" value={settings.id} />

        <label className="flex items-center gap-4 rounded-3xl border border-line bg-surface px-4 py-4 shadow-soft">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sprout-100">
            <Mail className="size-5 text-forest-700" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-ink">{t("emailTitle")}</p>
            <input
              type="email"
              name="email"
              defaultValue={settings.email ?? ""}
              placeholder={t("emailPlaceholder")}
              className="mt-1 w-full rounded-lg border-0 bg-transparent p-0 text-sm text-muted outline-none placeholder:text-faint focus:ring-0"
            />
          </div>
          <input
            type="checkbox"
            name="email_enabled"
            defaultChecked={settings.email_enabled}
            className="peer sr-only"
          />
          <span className="relative h-7 w-12 shrink-0 rounded-full bg-surface-sunken ring-1 ring-line transition-colors peer-checked:bg-forest-700 peer-checked:ring-0">
            <span className="absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-soft transition-transform peer-checked:translate-x-5" />
          </span>
        </label>

        <div className="flex items-center gap-4 rounded-3xl border border-line bg-surface px-4 py-4 shadow-soft">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sprout-100">
            <Clock className="size-5 text-forest-700" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-ink">{t("morningTimeTitle")}</p>
            <p className="text-sm text-muted">{t("morningTimeSubtitle")}</p>
          </div>
          <input
            type="time"
            name="morning_time"
            step={3600}
            defaultValue={settings.morning_time}
            className="rounded-xl border border-line bg-surface px-2 py-1.5 text-sm font-bold text-forest-700 outline-none ring-forest-500 focus:ring-2"
          />
        </div>
        <p className="px-1 text-xs text-faint">{t("morningTimeHelp")}</p>

        <div className="rounded-3xl border border-line bg-surface px-4 py-4 shadow-soft">
          <label htmlFor="timezone" className="text-sm font-bold text-forest-800">
            {t("timezone")}
          </label>
          <select
            id="timezone"
            name="timezone"
            defaultValue={settings.timezone}
            className="mt-2 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm outline-none ring-forest-500 focus:ring-2"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
            {/* Guards against a stored value outside this hardcoded list (a pre-
                existing DB value, or a future zone not yet added here) — without
                this, the browser would silently fall back to the first option
                and the next Save would silently overwrite the real timezone. */}
            {!TIMEZONES.some((tz) => tz.value === settings.timezone) ? (
              <option value={settings.timezone}>{settings.timezone}</option>
            ) : null}
          </select>
        </div>

        <div className="rounded-3xl border border-line bg-surface px-4 py-4 shadow-soft">
          <label htmlFor="language" className="flex items-center gap-2 text-sm font-bold text-forest-800">
            <Globe className="size-4" strokeWidth={2} />
            {t("language")}
          </label>
          <select
            id="language"
            name="language"
            defaultValue={settings.language}
            className="mt-2 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm outline-none ring-forest-500 focus:ring-2"
          >
            {LOCALES.map((locale) => (
              <option key={locale} value={locale}>
                {LANGUAGE_LABELS[locale]}
              </option>
            ))}
            {/* Same guard as timezone above — a stored value outside LOCALES
                (e.g. one gets removed later) would otherwise not match any
                option, silently default to the first one, and get clobbered
                back to that on the next unrelated Save. */}
            {!(LOCALES as readonly string[]).includes(settings.language) ? (
              <option value={settings.language}>{settings.language}</option>
            ) : null}
          </select>
        </div>

        <button
          type="submit"
          className="w-full rounded-full bg-forest-700 py-3.5 text-center text-sm font-bold text-white shadow-soft transition-transform active:scale-[0.98]"
        >
          {t("save")}
        </button>
      </form>
    </>
  );
}

function SettingRow({
  icon,
  title,
  subtitle,
  trailing,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-line bg-surface px-4 py-4 shadow-soft">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sprout-100">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink">{title}</p>
        <p className="truncate text-sm text-muted">{subtitle}</p>
      </div>
      {trailing ?? <div className="h-7 w-12 rounded-full bg-surface-sunken ring-1 ring-line" />}
    </div>
  );
}
