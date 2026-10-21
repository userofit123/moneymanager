// Errors in the page are sent to the server's error log (Settings → Error log):
// at most 25 per page load, each message once, with the last clicks so it is clear what was being done. Nothing is sent before sign-in.
import { request, sendJson } from "./http.js";
import { i18n } from "../i18n.js";
import { data } from "../stores/data.js";
import { current } from "../router.js";

const ACTS = [], SEEN = new Set();
let sent = 0, wired = false;
// the last 15 clicks on the app's own buttons (their data-a names), with the time
const pushAct = (a) => { ACTS.push(new Date().toTimeString().slice(0, 8) + " " + a); if (ACTS.length > 15) ACTS.shift(); };

export function reportErr(message, stack, action) {
  try {
    if (!data.state.value || sent >= 25) return;
    const msg = String(message || "").slice(0, 1000);
    if (!msg || /ResizeObserver|^Script error\.?$/.test(msg) || SEEN.has(msg)) return;
    SEEN.add(msg); sent++;
    request("/api/errors", { ...sendJson("POST", { message: msg, stack: String(stack || "").slice(0, 8000), action: action || "Error in the page", view: current.value?.name || "", ua: navigator.userAgent, screen: innerWidth + "x" + innerHeight, lang: i18n.global.locale.value === "he" ? "he" : "en", actions: ACTS.slice() }), keepalive: true }).catch(() => {});
  } catch { /* reporting must never break the page */ }
}

// For app.config.errorHandler: an error inside a Vue component. It still shows in the console.
export function vueError(err, _vm, info) {
  console.error(err);
  reportErr(err && err.message ? err.message : String(err), err && err.stack, "Error in the page" + (info ? " (" + info + ")" : ""));
}

export function startErrors() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  document.addEventListener("click", (e) => { const el = e.target.closest && e.target.closest("[data-a]"); if (!el) return; const d = el.dataset; pushAct(d.a + (d.t ? ":" + d.t : "") + (d.v && d.a == "nav" ? ":" + d.v : "") + (d.m ? ":" + d.m : "")); }, true);
  addEventListener("error", (e) => reportErr(e.message, e.error && e.error.stack, "Error in the page" + (e.filename ? " (" + String(e.filename).split("/").pop() + ":" + e.lineno + ")" : "")));
  addEventListener("unhandledrejection", (e) => { const r = e.reason; reportErr((r && r.message) || String(r), r && r.stack, "Unhandled error in the page"); });
}

// One line in main.js: withErrors(createApp(App)) reports component errors and starts listening for the others.
export function withErrors(app) { app.config.errorHandler = vueError; startErrors(); return app; }
