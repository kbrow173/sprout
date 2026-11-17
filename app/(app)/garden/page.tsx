import { Leaf } from "lucide-react";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import PlantCard from "@/components/PlantCard";
import { getPlants } from "@/lib/plants";
import { getNextDueByPlant, localToday } from "@/lib/care";
import { daysBetween } from "@/lib/care-math";

// Garden contents change every time a plant is added/removed — always live.
export const dynamic = "force-dynamic";

export default async function GardenPage() {
  const [plants, nextDue, today, t] = await Promise.all([getPlants(), getNextDueByPlant(), localToday(), getTranslations("garden")]);

  return (
    <>
      <PageHeader eyebrow={plants.length ? t("eyebrowCount", { count: plants.length }) : t("eyebrowEmpty")} title={t("title")} />

      {plants.length === 0 ? (
        <EmptyState
          illustration={<Leaf className="size-11 text-sprout-600" strokeWidth={2} />}
          title={t("emptyTitle")}
          body={t("emptyBody")}
          ctaHref="/add"
          ctaLabel={t("emptyCta")}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {plants.map((plant, i) => {
            const next = nextDue.get(plant.id);
            const days = next ? daysBetween(today, next.next_due_at) : null;
            const status = days == null ? undefined : days <= 0 ? t("statusDue") : t("statusIn", { count: days });
            return (
              <PlantCard
                key={plant.id}
                plant={plant}
                status={status}
                due={days != null && days <= 0}
                style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
