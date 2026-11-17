import { serverClient } from "@/lib/supabase";
import { getSettings } from "@/lib/settings";
import { getDueTasks, currentLocalDateAndHour, inMorningWindow, morningWindowDate } from "@/lib/care";
import { sendPushToAll } from "@/lib/push";
import { sendMorningEmail } from "@/lib/email";
import { serverTranslator } from "@/lib/server-i18n";

export const runtime = "nodejs";

/**
 * Triggered hourly by a GitHub Actions scheduled workflow (not Vercel Cron —
 * Hobby plan only allows once/day at a fixed UTC time, which drifts an hour
 * around DST). This route decides whether it's actually the user's morning.
 *
 * CATCH-UP WINDOW (L27): GitHub's scheduled runs are routinely delayed and
 * sometimes dropped. We send on the first run inside a short window starting
 * at morning_time (wrapping past midnight); the once-per-day claim stops
 * repeats. The claim is keyed by the date the window OPENED, so a 23:00
 * window caught at 00:30 doesn't eat the next day's send.
 *
 * RETRY (L32): if anything fails after the claim — a DB error, or every
 * attempted channel failing — the claim is released so the next run in the
 * window tries again, instead of silently losing the day.
 */
export async function POST(request: Request): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const settings = await getSettings();
  const { date: localDate, hour: currentHour } = currentLocalDateAndHour(settings.timezone);
  const morningHour = Number(settings.morning_time.split(":")[0]);

  if (!inMorningWindow(currentHour, morningHour)) {
    return Response.json({ skipped: "outside morning window", currentHour, morningHour });
  }
  const sendDate = morningWindowDate(localDate, currentHour, morningHour);

  // Atomic claim (L13): only succeeds if last_morning_send_date isn't already
  // sendDate. Must happen BEFORE sending.
  const previousSendDate = settings.last_morning_send_date ?? null;
  const { data: claimed, error: claimError } = await serverClient()
    .from("settings")
    .update({ last_morning_send_date: sendDate })
    .eq("id", settings.id)
    .or(`last_morning_send_date.is.null,last_morning_send_date.neq.${sendDate}`)
    .select("id");
  if (claimError) throw new Error(`[sprout] /api/cron/morning: claim failed: ${claimError.message}`);
  if (!claimed || claimed.length === 0) {
    return Response.json({ skipped: "already sent", sendDate });
  }

  async function releaseClaim() {
    const { error } = await serverClient()
      .from("settings")
      .update({ last_morning_send_date: previousSendDate })
      .eq("id", settings.id);
    if (error) console.error("[sprout] /api/cron/morning: release failed", error);
  }

  try {
    const tasks = await getDueTasks();
    const results: { push?: unknown; email?: unknown } = {};
    let anySucceeded = false;
    let anyFailed = false;

    if (tasks.length > 0) {
      // Count PLANTS, not tasks — one plant can have water + rotate due together.
      const names = [...new Set(tasks.map((t) => t.plant.nickname || t.plant.common_name))];
      const plantCount = new Set(tasks.map((t) => t.plant.id)).size;
      const t = await serverTranslator(settings.language, "push");
      const title = t("morningTitle", { count: plantCount });
      const body = names.length > 3 ? t("morningBodyMore", { names: names.slice(0, 3).join(", "), more: names.length - 3 }) : names.join(", ");
      // One plant → open its care sheet directly; several → Today.
      const url = plantCount === 1 ? `/plant/${tasks[0].plant.id}` : "/";

      // Push goes to every stored subscription — a device opts in/out by
      // having a row (L26).
      try {
        const push = await sendPushToAll({ title, body, url, tag: "sprout-daily", badge: plantCount });
        results.push = push;
        if (push.sent > 0) anySucceeded = true;
        // Every live device hit a transient error (5xx/timeout) → retry later.
        else if (push.failed > 0) anyFailed = true;
      } catch (err) {
        console.error("[sprout] /api/cron/morning: push failed", err);
        results.push = { error: String(err) };
        anyFailed = true;
      }

      if (settings.email_enabled && settings.email) {
        try {
          const sent = await sendMorningEmail(settings.email, tasks, settings.language);
          results.email = sent ? { sent: true } : { sent: false, reason: "Resend not configured" };
          if (sent) anySucceeded = true;
        } catch (err) {
          console.error("[sprout] /api/cron/morning: email failed", err);
          results.email = { sent: false, error: String(err) };
          anyFailed = true;
        }
      }
    }

    if (anyFailed && !anySucceeded) {
      await releaseClaim();
      return Response.json({ ran: true, released: true, sendDate, dueCount: tasks.length, ...results }, { status: 502 });
    }
    return Response.json({ ran: true, sendDate, dueCount: tasks.length, ...results });
  } catch (err) {
    console.error("[sprout] /api/cron/morning: failed after claim", err);
    await releaseClaim();
    return Response.json({ error: "Morning run failed; will retry next run.", released: true }, { status: 500 });
  }
}
