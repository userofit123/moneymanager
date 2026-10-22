// Sorting with an AI chat (lib/aiSort.js): what the export holds, how the AI's answer is checked, and what adding it changes.
// The data is the made-up Categories page data (fixtures/categories-start.json).
import test from "node:test";
import assert from "node:assert/strict";
import { saved } from "./golden.js";
import { exportTexts, readAnswer, choose, wouldSort, addAnswer, answerExample } from "../src/lib/aiSort.js";

const start = () => structuredClone(saved("categories-start"));

test("the export has each text once with how often and which way, and no amounts, dates or accounts", () => {
  const S = start(), e = exportTexts(S, "en");
  assert.equal(e.language, "en");
  assert.ok(e.texts.length > 0 && e.texts.length <= S.tx.length);
  for (const x of e.texts) assert.deepEqual(Object.keys(x).sort(), ["money", "text", "times"]);
  const keys = new Set(e.texts.map((x) => x.text.toLowerCase() + x.money));
  assert.equal(keys.size, e.texts.length);
  assert.ok(!JSON.stringify(e).match(/2026-\d\d-\d\d/)); // no dates
  assert.ok(!e.myCategories.includes("Uncategorized"));
});

test("the answer may come inside a chat reply; a broken one is refused", () => {
  const S = start();
  assert.deepEqual(readAnswer(S, "sorry, no"), { error: "bad" });
  assert.deepEqual(readAnswer(S, '{"hello": 1}'), { error: "bad" });
  const r = readAnswer(S, 'Here it is:\n```json\n{"categories":[{"name":"Pets"}],"rules":[{"contains":"vet","category":"Pets"}]}\n```');
  assert.deepEqual(r.plan, { cats: [{ name: "Pets", income: false }], rules: [{ k: "vet", c: "Pets" }], tagRules: [] });
});

test("the answer is checked: existing names are reused, unknown categories and too-short texts are left out, nothing twice", () => {
  const S = start(), have = Object.keys(S.cats)[0], rule = S.rules[0];
  const r = readAnswer(S, JSON.stringify({
    categories: [{ name: have.toUpperCase() }, { name: "Salary bonus", income: true }, { name: "" }, { name: "x".repeat(41) }],
    rules: [{ contains: "acme", category: have.toLowerCase() }, { contains: "acme", category: "Salary bonus" }, { contains: rule.k, category: have },
      { contains: "a", category: have }, { contains: "zoo", category: "Nowhere" }],
    tagRules: [{ contains: "hotel", tags: ["#Trip", "trip"] }, { contains: "hotel", tags: ["trip"] }, { contains: "x", tags: ["t"] }, { contains: "bus", tags: [] }],
  }));
  assert.deepEqual(r.plan.cats, [{ name: "Salary bonus", income: true }]);
  assert.deepEqual(r.plan.rules, [{ k: "acme", c: have }]);
  assert.deepEqual(r.plan.tagRules, [{ k: "hotel", tags: ["Trip"] }]);
  assert.equal(r.skipped, 6);
});

test("adding sorts only entries with no category, adds tags, and unchecked categories go with their rules", () => {
  const S = start(), u = S.tx.find((t) => !t.virtual && !t.c && t.desc), hand = S.tx.find((t) => !t.virtual && t.c && t.desc);
  assert.ok(u && hand, "the made-up data has an unsorted and a sorted entry");
  const word = u.desc.split(/\s+/)[0], hw = hand.desc.split(/\s+/)[0], handCat = hand.c;
  const { plan } = readAnswer(S, JSON.stringify({
    categories: [{ name: "New A" }, { name: "New B" }],
    rules: [{ contains: word, category: "New A" }, { contains: hw, category: "New A" }, { contains: "nothing-like-this", category: "New B" }],
    tagRules: [{ contains: word, tags: ["picked"] }],
  }));
  const p = choose(plan, ["New B"]);
  assert.deepEqual(p.cats.map((x) => x.name), ["New A"]);
  assert.ok(p.rules.length >= 1 && p.rules.every((r) => r.c == "New A"));
  assert.ok(wouldSort(S, p) >= 1);
  const lines = addAnswer(S, p);
  assert.equal(lines[0][0], "Added categories from an AI file");
  assert.equal(S.tx.find((t) => t.id == u.id).c, "New A");
  assert.equal(S.tx.find((t) => t.id == hand.id).c, handCat); // sorted by hand: kept
  assert.ok(S.tx.find((t) => t.id == u.id).tags.includes("picked"));
  assert.ok("New A" in S.cats && !("New B" in S.cats));
  assert.equal(addAnswer(S, { cats: [], rules: [], tagRules: [] }), false);
});

test("the example answer the prompt shows is one the check accepts", () => {
  const S = start(), r = readAnswer(S, answerExample({ cat: "Example food", inc: "Example pay", tag: "trip", shop: "supermarket", stay: "hotel" }));
  assert.deepEqual(r.plan.cats.map((x) => [x.name, x.income]), [["Example food", false], ["Example pay", true]]);
  assert.equal(r.plan.rules.length, 1);
  assert.equal(r.plan.tagRules.length, 1);
});
