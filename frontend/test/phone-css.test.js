// The phone app's styles stay apart from the computer's: every phone rule starts with html.phone, sides are logical
// (start/end), the old phone layout (html.mob, narrow max-width queries) is gone, no question-mark cursor, no ▾ ▸ arrows.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";

const SRC = new URL("../src/", import.meta.url);
const walk = (u) => readdirSync(u).flatMap((f) => { const x = new URL(f, u); return statSync(x).isDirectory() ? walk(new URL(f + "/", u)) : [x]; });
const files = (dir, ext) => walk(new URL(dir, SRC)).filter((u) => ext.some((e) => u.pathname.endsWith(e)));
const rel = (u) => u.pathname.split("/src/")[1];
const noComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

// "a, :is(b, c)" → ["a", ":is(b, c)"] (commas inside brackets stay)
const splitTop = (head) => { const out = []; let d = 0, cur = ""; for (const c of head) { if (c === "(") d++; if (c === ")") d--; if (c === "," && !d) { out.push(cur.trim()); cur = ""; } else cur += c; } out.push(cur.trim()); return out; };

// the selectors of every rule in a stylesheet (inside @media too; @keyframes steps are not selectors)
function selectors(css) {
  const out = [], s = noComments(css);
  let i = 0, buf = "", depth = 0, skip = -1;
  for (; i < s.length; i++) {
    const c = s[i];
    if (c === "{") {
      const head = buf.trim(); buf = "";
      if (skip < 0 && head.startsWith("@keyframes")) skip = depth;
      else if (skip < 0 && !head.startsWith("@") && head) out.push(...splitTop(head));
      depth++;
    } else if (c === "}") { depth--; buf = ""; if (depth === skip) skip = -1; } else if (c === ";") buf = ""; else buf += c;
  }
  return out;
}

test("every rule in src/phone/styles starts with html.phone", () => {
  for (const f of files("phone/styles/", [".css"])) {
    for (const sel of selectors(readFileSync(f, "utf8"))) assert.match(sel, /^html\.phone(\b|::|\[|\.|:)/, `${rel(f)}: "${sel}" should start with html.phone`);
  }
});

test("phone styles use logical sides (start/end), except lines marked /* fixed side */", () => {
  for (const f of files("phone/", [".css", ".vue"])) {
    readFileSync(f, "utf8").split("\n").forEach((line, n) => {
      if (line.includes("/* fixed side */")) return;
      const m = line.match(/(?:^|[\s;{"'])(margin-left|margin-right|padding-left|padding-right|border-left|border-right|left|right)\s*:/) || line.match(/(?:float|text-align)\s*:\s*(left|right)/);
      assert.ok(!m, `${rel(f)}:${n + 1} uses a fixed side: ${line.trim()}`);
    });
  }
});

test("the old phone layout is gone: no html.mob anywhere, no max-width query at or below 860px in src/styles", () => {
  for (const f of [...files("", [".css", ".js", ".vue"]), new URL("../index.html", import.meta.url)]) {
    const s = readFileSync(f, "utf8");
    assert.doesNotMatch(s, /html\.mob\b|\.mob\b|classList\.(?:toggle|add|contains)\("mob"/, `${f.pathname.split("/frontend/")[1]} still uses the old phone class`);
  }
  for (const f of files("styles/", [".css"])) {
    for (const m of readFileSync(f, "utf8").matchAll(/@media[^{]*max-width:\s*(\d+)px/g)) assert.ok(+m[1] > 860, `${rel(f)}: a max-width ${m[1]}px query only matched the old phone layout`);
  }
});

test("phone: no question-mark cursor, and open/close arrows are chevron icons, never ▾ ▸ characters", () => {
  for (const f of files("phone/", [".css", ".vue", ".js"])) {
    const s = readFileSync(f, "utf8");
    assert.doesNotMatch(s, /cursor:\s*help/, `${rel(f)} uses the question-mark cursor`);
    assert.doesNotMatch(s, /[▾▸▴◂►▼▲◀]/, `${rel(f)} uses a filled arrow character`);
  }
});
