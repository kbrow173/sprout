import { sendPushToAll } from "@/lib/push";

export const runtime = "nodejs";

/**
 * Manual dev/debug trigger — sends one fixed push to every registered
 * subscription, unlike /api/cron/morning which only fires within the
 * configured morning hour AND only when there are actually due tasks. Reuses
 * CRON_SECRET rather than a separate secret so there's one bearer token to
 * manage, not two.
 */
export async function POST(request: Request): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await sendPushToAll({
    title: "🌱 Sprout test push",
    body: "If you see this, push notifications are working.",
    url: "/",
    tag: "sprout-test",
  });

  return Response.json(result);
}
