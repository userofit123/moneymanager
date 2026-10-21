// The text that "Copy" puts on the clipboard in Settings → Error log.
// The report stays in English so it can be sent as it is.
import { i18n } from "../../i18n.js";
import { toast } from "../../core/toast.js";

export const errTime = (a) => new Date(a).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
export const SEP = "\n\n" + "-".repeat(40) + "\n";

export function errSysText(y = {}) {
  const L = [], c = y.data || {};
  L.push("Money Manager error report", "Generated: " + new Date().toISOString() + " (local " + new Date().toString().replace(/ GMT.*/, "") + ")", "");
  L.push("App version: " + (y.app || "?") + " · " + (y.mode || "?"), "System: " + (y.os || "?") + " · " + (y.platform || "") + " " + (y.arch || "") + " · " + (y.cpus || "?") + " CPUs · memory " + (y.freeMB || "?") + "/" + (y.memoryMB || "?") + " MB free", "Runtime: Node " + (y.node || "?") + (y.electron ? " · Electron " + y.electron : "") + (y.chrome ? " · bank browser " + y.chrome : ""), "Time zone: " + (y.timezone || "?") + " (" + (y.utcOffset || "") + ") · app running for " + (y.uptimeMin ?? "?") + " min");
  L.push("Data: " + (c.accounts ?? "?") + " accounts, " + (c.transactions ?? "?") + " transactions" + (c.first_tx ? " (" + c.first_tx + " to " + c.last_tx + ")" : ""));
  L.push("Window: " + navigator.userAgent, "Screen: " + innerWidth + "x" + innerHeight + " · language " + (i18n.global.locale.value === "he" ? "Hebrew" : "English") + " · " + (navigator.onLine ? "online" : "offline") + (matchMedia("(display-mode: standalone)").matches ? " · installed app" : ""));
  if ((y.lastSyncs || []).length) { L.push("", "Last sync of each connection:"); y.lastSyncs.forEach((r) => L.push("  " + r.source + ": " + (r.ok ? "ok" : "FAILED") + " " + (r.at || "") + (r.message ? " · " + r.message : ""))); }
  return L.join("\n");
}

export function errText(x) {
  const c = x.context || {}, L = [`#${x.id}  ${errTime(x.at)}  [${x.source}]`, "What was being done: " + (x.action || "—"), "Message: " + x.message];
  const ctx = Object.fromEntries(Object.entries(c).filter(([k]) => !["recent", "clientActions"].includes(k)));
  if (Object.keys(ctx).length) L.push("Context: " + JSON.stringify(ctx));
  if ((c.clientActions || []).length) L.push("Your last clicks in the app:", ...c.clientActions.map((a) => "  " + a));
  if ((c.recent || []).length) L.push("Last changes asked of the app:", ...c.recent.map((a) => "  " + a));
  if (x.detail) L.push("Details:", x.detail.split("\n").map((l) => "  " + l).join("\n"));
  return L.join("\n");
}
// has more than the message: show "Full details"
export const hasMore = (x) => !!(x.detail || (x.context && ((x.context.recent || []).length || (x.context.clientActions || []).length)));

export function copyText(t, msg) {
  const done = () => toast(msg || i18n.global.t("settings.err.copied"), { kind: "ok" });
  const fb = () => { const a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand("copy"); done(); } catch { /* nothing to do */ } a.remove(); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fb); else fb();
}
