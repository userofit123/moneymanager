// Settings → Connections and Sync: the connected banks, cards and wallets, the automatic sync settings, and the live
// "Verify this device" window. From the current app (web/js/07-periods-rules.js loadConn, renderConn, connCard, connCall,
// assistStart/assistOpen/assistTick/assistPost/assistClose; web/js/05-accounts-charts-help.js connStart; the conn* cases in 08-jars.js).
// Kept outside the page so the Sync section, the verification window and the page all share one copy.
import { ref, shallowRef, computed, reactive } from "vue";
import { i18n } from "../../i18n.js";
import { data } from "../../stores/data.js";
import { getJson, sendJson, request } from "../../core/http.js";
import { toast, clearToast } from "../../core/toast.js";
import { tx } from "../../core/heText.js";
import { job, startJob, endJob, runJob } from "../../core/jobs.js";
import { sheetOpened, sheetClosed } from "../../core/sheets.js";
import { srcName } from "../../core/sources.js";

// texts of this section: ck("toast.saved") is settings.conn.toast.saved
const ck = (k, a) => i18n.global.t("settings.conn." + k, a || {});
const cte = (k) => i18n.global.te("settings.conn." + k);

export const CONN = shallowRef([]); // GET /api/connections
export const SYNC_SET = shallowRef(null); // GET /api/sync/settings
export const loaded = ref(false);
export const formOpen = ref(false); // the "+ Add connection" part is open
export const adding = ref([]); // sources picked to add, not saved yet (CONN_ADD); "x~2" is another login of x
export const openCards = reactive(new Set()); // connected cards whose settings are shown (CONN_OPEN)
// what is typed in each card: { [source]: { nick, f: { fieldKey: value } } }
export const typed = reactive({});

const zone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; } };
export async function loadConn() {
  try {
    CONN.value = await getJson("/api/connections");
    try {
      let s = await getJson("/api/sync/settings");
      const z = zone();
      if (z && s.tz !== z) s = await data.api("/api/sync/settings", sendJson("PUT", { tz: z }));
      SYNC_SET.value = s;
    } catch { /* keep the last */ }
    // a picked source drops out once it is saved (or, for another login, once the server has it)
    adding.value = adding.value.filter((x) => (x.includes("~") ? !CONN.value.some((c) => c.source == x && c.configured) : CONN.value.some((c) => c.source == x && !c.configured)));
    loaded.value = true;
  } catch { /* the page shows what it had */ }
}

// The texts the server sends (bank names, field names, state words) in the page's language.
// A card's name is the company's name, then " · nickname" when it has one.
export const provName = (c) => { const p = c.providerLabel || "", k = c.provider || c.source, l = String(c.label || ""); return p && cte("prov." + k) && l.startsWith(p) ? ck("prov." + k) + l.slice(p.length) : tx(l); };
export const companyOf = (c) => { const k = c.provider || c.source; return cte("prov." + k) ? ck("prov." + k) : tx(c.providerLabel || c.label); };
export const nameOf = (c) => (c.pendingOf ? ck("newLogin", { label: provName(c.pendingOf) }) : provName(c));
export const fieldName = (f) => (cte("field." + f.k) ? ck("field." + f.k) : tx(f.label));
export const stateName = (s) => (cte("st." + s.key) ? ck("st." + s.key) : tx(s.label));
export const TONE = { green: "dn", yellow: "am2", red: "up", gray: "fl" };
export const BAD = ["failed", "locked", "otp"];

// A login being added that the server has not seen yet (CONN_PEND).
export const pending = computed(() => adding.value.filter((x) => x.includes("~") && !CONN.value.some((c) => c.source == x)).map((x) => {
  const b = CONN.value.find((c) => c.source == x.split("~")[0]) || { fields: [], kind: "bank" };
  return { ...b, source: x, provider: b.source, extra: true, nickname: "", configured: false, locked: false, assistedAt: null, lastError: "", label: (b.providerLabel || b.label) + " · new login", pendingOf: b, status: { key: "none", label: "No credentials", tone: "gray" } };
}));
export const cards = computed(() => CONN.value.filter((c) => c.configured || adding.value.includes(c.source)).concat(pending.value));
export const avail = computed(() => CONN.value.filter((c) => !c.extra && !(!c.configured && adding.value.includes(c.source))));
export const nConnected = computed(() => CONN.value.filter((c) => c.configured).length);
export const nBad = computed(() => CONN.value.filter((c) => c.configured && BAD.includes(c.status.key)).length);

const find = (src) => CONN.value.find((c) => c.source == src) || pending.value.find((c) => c.source == src);
export const labelOf = (src) => { const c = find(src); return c ? nameOf(c) : srcName(src); };

// Starts adding a source: the first login of a company is its own card; a second one gets a new id from the server.
export async function connStart(v, after) {
  const go = (id) => { adding.value = [...adding.value, id]; after?.(id); };
  const base = CONN.value.find((c) => c.source == v);
  if (base && (base.configured || adding.value.includes(v))) {
    try { const r = await data.api(`/api/connections/${v}/new`, { method: "POST" }); go(r.source); } catch (e) { toast(tx(e.message), { kind: "err" }); }
  } else go(v);
}
export const connCancel = (src) => { adding.value = adding.value.filter((x) => x != src); delete typed[src]; };

