// The app as an installed app: the service worker (/sw.js, which keeps a copy for offline use and shows phone notifications),
// and the browser's "install" offer, kept for the Install buttons (beforeinstallprompt).
import { ref, shallowRef } from "vue";
export const installPrompt = shallowRef(null);
export const swOk = ref(false); // the service worker is running (needed for phone notifications)
export function startPwa() {
  if (typeof window === "undefined") return;
  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installPrompt.value = e; });
  addEventListener("appinstalled", () => { installPrompt.value = null; });
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("/sw.js").then(() => { swOk.value = true; }).catch(() => {});
}
export async function install() {
  const p = installPrompt.value; if (!p) return;
  installPrompt.value = null;
  try { await p.prompt(); } catch { /* the browser said no */ }
}
// A notification on this device, through the service worker. Returns false when not allowed.
export async function notify(title, body) {
  if (!("Notification" in window) || Notification.permission != "granted") return false;
  try {
    const reg = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
    if (reg && reg.active) { reg.active.postMessage({ type: "notify", title, body }); return true; }
    new Notification(title, { body }); return true;
  } catch { return false; }
}
