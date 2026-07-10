import { Leaf } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import PlantCard from "@/components/PlantCard";
import { getPlants } from "@/lib/plants";

// Garden contents change every time a plant is added/removed — always fetch
// live rather than serving a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function GardenPage() {
  const plants = await getPlants();

  return (
    <>
      <PageHeader
        eyebrow={plants.length ? `${plants.length} plant${plants.length === 1 ? "" : "s"}` : "Your collection"}
        title="Garden"
      />

      {plants.length === 0 ? (
        <EmptyState
          illustration={<Leaf className="size-11 text-sprout-600" strokeWidth={2} />}
          title="Your garden is empty"
          body="Every jungle starts with one leaf. Snap a photo of a plant and it'll appear here as a cute little card."
          ctaHref="/add"
          ctaLabel="Add a plant"
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
