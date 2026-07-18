import { Leaf } from "lucide-react";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import PlantCard from "@/components/PlantCard";
import { getPlants } from "@/lib/plants";

// Garden contents change every time a plant is added/removed — always fetch
// live rather than serving a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function GardenPage() {
  const [plants, t] = await Promise.all([getPlants(), getTranslations("garden")]);

  return (
    <>
      <PageHeader
        eyebrow={plants.length ? t("eyebrowCount", { count: plants.length }) : t("eyebrowEmpty")}
        title={t("title")}
      />

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
          {plants.map((plant) => (
            <PlantCard key={plant.id} plant={plant} />
          ))}
        </div>
      )}
    </>
  );
}
