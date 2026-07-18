import "server-only";
import { Resend } from "resend";
import type { DueTask } from "@/lib/care";

const TASK_LABELS: Record<string, string> = {
  water: "Check soil (water if dry)", // moisture-first, not a blind "Water" command
  rotate: "Rotate",
  repot: "Repot",
  harvest: "Harvest",
  prune: "Prune",
};

/**
 * Sends the morning digest email. No-ops (logs, doesn't throw) if Resend
 * isn't configured yet — email is a "when you get to it" backup channel,
 * not a hard dependency for the rest of the app to work. Returns whether it
 * actually attempted a send, so callers can report accurate status rather
 * than assuming success just because nothing threw.
 */
export async function sendMorningEmail(to: string, tasks: DueTask[]): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.REMINDER_EMAIL_FROM;

  if (!apiKey || !from) {
    console.log("[sprout] sendMorningEmail: RESEND_API_KEY/REMINDER_EMAIL_FROM not set, skipping.");
    return false;
  }

  const resend = new Resend(apiKey);
  const subject =
    tasks.length === 1 ? "🌱 1 plant needs you today" : `🌱 ${tasks.length} plants need you today`;

  const rows = tasks
    .map((t) => {
      const label = TASK_LABELS[t.type] ?? t.type;
      const name = escapeHtml(t.plant.nickname || t.plant.common_name);
      return `<li><strong>${name}</strong> — ${label}${t.overdue ? " (overdue)" : ""}</li>`;
    })
    .join("");

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h1 style="color:#1f5b39; margin-bottom: 4px;">🌱 Sprout</h1>
      <p>Good morning! Here's what's due today:</p>
      <ul style="line-height: 1.8;">${rows}</ul>
      <p style="color:#666; font-size: 13px;">Open the app to mark things done.</p>
    </div>
  `;

  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) throw new Error(`[sprout] sendMorningEmail: ${error.message}`);
  return true;
}

function escapeHtml(s: string): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return s.replace(/[&<>"']/g, (c) => map[c]);
}
