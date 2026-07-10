"use client";

import { useEffect } from "react";

/**
 * Registers the hand-written push service worker (public/sw.js).
 * We deliberately do NOT use Serwist here — its webpack plugin conflicts with
 * Next 16's Turbopack (see LESSONS_LEARNED.md). All we need for morning
 * notifications is a SW with `push` + `notificationclick` listeners, which
 * sw.js provides. Registration is best-effort and silently no-ops where the
 * Service Worker API is unavailable.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      // Non-fatal: the app works without push; we just log for debugging.
      console.warn("[sprout] service worker registration failed:", err);
    });
  }, []);

  return null;
}
