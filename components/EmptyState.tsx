import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Friendly empty state — an illustrated blob card with an optional CTA.
 * Reused across Today / Garden before there's any data.
 */
export default function EmptyState({
  illustration,
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  illustration: ReactNode;
  title: string;
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="animate-pop flex flex-col items-center rounded-blob border border-line bg-surface px-6 py-10 text-center shadow-soft">
      <div className="mb-4 flex size-24 items-center justify-center rounded-full bg-sprout-100">
        {illustration}
      </div>
      <h2 className="text-xl font-bold text-forest-800">{title}</h2>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{body}</p>
      {ctaHref && ctaLabel ? (
        <Link
          href={ctaHref}
          className="mt-6 inline-flex items-center rounded-full bg-forest-700 px-6 py-3 text-sm font-bold text-white shadow-soft transition-transform active:scale-95"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
