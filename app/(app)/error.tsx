"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { RotateCcw, Sprout } from "lucide-react";

/**
 * In-app error boundary. Sprout runs as a standalone PWA with no browser
 * chrome, so a bare crash page would strand the user. The bottom nav stays.
 * Next 16 passes `unstable_retry` (not the older `reset`).
 */
export default function AppError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  const t = useTranslations("errors");
  useEffect(() => {
    console.error("[sprout] route error:", error);
  }, [error]);
  const locked = /locked/i.test(error.message);

  return (
    <div role="alert" className="animate-pop mt-10 rounded-blob border border-line bg-surface px-6 py-10 text-center shadow-soft">
      <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-sun-100">
        <Sprout className="size-8 text-forest-700" strokeWidth={2} />
      </div>
      <h1 className="text-xl font-bold text-forest-800">{t("title")}</h1>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">{locked ? t("locked") : t("body")}</p>
      <div className="mt-6 flex justify-center gap-2">
        {locked ? (
          <Link href="/login" className="inline-flex items-center rounded-full bg-forest-700 px-5 py-2.5 text-sm font-bold text-white shadow-soft">
            {t("unlock")}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="inline-flex items-center gap-1.5 rounded-full bg-forest-700 px-5 py-2.5 text-sm font-bold text-white shadow-soft transition-transform active:scale-[0.98]"
          >
            <RotateCcw className="size-4" strokeWidth={2.4} />
            {t("retry")}
          </button>
        )}
        <Link href="/" className="inline-flex items-center rounded-full bg-surface px-5 py-2.5 text-sm font-bold text-forest-700 ring-1 ring-sprout-300">
          {t("home")}
        </Link>
      </div>
      {error.digest ? <p className="mt-4 text-[0.7rem] text-muted">Ref: {error.digest}</p> : null}
    </div>
  );
}
