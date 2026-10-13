// The error log: every error the app meets is written here with the time, what was being done and what led up to it.
// Nothing in it may hold a password or token, so text is scrubbed before it is stored. Logging itself never throws.
import os from "node:os";
import { q } from "./db.js";

const recent = []; // the last changes asked of the app (method, path, time): the "what was done" before an error
export function noteRequest(method, path) {
  if (["GET", "HEAD", "OPTIONS"].includes(method) || /^\/api\/(errors|auth|prefs|alerts\/seen)/.test(path)) return;
  recent.push(`${new Date().toISOString()} ${method} ${String(path).replace(/[0-9a-f]{20,}/gi, "…").slice(0, 120)}`);
  if (recent.length > 25) recent.shift();
}
export const recentActions = () => recent.slice(-12);

const SECRET = /("?(?:password|passwd|token|secret|authorization|cookie|api[_-]?key|otp|code)"?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;&}]+)/gi;
export function scrubText(s, extra = []) {
  let t = String(s == null ? "" : s);
  for (const x of extra) if (x && String(x).length > 3) t = t.split(String(x)).join("•••");
  return t.replace(SECRET, "$1•••").replace(/(Bearer\s+)[A-Za-z0-9._~+\/=-]+/g, "$1•••").replace(/([?&](?:token|key|code|password)=)[^&\s]+/gi, "$1•••");
}

let n = 0;
export async function logError({ source = "server", action = "", error, message, detail, context = {}, scrub = [] }) {
  try {
    const m = scrubText(message ?? (error && error.message) ?? error, scrub).slice(0, 4000) || "Unknown error";
    const d = scrubText(detail ?? (error && error.stack) ?? "", scrub).slice(0, 12000);
    const ctx = { ...context };
    if (!ctx.recent) ctx.recent = recentActions();
    await q("INSERT INTO error_log (source,action,message,detail,context) VALUES ($1,$2,$3,$4,$5)", [String(source).slice(0, 30), scrubText(action, scrub).slice(0, 300), m, d, JSON.stringify(JSON.parse(scrubText(JSON.stringify(ctx), scrub)))]);
    if (++n % 40 === 0) await q("DELETE FROM error_log WHERE id < (SELECT COALESCE(max(id),0) - 999 FROM error_log)");
  } catch (e) { console.error("error log:", e.message); }
}

export async function listErrors(limit = 300) {
  const r = await q("SELECT id,at,source,action,message,detail,context FROM error_log ORDER BY id DESC LIMIT $1", [Math.min(1000, Math.max(1, +limit || 300))]);
  return r.rows.map((x) => ({ ...x, at: new Date(x.at).toISOString() }));
}
export const clearErrors = () => q("DELETE FROM error_log");

// What a person helping needs to know about the machine, with nothing private in it.
export async function systemInfo(version) {
  const one = async (sql) => { try { return (await q(sql)).rows[0] || {}; } catch { return {}; } };
  const counts = await one("SELECT (SELECT count(*) FROM accounts)::int AS accounts, (SELECT count(*) FROM transactions)::int AS transactions, (SELECT min(date)::text FROM transactions) AS first_tx, (SELECT max(date)::text FROM transactions) AS last_tx");
  let runs = [];
  try { runs = (await q("SELECT DISTINCT ON (source) source, finished_at, ok, message FROM sync_runs WHERE finished_at IS NOT NULL ORDER BY source, id DESC")).rows.map((r) => ({ source: r.source, at: r.finished_at && new Date(r.finished_at).toISOString(), ok: r.ok, message: scrubText(r.message || "").slice(0, 300) })); } catch { /* none yet */ }
  const off = -new Date().getTimezoneOffset();
  return {
    app: version || "", mode: process.env.DB_DRIVER === "pglite" ? "Windows app (built-in database)" : "Docker / server (PostgreSQL)",
    platform: process.platform, arch: process.arch, os: `${os.type()} ${os.release()}`, node: process.versions.node, electron: process.versions.electron || "",
    chrome: (process.env.PUPPETEER_EXECUTABLE_PATH || "").split(/[\\/]/).slice(-3).join("/"),
    cpus: os.cpus().length, memoryMB: Math.round(os.totalmem() / 1048576), freeMB: Math.round(os.freemem() / 1048576), uptimeMin: Math.round(process.uptime() / 60),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, utcOffset: `UTC${off >= 0 ? "+" : "-"}${Math.floor(Math.abs(off) / 60)}${off % 60 ? ":" + String(Math.abs(off) % 60).padStart(2, "0") : ""}`,
    data: counts, lastSyncs: runs,
  };
}
