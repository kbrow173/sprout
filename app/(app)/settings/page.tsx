import { Bell, Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/PageHeader";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import SettingsForm from "@/components/SettingsForm";
import { getSettings } from "@/lib/settings";
import { passcodeConfigured } from "@/lib/auth";
import { logoutAction } from "@/lib/auth-actions";
import { LOCALES } from "@/i18n/request";

export const dynamic = "force-dynamic";

// Full IANA list (was 6 hardcoded zones). Falls back if the runtime lacks it.
function allTimezones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["America/Chicago", "America/New_York", "America/Denver", "America/Los_Angeles", "UTC"];
  }
}

export default async function SettingsPage() {
  const [settings, t] = await Promise.all([getSettings(), getTranslations("settings")]);

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} />

      <section className="flex items-center gap-4 rounded-3xl border border-line bg-surface px-4 py-4 shadow-soft">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sprout-100">
          <Bell className="size-5 text-forest-700" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink">{t("pushTitle")}</p>
          <p className="text-sm text-muted">{t("pushSubtitle")}</p>
        </div>
        <PushSubscribeButton />
      </section>

      <SettingsForm settings={settings} timezones={allTimezones()} locales={LOCALES} />

      {passcodeConfigured() ? (
        <form action={logoutAction} className="mt-2">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-muted transition-colors hover:bg-surface-sunken"
          >
            <Lock className="size-4" strokeWidth={2.2} />
            {t("lock")}
          </button>
        </form>
      ) : null}
    </>
  );
}
