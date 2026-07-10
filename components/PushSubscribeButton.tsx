"use client";

import { useEffect, useState } from "react";
import { setPushEnabledAction } from "@/lib/actions";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/**
 * iOS requires Notification.requestPermission() to be called from a real tap
 * handler (not on load) — this whole flow lives behind one button press.
 */
export default function PushSubscribeButton({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        const actuallyEnabled = !!sub;
        setEnabled(actuallyEnabled);
        // Self-heal settings.push_enabled only if it's actually out of sync
        // with the real browser subscription state — avoids a read+write
        // round trip on every single Settings page visit for the common
        // case where nothing changed.
        if (actuallyEnabled !== initialEnabled) void setPushEnabledAction(actuallyEnabled);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (enabled) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setEnabled(false);
        await setPushEnabledAction(false);
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Push isn't configured yet.");

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setEnabled(true);
      await setPushEnabledAction(true);
    } catch (err) {
      console.error("[sprout] push toggle failed:", err);
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return <span className="text-xs font-semibold text-faint">Not supported here</span>;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={enabled}
      aria-label="Toggle phone notifications"
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
        enabled ? "bg-forest-700" : "bg-surface-sunken ring-1 ring-line"
      }`}
    >
      <span
        className={`absolute top-0.5 size-6 rounded-full bg-white shadow-soft transition-transform ${
          enabled ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
