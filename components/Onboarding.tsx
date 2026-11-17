"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Bell, Camera, Share, Smartphone, Sprout } from "lucide-react";

const noopSubscribe = () => () => {};
function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

/**
 * First-run setup on an empty garden (Phase 11): install → notifications →
 * first plant. The install step hides once running as an installed app; on
 * iOS it explains Share → Add to Home Screen (push only works installed).
 */
export default function Onboarding() {
  const t = useTranslations("onboarding");
  const installed = useSyncExternalStore(noopSubscribe, isStandalone, () => false);
  const ios = useSyncExternalStore(noopSubscribe, isIos, () => false);

  let step = 1;
  return (
    <div className="animate-pop rounded-blob border border-line bg-surface px-5 py-6 shadow-soft">
      <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-sprout-100">
        <Sprout className="size-8 text-sprout-600" strokeWidth={2} />
      </div>
      <h2 className="text-center text-xl font-bold text-forest-800">{t("title")}</h2>
      <p className="mx-auto mt-1 max-w-xs text-center text-sm leading-relaxed text-muted">{t("body")}</p>

      <ol className="mt-5 space-y-3">
        {!installed ? (
          <Step n={step++} icon={<Smartphone className="size-5 text-forest-700" strokeWidth={2} />} title={t("installTitle")}>
            {ios ? (
              <span className="inline-flex flex-wrap items-center gap-1">
                {t("installIosBefore")} <Share className="inline size-3.5" aria-label="Share" /> {t("installIosAfter")}
              </span>
            ) : (
              t("installOther")
            )}
          </Step>
        ) : null}
        <Step n={step++} icon={<Bell className="size-5 text-forest-700" strokeWidth={2} />} title={t("notifyTitle")}>
          {t("notifyBody")}{" "}
          <Link href="/settings" className="font-bold text-forest-700 underline underline-offset-2">
            {t("notifyLink")}
          </Link>
        </Step>
        <Step n={step++} icon={<Camera className="size-5 text-forest-700" strokeWidth={2} />} title={t("addTitle")}>
          {t("addBody")}
        </Step>
      </ol>

      <Link
        href="/add"
        className="mt-6 flex w-full items-center justify-center rounded-full bg-forest-700 py-3.5 text-sm font-bold text-white shadow-soft transition-transform active:scale-[0.98]"
      >
        {t("cta")}
      </Link>
    </div>
  );
}

function Step({ n, icon, title, children }: { n: number; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 rounded-2xl bg-sprout-100/60 px-3 py-3">
      <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface">
        {icon}
        <span className="absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-full bg-forest-700 text-[0.7rem] font-bold text-white">
          {n}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-ink">{title}</p>
        <p className="text-xs leading-relaxed text-muted">{children}</p>
      </div>
    </li>
  );
}
