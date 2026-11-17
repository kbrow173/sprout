"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  AlarmClock,
  Check,
  Droplet,
  FlaskConical,
  Hand,
  Info,
  MoreHorizontal,
  Package,
  RotateCw,
  Scale,
  Scissors,
  SkipForward,
  Undo2,
  Utensils,
} from "lucide-react";
import PlantIllustration from "@/components/PlantIllustration";
import { performTaskAction, performWaterCheck, undoAction } from "@/lib/actions";
import type { DueTask } from "@/lib/care";
import type { TaskAction } from "@/lib/care-math";
import type { CareTaskType, WaterCheckStatus } from "@/lib/types";

const TASK_ICON: Record<CareTaskType, typeof Droplet> = {
  water: Droplet,
  rotate: RotateCw,
  repot: Package,
  harvest: Scissors,
  prune: Scissors,
  fertilize: FlaskConical,
};

interface Toast {
  eventId: string | null;
  message: string;
  key: number;
}

/**
 * Today's tasks, one card per PLANT (Phase 11 — a plant with water + rotate
 * due used to show as two cards). Owns the Undo toast: it lives here, above
 * the cards, because a card disappears the moment its task is done (L36).
 * Also mirrors the due count onto the app-icon badge where supported.
 */
export default function TodayList({ tasks }: { tasks: DueTask[] }) {
  const t = useTranslations("today");
  const [toast, setToast] = useState<Toast | null>(null);
  const [undoing, startUndo] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const groups = groupByPlant(tasks);

  useEffect(() => {
    // App-icon badge (installed PWA, Chrome/Edge/Safari 17+). Best-effort.
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    const count = new Set(tasks.map((x) => x.plant.id)).size;
    if (count > 0) nav.setAppBadge?.(count).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  }, [tasks]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function showToast(eventId: string | null, message: string) {
    if (timer.current) clearTimeout(timer.current);
    setToast({ eventId, message, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), 7000);
  }

  function undo() {
    const id = toast?.eventId;
    if (!id) return;
    startUndo(async () => {
      const ok = await undoAction(id);
      showToast(null, ok ? t("undone") : t("undoFailed"));
    });
  }

  return (
    <>
      <div className="space-y-3">
        {groups.map((g, i) => (
          <PlantGroup key={g.plant.id} group={g} onDone={showToast} style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }} />
        ))}
      </div>

      {toast ? (
        <div
          key={toast.key}
          role="status"
          aria-live="polite"
          className="animate-pop fixed inset-x-0 bottom-28 z-50 mx-auto flex w-[min(24rem,calc(100%-2rem))] items-center gap-3 rounded-full bg-forest-900 px-5 py-3 text-sm font-semibold text-white shadow-lift"
        >
          <span className="min-w-0 flex-1 truncate">{toast.message}</span>
          {toast.eventId ? (
            <button
              type="button"
              onClick={undo}
              disabled={undoing}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-bold text-sprout-300 outline-none focus-visible:ring-2 focus-visible:ring-sprout-300 disabled:opacity-60"
            >
              <Undo2 className="size-4" strokeWidth={2.4} />
              {t("undo")}
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

interface Group {
  plant: DueTask["plant"];
  tasks: DueTask[];
}

function groupByPlant(tasks: DueTask[]): Group[] {
  const map = new Map<string, Group>();
  for (const task of tasks) {
    const g = map.get(task.plant.id) ?? { plant: task.plant, tasks: [] };
    g.tasks.push(task);
    map.set(task.plant.id, g);
  }
  // Water first inside a card — it's the one that matters most day to day.
  for (const g of map.values()) g.tasks.sort((a, b) => Number(b.type === "water") - Number(a.type === "water"));
  return [...map.values()];
}

function PlantGroup({
  group,
  onDone,
  style,
}: {
  group: Group;
  onDone: (eventId: string | null, message: string) => void;
  style?: React.CSSProperties;
}) {
  const name = group.plant.nickname || group.plant.common_name;
  return (
    <section
      style={style}
      aria-label={name}
      className="animate-pop rounded-3xl border border-line bg-surface px-4 py-3 shadow-soft"
    >
      <Link href={`/plant/${group.plant.id}`} className="flex items-center gap-3 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-forest-500">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sprout-100">
          <PlantIllustration illustrationKey={group.plant.illustration_key} size={36} />
        </div>
        <p className="min-w-0 flex-1 truncate font-bold text-ink">{name}</p>
      </Link>
      <div className="mt-2 divide-y divide-line">
        {group.tasks.map((task) => (
          <TaskRow key={task.id} task={task} plantName={name} onDone={onDone} />
        ))}
      </div>
    </section>
  );
}

function TaskRow({
  task,
  plantName,
  onDone,
}: {
  task: DueTask;
  plantName: string;
  onDone: (eventId: string | null, message: string) => void;
}) {
  const t = useTranslations("today");
  const tt = useTranslations("tasks");
  const [pending, start] = useTransition();
  const [showGuide, setShowGuide] = useState(false);
  const [menu, setMenu] = useState(false);
  const Icon = TASK_ICON[task.type];

  function act(action: TaskAction, message: string) {
    setMenu(false);
    start(async () => onDone(await performTaskAction(task.id, action), message));
  }
  function water(status: WaterCheckStatus) {
    start(async () => onDone(await performWaterCheck(task.id, status), t(status === "watered" ? "toastWatered" : "toastMoist", { name: plantName })));
  }

  const label = task.type === "water" ? t("checkSoil") : task.type === "repot" ? t("checkRoots") : tt(task.type);

  return (
    <div className="py-3 first:pt-2 last:pb-1">
      <div className="flex items-center gap-2">
        <p className={`flex min-w-0 flex-1 items-center gap-1.5 text-sm font-semibold ${task.overdue ? "text-bloom-600" : "text-ink"}`}>
          <Icon className="size-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />
          <span className="truncate">
            {label}
            {task.overdue ? <span className="font-medium"> · {t("overdue")}</span> : null}
          </span>
        </p>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-label={t("moreOptions", { task: label })}
            aria-expanded={menu}
            className="flex size-8 items-center justify-center rounded-full text-muted outline-none hover:bg-surface-sunken focus-visible:ring-2 focus-visible:ring-forest-500"
          >
            <MoreHorizontal className="size-4" strokeWidth={2.4} />
          </button>
          {menu ? (
            <div className="animate-pop absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-2xl border border-line bg-surface py-1 shadow-lift">
              <MenuItem icon={<AlarmClock className="size-4" />} onClick={() => act("snooze", t("toastSnoozed", { name: plantName }))}>
                {t("snooze")}
              </MenuItem>
              {task.type !== "water" ? (
                <MenuItem icon={<SkipForward className="size-4" />} onClick={() => act("skip", t("toastSkipped", { name: plantName }))}>
                  {t("skip")}
                </MenuItem>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {task.type === "water" ? (
        <>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {task.last_status === "moist" ? <span className="font-semibold text-forest-700">{t("lastMoist")} </span> : null}
            {t("waterTip")}
          </p>
          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            aria-expanded={showGuide}
            className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-forest-700 outline-none hover:text-forest-800 focus-visible:underline"
          >
            <Info className="size-3.5" strokeWidth={2.4} />
            {t("howToCheck")}
          </button>
          {showGuide ? (
            <div className="animate-pop mt-2 space-y-2 rounded-2xl bg-sprout-100/70 px-3 py-2.5">
              <GuideRow icon={<Hand className="size-3.5 text-forest-700" strokeWidth={2.2} />} text={t("howFinger")} />
              <GuideRow icon={<Utensils className="size-3.5 text-forest-700" strokeWidth={2.2} />} text={t("howChopstick")} />
              <GuideRow icon={<Scale className="size-3.5 text-forest-700" strokeWidth={2.2} />} text={t("howLift")} />
            </div>
          ) : null}
          <div className="mt-2.5 flex gap-2">
            <ActionButton variant="ghost" pending={pending} onClick={() => water("moist")}>
              {t("stillMoist")}
            </ActionButton>
            <ActionButton variant="solid" pending={pending} onClick={() => water("watered")}>
              <Droplet className="size-4" strokeWidth={2.6} />
              {t("watered")}
            </ActionButton>
          </div>
        </>
      ) : task.type === "repot" ? (
        <>
          <p className="mt-1 text-xs leading-relaxed text-muted">{t("repotTip")}</p>
          <div className="mt-2.5 flex gap-2">
            <ActionButton variant="ghost" pending={pending} onClick={() => act("roots_ok", t("toastRootsOk", { name: plantName }))}>
              {t("rootsOk")}
            </ActionButton>
            <ActionButton variant="solid" pending={pending} onClick={() => act("done", t("toastRepotted", { name: plantName }))}>
              <Package className="size-4" strokeWidth={2.4} />
              {t("repotted")}
            </ActionButton>
          </div>
        </>
      ) : (
        <>
          {task.type === "fertilize" ? <p className="mt-1 text-xs leading-relaxed text-muted">{t("fertilizeTip")}</p> : null}
          <div className="mt-2.5 flex">
            <ActionButton variant="solid" pending={pending} onClick={() => act("done", t("toastDone", { task: tt(task.type), name: plantName }))}>
              <Check className="size-4" strokeWidth={2.6} />
              {t("markDone")}
            </ActionButton>
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ icon, onClick, children }: { icon: React.ReactNode; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-ink outline-none hover:bg-surface-sunken focus-visible:bg-surface-sunken"
    >
      <span className="text-muted">{icon}</span>
      {children}
    </button>
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

function ActionButton({
  variant,
  pending,
  onClick,
  children,
}: {
  variant: "solid" | "ghost";
  pending: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const skin = variant === "solid" ? "bg-forest-700 text-white shadow-soft" : "border border-line bg-surface text-forest-700";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-busy={pending}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold outline-none transition-transform focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 active:scale-95 disabled:opacity-50 ${skin}`}
    >
      {children}
    </button>
  );
}
