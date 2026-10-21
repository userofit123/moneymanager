// Every text used in the code with t("some.key") must exist in both languages, and right-to-left is set in one place only.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = new URL("../src/", import.meta.url).pathname;
const files = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? files(p) : /\.(vue|js)$/.test(n) ? [p] : []; });
import { loadLocale as load } from "./load-locales.js";
const flat = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, p + k + ".") : [p + k]));
const en = new Set(flat(load("en")));
const he = new Set(flat(load("he")));

test("every t('key') used in the code exists in English and Hebrew", () => {
  const bad = [];
  for (const f of files(SRC)) {
    const code = readFileSync(f, "utf8");
    for (const m of code.matchAll(/(?<![\w.])\$?t\(\s*["'`]([\w.]+)(\$\{)?/g)) {
      // t(`settings.cur.${x}`) or t("settings.cur." + x): a key put together in the code; the part before ${ must be a group in both languages
      const has = (set) => (m[2] || m[1].endsWith(".") ? [...set].some((k) => k.startsWith(m[1])) : set.has(m[1]));
      if (!has(en)) bad.push(`${f.slice(SRC.length)}: ${m[1]} (English)`);
      if (!has(he)) bad.push(`${f.slice(SRC.length)}: ${m[1]} (Hebrew)`);
    }
  }
  assert.deepEqual(bad, [], "Missing texts:\n" + bad.join("\n"));
});

test("page direction is set only in direction.js", () => {
  const others = files(SRC).filter((f) => !f.endsWith("direction.js") && /\.dir\s*=|setAttribute\(\s*["']dir["']|\.lang\s*=/.test(readFileSync(f, "utf8")));
  assert.deepEqual(others, [], "Set the direction through applyLang() in direction.js, not here");
});
