import { CircleCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import Onboarding from "@/components/Onboarding";
import TodayList from "@/components/TodayList";
import { getDueTasks, currentLocalDateAndHour } from "@/lib/care";
import { getPlants } from "@/lib/plants";
import { getSettings } from "@/lib/settings";

// Due tasks change constantly (mark-done, new plants) — always fetch live.
export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const [tasks, plants, settings, t] = await Promise.all([
    getDueTasks(),
    getPlants(),
    getSettings(),
    getTranslations("today"),
  ]);

  // No plants → first-run setup. Plants but nothing due → reassurance.
  // (Conflating these was a user-flagged bug.)
  return (
    <>
      <PageHeader eyebrow={greeting(settings.timezone, t)} title={t("title")} />
      {plants.length === 0 ? (
        <Onboarding />
      ) : tasks.length === 0 ? (
        <EmptyState
          illustration={<CircleCheck className="size-11 text-sprout-600" strokeWidth={2} />}
          title={t("allCaughtUpTitle")}
          body={t("allCaughtUpBody")}
          ctaHref="/garden"
          ctaLabel={t("allCaughtUpCta")}
        />
      ) : (
        <TodayList tasks={tasks} />
      )}
    </>
  );
}

// Local hour (not server-runtime UTC — L11) picks the greeting.
function greeting(timezone: string, t: Awaited<ReturnType<typeof getTranslations>>): string {
  const { hour } = currentLocalDateAndHour(timezone);
  if (hour < 12) return t("greetingMorning");
  if (hour < 18) return t("greetingAfternoon");
  return t("greetingEvening");
}
