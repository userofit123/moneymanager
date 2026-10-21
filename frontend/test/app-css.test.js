// The app's main stylesheet (styles/app.css) is loaded, its Hebrew rules stay simple, and components use its shared class names.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const copy = read("../src/styles/app.css");

test("main.js loads app.css and starts the phone switch; the look sets light/dark (data-mode), which the stylesheet depends on", () => {
  const main = read("../src/main.js");
  assert.match(main, /import "\.\/styles\/app\.css"/);
  assert.match(main, /startMobile\(\)/);
  const mob = read("../src/mobile.js");
  assert.match(mob, /w <= 860 \|\| \(touch && w <= 1100\)/);
  assert.match(read("../src/core/theme.js"), /h\.dataset\.mode = d \? "dark" : "light"/);
});

test("Hebrew: html.he body is right to left, nothing else mirrors the page", () => {
  assert.match(copy, /html\.he body\{direction:rtl\}/);
  assert.doesNotMatch(read("../src/styles/base.css"), /transform:\s*scaleX\(-1\)/);
});

test("components use the shared class names instead of their own copies of the styles", () => {
  const need = { BaseButton: "btn", BaseCard: "card", BaseSheet: "sheet", BaseTabs: "seg", PageHeader: "<header>" };
  for (const [n, cls] of Object.entries(need)) {
    const src = read(`../src/components/${n}.vue`);
    assert.ok(src.includes(cls), `${n} should use "${cls}"`);
    assert.doesNotMatch(src, /<style scoped>/, `${n} should not carry its own copy of the styles`);
  }
});
