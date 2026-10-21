// Every English text must have a Hebrew text (and the other way round), and none may be empty.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const load = (n) => {
  const o = JSON.parse(readFileSync(new URL(`../src/locales/${n}.json`, import.meta.url), "utf8"));
  // The Settings texts are one file per section, filed under settings.<section> (see src/i18n.js).
  const dir = new URL("../src/locales/settings/", import.meta.url);
  o.settings = Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith(`.${n}.json`)).map((f) => [f.slice(0, -`.${n}.json`.length), JSON.parse(readFileSync(new URL(f, dir), "utf8"))]));
  return o;
};
const flat = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, p + k + ".") : [[p + k, v]]));
const en = Object.fromEntries(flat(load("en")));
const he = Object.fromEntries(flat(load("he")));

test("every English text has a Hebrew text", () => {
  const missing = Object.keys(en).filter((k) => !(k in he));
  assert.deepEqual(missing, [], "Missing in he.json: " + missing.join(", "));
});
test("no Hebrew text is left over without an English one", () => {
  const extra = Object.keys(he).filter((k) => !(k in en));
  assert.deepEqual(extra, [], "Only in he.json: " + extra.join(", "));
});
test("no text is empty, and Hebrew texts contain Hebrew letters", () => {
  for (const [k, v] of Object.entries(en)) assert.ok(String(v).trim(), "empty English text: " + k);
  for (const [k, v] of Object.entries(he)) {
    assert.ok(String(v).trim(), "empty Hebrew text: " + k);
    if (String(en[k]).replace(/[^A-Za-z]/g, "").length > 3) assert.match(v, /[֐-׿]/, "Hebrew text without Hebrew letters (still English?): " + k);
  }
});
test("placeholders like {name} match in both languages", () => {
  const ph = (s) => [...new Set(String(s).match(/\{\w+\}/g) || [])].sort().join(); // each placeholder once: a plural form may leave out {n} ("one jar")
  for (const k of Object.keys(en)) if (k in he) assert.equal(ph(he[k]), ph(en[k]), "placeholder mismatch: " + k);
});
