// New versions: the "Update available" button in the menu, the update card in Settings → Version and updates,
// and the "has been updated" window after an update.
import { reactive } from "vue";
import { getJson } from "./http.js";
import { readPref, writePref } from "./prefs.js";
import { i18n } from "../i18n.js";
import { downloads } from "../lib/downloads.js";

// status: idle | checking | uptodate | available | downloading | ready | installing | error. The desktop app reports its own.
export const UP = reactive({ cur: "", latest: "", status: "idle", percent: 0, notes: "", url: "", err: "", none: false, auto: true, manual: false });

export async function upWeb(force) {
  if (force) UP.status = "checking";
  try {
    const j = await getJson("/api/update-check" + (force ? "?force=1" : ""));
    Object.assign(UP, { cur: j.current, latest: j.latest, status: j.available ? "available" : j.reachable ? "uptodate" : force ? "error" : "idle", err: j.reachable ? "" : j.error ? "(" + j.error + ")" : i18n.global.t("upd.noGithub"), none: !!(j.reachable && !j.latest), notes: j.notes || "", url: j.url || "" });
    // the phone app: a ready download older than the newest version gives way to it, so Install never installs an older one
    if (APP.staged && UP.latest && vNewer(UP.latest, APP.staged)) appForget();
  } catch { if (force) { UP.status = "error"; UP.err = i18n.global.t("upd.noGithub"); } }
}
function fromDesk(s) {
  if (UP.status == "installing") return;
  Object.assign(UP, { cur: s.current, status: s.status, latest: s.version, percent: s.percent || 0, notes: s.notes || "", auto: s.auto !== false, manual: !!s.manual, err: s.error || "" });
}
// ---- the phone app updating itself (window.mmApp.update, android Updater.kt) ----
// The newest version comes from the same check as the server's (UP.latest). Download fetches the APK with a progress bar,
// then Install hands it to Android's installer (which asks to confirm). A file downloaded before the app was closed is offered as Install.
// status: idle | checking | downloading | ready | error. err is a text key (updAllow, updDamaged, updFailed).
// auto, wifiOnly: the person's choices "Download updates automatically" and "Only on Wi-Fi" (kept by the app, Updater.kt);
// known is false until the app has told them (an older app has no such choices).
export const APP = reactive({ status: "idle", percent: -1, mb: 0, staged: "", err: "", version: "", auto: false, wifiOnly: true, known: false });
const appUpd = () => (typeof window !== "undefined" && window.mmApp && window.mmApp.update) || null;
// a newer version than the app on this phone exists
export const appBehind = () => !!(typeof window !== "undefined" && window.mmApp && UP.latest && vNewer(UP.latest, String(window.mmApp.version).split("-")[0]));
export async function appCheck() {
  if (APP.status === "downloading") return;
  APP.status = "checking";
  await upWeb(true);
  APP.status = APP.staged ? "ready" : "idle";
  appAuto();
}
const errKey = (e) => (/^upd\w+$/.test(e && e.message) ? e.message : "updFailed");
// the size can be unknown (-1): the megabytes so far show instead of a share
const onProgress = (done, total) => { APP.percent = total > 0 ? Math.round((done * 100) / total) : -1; APP.mb = Math.round(done / 1e5) / 10; };
let lastFail = 0;
// shows a download until it ends: the ready version, or the error
async function follow(v, run) {
  Object.assign(APP, { status: "downloading", version: v, err: "" });
  try { const got = await run(); Object.assign(APP, { status: "ready", staged: got || v }); lastFail = 0; }
  catch (e) { Object.assign(APP, { status: "error", err: errKey(e) }); lastFail = Date.now(); }
}
export async function appDownload() {
  const u = appUpd(); if (!u || APP.status === "downloading" || !UP.latest) return;
  const v = UP.latest, file = downloads("android", v)[0];
  Object.assign(APP, { percent: -1, mb: 0 });
  await follow(v, () => u.download(file.href, v, onProgress));
}
// The page opened again (or reloaded) while the app was still downloading: the progress bar comes back.
function resume(s) {
  const u = appUpd();
  onProgress(s.done || 0, s.total == null ? -1 : s.total);
  follow(s.running, () => u.watch(onProgress));
}
// "Download updates automatically": a newer version found by a check downloads by itself, then waits for the person to tap Install.
// "Only on Wi-Fi": on mobile data it waits (looked at again every 15 minutes). A failed download is tried again after 15 minutes.
const RETRY = 15 * 6e4;
let appKnown = Promise.resolve(); // what the app said at the start (a running or ready download), so a second download never starts
async function appAuto() {
  await appKnown;
  const u = appUpd(); if (!u || !u.choices || !APP.auto || !appBehind()) return;
  if (!(APP.status === "idle" || (APP.status === "error" && Date.now() - lastFail >= RETRY))) return;
  if (APP.wifiOnly) { const c = await u.choices().catch(() => null); if (!c || c.metered) return; }
  if (APP.status === "idle" || APP.status === "error") appDownload();
}
export async function appSetChoices(auto, wifiOnly) {
  const u = appUpd(); if (!u || !u.setChoices) return;
  Object.assign(APP, { auto, wifiOnly });
  try { const c = await u.setChoices(auto, wifiOnly); Object.assign(APP, { auto: !!c.auto, wifiOnly: !!c.wifiOnly }); } catch { /* the switch shows what was asked */ }
  appAuto();
}
export async function appInstall() {
  const u = appUpd(); if (!u) return;
  APP.err = "";
  try { await u.install(); } catch (e) { APP.err = /^upd\w+$/.test(e && e.message) ? e.message : "updFailed"; }
}
function appForget() {
  Object.assign(APP, { status: "idle", staged: "" });
  appUpd()?.forget().catch(() => {});
}

let started = false;
export function startUpdates() {
  if (started) return; started = true;
  getJson("/api/version").then((j) => { if (!UP.cur && j && j.version) UP.cur = j.version; }).catch(() => {});
  const u = appUpd();
  if (u) {
    // a download still running (the page was reloaded mid-way) shows its progress again; a finished one is offered as Install
    appKnown = (u.state ? u.state() : u.staged().then((v) => ({ staged: v }))).then((s) => {
      if (s.running && APP.status === "idle") resume(s);
      else if (s.staged && APP.status === "idle") { Object.assign(APP, { status: "ready", staged: s.staged }); if (UP.latest && vNewer(UP.latest, s.staged)) appForget(); }
    }).catch(() => {});
    if (u.choices) u.choices().then((c) => { Object.assign(APP, { auto: !!c.auto, wifiOnly: !!c.wifiOnly, known: true }); appAuto(); }).catch(() => {});
    setInterval(appAuto, RETRY);
    window.addEventListener("online", appAuto);
  }
  if (window.desktop) { window.desktop.onUpdate((s) => fromDesk(s)); window.desktop.getUpdate().then(fromDesk).catch(() => {}); }
  else { upWeb().then(appAuto); setInterval(() => upWeb().then(appAuto), 6 * 36e5); }
}

// ---- the change log ----
export const vNewer = (a, b) => { const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
function relParse(t) {
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
  return { cur, secs: secs.map((r) => ({ v: r.v, html: mdLite(r.body.replace(/^- (?:Includes everything above|כולל את כל האמור לעיל)\.?\s*$/gm, "").replace(/^### .*\n/gm, "")) })) };
}
export const markSeen = (v) => writePref("moneySeenV", v);
