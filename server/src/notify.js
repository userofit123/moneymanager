// Background alerts to the user's own ntfy server. Nothing leaves the home network unless the URL says so.
import { q } from "./db.js";

export async function ntfyUrl() {
  const r = await q("SELECT value FROM settings WHERE key='ntfy'");
  const u = r.rows[0]?.value;
  return typeof u === "string" && /^https?:\/\//.test(u) ? u : "";
}

export async function sendNtfy(title, body, priority = "default") {
  const url = await ntfyUrl();
  if (!url) return false;
  try {
    const r = await fetch(url, { method: "POST", body, headers: { Title: title, Priority: priority }, signal: AbortSignal.timeout(8000) });
    return r.ok;
  } catch { return false; }
}

// Tell the user once per distinct problem, not at every sync.
export async function notifyOnce(key, title, body, priority) {
  const k = `notified:${key}`;
  if ((await q("SELECT 1 FROM settings WHERE key=$1", [k])).rowCount) return false;
  const ok = await sendNtfy(title, body, priority);
  if (ok) await q("INSERT INTO settings (key,value) VALUES ($1,'true')", [k]);
  return ok;
}
export const clearNotified = (key) => q("DELETE FROM settings WHERE key=$1", [`notified:${key}`]);

// Gaps older than the chosen number of days (default 3) raise a daily reminder.
export async function remindOldGaps() {
  const days = (await q("SELECT value FROM settings WHERE key='cfg'")).rows[0]?.value?.gapDays ?? 3;
  const r = await q(
    `SELECT a.name,a.currency,g.remaining FROM balance_gaps g JOIN accounts a ON a.id=g.account_id
     WHERE g.status='open' AND g.created_at < now() - ($1 || ' days')::interval`, [String(days)]);
  if (!r.rowCount) return 0;
  await sendNtfy("Money · missing money", r.rows.map((g) => `${g.name}: ${g.remaining < 0 ? "money left" : "money arrived"} ${Math.abs(g.remaining)} ${g.currency} with no transaction`).join("\n"), "high");
  return r.rowCount;
}
