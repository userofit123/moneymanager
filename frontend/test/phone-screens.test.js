// Every page has a phone screen: each page in the menu (routes.js) and each pushed screen is in phone/screens.js,
// its file exists, its name has a text in English and Hebrew, and every screen's stylesheet is loaded.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { pages } from "../src/routes.js";
import { SCREENS, TABS } from "../src/phone/screens.js";
import { loadLocale } from "./load-locales.js";

const fileOf = (s) => s.load.toString().match(/import\(["']([^"']+)["']\)/)[1];
const get = (o, k) => k.split(".").reduce((x, p) => (x == null ? x : x[p]), o);

test("every page in the menu has a phone screen, and every tab is a screen", () => {
  for (const p of pages.filter((x) => x.nav)) assert.ok(SCREENS[p.name], `no phone screen for the ${p.name} page`);
  for (const t of TABS) assert.equal(SCREENS[t]?.tab, t, `the ${t} tab has no screen of its own`);
});

test("every screen's file exists; pushed screens say which address part holds what they show", () => {
  for (const [n, s] of Object.entries(SCREENS)) {
    assert.ok(existsSync(new URL("../src/phone/" + fileOf(s).replace(/^\.\//, ""), import.meta.url)), `${n}: ${fileOf(s)} is missing`);
    assert.ok(s.tab || s.param, `${n} is neither a page in a tab nor a pushed screen`);
    if (s.on) assert.ok(SCREENS[s.on], `${n} is pushed on an unknown page ${s.on}`);
  }
});

test("every screen's name has a text in English and Hebrew", () => {
  const en = loadLocale("en"), he = loadLocale("he");
  for (const [n, s] of Object.entries(SCREENS)) for (const [L, m] of [["en", en], ["he", he]]) assert.equal(typeof get(m, s.title), "string", `${n}: ${s.title} has no ${L} text`);
  for (const t of TABS) for (const m of [en, he]) assert.ok(get(m, "phone.shell.tabs." + t), `tab ${t} has no name`);
});

test("phone/styles/index.css loads the sizes, page, building blocks, the adopted computer windows and every screen's stylesheet", () => {
  const index = readFileSync(new URL("../src/phone/styles/index.css", import.meta.url), "utf8");
  const imports = [...index.matchAll(/@import "\.\/([^"]+)";/g)].map((m) => m[1]);
  assert.deepEqual(imports.slice(0, 4), ["tokens.css", "base.css", "components.css", "adopted.css"]);
  const screens = readdirSync(new URL("../src/phone/styles/screens/", import.meta.url)).map((f) => "screens/" + f);
  assert.deepEqual(imports.slice(4).sort(), screens.sort());
  assert.match(readFileSync(new URL("../src/phone/PhoneApp.vue", import.meta.url), "utf8"), /import "\.\/styles\/index\.css"/);
});
