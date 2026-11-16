"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const STALE_AFTER_MS = 60_000;

/**
 * Re-fetches server data when the app comes back to the foreground after a
 * while. WHY: as an installed PWA there's no reload button, and globals.css
 * disables pull-to-refresh (overscroll-behavior), so Today stayed frozen on
 * yesterday's tasks if the app was left open overnight.
 */
export default function RefreshOnReturn() {
  const router = useRouter();

  useEffect(() => {
    let hiddenAt = 0;
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
      } else if (hiddenAt && Date.now() - hiddenAt > STALE_AFTER_MS) {
        router.refresh();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [router]);

  return null;
}
