// Loads the current app's own scripts (web/) in Node with a stand-in page, so tests can run the old code
// on the same data as the new code and compare the results. The clock is fixed at `now`.
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WEB = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../web");
// Anything the page asks for (elements, styles, events) gives back a harmless stand-in.
const stub = () => { const f = function () { return P; }; const P = new Proxy(f, { get: (t, k) => (k === Symbol.toPrimitive ? () => "" : k === Symbol.iterator ? function* () {} : k === "length" ? 0 : P), set: () => true, apply: () => P, construct: () => P, has: () => false }); return P; };

export function oldApp(now) {
  const RD = Date, T = now.getTime();
  class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(T); } static now() { return T; } }
  const ls = {}, ctx = { console: { log() {}, warn() {}, error() {} }, Date: FD, Math, JSON, Intl, Promise, URLSearchParams, structuredClone, queueMicrotask,
    setTimeout: () => 0, clearTimeout: () => 0, setInterval: () => 0, requestAnimationFrame: () => 0, fetch: () => new Promise(() => {}),
    localStorage: { getItem: (k) => ls[k] ?? null, setItem: (k, v) => { ls[k] = v; } }, confirm: () => true, prompt: () => null, alert: () => {},
    document: stub(), navigator: stub(), location: stub(), matchMedia: () => stub(), addEventListener: () => {}, innerWidth: 1200 };
  for (const k of ["MutationObserver", "ResizeObserver", "IntersectionObserver", "EventSource", "HTMLSelectElement", "HTMLInputElement", "HTMLElement", "Element", "Node", "NodeFilter", "Event", "CustomEvent", "Image", "Blob", "FileReader", "Worker", "BroadcastChannel", "Notification"]) ctx[k] = stub();
  ctx.window = ctx.self = ctx.globalThis = ctx;
  vm.createContext(ctx);
  const files = ["he-core.js", "he-text.js", "he-rules.js", "brands.js", "recap.js", "help.js", "help-he.js", ...fs.readdirSync(WEB + "/js").sort().map((x) => "js/" + x)];
  // The page's start-up code fails without a real browser; the functions the tests need are defined before that.
  for (const f of files) { try { vm.runInContext(fs.readFileSync(WEB + "/" + f, "utf8"), ctx, { filename: f }); } catch { /* start-up code only */ } }
  return { Date: FD, run: (code, vars = {}) => { Object.assign(ctx, vars); return vm.runInContext(code, ctx); } };
}
