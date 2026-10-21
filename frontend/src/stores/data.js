// One shared copy of the user's data for the whole app, and the one place that saves it.
// Screens read from it and never fetch the data on their own, so every screen shows the same numbers and all of them update together.
// Saving works like the current app (web/js/02-state-data.js save/flush/flushNow/adopt/log): a change is made on a copy,
// written to the change history, shown at once, and sent to the server a moment later as the whole data with its version (rev).
// If the server has a newer version (a sync ran meanwhile), its copy is taken and the person is asked to repeat the change.
import { ref, shallowRef } from "vue";
import { connectLive } from "../live.js";
import { request, getJson, sendJson } from "../core/http.js";
import { sampleOn, sampleState } from "./sample.js";

const putState = async (S) => {
  const r = await request("/api/state", sendJson("PUT", S));
  const j = await r.json().catch(() => ({}));
  return { status: r.status, ok: r.ok, json: j };
};

export function createDataStore({ fetchJson = getJson, connect = connectLive, send = putState, delay = 400, settle = null, notify = () => {} } = {}) {
  const state = shallowRef(null); // what GET /api/state returns (accounts, tx, jars, budgets...)
  const loading = ref(false);
  const error = ref(null);
  const offline = ref(false);
  const saving = ref(false);
  // Exchange rates (GET /api/fx), loaded once with the data like loadFX() in the current app. fx.fx is { USD: 3.7, ... }.
  const fx = shallowRef({ fx: {}, series: {}, asOf: null, stale: false, live: false });
  let stop = null, busy = null, dirty = false, timer = null, failed = false;
  const hooks = { settle, notify };

  // Loads the data. Asking again while a load is running joins that load instead of starting another.
  function load() {
    if (busy) return busy;
    loading.value = true;
    busy = fetchJson("/api/state")
      .then((s) => { adopt(s); error.value = null; })
      .catch((e) => { error.value = e; })
      .finally(() => { loading.value = false; busy = null; });
    return busy;
  }
  // Takes the server's copy, then the app does its own upkeep on it (core/settle.js), saved like any change.
  function adopt(s) {
    state.value = s;
    resettle();
  }
  const resettle = () => { if (hooks.settle && state.value) change(() => [], { quiet: true }); };
  // Only loads again when the server's version changed, and never over a change that is not saved yet.
  async function refreshIfChanged() {
    if (dirty || saving.value) return;
    try {
      const { rev } = await fetchJson("/api/rev");
      if (dirty || saving.value) return;
      if (!state.value || rev !== state.value.rev) await load();
    } catch (e) { error.value = e; }
  }
  async function loadFx() {
    try {
      const j = await fetchJson("/api/fx");
      fx.value = { fx: j.fx || {}, series: j.series || {}, asOf: j.asOf, stale: !!j.stale, live: Object.values(j.series || {}).some((x) => x.length >= 2) };
      resettle(); // the held-back amount counts foreign money at the new rates
    } catch { /* no rates: foreign money counts at 1, and the pages say so */ }
  }
  async function start() {
    if (stop) return;
    stop = connect(refreshIfChanged);
    loadFx();
    await load();
  }
  function end() { stop?.(); stop = null; }

  // change(edit): edit(copy) changes a copy of the data and returns the change-history lines [[action, detail, undo?, who?], ...]
  // (or false to cancel). The copy is shown at once and saved shortly after. Returns the new history entries.
  function change(edit, { quiet = false } = {}) {
    const cur = state.value;
    if (!cur) return [];
    const next = structuredClone(cur);
    const lines = edit(next);
    if (lines === false) return [];
    // after every change the app's upkeep runs on the result, like renderAll() in the current app
    const upkeep = hooks.settle ? hooks.settle(next) || [] : [];
    const at = new Date().toISOString();
    const entries = [...(lines || []), ...upkeep].map(([action, detail, undo, who]) => ({ t: at, who: who || "You", action, detail: detail || "", undo: undo || null }));
    if (entries.length) next.audit = [...[...entries].reverse(), ...(next.audit || [])].slice(0, 2000);
    state.value = next;
    if (JSON.stringify(next) !== JSON.stringify(cur)) { dirty = true; schedule(delay); }
    const mine = entries.filter((e) => e.who !== "System");
    if (mine.length && !quiet) hooks.notify("saved", { entries: mine });
    return entries;
  }
  function schedule(ms) { clearTimeout(timer); timer = setTimeout(flush, ms); }

  async function flush() {
    if (saving.value || !dirty || !state.value) return;
    saving.value = true; dirty = false;
    const sent = state.value, fresh = (sent.audit || []).filter((a) => !a.id), edited = new Set((sent.jars || []).filter((x) => x.balEdit).map((x) => x.id));
    try {
      const r = await send(sent);
      if (r.status === 409) {
        state.value = r.json.state; // the server's copy wins; the person repeats the last change
        hooks.notify("stale");
        saving.value = false;
        resettle();
        return;
      }
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = r.json, now = state.value;
      // what the server gives back: the new version, the ids of the new history lines, and the jars after it filled them
      // The history lines sent without an id are the oldest of the lines still without one (newer lines are added in front), in the same order.
      const audit = [...(now.audit || [])], open = audit.map((a, i) => (a.id ? -1 : i)).filter((i) => i >= 0).slice(-fresh.length);
      if (fresh.length) open.forEach((at, k) => { const id = j.auditIds?.[k]; if (id != null) audit[at] = { ...audit[at], id }; });
      const next = { ...now, rev: j.rev, audit };
      // the typed jar balances are saved now, so their "just typed" marks go
      next.jars = (now.jars || []).map((x) => (edited.has(x.id) ? strip(x) : x));
      if (j.jars) next.jars = mergeJars(next.jars, j.jars, now === sent);
      state.value = next;
      if (j.filled) hooks.notify("filled", { n: j.filled });
      failed = false; offline.value = false;
      hooks.notify("clear", { key: "savefail" });
    } catch {
      failed = true; dirty = true;
      const off = typeof navigator !== "undefined" && navigator.onLine === false;
      offline.value = off;
      hooks.notify(off ? "offline" : "savefail");
      schedule(off ? 4000 : 8000);
    }
    saving.value = false;
    if (dirty && !failed) schedule(200);
  }
  // Waits for any save to finish. Used before calls that need the server to have the latest data.
  async function flushNow() {
    clearTimeout(timer);
    while (saving.value) await new Promise((r) => setTimeout(r, 40));
    if (dirty) await flush();
  }
  // A call to the server after the data is saved. Throws an Error with the server's own message when it says no.
  async function api(path, opt) {
    await flushNow();
    const r = await request(path, opt);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "HTTP " + r.status);
    return j;
  }
  // Undo one change from the history (the "undo" action of the current app).
  function undo(entry) {
    change((S) => {
      const e = (S.audit || []).find((x) => (entry.id != null ? x.id === entry.id : x.t === entry.t && x.action === entry.action && x.detail === entry.detail));
      const u = e && e.undo;
      if (!u) return false;
      if (u.type == "tx") { const t = S.tx.find((x) => x.id == u.id); if (t) t[u.f] = u.old; }
      else if (u.type == "budget") { if (u.old == null) delete S.budgets[u.k]; else S.budgets[u.k] = u.old; }
      else if (u.type == "merchant") { S.hiddenMerchants = (S.hiddenMerchants || []).filter((x) => x != u.name); }
      else if (u.type == "jar") {
        const j = S.jars.find((x) => x.id == u.id);
        if (j) { const was = j[u.f]; j[u.f] = u.old; if (u.f == "bal") { j.balEdit = true; if (u.old > was) { j.balUndo = 1; j.balNote = "Undone"; j.got = +((+j.got || 0) + (u.old - was)).toFixed(2); } } }
      }
      e.undo = null;
      return [["Undid a change", e.action + ": " + e.detail]];
    });
  }
  const isDirty = () => dirty;

  return { state, fx, loadFx, loading, error, offline, saving, load, start, end, change, flush, flushNow, api, undo, isDirty, hooks };
}

// The server sends the jars back after it fills them. A jar whose balance was just typed keeps the typed balance (like applyJars).
function mergeJars(mine, theirs, same) {
  if (same) return theirs.map((sj) => { const j = mine.find((x) => x.id == sj.id); return j ? { ...j, ...sj } : sj; });
  return mine.map((j) => {
    const sj = theirs.find((x) => x.id == j.id);
    if (!j.balEdit && sj) return { ...j, bal: sj.bal, got: sj.got, paid: sj.paid || 0, moves: sj.moves, ledger: sj.ledger };
    return sj ? { ...j, got: sj.got, paid: sj.paid || 0, moves: sj.moves, ledger: sj.ledger } : j;
  });
}
const strip = (j) => { const o = { ...j }; delete o.balEdit; delete o.balNote; delete o.balUndo; delete o.balPaid; return o; };

// ?sample=1 on the test site shows made-up data instead (see sample.js). Nothing is saved then.
export const data = sampleOn()
  ? createDataStore({ fetchJson: async (url) => (url === "/api/rev" ? { rev: "sample" } : url === "/api/fx" ? { fx: {}, series: {} } : sampleState()), connect: () => () => {}, send: async () => ({ status: 200, ok: true, json: { rev: "sample" } }) })
  : createDataStore();
