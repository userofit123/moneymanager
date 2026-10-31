// What each money coming in is (lib/moneyIn.js): income, salary (a kind of income) or money back. Nothing is guessed from
// words or shops. Made-up data only.
import test from "node:test";
import assert from "node:assert/strict";
import { moneyIn, KINDS, inRules, inRow, partOf } from "../src/lib/moneyIn.js";

const ACC = [{ n: "Bank", kind: "bank" }, { n: "Savings", kind: "bank" }, { n: "Card", kind: "card" }, { n: "Wallet", kind: "wallet" }];
let id = 0;
const IN = (d, a, desc, from, o = {}) => ({ id: "i" + ++id, d, a, desc, from, to: "Bank", ...o });
const OUT = (d, a, desc, to, o = {}) => ({ id: "o" + ++id, d, a: -a, desc, from: "Card", to, ...o });
const run = (tx, o = {}) => moneyIn({ accounts: ACC, tx, ...o });
const one = (t, more = [], o = {}) => run([t, ...more], o).get(t.id);

test("only money coming in gets a kind, income or money back", () => {
  const L = [IN("2026-10-01", 100, "Something", "Someone"), OUT("2026-10-02", 50, "Shop", "Shop"), IN("2026-10-03", 20, "Fee", "x", { virtual: true })];
  const M = run(L);
  assert.deepEqual([...M.keys()], [L[0].id]);
  assert.ok(KINDS.includes(M.get(L[0].id).kind));
  assert.deepEqual(moneyIn({}), new Map());
});

test("a bank deposit whose whole text is 'זיכוי' is income, not money back", () => {
  assert.deepEqual(one(IN("2026-10-10", 12000, "זיכוי", "")), { kind: "income", why: "income" });
  // refund words, salary words and a shop bought from before decide nothing
  const buy = OUT("2026-10-01", 300, "Fashion Shop", "Fashion Shop", { from: "Bank" });
  assert.equal(one(IN("2026-10-05", 300, "Fashion Shop refund", "Fashion Shop"), [buy]).kind, "income");
  assert.deepEqual(one(IN("2026-10-05", 9000, "משכורת", "Acme")), { kind: "income", why: "income" });
});

test("a cash deposit is income", () => {
  assert.deepEqual(one(IN("2026-10-12", 500, "הפקדת מזומן", "")), { kind: "income", why: "income" });
  assert.deepEqual(one(IN("2026-10-12", 500, "Cash deposit", "", { to: "Wallet" })), { kind: "income", why: "income" });
});

test("a credit on a credit card is money back", () => {
  assert.deepEqual(one(IN("2026-10-08", 100, "Fashion Shop", "Fashion Shop", { to: "Card" })), { kind: "back", why: "card" });
});

test("the person's choice wins, then a money coming in rule", () => {
  assert.deepEqual(one(IN("2026-10-01", 300, "Card credit", "x", { to: "Card", mk: "income" })), { kind: "income", why: "chosen" });
  assert.deepEqual(one(IN("2026-10-01", 9000, "Acme", "Acme"), [], { inMark: {} }).why, "income");
  const t = IN("2026-10-01", 9000, "Acme", "Acme");
  assert.deepEqual(one(t, [], { inMark: { [t.id]: "salary" } }), { kind: "income", sub: "salary", why: "chosen" });
  assert.deepEqual(one(IN("2026-10-01", 50, "Shop", "Shop", { mk: "back" })), { kind: "back", why: "chosen" });
  const R = { moneyInRules: [{ k: "acme", kind: "salary" }, { k: "insurer", kind: "back" }] };
  assert.deepEqual(one(IN("2026-10-01", 900, "ACME LTD", "Acme Ltd"), [], R), { kind: "income", sub: "salary", why: "rule", rule: "acme" });
  assert.deepEqual(one(IN("2026-10-01", 900, "Payment", "The Insurer"), [], R), { kind: "back", why: "rule", rule: "insurer" });
  // the choice beats the rule
  assert.equal(one(IN("2026-10-01", 900, "ACME LTD", "Acme Ltd", { mk: "back" }), [], R).kind, "back");
});

test("choices and rules from the older kinds are read as today's", () => {
  assert.deepEqual(one(IN("2026-10-01", 300, "Bit from Dana", "Dana", { mk: "people" })), { kind: "income", why: "chosen" });
  assert.deepEqual(one(IN("2026-10-01", 300, "x", "x", { mk: "earned" })), { kind: "income", why: "chosen" });
  // your own money is no longer a choice: the app decides
  assert.deepEqual(one(IN("2026-10-01", 300, "x", "x", { to: "Card", mk: "own" })), { kind: "back", why: "card" });
  assert.deepEqual(inRules({ moneyInRules: [{ k: "a", kind: "earned" }, { k: "b", kind: "back" }, { k: "c", kind: "people" }, { k: "d", kind: "own" }] }), [{ k: "a", kind: "salary" }, { k: "b", kind: "back" }]);
  assert.deepEqual(inRules({ salaryRules: ["acme"] }), [{ k: "acme", kind: "salary" }]);
});

test("a transfer between your own accounts has no kind; a rejected pair is income", () => {
  const o = OUT("2026-10-01", 500, "To savings", "Savings", { from: "Bank" }), i = IN("2026-10-01", 500, "From bank", "Bank", { to: "Savings" });
  assert.equal(one(i, [o], { xf: [{ o: o.id, i: i.id, st: "ok" }] }), undefined);
  assert.equal(one(i, [o], { xf: [{ o: o.id, i: i.id, st: "rej" }] }).kind, "income");
});

test("inRow and partOf: money back is marked back, a salary sal", () => {
  const t = { id: 1, a: 10 };
  assert.deepEqual(inRow(t, { kind: "back" }), { id: 1, a: 10, back: true });
  assert.deepEqual(inRow(t, { kind: "income", sub: "salary" }), { id: 1, a: 10, sal: true });
  assert.equal(inRow(t, { kind: "income" }), t);
  assert.equal(inRow(t, undefined), t);
  assert.equal(partOf({ kind: "back" }), "back");
  assert.equal(partOf(undefined), "in");
});
