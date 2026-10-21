// The new app carries every rule of the current app's stylesheet: legacy.css is a whole copy of web/css/app.css.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const old = read("../../web/css/app.css");
const copy = read("../src/styles/legacy.css");

test("legacy.css is the current app's app.css, only the font paths differ", () => {
  assert.equal(copy, old.replaceAll("url(../fonts/", "url(/fonts/"));
});

test("main.js loads legacy.css and starts the phone/dark switches the old stylesheet depends on", () => {
  const main = read("../src/main.js");
  assert.match(main, /import "\.\/styles\/legacy\.css"/);
  assert.match(main, /startMobile\(\)/);
  const mob = read("../src/mobile.js");
  assert.match(mob, /w <= 860 \|\| \(touch && w <= 1100\)/);
  assert.match(mob, /data-mode/);
});

test("the Hebrew rules are the old ones: html.he body is right to left, nothing else mirrors the page", () => {
  assert.match(copy, /html\.he body\{direction:rtl\}/);
  assert.doesNotMatch(read("../src/styles/base.css"), /transform:\s*scaleX\(-1\)/);
});

test("components use the old class names instead of their own copies of the styles", () => {
  const need = { BaseButton: "btn", BaseCard: "card", BaseDialog: "sheet", BaseInput: "fld", BaseSelect: "fld", BaseTabs: "seg", BaseToggle: "tg", PageHeader: "<header>", ProgressBar: "bar", BaseBadge: "badge", HelpIcon: "hq" };
  for (const [n, cls] of Object.entries(need)) {
    const src = read(`../src/components/${n}.vue`);
    assert.ok(src.includes(cls), `${n} should use "${cls}"`);
    assert.doesNotMatch(src, /<style scoped>/, `${n} should not carry its own copy of the styles`);
  }
});
