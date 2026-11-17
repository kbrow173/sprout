import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/PageHeader";
import PlantQuestions from "@/components/PlantQuestions";
import { getPlantWithCare } from "@/lib/plants";
import { updatePlantAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Edit a plant's details (Phase 11). Pot changes re-base its watering prior. */
export default async function EditPlantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();
  const [plant, t] = await Promise.all([getPlantWithCare(id), getTranslations("plant")]);
  if (!plant) notFound();

  return (
    <>
      <Link
        href={`/plant/${plant.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted transition-colors hover:text-forest-700"
      >
        <ChevronLeft className="size-4" strokeWidth={2.4} />
        {plant.nickname || plant.common_name}
      </Link>
      <PageHeader eyebrow={plant.common_name} title={t("editTitle")} />
      <form action={updatePlantAction} className="space-y-6">
        <input type="hidden" name="id" value={plant.id} />
        <PlantQuestions species={plant.species_care} mode="edit" initial={plant} />
      </form>
    </>
  );
}
