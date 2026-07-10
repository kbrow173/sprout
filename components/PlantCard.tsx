import Link from "next/link";
import PlantIllustration from "@/components/PlantIllustration";
import type { Plant } from "@/lib/types";

export default function PlantCard({ plant }: { plant: Plant }) {
  return (
    <Link
      href={`/plant/${plant.id}`}
      className="animate-pop group flex flex-col items-center rounded-blob border border-line bg-surface p-4 text-center shadow-soft transition-transform active:scale-[0.97]"
    >
      <div className="flex size-20 items-center justify-center rounded-full bg-sprout-100 transition-transform group-hover:scale-105">
        <PlantIllustration illustrationKey={plant.illustration_key} size={64} />
      </div>
      <p className="mt-3 truncate text-sm font-bold text-ink">
        {plant.nickname || plant.common_name}
      </p>
      {plant.nickname ? (
        <p className="truncate text-xs text-muted">{plant.common_name}</p>
      ) : (
        <p className="truncate text-xs text-muted italic">{plant.scientific_name}</p>
      )}
    </Link>
  );
}
