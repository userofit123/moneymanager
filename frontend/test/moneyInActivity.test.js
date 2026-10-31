// Money coming in on the Activity page: the Type filter and grouping (income, salary, money back), "still to come in",
// and the person's own choice (S.inMark). Made-up data only.
import test from "node:test";
import assert from "node:assert/strict";
import { kinds, filterRows, groupRows, totals, leftOut } from "../src/lib/activity.js";
import { inKinds, setMark, chosenMark, markOf } from "../src/lib/moneyIn.js";

const ACC = [{ n: "Bank", kind: "bank" }, { n: "Card", kind: "card" }];
const T = (id, d, a, desc, o = {}) => ({ id, d, a, desc, from: a > 0 ? desc : "Card", to: a > 0 ? "Bank" : desc, tags: [], ...o });
const S = {
  accounts: ACC, xf: [], moneyInRules: [{ k: "acme", kind: "salary" }],
  tx: [
    T("buy", "2026-10-02", -200, "Shoe Shop"),
    T("ret", "2026-10-05", 200, "Shoe Shop", { to: "Card" }), // money back on the card
    T("zik", "2026-10-08", 200, "זיכוי"), // a bank deposit called "credit": income
    T("sal", "2026-10-10", 9000, "Acme"),
    T("csh", "2026-10-12", 500, "Cash deposit"),
    T("fut", "2099-01-01", 300, "Shoe Shop", { to: "Card" }), // money back still to come
    T("fu2", "2099-01-02", 1000, "Interest"), // income still to come
  ],
};
const k = kinds(S, "2026-10-20");
const ids = (type) => filterRows(S, S.tx, { q: "", src: "", cat: "", type, tag: "" }, k).map((t) => t.id).sort();

test("the Type filter: income (salary too), salary, money back", () => {
  assert.deepEqual(ids("income"), ["csh", "fu2", "sal", "zik"]);
  assert.deepEqual(ids("salary"), ["sal"]);
  assert.deepEqual(ids("back"), ["fut", "ret"]);
  assert.deepEqual(ids("expense"), ["buy"]);
});

test("group by type: salary, income and money back, each with its own totals", () => {
  const g = Object.fromEntries(groupRows(S.tx, "type", "new", k).map((x) => [x.key, x]));
  assert.deepEqual(Object.keys(g).sort(), ["back", "expenses", "income", "salary"]);
  assert.equal(g.back.T.inc, 0); assert.equal(g.back.T.back, 200); assert.equal(g.back.T.out, 0);
  assert.equal(g.salary.T.inc, 9000);
  assert.deepEqual(totals(S.tx, k), { inc: 9700, out: 200, back: 200, net: 9500 });
  // every money in is in the totals: only the upcoming ones are left out
  assert.deepEqual(leftOut(S.tx, k), { transfers: 0, cardPays: 0, upcoming: 2, balance: 0, ignored: 0 });
});

test("still to come in counts money in, not money back", () => {
  const g = groupRows(S.tx, "month", "new", k).find((x) => x.key == "2099-01");
  assert.equal(g.E, 1000);
});

test("the person's choice is saved in S.inMark and wins; empty goes back to automatic", () => {
  const S2 = structuredClone(S), t = S2.tx.find((x) => x.id == "zik");
  assert.equal(markOf(inKinds(S2).get("zik")), "income");
  assert.equal(setMark(S2, t, "back"), true);
  assert.equal(setMark(S2, t, "back"), false, "nothing changed");
  assert.equal(chosenMark(S2, t), "back");
  assert.equal(markOf(inKinds(S2).get("zik")), "back");
  assert.equal(setMark(S2, t, ""), true);
  assert.equal(chosenMark(S2, t), "");
  assert.equal(markOf(inKinds(S2).get("zik")), "income");
  assert.equal(markOf({ kind: "income", sub: "salary" }), "salary");
  // an older choice that is no longer one (your own money) is cleared by Automatic
  const S3 = { ...structuredClone(S), inMark: { csh: "own" } }, c = S3.tx.find((x) => x.id == "csh");
  assert.equal(chosenMark(S3, c), "");
  assert.equal(setMark(S3, c, ""), true);
  assert.deepEqual(S3.inMark, {});
});
