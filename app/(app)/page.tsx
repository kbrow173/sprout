import { Sprout } from "lucide-react";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import ReminderCard from "@/components/ReminderCard";
import { getDueTasks, currentLocalDateAndHour } from "@/lib/care";
import { getSettings } from "@/lib/settings";

// Due tasks change constantly (mark-done, new plants) — always fetch live.
export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const [tasks, settings, t] = await Promise.all([
    getDueTasks(),
    getSettings(),
    getTranslations("today"),
  ]);

  return (
    <>
      <PageHeader eyebrow={greeting(settings.timezone, t)} title={t("title")} />

      {tasks.length === 0 ? (
        <EmptyState
          illustration={<Sprout className="size-11 text-sprout-600" strokeWidth={2} />}
          title={t("emptyTitle")}
          body={t("emptyBody")}
          ctaHref="/add"
          ctaLabel={t("emptyCta")}
        />
      ) : (
        <div className="space-y-2.5">
          {tasks.map((task, i) => (
            <ReminderCard key={task.id} task={task} style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }} />
          ))}
        </div>
      )}
    </>
  );
}

// Local hour (not server-runtime UTC — see LESSONS_LEARNED.md L11) decides
// which of the three greetings to show.
function greeting(timezone: string, t: Awaited<ReturnType<typeof getTranslations>>): string {
  const { hour } = currentLocalDateAndHour(timezone);
  if (hour < 12) return t("greetingMorning");
  if (hour < 18) return t("greetingAfternoon");
  return t("greetingEvening");
}
