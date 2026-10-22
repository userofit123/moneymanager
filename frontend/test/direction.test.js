// Hebrew must be right to left, English left to right, and no style may use a fixed left or right.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { applyLang } from "../src/direction.js";

const fakeRoot = () => { const set = new Set(); return { lang: "", classList: { toggle: (c, on) => (on ? set.add(c) : set.delete(c)), has: (c) => set.has(c) } }; };

test("Hebrew sets lang=he and class he; English removes it; <html> itself never gets dir (scrollbars stay on the right)", () => {
  const r = fakeRoot();
  applyLang("he", r);
  assert.equal(r.lang, "he"); assert.ok(r.classList.has("he")); assert.equal(r.dir, undefined);
  applyLang("en", r);
  assert.equal(r.lang, "en"); assert.ok(!r.classList.has("he")); assert.equal(r.dir, undefined);
});

test("Hebrew content is right to left through 'html.he body { direction: rtl }'", () => {
  const css = readFileSync(new URL("../src/styles/base.css", import.meta.url), "utf8");
  assert.match(css, /html\.he body\s*\{[^}]*direction:\s*rtl/);
  assert.doesNotMatch(readFileSync(new URL("../index.html", import.meta.url), "utf8"), /dir\s*=\s*["']rtl/);
});

test("i18n.js applies the direction whenever the language changes", () => {
  const code = readFileSync(new URL("../src/i18n.js", import.meta.url), "utf8");
  assert.match(code, /watch\(i18n\.global\.locale,\s*\(lang\)\s*=>\s*applyLang\(lang\)/);
});

test("styles use logical properties (start/end), never fixed left/right", () => {
  const dir = new URL("../src/", import.meta.url).pathname;
  const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : /\.(vue|css)$/.test(n) ? [p] : []; });
  const bad = [];
  // A few declarations keep a fixed side on purpose and say so with /* fixed side */: positions a script sets from a measured x
  // (tab and menu highlights, tooltips), centering with left: 50%, spinner and arrow shapes, and sides that come with their own
  // Hebrew rule (a .fab on the right with "html.he .fab" moving it to the left).
  for (const f of walk(dir)) {
    // in a .vue file only the CSS counts: its <style> block and static style="…" (a tooltip placed at a measured x, or a "left" amount in a sentence, is not CSS)
    const src = readFileSync(f, "utf8"), css = f.endsWith(".css");
    let inStyle = false;
    src.split("\n").forEach((line, i) => {
      if (/<style\b/.test(line)) inStyle = true;
      const text = css || inStyle ? line : (line.match(/(?<![:\w-])style="[^"]*"/g) || []).join(" ");
      if (/<\/style>/.test(line)) inStyle = false;
      if (!text || /\/\* fixed side \*\//.test(text)) return;
      line = text;
      if (/(margin|padding|border)-(left|right)|text-align:\s*(left|right)|float:\s*(left|right)|(^|[\s;{])(left|right)\s*:/.test(line)) bad.push(`${f.slice(dir.length)}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(bad, [], "Use logical CSS (margin-inline-start, inset-inline-end, text-align: start) so Hebrew mirrors:\n" + bad.join("\n"));
});
