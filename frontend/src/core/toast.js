// The little messages at the bottom of the page (components/ToastHost.vue shows them).
// The caller says whether a message is good news or an error: the text may be Hebrew, so it cannot be guessed from the words.
import { ref } from "vue";

export const toasts = ref([]);
let toastId = 0;

// toast(text, { kind: "ok" | "err" | "info", title, undo: fn, actions: [{ label, run }], sticky: "key", ms })
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
