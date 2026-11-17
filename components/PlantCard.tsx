import Link from "next/link";
import PlantIllustration from "@/components/PlantIllustration";
import type { Plant } from "@/lib/types";

/** Garden grid card. `status` is a short pre-translated line ("Needs you today" / "Next in 3 days"). */
export default function PlantCard({
  plant,
  status,
  due,
  style,
}: {
  plant: Plant;
  status?: string;
  /** Something is due today or overdue — tints the status chip. */
  due?: boolean;
  /** Pass animationDelay for a staggered grid reveal — see GardenPage. */
  style?: React.CSSProperties;
}) {
  return (
    <Link
      href={`/plant/${plant.id}`}
      style={style}
      className="animate-pop group flex flex-col items-center rounded-blob border border-line bg-surface p-4 text-center shadow-soft outline-none transition-transform focus-visible:ring-2 focus-visible:ring-forest-500 active:scale-[0.97]"
    >
      <div className="relative flex size-20 items-center justify-center rounded-full bg-sprout-100 transition-transform group-hover:scale-105">
        <PlantIllustration illustrationKey={plant.illustration_key} size={64} />
        {due ? <span aria-hidden="true" className="absolute top-0.5 right-0.5 size-3.5 rounded-full bg-bloom-500 ring-2 ring-surface" /> : null}
      </div>
      <p className="mt-3 w-full truncate text-sm font-bold text-ink">{plant.nickname || plant.common_name}</p>
      {plant.nickname ? (
        <p className="w-full truncate text-xs text-muted">{plant.common_name}</p>
      ) : (
        <p className="w-full truncate text-xs text-muted italic">{plant.scientific_name}</p>
      )}
      {status ? (
        <p className={`mt-2 rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold ${due ? "bg-bloom-100 text-bloom-600" : "bg-sprout-100 text-forest-700"}`}>
          {status}
        </p>
      ) : null}
    </Link>
  );
}
