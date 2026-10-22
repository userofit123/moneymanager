// The app's styles: styles/index.css loads every app-wide file in order, each page loads its own file, the Hebrew rules
// stay simple, the tooltip cursor rule is there, and components use the shared class names.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const STYLES = new URL("../src/styles/", import.meta.url);
const index = read("../src/styles/index.css");

test("main.js loads styles/index.css and starts the phone switch; the look sets light/dark (data-mode), which the styles depend on", () => {
  const main = read("../src/main.js");
  assert.match(main, /import "\.\/styles\/index\.css"/);
  assert.match(main, /startMobile\(\)/);
  const mob = read("../src/mobile.js");
  assert.match(mob, /w <= 860 \|\| \(touch && w <= 1100\)/);
  assert.match(read("../src/core/theme.js"), /h\.dataset\.mode = d \? "dark" : "light"/);
});

test("index.css imports every app-wide stylesheet once (early/<page>.css too), tokens first; page files are not in it", () => {
  const imports = [...index.matchAll(/@import "\.\/([^"]+)";/g)].map((m) => m[1]);
  assert.equal(imports[0], "tokens.css");
  assert.equal(new Set(imports).size, imports.length, "a file is imported twice");
  const files = [...readdirSync(STYLES).filter((f) => f.endsWith(".css") && f !== "index.css"), ...["components", "early"].flatMap((d) => readdirSync(new URL(d + "/", STYLES)).map((f) => `${d}/${f}`))];
  assert.deepEqual([...imports].sort(), files.sort());
  assert.ok(!imports.some((f) => f.startsWith("pages/")));
});

test("each page's own stylesheet is imported by that page", () => {
  for (const f of readdirSync(new URL("pages/", STYLES))) {
    const name = f.replace(/\.css$/, ""), view = `../src/views/${name[0].toUpperCase() + name.slice(1)}.vue`;
    assert.ok(existsSync(new URL(view, import.meta.url)), `no page for styles/pages/${f}`);
    assert.match(read(view), new RegExp(`import "\\.\\./styles/pages/${name}\\.css"`), `${view} should import styles/pages/${f}`);
  }
});

test("Hebrew: html.he body is right to left, nothing else mirrors the page", () => {
  const base = read("../src/styles/base.css");
  assert.match(base, /html\.he body \{\s*direction: rtl;\s*\}/);
  assert.doesNotMatch(base, /transform:\s*scaleX\(-1\)/);
});

test("tooltips never show the question-mark cursor", () => {
  assert.match(read("../src/styles/base.css"), /:where\(\[title\], \[data-tip\], abbr\) \{\s*cursor: inherit;/);
});

test("components use the shared class names instead of their own copies of the styles", () => {
  const need = { BaseButton: "btn", BaseCard: "card", BaseSheet: "sheet", BaseTabs: "seg", PageHeader: "<header>" };
  for (const [n, cls] of Object.entries(need)) {
    const src = read(`../src/components/${n}.vue`);
    assert.ok(src.includes(cls), `${n} should use "${cls}"`);
    assert.doesNotMatch(src, /<style scoped>/, `${n} should not carry its own copy of the styles`);
  }
});
