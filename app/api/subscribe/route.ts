import { saveSubscription, removeSubscription, type PushSubscriptionJSON } from "@/lib/push";

export const runtime = "nodejs";

function isValidSubscription(body: unknown): body is PushSubscriptionJSON {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (typeof b.endpoint !== "string" || !b.endpoint) return false;
  // Real endpoints are always https:// URLs from a push service. This won't
  // catch every fake value, but it rejects garbage/non-URL junk outright
  // rather than persisting it forever (sendPushToAll only prunes on a
  // confirmed-gone 404/410 from the push service, not malformed input).
  try {
    if (new URL(b.endpoint).protocol !== "https:") return false;
  } catch {
    return false;
  }
  const keys = b.keys as Record<string, unknown> | undefined;
  return !!keys && typeof keys.p256dh === "string" && typeof keys.auth === "string";
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  if (!isValidSubscription(body)) {
    return Response.json({ error: "Invalid push subscription." }, { status: 400 });
  }

  try {
    await saveSubscription(body);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[sprout] /api/subscribe POST:", err);
    return Response.json({ error: "Couldn't save that subscription." }, { status: 500 });
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const endpoint = (body as { endpoint?: string } | null)?.endpoint;
  if (!endpoint) {
    return Response.json({ error: "Missing endpoint." }, { status: 400 });
  }

  try {
    await removeSubscription(endpoint);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[sprout] /api/subscribe DELETE:", err);
    return Response.json({ error: "Couldn't remove that subscription." }, { status: 500 });
  }
}
