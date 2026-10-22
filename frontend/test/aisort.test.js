// Sorting with an AI chat (lib/aiSort.js): what the export holds, how the AI's answer is checked, and what adding it changes.
// The data is the made-up Categories page data (fixtures/categories-start.json).
import test from "node:test";
import assert from "node:assert/strict";
import { saved } from "./golden.js";
import { exportTexts, readAnswer, choose, wouldSort, addAnswer, answerExample, flip, rowState, planSize } from "../src/lib/aiSort.js";

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
  assert.deepEqual(e.myDisplayNames, S.cfg.nameRules.map((r) => ({ contains: r.k, name: r.n })));
  assert.deepEqual(e.myCardPayments, S.cardRules);
  assert.deepEqual(e.mySalary, S.salaryRules);
});

test("the answer may come inside a chat reply; a broken one is refused", () => {
  const S = start();
  assert.deepEqual(readAnswer(S, "sorry, no"), { error: "bad" });
  assert.deepEqual(readAnswer(S, '{"hello": 1}'), { error: "bad" });
  const r = readAnswer(S, 'Here it is:\n```json\n{"categories":[{"name":"Pets"}],"rules":[{"contains":"vet","category":"Pets"}]}\n```');
  assert.deepEqual(r.plan, { cats: [{ name: "Pets", income: false }], rules: [{ k: "vet", c: "Pets" }], tagRules: [], names: [], cards: [], salary: [] });
  assert.equal(planSize(readAnswer(S, '{"salary":["acme"]}').plan), 1); // an answer with only the new keys is fine
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
  assert.equal(addAnswer(S, { cats: [], rules: [], tagRules: [] }), false); // an older plan shape still works
});

test("display names, card payments and salary texts are checked like adding them by hand, nothing twice", () => {
  const S = start(), nameK = S.cfg.nameRules[0].k, card = S.cardRules[0];
  const r = readAnswer(S, JSON.stringify({
    displayNames: [{ contains: "SPRM 0042", name: "Super-Pharm" }, { contains: "sprm 0042", name: "Again" }, { contains: nameK.toUpperCase(), name: "X" },
      { contains: "z", name: "Short" }, { contains: "ok text", name: "" }, { contains: "ok text", name: "n".repeat(41) }],
    cardPayments: ["Visa-Cal charge", "VISACAL charge", card, "x", { contains: "Amex debit" }, "c".repeat(61)],
    salary: ["Wix Ltd salary", "wix ltd salary", "", 5],
  }));
  assert.deepEqual(r.plan.names, [{ k: "SPRM 0042", n: "Super-Pharm" }]);
  assert.deepEqual(r.plan.cards, ["visacal charge", "amex debit"]);
  assert.deepEqual(r.plan.salary, ["wix ltd salary"]);
  assert.equal(r.skipped, 3 + 2 + 2); // names: short, empty, long; cards: short, long; salary: empty, too short
});

test("rows can be unchecked one by one or a whole kind at once; a rule goes with its unchecked category", () => {
  const S = start(), { plan } = readAnswer(S, JSON.stringify({
    categories: [{ name: "New A" }, { name: "New B" }], rules: [{ contains: "aaa", category: "New A" }, { contains: "bbb", category: "New B" }],
    tagRules: [{ contains: "hotel", tags: ["trip"] }], displayNames: [{ contains: "abc 1", name: "Abc" }, { contains: "def 2", name: "Def" }],
    cardPayments: ["card one", "card two"], salary: ["pay one"],
  }));
  let off = flip({}, "cats", ["New B"], false);
  off = flip(off, "names", ["abc 1"], false);
  off = flip(off, "cards", ["card one", "card two"], false);
  off = flip(off, "cards", ["card two"], true);
  assert.deepEqual(rowState(off, "rules", { k: "bbb", c: "New B" }), { on: false, locked: true });
  const p = choose(plan, off);
  assert.deepEqual(p.cats.map((x) => x.name), ["New A"]);
  assert.deepEqual(p.rules.map((x) => x.k), ["aaa"]);
  assert.deepEqual(p.names.map((x) => x.k), ["def 2"]);
  assert.deepEqual(p.cards, ["card two"]);
  assert.deepEqual(p.salary, ["pay one"]);
  assert.equal(p.tagRules.length, 1);
  assert.equal(planSize(choose(plan, flip(off, "salary", ["pay one"], false))), planSize(p) - 1);
});

test("adding adds every kind, marks matching income with no category as Salary, and writes one history line", () => {
  const S = start(), pay = S.tx.find((t) => !t.virtual && t.a > 0 && !t.c && /salary/i.test(t.desc));
  assert.ok(pay, "the made-up data has unsorted salary income");
  const { plan } = readAnswer(S, JSON.stringify({
    displayNames: [{ contains: "SPRM 0042", name: "Super-Pharm" }], cardPayments: ["visa cal charge"], salary: [pay.desc],
  }));
  assert.ok(wouldSort(S, plan) >= 1);
  const n0 = S.cfg.nameRules.length, lines = addAnswer(S, plan);
  assert.deepEqual(S.cfg.nameRules.at(-1), { k: "SPRM 0042", n: "Super-Pharm", f: "any", m: "in" });
  assert.equal(S.cfg.nameRules.length, n0 + 1);
  assert.ok(S.cardRules.includes("visa cal charge"));
  assert.ok(S.salaryRules.includes(plan.salary[0]));
  assert.equal(S.tx.find((t) => t.id == pay.id).c, "Salary");
  assert.equal(lines.length, 1);
  assert.match(lines[0][1], /^0 categories, 0 rules, 0 tag rules, 1 display names, 1 card payment rules, 1 salary rules, [1-9]\d* sorted$/);
});

test("the example answer the prompt shows is one the check accepts", () => {
  const S = start(), r = readAnswer(S, answerExample({ cat: "Example food", inc: "Example pay", tag: "trip", shop: "supermarket", stay: "hotel", messy: "PAYPAL *SPOTIFY 4029", shown: "Spotify", card: "isracard", pay: "acme ltd" }));
  assert.deepEqual(r.plan.cats.map((x) => [x.name, x.income]), [["Example food", false], ["Example pay", true]]);
  assert.equal(r.plan.rules.length, 1);
  assert.equal(r.plan.tagRules.length, 1);
  assert.deepEqual([r.plan.names.length, r.plan.cards, r.plan.salary], [1, ["isracard"], ["acme ltd"]]);
  assert.equal(r.skipped, 0);
});
