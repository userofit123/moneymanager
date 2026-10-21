// A very small router: the address picks the page, links change the address without reloading,
// and Back and Forward work.
import { ref, computed } from "vue";
import { SHORT, pages } from "./routes.js";

// "/activity/" → the Activity page; "/fc" (a short name) → Forecast; "/" or an unknown address → Home.
export function matchPage(pathname, list = pages) {
  const p = String(pathname || "").split(/[?#]/)[0].replace(/^\/+|\/+$/g, ""), name = SHORT[p] || p;
  return list.find((x) => x.name === name) || list.find((x) => x.name === "home");
}
export const hrefOf = (page) => page.path;

const path = ref(typeof location !== "undefined" ? location.pathname : "/");
export const current = computed(() => matchPage(path.value));

export function go(to, { replace = false } = {}) {
  // the page that is already open: only back to its top
  if (to === location.pathname) { window.scrollTo(0, 0); return; }
  history[replace ? "replaceState" : "pushState"]({}, "", to);
  path.value = location.pathname;
  window.scrollTo(0, 0);
}
export function startRouter() {
  // Back and Forward to another page start at its top (the browser's own scroll memory is off)
  try { history.scrollRestoration = "manual"; } catch { /* old browsers */ }
  addEventListener("popstate", () => { const was = current.value; path.value = location.pathname; if (current.value !== was) window.scrollTo(0, 0); });
  // a short or unknown address shows its page at the page's own address (the ?query and #hash stay, so links like ?add=1 still work)
  const pg = matchPage(location.pathname);
  if (pg.path !== location.pathname) { history.replaceState({}, "", hrefOf(pg) + location.search + location.hash); path.value = location.pathname; }
}
// For <a href> links inside the app: an ordinary click stays in the app, Ctrl or middle click still opens a new tab.
export function onLink(e) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.currentTarget;
  e.preventDefault();
  go(a.getAttribute("href"));
}
