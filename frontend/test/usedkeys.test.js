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

// A key in a group: "settings.cur." + x or `num.g.${id}` needs some text under that start; a whole key needs its text.
const known = (set, k, part) => (part ? [...set].some((x) => x.startsWith(k)) : set.has(k));
const missing = (bad, where, k, part) => {
  if (!known(en, k, part)) bad.push(`${where}: ${k} (English)`);
  if (!known(he, k, part)) bad.push(`${where}: ${k} (Hebrew)`);
};

test("every tk('key') of a page's own helper (tk = (k) => t('settings.cur.' + k)) exists in English and Hebrew", () => {
  const bad = [];
  for (const f of files(SRC)) {
    const code = readFileSync(f, "utf8");
    for (const [, name, pre] of code.matchAll(/(?:const|let) (\w+) = \(\w+[^)]*\) => \$?t\(\s*["'`]([\w.]+\.)["'`]\s*\+\s*\w+/g)) {
      for (const m of code.matchAll(new RegExp(`(?<![\\w.$])${name}\\(\\s*["'\`]([\\w.]+)(["'\`]\\s*\\+|\\$\\{)?`, "g"))) missing(bad, f.slice(SRC.length), pre + m[1], !!m[2]);
    }
  }
  assert.deepEqual(bad, [], "Missing texts:\n" + bad.join("\n"));
});

test("every text key written anywhere in the code ('num.g.' + id, c ? 'a.b' : 'a.c') exists in English and Hebrew", () => {
  // any string in the code that starts with a top group of the texts (num., settings., forecast. …) is taken as a text key
  const tops = new Set([...en].map((k) => k.split(".")[0]));
  const bad = [];
  for (const f of files(SRC)) {
    const code = readFileSync(f, "utf8");
    // (?<!=): not a template attribute such as v-if="app.ready", which is code, not a text
    for (const m of code.matchAll(/(?<!=)["'`]([a-z]\w*(?:\.\w+)+)(\.?)(["'`]\s*\+|["'`]|\$\{)/g)) {
      if (!tops.has(m[1].split(".")[0])) continue;
      // a start that the code completes later, as in (card ? "al.card" : "al.gap") + "Up", counts as a group start too
      const part = !!m[2] || m[3] !== m[3][0] || !en.has(m[1]);
      missing(bad, f.slice(SRC.length), m[1] + m[2], part);
    }
  }
  assert.deepEqual(bad, [], "Missing texts:\n" + bad.join("\n"));
});

test("page direction is set only in direction.js", () => {
  const others = files(SRC).filter((f) => !f.endsWith("direction.js") && /\.dir\s*=|setAttribute\(\s*["']dir["']|\.lang\s*=/.test(readFileSync(f, "utf8")));
  assert.deepEqual(others, [], "Set the direction through applyLang() in direction.js, not here");
});
