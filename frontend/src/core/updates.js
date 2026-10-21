// New versions: the "Update available" button in the menu, the update card in Settings → Version and updates,
// and the "has been updated" window after an update.
import { reactive } from "vue";
import { getJson } from "./http.js";
import { readPref, writePref } from "./prefs.js";
import { i18n } from "../i18n.js";

// status: idle | checking | uptodate | available | downloading | ready | installing | error. The desktop app reports its own.
export const UP = reactive({ cur: "", latest: "", status: "idle", percent: 0, notes: "", url: "", err: "", none: false, auto: true });

export async function upWeb(force) {
  if (force) UP.status = "checking";
  try {
    const j = await getJson("/api/update-check" + (force ? "?force=1" : ""));
    Object.assign(UP, { cur: j.current, latest: j.latest, status: j.available ? "available" : j.reachable ? "uptodate" : force ? "error" : "idle", err: j.reachable ? "" : j.error ? "(" + j.error + ")" : i18n.global.t("upd.noGithub"), none: !!(j.reachable && !j.latest), notes: j.notes || "", url: j.url || "" });
  } catch { if (force) { UP.status = "error"; UP.err = i18n.global.t("upd.noGithub"); } }
}
function fromDesk(s) {
  if (UP.status == "installing") return;
  Object.assign(UP, { cur: s.current, status: s.status, latest: s.version, percent: s.percent || 0, notes: s.notes || "", auto: s.auto !== false, err: s.error || "" });
}
let started = false;
export function startUpdates() {
  if (started) return; started = true;
  getJson("/api/version").then((j) => { if (!UP.cur && j && j.version) UP.cur = j.version; }).catch(() => {});
  if (window.desktop) { window.desktop.onUpdate((s) => fromDesk(s)); window.desktop.getUpdate().then(fromDesk).catch(() => {}); }
  else { upWeb(); setInterval(upWeb, 6 * 36e5); }
}

// ---- the change log ----
export const vNewer = (a, b) => { const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
export function relParse(t) {
  const out = [];
  String(t).split(/^(?=## \[)/m).forEach((b) => { const m = b.match(/^## \[?v?(\d+\.\d+\.\d+)\]?(?:\s*-\s*([^\n]*))?/); if (!m) return; out.push({ v: m[1], date: (m[2] || "").trim(), body: b.slice(b.indexOf("\n") + 1) }); });
  return out;
}
// The versions with their notes, in Hebrew when the page is (CHANGELOG.md and CHANGELOG.he.md).
export function relPick(j, he = i18n.global.locale.value === "he") {
  const en = relParse((j && j.changelog) || "");
  if (!he || !j || !j.changelogHe) return en;
  const H = Object.fromEntries(relParse(j.changelogHe).map((r) => [r.v, r.body]));
  return en.map((r) => (H[r.v] ? { ...r, body: H[r.v] } : r));
}
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// A small part of Markdown, as the change log uses it.
export function mdLite(t) {
  let h = "", ul = false;
  const inl = (x) => esc(x).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`(.+?)`/g, "<code>$1</code>");
  String(t).split("\n").forEach((l) => {
    const m3 = l.match(/^### (.*)/), m2 = l.match(/^## (.*)/), li = l.match(/^- (.*)/);
    if (ul && !li) { h += "</ul>"; ul = false; }
    if (m2) h += `<h4 class="clv">${inl("⁦" + m2[1].replace(/[[\]]/g, "") + "⁩")}</h4>`;
    else if (m3) h += `<h5 class="cls">${inl(m3[1])}</h5>`;
    else if (li) { if (!ul) { h += '<ul class="cll">'; ul = true; } h += `<li>${inl(li[1])}</li>`; }
    else if (l.trim() && !/^# /.test(l)) h += `<p class="sm">${inl(l)}</p>`;
  });
  return h + (ul ? "</ul>" : "");
}

// What to show in the "has been updated" window: the versions since the one last seen here. Null when there is nothing to show.
// A brand-new install (no transactions yet) has nothing to be updated from.
export async function whatsNew(hasData) {
  let j; try { j = await getJson("/api/version"); } catch { return null; }
  const cur = j && j.version; if (!cur) return null;
  const seen = readPref("moneySeenV") || "";
  if (seen == cur) return null;
  if (!seen && !hasData) { writePref("moneySeenV", cur); return null; }
  const secs = relPick(j).filter((r) => !seen || vNewer(r.v, seen)).filter((r) => !vNewer(r.v, cur));
  if (!secs.length) { writePref("moneySeenV", cur); return null; }
  return { cur, secs: secs.map((r) => ({ v: r.v, html: mdLite(r.body.replace(/^### .*\n/gm, "")) })) };
}
export const markSeen = (v) => writePref("moneySeenV", v);
