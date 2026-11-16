"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, Sprout } from "lucide-react";

/**
 * In-app error boundary. WHY: Sprout runs as a standalone PWA with no browser
 * chrome — before this, any thrown server error showed Next's bare crash page
 * with no reload button and no way back. The bottom nav (from the (app)
 * layout) stays visible around this.
 *
 * Next 16 passes `unstable_retry` (not the older `reset`) — see
 * node_modules/next/dist/docs/.../error.md.
 */
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[sprout] route error:", error);
  }, [error]);

  return (
    <div className="animate-pop mt-10 rounded-blob border border-line bg-surface px-6 py-10 text-center shadow-soft">
      <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-sun-100">
        <Sprout className="size-8 text-forest-700" strokeWidth={2} />
      </div>
      <h1 className="text-xl font-bold text-forest-800">Something wilted</h1>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
        That didn&apos;t work. Check your connection and try again.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="inline-flex items-center gap-1.5 rounded-full bg-forest-700 px-5 py-2.5 text-sm font-bold text-white shadow-soft transition-transform active:scale-[0.98]"
        >
          <RotateCcw className="size-4" strokeWidth={2.4} />
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center rounded-full bg-surface px-5 py-2.5 text-sm font-bold text-forest-700 ring-1 ring-sprout-300"
        >
          Go to Today
        </Link>
      </div>
      {error.digest ? <p className="mt-4 text-[0.7rem] text-muted">Ref: {error.digest}</p> : null}
    </div>
  );
}
