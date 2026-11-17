import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import {
  AlertTriangle,
  ChevronLeft,
  CircleCheck,
  CircleX,
  Droplets,
  FlaskConical,
  Flower2,
  History,
  NotebookPen,
  Pencil,
  RotateCw,
  Scissors,
  ShieldAlert,
  Sprout as SproutIcon,
  Sun,
  Wheat,
} from "lucide-react";
import PlantIllustration from "@/components/PlantIllustration";
import CareSection from "@/components/CareSection";
import DeleteButton from "@/components/DeleteButton";
import PendingSubmit from "@/components/PendingSubmit";
import { getPlantWithCare } from "@/lib/plants";
import { expectedWaterIntervalDays, getCareHistory, getTasksForPlant, localToday } from "@/lib/care";
import { daysBetween, fertilizeStrength } from "@/lib/care-math";
import { getLocalizedSpeciesCare } from "@/lib/translations";
import { getSettings } from "@/lib/settings";
import { deletePlantAction, recordWaterCheckAction } from "@/lib/actions";
import type { Locale, SpeciesCare } from "@/lib/types";

// A plant's care sheet reflects live DB state (e.g. right after adding it).
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PlantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Not a UUID → 404 directly, rather than a Postgres cast error → crash page.
  if (!UUID_PATTERN.test(id)) notFound();

  const [plant, tasks, history, today, settings, locale, t, tt, format] = await Promise.all([
    getPlantWithCare(id),
    getTasksForPlant(id),
    getCareHistory(id),
    localToday(),
    getSettings(),
    getLocale(),
    getTranslations("plant"),
    getTranslations("tasks"),
    getFormatter(),
  ]);
  if (!plant) notFound();

  // Free-text care fields in the UI language (cached Claude translation —
  // lib/translations.ts). Never let a translation failure break the page.
  let care: SpeciesCare = plant.species_care;
  try {
    care = await getLocalizedSpeciesCare(plant.species_care, locale as Locale);
  } catch (err) {
    console.error("[sprout] care translation failed, showing English:", err);
  }

  const displayName = plant.nickname || plant.common_name;
  const waterTask = tasks.find((x) => x.type === "water") ?? null;
  const expectedDays = waterTask ? await expectedWaterIntervalDays(care, waterTask.adjust_factor) : care.water_days_summer;
  const b = (chunks: React.ReactNode) => <strong className="text-ink">{chunks}</strong>;
  const when = (ymd: string) => {
    const d = daysBetween(today, ymd);
    return d < 0 ? t("dueOverdue") : d === 0 ? t("dueToday") : t("dueIn", { count: d });
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/garden" className="inline-flex items-center gap-1 text-sm font-semibold text-muted transition-colors hover:text-forest-700">
          <ChevronLeft className="size-4" strokeWidth={2.4} />
          {t("back")}
        </Link>
        <Link
          href={`/plant/${plant.id}/edit`}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-sm font-bold text-forest-700 shadow-soft ring-1 ring-line"
        >
          <Pencil className="size-3.5" strokeWidth={2.4} />
          {t("edit")}
        </Link>
      </div>

      {/* Hero */}
      <div className="animate-pop mb-5 flex flex-col items-center rounded-blob border border-line bg-surface px-6 py-8 text-center shadow-soft">
        <div className="flex size-28 items-center justify-center rounded-full bg-sprout-100">
          <PlantIllustration illustrationKey={plant.illustration_key} size={92} />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-forest-800">{displayName}</h1>
        {plant.nickname ? <p className="text-sm text-muted">{care.common_name}</p> : null}
        <p className="text-sm text-muted italic">{plant.scientific_name}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Chip>{t(`difficulty_${care.difficulty}`)}</Chip>
          <Chip>{t(`light_${care.light}`)}</Chip>
          {plant.light_location ? <Chip>📍 {plant.light_location}</Chip> : null}
        </div>
      </div>

      <div className="space-y-3">
        {/* Coming up */}
        {tasks.length ? (
          <CareSection icon={<CircleCheck className="size-4 text-forest-700" strokeWidth={2.2} />} title={t("comingUp")}>
            <ul className="space-y-1.5">
              {tasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3">
                  <span>{task.type === "water" ? t("checkSoil") : task.type === "repot" ? t("checkRoots") : tt(task.type)}</span>
                  <span className={`text-xs font-semibold ${task.next_due_at < today ? "text-bloom-600" : "text-muted"}`}>
                    {when(task.next_due_at)}
                  </span>
                </li>
              ))}
            </ul>
          </CareSection>
        ) : null}

        <CareSection icon={<Droplets className="size-4 text-sky-500" strokeWidth={2.2} />} title={t("sectionWatering")}>
          <p>{t.rich("waterCheckFirst", { b })}</p>
          <p className="mt-1.5">
            {t.rich("waterExpects", { b, name: displayName, days: expectedDays })}
            {waterTask?.last_status === "moist" ? <span className="text-forest-700"> {t("waterLearning")}</span> : null}
          </p>
          <p className="mt-1 text-xs text-muted">{t("waterSpeciesGuide", { summer: care.water_days_summer, winter: care.water_days_winter })}</p>
          <div className="mt-3 space-y-1.5 rounded-2xl bg-sprout-100/70 px-3 py-2.5 text-xs leading-relaxed text-ink">
            <p className="font-bold text-forest-800">{t("howToCheck")}</p>
            <p>{t.rich("howFinger", { b })}</p>
            <p>{t.rich("howChopstick", { b })}</p>
            <p>{t.rich("howLift", { b })}</p>
          </div>
          {waterTask ? (
            <form action={recordWaterCheckAction} className="mt-3">
              <input type="hidden" name="task_id" value={waterTask.id} />
              <input type="hidden" name="status" value="watered" />
              <input type="hidden" name="redirect_to" value={`/plant/${plant.id}`} />
              <PendingSubmit className="flex w-full items-center justify-center gap-1.5 rounded-full bg-forest-700 px-3 py-2 text-sm font-bold text-white shadow-soft transition-transform active:scale-95">
                <Droplets className="size-4" strokeWidth={2.6} /> {t("wateredNow")}
              </PendingSubmit>
            </form>
          ) : null}
        </CareSection>

        {care.fertilize_days ? (
          <CareSection icon={<FlaskConical className="size-4 text-forest-700" strokeWidth={2.2} />} title={t("sectionFertilize")}>
            {t.rich("fertilizeBody", {
              b,
              days: care.fertilize_days,
              strength: t(fertilizeStrength(plant.illustration_key) === "quarter" ? "strengthQuarter" : "strengthHalf"),
            })}
            <p className="mt-1 text-xs text-muted">{t(settings.hemisphere === "south" ? "fertilizeSeasonSouth" : "fertilizeSeasonNorth")}</p>
          </CareSection>
        ) : null}

        <CareSection icon={<Sun className="size-4 text-sun-500" strokeWidth={2.2} />} title={t("sectionLight")}>
          {t("lightBody", { light: t(`light_${care.light}`), humidity: care.humidity })}
        </CareSection>

        <CareSection icon={<SproutIcon className="size-4 text-forest-700" strokeWidth={2.2} />} title={t("sectionSoil")}>
          {plant.soil_mix || care.soil_recommendation}
          {plant.potted && plant.has_drainage === false ? (
            <p className="mt-1.5 flex items-center gap-1.5 font-semibold text-sun-700">
              <AlertTriangle className="size-3.5 shrink-0" strokeWidth={2.4} /> {t("noDrainageWarning")}
            </p>
          ) : null}
        </CareSection>

        <div className="grid grid-cols-2 gap-3">
          <CareSection icon={<RotateCw className="size-4 text-forest-700" strokeWidth={2.2} />} title={t("sectionRotate")}>
            {t("rotateBody", { days: care.rotate_days })}
          </CareSection>
          <CareSection icon={<Flower2 className="size-4 text-forest-700" strokeWidth={2.2} />} title={t("sectionRepot")}>
            {t("repotBody", { months: care.repot_months })}
          </CareSection>
        </div>

        <CareSection icon={<SproutIcon className="size-4 text-forest-700" strokeWidth={2.2} />} title={t("sectionPropagation")}>
          {care.propagation}
        </CareSection>

        <CareSection icon={<Scissors className="size-4 text-forest-700" strokeWidth={2.2} />} title={t("sectionPruning")}>
          {care.pruning}
        </CareSection>

        {care.harvesting ? (
          <CareSection icon={<Wheat className="size-4 text-sun-500" strokeWidth={2.2} />} title={t("sectionHarvesting")}>
            {care.harvesting}
          </CareSection>
        ) : null}

        <CareSection icon={<ShieldAlert className="size-4 text-bloom-500" strokeWidth={2.2} />} title={t("sectionToxicity")}>
          {care.toxicity}
        </CareSection>

        {care.dos.length ? (
          <CareSection icon={<CircleCheck className="size-4 text-sprout-600" strokeWidth={2.2} />} title={t("sectionDo")}>
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
          <CareSection icon={<CircleX className="size-4 text-bloom-500" strokeWidth={2.2} />} title={t("sectionDont")}>
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

        {plant.notes ? (
          <CareSection icon={<NotebookPen className="size-4 text-forest-700" strokeWidth={2.2} />} title={t("sectionNotes")}>
            <p className="whitespace-pre-line">{plant.notes}</p>
          </CareSection>
        ) : null}

        <CareSection icon={<History className="size-4 text-forest-700" strokeWidth={2.2} />} title={t("sectionHistory")}>
          {history.length ? (
            <ul className="space-y-1.5">
              {history.map((ev) => (
                <li key={ev.id} className="flex items-center justify-between gap-3">
                  <span>{t(`history_${ev.action}`, { task: tt(ev.task_type) })}</span>
                  <time dateTime={ev.at} className="shrink-0 text-xs text-muted">
                    {format.dateTime(new Date(ev.at), { month: "short", day: "numeric", timeZone: settings.timezone })}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">{t("historyEmpty")}</p>
          )}
        </CareSection>
      </div>

      <form action={deletePlantAction}>
        <input type="hidden" name="id" value={plant.id} />
        <DeleteButton plantLabel={displayName} />
      </form>
    </>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-sprout-100 px-3 py-1 text-xs font-semibold text-forest-700">{children}</span>;
}
