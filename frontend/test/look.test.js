// The new app's look: the same colors as the current app, money written the same way, and no question-mark cursor anywhere.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { formatMoney, clampPercent, currencySymbol } from "../src/format.js";

const read = (p) => readFileSync(new URL("../src/" + p, import.meta.url), "utf8");
const old = readFileSync(new URL("../../web/js/01-prefs-theme.js", import.meta.url), "utf8");

test("default colors match the current app's Indigo look, light and dark", () => {
  const css = read("styles/tokens.css");
  const m = old.match(/Indigo:\{L:\[([^\]]*)\],D:\[([^\]]*)\]/);
  const names = ["acc", "accc", "onc", "bg", "acc2", "on"];
  const [light, dark] = css.split("prefers-color-scheme: dark");
  [[m[1], light], [m[2], dark]].forEach(([list, part]) => list.split(",").map((c) => c.replace(/"/g, "")).forEach((c, i) => {
    const want = c === "#fff" ? "#ffffff" : c;
    assert.match(part, new RegExp(`--${names[i]}:\\s*${want}`, "i"), `--${names[i]} should be ${want}`);
  }));
});

test("money is written like the current app", () => {
  assert.equal(formatMoney(1250), "₪1,250");
  assert.equal(formatMoney(-80), "−₪80");
  assert.equal(formatMoney(15, { sign: true }), "+₪15");
  assert.equal(formatMoney(-0.2), "₪0");
  assert.equal(formatMoney(9.5, { currency: "USD", decimals: 2 }), "$9.50");
  assert.equal(currencySymbol("CHF"), "CHF ");
});

test("progress bars never go below 0% or above 100%", () => {
  assert.equal(clampPercent(50, 200), 25);
  assert.equal(clampPercent(500, 200), 100);
  assert.equal(clampPercent(-5, 200), 0);
  assert.equal(clampPercent(5, 0), 0);
});

test("no style uses the question-mark (help) cursor", () => {
  const all = ["styles/base.css", "styles/tokens.css", ...readdirSync(new URL("../src/components", import.meta.url)).map((f) => "components/" + f)];
  for (const f of all) assert.doesNotMatch(read(f), /cursor:\s*help/, f);
});

test("components use the shared color names, not colors typed in by hand", () => {
  for (const f of readdirSync(new URL("../src/components", import.meta.url))) {
    const css = (read("components/" + f).split("<style")[1] || "").replace(/#fff\b/g, "");
    assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i, f);
  }
});

test("all building blocks the screens need exist", () => {
  const have = readdirSync(new URL("../src/components", import.meta.url));
  for (const n of ["BaseButton", "BaseCard", "BaseDialog", "ListRow", "BaseTabs", "BaseChip", "BaseBadge", "BaseInput", "BaseSelect", "BaseToggle", "BaseTooltip", "HelpIcon", "EmptyState", "MoneyAmount", "ProgressBar"]) assert.ok(have.includes(n + ".vue"), n);
});

test("Hebrew style rules only change their own part, never the whole page", () => {
  // Vue keeps only what is inside :global(...), so ":global(html.he) .x" would style the whole page. Write ":global(html.he .x)".
  for (const f of readdirSync(new URL("../src/components/", import.meta.url))) {
    assert.doesNotMatch(read("components/" + f), /:global\([^)]*\)\s*[.#\w[]/, `${f}: put the whole selector inside :global(...)`);
  }
});
