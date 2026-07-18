"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import {
  Check,
  Droplet,
  Hand,
  Info,
  Package,
  RotateCw,
  Scale,
  Scissors,
  Utensils,
} from "lucide-react";
import PlantIllustration from "@/components/PlantIllustration";
import { markCareTaskDoneAction, recordWaterCheckAction } from "@/lib/actions";
import type { DueTask } from "@/lib/care";
import type { CareTaskType } from "@/lib/types";

const TASK_ICON: Record<CareTaskType, typeof Droplet> = {
  water: Droplet,
  rotate: RotateCw,
  repot: Package,
  harvest: Scissors,
  prune: Scissors,
};

/** A single due-today (or overdue) care task. Water tasks are moisture checks
 *  (two-button feedback + an expandable how-to-check guide); every other type
 *  keeps the plain one-tap mark-done. */
export default function ReminderCard({
  task,
  style,
}: {
  task: DueTask;
  /** Pass animationDelay for a staggered list reveal — see TodayPage. */
  style?: React.CSSProperties;
}) {
  const t = useTranslations("reminderCard");
  const Icon = TASK_ICON[task.type];

  const header = (
    <Link href={`/plant/${task.plant.id}`} className="flex min-w-0 flex-1 items-center gap-3">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sprout-100">
        <PlantIllustration illustrationKey={task.plant.illustration_key} size={36} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">
          {task.plant.nickname || task.plant.common_name}
        </p>
        <p
          className={`flex items-center gap-1 text-xs font-semibold ${
            task.overdue ? "text-bloom-500" : "text-muted"
          }`}
        >
          <Icon className="size-3.5" strokeWidth={2.4} />
          {task.type === "water" ? t("check") : t(task.type)}
          {task.overdue ? t("overdueSuffix") : ""}
        </p>
      </div>
    </Link>
  );

  if (task.type === "water") {
    return (
      <div
        style={style}
        className="animate-pop flex flex-col gap-3 rounded-3xl border border-line bg-surface px-4 py-3 shadow-soft"
      >
        <div className="flex items-center gap-3">{header}</div>
        <WaterCheck task={task} />
      </div>
    );
  }

  return (
    <div
      style={style}
      className="animate-pop flex items-center gap-3 rounded-3xl border border-line bg-surface px-4 py-3 shadow-soft"
    >
      {header}
      <form action={markCareTaskDoneAction}>
        <input type="hidden" name="task_id" value={task.id} />
        <IconSubmit ariaLabel={t("markDone", { task: t(task.type) })}>
          <Check className="size-5" strokeWidth={2.6} />
        </IconSubmit>
      </form>
    </div>
  );
}

/** The moisture-check body of a water card: tip, expandable guide, two buttons. */
function WaterCheck({ task }: { task: DueTask }) {
  const t = useTranslations("reminderCard");
  const [showGuide, setShowGuide] = useState(false);

  return (
    <>
      <p className="text-xs leading-relaxed text-muted">
        {task.last_status === "moist" ? (
          <span className="font-semibold text-forest-700">{t("lastMoist")} </span>
        ) : null}
        {t("waterTip")}
      </p>

      <button
        type="button"
        onClick={() => setShowGuide((v) => !v)}
        aria-expanded={showGuide}
        className="flex items-center gap-1 self-start text-xs font-semibold text-forest-700 transition-colors hover:text-forest-800"
      >
        <Info className="size-3.5" strokeWidth={2.4} />
        {t("howToCheckToggle")}
      </button>

      {showGuide ? (
        <div className="animate-pop space-y-2 rounded-2xl bg-sprout-100/70 px-3 py-2.5">
          <GuideRow icon={<Hand className="size-3.5 text-forest-700" strokeWidth={2.2} />} text={t("howFinger")} />
          <GuideRow icon={<Utensils className="size-3.5 text-forest-700" strokeWidth={2.2} />} text={t("howChopstick")} />
          <GuideRow icon={<Scale className="size-3.5 text-forest-700" strokeWidth={2.2} />} text={t("howLift")} />
        </div>
      ) : null}

      <div className="flex gap-2">
        <form action={recordWaterCheckAction} className="flex-1">
          <input type="hidden" name="task_id" value={task.id} />
          <input type="hidden" name="status" value="moist" />
          <TextSubmit variant="ghost">{t("stillMoist")}</TextSubmit>
        </form>
        <form action={recordWaterCheckAction} className="flex-1">
          <input type="hidden" name="task_id" value={task.id} />
          <input type="hidden" name="status" value="watered" />
          <TextSubmit variant="solid">
            <Droplet className="size-4" strokeWidth={2.6} />
            {t("watered")}
          </TextSubmit>
        </form>
      </div>
    </>
  );
}

function GuideRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <p className="flex gap-2 text-xs leading-relaxed text-ink">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{text}</span>
    </p>
  );
}

/** Round icon button (non-water mark-done), disabled while its form is pending. */
function IconSubmit({ ariaLabel, children }: { ariaLabel: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={ariaLabel}
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-forest-700 text-white shadow-soft transition-transform active:scale-90 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/** Full-width labeled button (water feedback), disabled while its form is pending. */
function TextSubmit({
  variant,
  children,
}: {
  variant: "solid" | "ghost";
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  const base =
    "flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold transition-transform active:scale-95 disabled:opacity-50";
  const skin =
    variant === "solid"
      ? "bg-forest-700 text-white shadow-soft"
      : "border border-line bg-surface text-forest-700";
  return (
    <button type="submit" disabled={pending} className={`${base} ${skin}`}>
      {children}
    </button>
  );
}
