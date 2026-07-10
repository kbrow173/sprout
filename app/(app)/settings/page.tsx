import { Bell, Mail, Clock } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import { getSettings } from "@/lib/settings";
import { updateSettingsAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

const TIMEZONES = [
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Toronto", label: "Eastern (Toronto)" },
  { value: "UTC", label: "UTC" },
];

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <>
      <PageHeader eyebrow="Preferences" title="Settings" />

      <section className="space-y-3">
        <SettingRow
          icon={<Bell className="size-5 text-forest-700" strokeWidth={2} />}
          title="Phone notifications"
          subtitle="A gentle nudge each morning for what's due"
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
            <p className="font-bold text-ink">Email backup</p>
            <input
              type="email"
              name="email"
              defaultValue={settings.email ?? ""}
              placeholder="you@example.com"
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
            <p className="font-bold text-ink">Morning time</p>
            <p className="text-sm text-muted">When your daily reminder arrives</p>
          </div>
          <input
            type="time"
            name="morning_time"
            step={3600}
            defaultValue={settings.morning_time}
            className="rounded-xl border border-line bg-surface px-2 py-1.5 text-sm font-bold text-forest-700 outline-none ring-forest-500 focus:ring-2"
          />
        </div>
        <p className="px-1 text-xs text-faint">
          Notifications are checked hourly, so the minutes above are rounded to the hour.
        </p>

        <div className="rounded-3xl border border-line bg-surface px-4 py-4 shadow-soft">
          <label htmlFor="timezone" className="text-sm font-bold text-forest-800">
            Timezone
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

        <button
          type="submit"
          className="w-full rounded-full bg-forest-700 py-3.5 text-center text-sm font-bold text-white shadow-soft transition-transform active:scale-[0.98]"
        >
          Save
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
