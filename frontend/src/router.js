// A very small router: the address after /app picks the page, links change the address without reloading,
// and Back and Forward work. The same pages and addresses as the current app.
import { ref, computed } from "vue";
import { BASE, pages } from "./routes.js";

// "/app/activity/" → the Activity page. "/app" or an unknown address → Home.
export function matchPage(pathname, list = pages, base = BASE) {
  let p = String(pathname || "").split(/[?#]/)[0];
  if (p.startsWith(base)) p = p.slice(base.length);
  p = "/" + p.replace(/^\/+|\/+$/g, "");
  return list.find((x) => x.path === p) || list.find((x) => x.name === "home");
}
export const hrefOf = (page, base = BASE) => base + page.path;

const path = ref(typeof location !== "undefined" ? location.pathname : BASE + "/home");
export const current = computed(() => matchPage(path.value));

export function go(to, { replace = false } = {}) {
  const url = to.startsWith(BASE) ? to : BASE + to;
  if (url === location.pathname) return;
  history[replace ? "replaceState" : "pushState"]({}, "", url);
  path.value = location.pathname;
  window.scrollTo(0, 0);
}
export function startRouter() {
  addEventListener("popstate", () => { path.value = location.pathname; });
  // "/app/" alone shows Home at its own address.
  // (the ?query and #hash stay, so links like ?add=1 still work)
  if (matchPage(location.pathname).path !== location.pathname.replace(BASE, "").replace(/\/+$/, "")) { history.replaceState({}, "", hrefOf(matchPage(location.pathname)) + location.search + location.hash); path.value = location.pathname; }
}
// For <a href> links inside the app: an ordinary click stays in the app, Ctrl or middle click still opens a new tab.
export function onLink(e) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.currentTarget;
  e.preventDefault();
  go(a.getAttribute("href"));
}
