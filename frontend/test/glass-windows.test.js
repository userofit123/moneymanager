// Glass look: windows (BaseSheet/BaseDialog), the Appearance panel, Are you sure, help, the date range and the document viewer
// stay frosted (a see-through colour over a blur of what is behind them). This look was lost more than once; these checks
// fail when it is taken out again.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const theme = read("../src/styles/theme.css").replace(/\/\*[\s\S]*?\*\//g, "");
const WINDOWS = [".sheet", ".pop", ".askb", ".help", ".rcal", ".dvbox"];
// every rule as [selector, body]
const rules = (css) => [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => [m[1].trim(), m[2]]);

test("glass: every window has a see-through colour and a blur of what is behind it", () => {
  const win = rules(theme).find(([sel]) => sel.startsWith("body.glass") && WINDOWS.every((c) => sel.includes(c)));
  assert.ok(win, "the glass rule for windows is missing in styles/theme.css");
  assert.match(win[1], /background:\s*var\(--gpbg\)/);
  assert.match(win[1], /(^|[^-])backdrop-filter:\s*var\(--gpfx\)/, "windows lost their blur in the glass look");
  assert.match(win[1], /-webkit-backdrop-filter:\s*var\(--gpfx\)/, "Safari needs -webkit-backdrop-filter");
  // the window colour must let the blur show: at Opacity 0 it is at most 90% solid
  const m = /--gpop100:\s*calc\(\(\s*([\d.]+)\s*\+\s*var\(--gop\)\s*\*\s*([\d.]+)\s*\)\s*\*\s*100%\)/.exec(theme);
  assert.ok(m, "--gpop100 (how solid windows are) has an unexpected form");
  assert.ok(+m[1] <= 0.9, "windows are too solid for the blur to show");
  assert.equal(+m[1] + +m[2], 1, "at Opacity 100% windows are solid");
});

test("glass: no other rule takes the blur or the see-through colour off a window", () => {
  const dir = new URL("../src/styles/", import.meta.url);
  const files = ["theme.css", ...["components", "early", "pages"].flatMap((d) => readdirSync(new URL(d + "/", dir)).map((f) => `${d}/${f}`))];
  for (const f of files) {
    for (const [sel, body] of rules(read(`../src/styles/${f}`))) {
      if (!sel.includes("glass")) continue;
      const hit = sel.split(",").some((s) => WINDOWS.some((c) => new RegExp(`\\${c}(?![\\w-])\\s*$`).test(s.trim())));
      if (!hit) continue;
      assert.doesNotMatch(body, /backdrop-filter:\s*none/, `${f}: "${sel}" removes the window blur`);
      assert.doesNotMatch(body, /background(-color)?:\s*var\(--(bg|s1|s2)\)/, `${f}: "${sel}" makes a window solid in the glass look`);
    }
  }
});

test("glass: menus, drop-downs and tips are put on <body>, so a window's blur never holds them inside it", () => {
  assert.match(read("../src/components/BaseDialog.vue"), /<BaseSheet\b/, "BaseDialog should be a BaseSheet (class sheet)");
  assert.match(read("../src/components/BaseSheet.vue"), /class="sheet on"/);
  for (const f of ["BaseSheet", "PopMenu", "AskPop"]) assert.match(read(`../src/components/${f}.vue`), /<Teleport v-else to="body">/, `${f}.vue`);
  assert.match(read("../src/core/dropdown.js"), /document\.body\.appendChild\(m\)/);
  assert.match(read("../src/core/tooltip.js"), /document\.body\.appendChild\(tipEl\)/);
});
