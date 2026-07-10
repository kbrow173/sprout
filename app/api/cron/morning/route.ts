import { serverClient } from "@/lib/supabase";
import { getSettings } from "@/lib/settings";
import { getDueTasks, currentLocalDateAndHour } from "@/lib/care";
import { sendPushToAll } from "@/lib/push";
import { sendMorningEmail } from "@/lib/email";

export const runtime = "nodejs";

/**
 * Triggered hourly by a GitHub Actions scheduled workflow (not Vercel Cron —
 * Hobby plan only allows once/day at a fixed UTC time, which drifts an hour
 * around DST). This route itself decides whether it's actually the user's
 * morning: it no-ops every hour except the one matching settings.morning_time
 * in settings.timezone, so the send time is always correct local time,
 * DST included, with no schedule to hand-adjust twice a year.
 *
 * morning_time is compared by hour only — the trigger is hourly, so minutes
 * can't be honored. updateSettingsAction rounds the stored value to :00 so
 * what's saved always matches what actually happens.
 */
export async function POST(request: Request): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const settings = await getSettings();
  const { date: today, hour: currentHour } = currentLocalDateAndHour(settings.timezone);
  const morningHour = Number(settings.morning_time.split(":")[0]);

  if (currentHour !== morningHour) {
    return Response.json({ skipped: "not morning time yet", currentHour, morningHour });
  }

  // Atomic claim: only succeeds (returns a row) if last_morning_send_date is
  // NOT already today. A second overlapping invocation (GitHub Actions retry
  // or a manual workflow_dispatch landing in the same hour) will affect zero
  // rows and skip, instead of both sending — this must happen BEFORE any
  // sending, not after, or two concurrent requests both pass a read-only check.
  const { data: claimed, error: claimError } = await serverClient()
    .from("settings")
    .update({ last_morning_send_date: today })
    .eq("id", settings.id)
    .or(`last_morning_send_date.is.null,last_morning_send_date.neq.${today}`)
    .select("id");
  if (claimError) throw new Error(`[sprout] /api/cron/morning: claim failed: ${claimError.message}`);
  if (!claimed || claimed.length === 0) {
    return Response.json({ skipped: "already sent today", today });
  }

  const tasks = await getDueTasks();
  const results: { push?: unknown; email?: unknown } = {};

  if (tasks.length > 0) {
    if (settings.push_enabled) {
      try {
        results.push = await sendPushToAll({
          title: tasks.length === 1 ? "🌱 1 plant needs you today" : `🌱 ${tasks.length} plants need you today`,
          body: tasks
            .slice(0, 3)
            .map((t) => t.plant.nickname || t.plant.common_name)
            .join(", "),
          url: "/",
          tag: "sprout-daily",
        });
      } catch (err) {
        console.error("[sprout] /api/cron/morning: push failed", err);
        results.push = { error: String(err) };
      }
    }

    if (settings.email_enabled && settings.email) {
      try {
        const sent = await sendMorningEmail(settings.email, tasks);
        results.email = sent ? { sent: true } : { sent: false, reason: "Resend not configured" };
      } catch (err) {
        console.error("[sprout] /api/cron/morning: email failed", err);
        results.email = { sent: false, error: String(err) };
      }
    }
  }

  return Response.json({ ran: true, today, dueCount: tasks.length, ...results });
}
