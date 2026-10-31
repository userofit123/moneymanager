// All texts of one language, put together the way src/i18n.js does: locales/<lang>.json, locales/pages/<name>.<lang>.json under "<name>",
// locales/settings/<section>.<lang>.json under "settings.<section>" and locales/phone/<area>.<lang>.json under "phone.<area>".
import { readFileSync, readdirSync } from "node:fs";
const dirOf = (d) => new URL(`../src/locales/${d}/`, import.meta.url);
const files = (d, n) => Object.fromEntries(readdirSync(dirOf(d)).filter((f) => f.endsWith(`.${n}.json`)).map((f) => [f.slice(0, -`.${n}.json`.length), JSON.parse(readFileSync(new URL(f, dirOf(d)), "utf8"))]));
export function loadLocale(n) {
  const o = JSON.parse(readFileSync(new URL(`../src/locales/${n}.json`, import.meta.url), "utf8"));
  return { ...o, ...files("pages", n), settings: files("settings", n), phone: files("phone", n) };
}
