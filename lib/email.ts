import "server-only";
import { Resend } from "resend";
import type { DueTask } from "@/lib/care";
import { appBaseUrl, serverTranslator } from "@/lib/server-i18n";

/**
 * Sends the morning digest email in the user's language. Returns false
 * (doesn't throw) if Resend isn't configured — email is a backup channel,
 * and callers report accurate "did this send" status.
 */
export async function sendMorningEmail(to: string, tasks: DueTask[], locale: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.REMINDER_EMAIL_FROM;
  if (!apiKey || !from) {
    console.log("[sprout] sendMorningEmail: RESEND_API_KEY/REMINDER_EMAIL_FROM not set, skipping.");
    return false;
  }

  const t = await serverTranslator(locale, "email");
  const tt = await serverTranslator(locale, "tasks");
  const base = appBaseUrl();
  const plantCount = new Set(tasks.map((x) => x.plant.id)).size;
  const subject = t("subject", { count: plantCount });

  const rows = tasks
    .map((task) => {
      const label = task.type === "water" ? t("checkSoil") : task.type === "repot" ? t("checkRoots") : tt(task.type);
      const name = escapeHtml(task.plant.nickname || task.plant.common_name);
      const link = base ? `${base}/plant/${task.plant.id}` : null;
      const nameHtml = link ? `<a href="${link}" style="color:#17422a;text-decoration:none;font-weight:700">${name}</a>` : `<strong>${name}</strong>`;
      const overdue = task.overdue ? ` <span style="color:#c2452d">· ${escapeHtml(t("overdue"))}</span>` : "";
      return `<tr><td style="padding:10px 0;border-bottom:1px solid #e4ece5;font-size:15px">${nameHtml}<br><span style="color:#5b6b60;font-size:13px">${escapeHtml(label)}${overdue}</span></td></tr>`;
    })
    .join("");

  const button = base
    ? `<a href="${base}/" style="display:inline-block;margin-top:20px;background:#1f5b39;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">${escapeHtml(t("open"))}</a>`
    : "";

  const html = `
<div style="background:#f8faf7;padding:24px 12px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#16241b">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e4ece5;border-radius:24px;padding:24px">
    <p style="margin:0;font-size:28px">🌱</p>
    <h1 style="margin:8px 0 4px;color:#17422a;font-size:22px">${escapeHtml(t("heading"))}</h1>
    <p style="margin:0 0 12px;color:#5b6b60">${escapeHtml(t("intro", { count: plantCount }))}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    ${button}
    <p style="margin:20px 0 0;color:#6b7a70;font-size:12px">${escapeHtml(t("footer"))}</p>
  </div>
</div>`;

  const { error } = await new Resend(apiKey).emails.send({ from, to, subject, html });
  if (error) throw new Error(`[sprout] sendMorningEmail: ${error.message}`);
  return true;
}

function escapeHtml(s: string): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return s.replace(/[&<>"']/g, (c) => map[c]);
}