// One call about a connection; then everything is read again. Returns the answer, or null when the server said no.
export async function connCall(src, path, method, body, msg) {
  try {
    const r = await data.api(`/api/connections/${src}${path}`, body ? sendJson(method, body) : { method });
    await loadConn();
    data.load().catch(() => {});
    if (msg) toast(msg);
    return r;
  } catch (e) { toast(tx(e.message), { kind: "err" }); return null; }
}
export function connSave(src) {
  const c = find(src) || { fields: [] }, v = typed[src] || { nick: c.nickname || "", f: {} }, body = {};
  c.fields.forEach((f) => { body[f.k] = v.f[f.k] || ""; });
  body.nickname = v.nick ?? "";
  const done = (r) => { if (r) typed[src] = { nick: body.nickname, f: {} }; };
  if (c.configured && c.fields.every((f) => !body[f.k])) return connCall(src, "/nickname", "PUT", { nickname: body.nickname || "" }, ck("toast.nick")).then(done);
  return connCall(src, "", "PUT", body, ck("toast.saved")).then(done);
}
export const connTest = (src) => runJob(src, "test", () => connCall(src, "/test", "POST", null));
export const connUnlock = (src) => connCall(src, "/unlock", "POST", null, ck("toast.unlocked"));
export function connDel(src) { if (confirm(ck("toast.confirmRemove"))) connCall(src, "", "DELETE", null, ck("toast.removed")); }
export async function connSync(src) {
  try {
    const r = await runJob(src, "sync", () => data.api(`/api/sync/${src}`, { method: "POST" }));
    if (!r) return;
    await data.load(); await loadConn();
    toast(r.ok ? ck("toast.synced", { n: r.added || 0 }) : r.error ? tx(r.error) : ck("toast.failed"), { kind: r.ok ? "ok" : "err" });
  } catch (e) { toast(tx(e.message), { kind: "err" }); }
}
export async function connHist(src, days) {
  try {
    const r = await runJob(src, "sync", () => data.api(`/api/sync/${src}?days=${days}`, { method: "POST" }));
    if (!r) return;
    await data.load(); await loadConn();
    const m = r.ok ? (r.message ? tx(r.message.charAt(0).toUpperCase() + r.message.slice(1)) : ck("toast.histNew", { n: r.added || 0 })) : r.error ? tx(r.error) : ck("toast.failed");
    toast(m, { kind: r.ok ? "ok" : "err", sticky: "hist" });
    setTimeout(() => clearToast("hist"), 12000);
  } catch (e) { toast(tx(e.message), { kind: "err" }); }
}

// ---- Automatic sync settings (data-c="syncset") ----
export async function syncSet(k, v) {
  if (v === "" || v == null) return;
  try {
    SYNC_SET.value = await data.api("/api/sync/settings", sendJson("PUT", { [k]: k == "at" ? v : +v, tz: zone() }));
    toast(i18n.global.t("settings.sync.saved"));
  } catch (e) { toast(tx(e.message), { kind: "err" }); }
}

// ---- "Verify this device": the bank's page in the app's own browser, shown live (#assist) ----
// AS = { src, label, fields, w, h }; the picture is fetched every 800 ms while it is open.
export const AS = shallowRef(null);
export const shot = ref(""); // the current picture (an object URL)
let timer = null, busy = false;
const closeByBack = () => assistClose(); // the phone's Back button closes it, like the current app

export async function assistStart(src) {
  if (job.value) { toast(i18n.global.t("sync.waitFirst"), { kind: "err" }); return; }
  startJob(src, "assist");
  toast(ck("toast.opening"), { kind: "info" });
  try { await data.api(`/api/connections/${src}/assist/start`, { method: "POST" }); assistOpen(src); } catch (e) { endJob(); toast(tx(e.message), { kind: "err" }); }
}
export function assistOpen(src) {
  const c = find(src) || { fields: [] };
  if (AS.value) return;
  AS.value = { src, label: labelOf(src), fields: c.fields || [], w: 1024, h: 768 };
  shot.value = "";
  sheetOpened(closeByBack);
  assistTick();
  timer = setInterval(assistTick, 800);
}
export async function assistTick() {
  if (!AS.value || busy) return;
  busy = true;
  try {
    const r = await request("/api/assist/screen?" + Date.now(), { cache: "no-store" });
    if (r.status == 409) { assistClose(); toast(ck("toast.assistGone"), { kind: "err" }); return; }
    if (!r.ok) throw 0;
    const u = URL.createObjectURL(await r.blob()), old = shot.value;
    shot.value = u;
    if (old) setTimeout(() => URL.revokeObjectURL(old), 500);
  } catch { /* the next tick tries again */ }
  busy = false;
}
export async function assistPost(path, body) {
  try { await data.api("/api/assist/" + path, sendJson("POST", body || {})); if (AS.value) { busy = false; setTimeout(assistTick, 250); } } catch (e) { toast(tx(e.message), { kind: "err" }); }
}
export function assistClose() {
  if (AS.value) { clearInterval(timer); AS.value = null; sheetClosed(closeByBack); }
  busy = false;
  if (shot.value) { URL.revokeObjectURL(shot.value); shot.value = ""; }
  endJob();
  loadConn();
  data.load().catch(() => {});
}
// Close (cancel) or "Done · I am logged in".
export async function assistStop(cancel) {
  try { await data.api("/api/assist/stop", { method: "POST" }); toast(cancel ? ck("toast.closed") : ck("toast.assistSaved")); } catch (e) { toast(tx(e.message), { kind: "err" }); }
  assistClose();
}
