import "server-only";
import webpush from "web-push";
import { serverClient } from "@/lib/supabase";
import type { PushSubscriptionRow } from "@/lib/types";

const PUSH_TTL_SECONDS = 12 * 60 * 60;

let configured = false;
function ensureConfigured(): void {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("[sprout] Missing VAPID env vars — needed for Web Push.");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Saves a subscription, keyed by endpoint (re-subscribing updates rotated keys). */
export async function saveSubscription(sub: PushSubscriptionJSON): Promise<void> {
  const { error } = await serverClient()
    .from("push_subscriptions")
    .upsert(
      { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      { onConflict: "endpoint" }
    );
  if (error) throw new Error(`[sprout] saveSubscription: ${error.message}`);
}

export async function removeSubscription(endpoint: string): Promise<void> {
  const { error } = await serverClient().from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw new Error(`[sprout] removeSubscription: ${error.message}`);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** Sends a push to every stored subscription; prunes ones the push service reports gone (404/410). */
export async function sendPushToAll(
  payload: PushPayload
): Promise<{ sent: number; pruned: number; failed: number }> {
  // Subscriptions first: with none, push is simply not in use — don't require
  // VAPID env (email-only setups would otherwise throw every morning).
  const { data: subs, error } = await serverClient().from("push_subscriptions").select("*");
  if (error) throw new Error(`[sprout] sendPushToAll: ${error.message}`);
  if (!subs || subs.length === 0) return { sent: 0, pruned: 0, failed: 0 };

  ensureConfigured();

  const body = JSON.stringify(payload);
  let sent = 0;
  let pruned = 0;
  // Transient failures (5xx, timeouts) — reported so the cron can retry.
  let failed = 0;

  await Promise.all(
    (subs as PushSubscriptionRow[]).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
          // If the phone is offline, the push service holds the message at
          // most this long — a "morning" nudge arriving at night is worse
          // than none. web-push's default TTL is 4 weeks.
          { TTL: PUSH_TTL_SECONDS }
        );
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        const code = (err as { code?: string }).code;
        // 404/410: push service confirms the subscription is gone. 400: push
        // service rejected the subscription details as invalid — permanent,
        // not transient. ENOTFOUND/ECONNREFUSED: the endpoint host doesn't
        // exist or refuses connections — a fake/garbage endpoint, permanent.
        // Anything else (5xx, timeouts) could be transient, so it's kept and
        // just logged rather than pruned on a single failure.
        const isPermanentlyDead =
          statusCode === 404 ||
          statusCode === 410 ||
          statusCode === 400 ||
          code === "ENOTFOUND" ||
          code === "ECONNREFUSED";
        if (isPermanentlyDead) {
          await removeSubscription(sub.endpoint);
          pruned++;
        } else {
          failed++;
          console.error(`[sprout] sendPushToAll: failed for ${sub.endpoint}`, err);
        }
      }
    })
  );

  return { sent, pruned, failed };
}
