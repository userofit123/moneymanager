// The phone app's navigation, as plain data: one stack of screens per tab, and the address that each screen has.
// The address is the source of truth (Back, Forward, links and alerts all change it): showUrl() makes the stacks follow it.
// A screen is { name, id, url } (id: what a pushed screen shows, like the account id).
import { SCREENS, TABS, PUSHED } from "./screens.js";
import { matchPage } from "../router.js";
import { pages } from "../routes.js";

const pathOf = (name) => (name === "more" ? "/more" : pages.find((p) => p.name === name)?.path || "/");
export const tabOf = (name) => SCREENS[name]?.tab || "more";

// "/accounts?id=4&tx=9" → the More tab with More, Accounts, the account and the transaction
export function stackOf(url) {
  const [path, search = ""] = String(url || "/").split("?");
  const q = new URLSearchParams(search);
  const page = path.replace(/^\/+|\/+$/g, "") === "more" ? "more" : matchPage(path).name;
  const tab = tabOf(page), base = pathOf(page);
  const stack = [{ name: tab, id: null, url: pathOf(tab) }];
  if (page !== tab) stack.push({ name: page, id: null, url: base });
  const kept = new URLSearchParams();
  for (const n of PUSHED) {
    const s = SCREENS[n], v = q.get(s.param);
    if (v == null || v === "" || (s.on && s.on !== page)) continue;
    kept.set(s.param, v);
    stack.push({ name: n, id: v, url: base + "?" + kept.toString() });
  }
  return { tab, stack };
}

// the address of a screen pushed on top of `from` (a screen's url), like the transaction 9 on the account page
export function pushUrl(from, name, id) {
  const s = SCREENS[name];
  if (!s?.param) return pathOf(name);
  const [path, search = ""] = String(from).split("?"), q = new URLSearchParams(search);
  q.set(s.param, id);
  return (s.on ? pathOf(s.on) : path) + "?" + q.toString();
}

export function createNav(url = "/") {
  const nav = { tab: "home", stacks: Object.fromEntries(TABS.map((t) => [t, [{ name: t, id: null, url: pathOf(t) }]])) };
  showUrl(nav, url);
  return nav;
}
export const top = (nav, tab = nav.tab) => nav.stacks[tab][nav.stacks[tab].length - 1];
export const rootUrl = (tab) => pathOf(tab);

// Makes the stacks show this address. Returns how it got there: "push" (one or more screens deeper), "pop" (back to a screen
// in the stack), "tab" (another tab), "none" (already there). A screen already in the tab's stack keeps its place (and scroll).
export function showUrl(nav, url) {
  const { tab, stack } = stackOf(url), cur = nav.stacks[tab], at = cur.findIndex((s) => s.url === stack[stack.length - 1].url);
  const was = nav.tab;
  nav.tab = tab;
  if (at >= 0) {
    const popped = at < cur.length - 1;
    cur.splice(at + 1);
    return was !== tab ? "tab" : popped ? "pop" : "none";
  }
  // keep the screens that are the same, so their scroll is remembered
  const keep = stack.map((s, i) => (cur[i] && cur[i].url === s.url ? cur[i] : s));
  const deeper = keep.length >= cur.length;
  nav.stacks[tab] = keep;
  return was !== tab ? "tab" : deeper ? "push" : "pop";
}

// What a phone screen can ask for (given by PhoneApp): push(name, id), back(), tab(name), and its own place in the stack
// (given by ScreenHost: the screen, the one under it and whether it is the tab's first screen).
import { inject } from "vue";
export const NAV_KEY = Symbol("phoneNav"), SCREEN_KEY = Symbol("phoneScreen");
export const usePhoneNav = () => inject(NAV_KEY);
export const useScreen = () => inject(SCREEN_KEY, { entry: null, under: null });
