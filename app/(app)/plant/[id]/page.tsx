import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Droplets,
  Sun,
  RotateCw,
  Sprout as SproutIcon,
  Flower2,
  Scissors,
  Wheat,
  AlertTriangle,
  ShieldAlert,
  CircleCheck,
  CircleX,
} from "lucide-react";
import PlantIllustration from "@/components/PlantIllustration";
import CareSection from "@/components/CareSection";
import DeleteButton from "@/components/DeleteButton";
import { getPlantWithCare } from "@/lib/plants";
import { deletePlantAction } from "@/lib/actions";

// A plant's care sheet reflects live DB state (e.g. right after adding it).
export const dynamic = "force-dynamic";

const LIGHT_LABEL: Record<string, string> = {
  low: "Low light",
  medium: "Medium, indirect light",
  bright: "Bright, indirect light",
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Easy-going",
  medium: "Moderate care",
  fussy: "A little fussy",
};

export default async function PlantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plant = await getPlantWithCare(id);
  if (!plant) notFound();

  const care = plant.species_care;
  const displayName = plant.nickname || plant.common_name;

  return (
    <>
      <Link
        href="/garden"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted transition-colors hover:text-forest-700"
      >
        <ChevronLeft className="size-4" strokeWidth={2.4} />
        Garden
      </Link>

      {/* Hero */}
      <div className="animate-pop mb-5 flex flex-col items-center rounded-blob border border-line bg-surface px-6 py-8 text-center shadow-soft">
        <div className="flex size-28 items-center justify-center rounded-full bg-sprout-100">
          <PlantIllustration illustrationKey={plant.illustration_key} size={92} />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-forest-800">{displayName}</h1>
        {plant.nickname ? (
          <p className="text-sm text-muted">{plant.common_name}</p>
        ) : null}
        <p className="text-sm text-muted italic">{plant.scientific_name}</p>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Chip>{DIFFICULTY_LABEL[care.difficulty] ?? care.difficulty}</Chip>
          <Chip>{LIGHT_LABEL[care.light] ?? care.light}</Chip>
          {plant.light_location ? <Chip>📍 {plant.light_location}</Chip> : null}
        </div>
      </div>

      {/* Care sheet */}
      <div className="space-y-3">
        <CareSection icon={<Droplets className="size-4 text-sky-500" strokeWidth={2.2} />} title="Watering">
          Every <strong className="text-ink">{care.water_days_summer} days</strong> in the growing
          season (spring/summer), stretching to every{" "}
          <strong className="text-ink">{care.water_days_winter} days</strong> in fall/winter.
        </CareSection>

        <CareSection icon={<Sun className="size-4 text-sun-500" strokeWidth={2.2} />} title="Light">
          {LIGHT_LABEL[care.light] ?? care.light}. Humidity: {care.humidity}
        </CareSection>

        <CareSection icon={<SproutIcon className="size-4 text-forest-700" strokeWidth={2.2} />} title="Soil">
          {plant.soil_mix || care.soil_recommendation}
          {plant.has_drainage === false ? (
            <p className="mt-1.5 flex items-center gap-1.5 font-semibold text-sun-500">
              <AlertTriangle className="size-3.5" strokeWidth={2.4} /> No drainage hole — water
              lightly and watch for sogginess.
            </p>
          ) : null}
        </CareSection>

        <div className="grid grid-cols-2 gap-3">
          <CareSection icon={<RotateCw className="size-4 text-forest-700" strokeWidth={2.2} />} title="Rotate">
            Every ~{care.rotate_days} days for even growth
          </CareSection>
          <CareSection icon={<Flower2 className="size-4 text-forest-700" strokeWidth={2.2} />} title="Repot">
            Roughly every {care.repot_months} months
          </CareSection>
        </div>

        <CareSection icon={<SproutIcon className="size-4 text-forest-700" strokeWidth={2.2} />} title="Propagation">
          {care.propagation}
        </CareSection>

        <CareSection icon={<Scissors className="size-4 text-forest-700" strokeWidth={2.2} />} title="Pruning">
          {care.pruning}
        </CareSection>

        {care.harvesting ? (
          <CareSection icon={<Wheat className="size-4 text-sun-500" strokeWidth={2.2} />} title="Harvesting">
            {care.harvesting}
          </CareSection>
        ) : null}

        <CareSection icon={<ShieldAlert className="size-4 text-bloom-500" strokeWidth={2.2} />} title="Toxicity">
          {care.toxicity}
        </CareSection>

        {care.dos.length ? (
          <CareSection icon={<CircleCheck className="size-4 text-sprout-600" strokeWidth={2.2} />} title="Do">
            <ul className="space-y-1.5">
              {care.dos.map((item) => (
                <li key={item} className="flex gap-2">
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-sprout-600" strokeWidth={2.2} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CareSection>
        ) : null}

        {care.donts.length ? (
          <CareSection icon={<CircleX className="size-4 text-bloom-500" strokeWidth={2.2} />} title="Don't">
            <ul className="space-y-1.5">
              {care.donts.map((item) => (
                <li key={item} className="flex gap-2">
                  <CircleX className="mt-0.5 size-4 shrink-0 text-bloom-500" strokeWidth={2.2} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CareSection>
        ) : null}
      </div>

      <form action={deletePlantAction}>
        <input type="hidden" name="id" value={plant.id} />
        <DeleteButton plantLabel={displayName} />
      </form>
    </>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-sprout-100 px-3 py-1 text-xs font-semibold text-forest-700">
      {children}
    </span>
  );
}
