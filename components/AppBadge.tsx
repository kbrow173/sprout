"use client";

import { useEffect } from "react";

/**
 * Mirrors the number of plants due today onto the app-icon badge (installed
 * PWA; Badging API). Rendered by the Today page in EVERY state — it used to
 * live inside TodayList, which unmounts once the last task is done, so the
 * badge never cleared (L39).
 */
export default function AppBadge({ count }: { count: number }) {
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (n: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (count > 0) nav.setAppBadge?.(count).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  }, [count]);
  return null;
}
