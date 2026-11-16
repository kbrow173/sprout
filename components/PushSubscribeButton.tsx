"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

const noopSubscribe = () => () => {};

function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window;
}

/** iOS only exposes Web Push to a Home Screen-installed PWA. */
function isIosBrowserTab(): boolean {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

/**
 * Per-DEVICE push toggle. It reflects only this browser's subscription.
 *
 * WHY no global flag: this used to "self-heal" settings.push_enabled from the
 * current browser, so opening Settings on a laptop (no subscription) switched
 * push off for the phone too. The cron now just sends to every stored
 * subscription — a device is "on" iff it has one (audit A2, L26).
 *
 * iOS requires Notification.requestPermission() from a real tap handler, so
 * the whole subscribe flow lives behind one button press.
 */
export default function PushSubscribeButton() {
  const supported = useSyncExternalStore(noopSubscribe, pushSupported, () => true);
  const iosTab = useSyncExternalStore(noopSubscribe, isIosBrowserTab, () => false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!pushSupported()) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEnabled(!!sub))
      .catch(() => {});
  }, []);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.ready;

      if (enabled) {
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
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage(
          permission === "denied"
            ? "Notifications are blocked — allow them in your browser or phone settings."
            : "Notifications weren't allowed."
        );
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Push isn't configured yet.");

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) {
        // Don't leave a browser subscription the server doesn't know about.
        await sub.unsubscribe();
        throw new Error("Couldn't save this device.");
      }
      setEnabled(true);
    } catch (err) {
      console.error("[sprout] push toggle failed:", err);
      setMessage(err instanceof Error ? err.message : "Something went wrong — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <span className="max-w-[9rem] text-right text-xs font-semibold text-muted">
        {iosTab ? "Add Sprout to your Home Screen first" : "Not supported here"}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={enabled}
        aria-label="Notifications on this device"
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 disabled:opacity-60 ${
          enabled ? "bg-forest-700" : "bg-surface-sunken ring-1 ring-line"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-soft transition-transform ${
            enabled ? "translate-x-5" : ""
          }`}
        />
      </button>
      {message ? (
        <p role="status" className="max-w-[10rem] text-right text-[0.7rem] leading-snug text-bloom-500">
          {message}
        </p>
      ) : null}
    </div>
  );
}
