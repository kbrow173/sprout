"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Check, Droplet, Package, RotateCw, Scissors } from "lucide-react";
import PlantIllustration from "@/components/PlantIllustration";
import { markCareTaskDoneAction } from "@/lib/actions";
import type { DueTask } from "@/lib/care";
import type { CareTaskType } from "@/lib/types";

const TASK_META: Record<CareTaskType, { label: string; icon: typeof Droplet }> = {
  water: { label: "Water", icon: Droplet },
  rotate: { label: "Rotate", icon: RotateCw },
  repot: { label: "Repot", icon: Package },
  harvest: { label: "Harvest", icon: Scissors },
  prune: { label: "Prune", icon: Scissors },
};

/** A single due-today (or overdue) care task, with a one-tap mark-done. */
export default function ReminderCard({ task }: { task: DueTask }) {
  const { label, icon: Icon } = TASK_META[task.type];

  return (
    <div className="animate-pop flex items-center gap-3 rounded-3xl border border-line bg-surface px-4 py-3 shadow-soft">
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
            {task.overdue ? " · overdue" : ""}
          </p>
        </div>
      </Link>

      <form action={markCareTaskDoneAction}>
        <input type="hidden" name="task_id" value={task.id} />
        <MarkDoneButton label={label} />
      </form>
    </div>
  );
}

function MarkDoneButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={`Mark ${label.toLowerCase()} done`}
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-forest-700 text-white shadow-soft transition-transform active:scale-90 disabled:opacity-50"
    >
      <Check className="size-5" strokeWidth={2.6} />
    </button>
  );
}
