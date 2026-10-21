// What every section of Settings uses. Ported from the current app: api() is web/js/02-state-data.js api(), toast() is
// web/js/07-periods-rules.js toast(), and changeState() saves like Budgets and Jars do (change a copy, send the whole state, load the fresh copy).
import { ref } from "vue";
import { data } from "../../stores/data.js";

// A call to the server. Throws an Error with the server's own message when it says no.
export async function api(path, opt) {
  const r = await fetch(path, opt);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "HTTP " + r.status);
  return j;
}
// fetch options for a JSON body: api("/x", sendJson("PUT", { a: 1 }))
export const sendJson = (method, body) => ({ method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });

// ---- the little messages at the bottom of the page (ToastHost.vue shows them) ----
export const toasts = ref([]);
let toastId = 0;
// toast(text, { kind: "ok" | "err" | "info", title, undo: fn, actions: [{ label, run }], sticky: "key", ms })
// The old app guessed ok/err from the English words; the new one is told, because the text may be Hebrew.
export function toast(m, o = {}) {
  const kind = o.kind || (/…$|\.\.\.$/.test(String(m)) ? "info" : "ok");
  if (o.sticky) toasts.value = toasts.value.filter((x) => x.sticky !== o.sticky);
  const item = { id: ++toastId, m: String(m), kind, title: o.title || "", undo: o.undo || null, actions: o.actions || [], sticky: o.sticky || "", out: false };
  toasts.value = [...toasts.value, item].slice(-4);
  if (!o.sticky) setTimeout(() => dismissToast(item.id, true), o.ms || (kind === "info" ? 2600 : o.undo ? 6500 : 3800));
  return item.id;
}
export const toastErr = (m, o = {}) => toast(m instanceof Error ? m.message : m, { ...o, kind: "err" });
export function dismissToast(id, fade) {
  if (!fade) { toasts.value = toasts.value.filter((x) => x.id !== id); return; }
  const t = toasts.value.find((x) => x.id === id);
  if (!t) return;
  t.out = true; toasts.value = [...toasts.value];
  setTimeout(() => { toasts.value = toasts.value.filter((x) => x.id !== id); }, 260);
}
export const clearToast = (key) => { toasts.value = toasts.value.filter((x) => x.sticky !== key); };

// ---- saving a change to the user's data ----
// edit(copy) changes the copy and returns a list of change-history lines [[action, detail, undo?], ...] (or false to stop).
// Returns true when the server took it.
export async function changeState(edit) {
  const cur = data.state.value;
  if (!cur) return false;
  const next = structuredClone(cur), r = edit(next);
  if (r === false) return false;
  const at = new Date().toISOString();
  if (r && r.length) next.audit = [...r.map(([a, d, u]) => ({ t: at, who: "You", action: a, detail: d, undo: u || null })).reverse(), ...(next.audit || [])].slice(0, 2000);
  data.state.value = next;
  let ok = false, err = "";
  try {
    const res = await fetch("/api/state", sendJson("PUT", next));
    ok = res.ok;
    if (!ok) err = res.status === 409 ? "stale" : "failed";
  } catch { err = "failed"; }
  await data.load();
  if (!ok) throw new Error(err);
  return true;
}
