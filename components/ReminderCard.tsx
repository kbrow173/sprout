"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Check, Droplet, Package, RotateCw, Scissors } from "lucide-react";
import PlantIllustration from "@/components/PlantIllustration";
import { markCareTaskDoneAction } from "@/lib/actions";
import type { DueTask } from "@/lib/care";
import type { CareTaskType } from "@/lib/types";

const TASK_ICON: Record<CareTaskType, typeof Droplet> = {
  water: Droplet,
  rotate: RotateCw,
  repot: Package,
  harvest: Scissors,
  prune: Scissors,
};

/** A single due-today (or overdue) care task, with a one-tap mark-done. */
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
  const label = t(task.type);

  return (
    <div style={style} className="animate-pop flex items-center gap-3 rounded-3xl border border-line bg-surface px-4 py-3 shadow-soft">
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
            {label}
            {task.overdue ? t("overdueSuffix") : ""}
          </p>
        </div>
      </Link>

      <form action={markCareTaskDoneAction}>
        <input type="hidden" name="task_id" value={task.id} />
        <MarkDoneButton markDoneLabel={t("markDone", { task: label })} />
      </form>
    </div>
  );
}

function MarkDoneButton({ markDoneLabel }: { markDoneLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={markDoneLabel}
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-forest-700 text-white shadow-soft transition-transform active:scale-90 disabled:opacity-50"
    >
      <Check className="size-5" strokeWidth={2.6} />
    </button>
  );
}
