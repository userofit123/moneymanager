// Money coming in on the Activity page: the Type filter and grouping by kind, "still to come in", the person's own
// choice (S.inMark), and a refund on the card and in the bank that already counts once. Made-up data only.
import test from "node:test";
import assert from "node:assert/strict";
import { kinds, filterRows, groupRows, totals } from "../src/lib/activity.js";
import { inKinds, setMark, chosenMark, markOf, twinState } from "../src/lib/moneyIn.js";

const ACC = [{ n: "Bank", kind: "bank" }, { n: "Card", kind: "card" }];
const T = (id, d, a, desc, o = {}) => ({ id, d, a, desc, from: a > 0 ? desc : "Card", to: a > 0 ? "Bank" : desc, tags: [], ...o });
const S = {
  accounts: ACC, xf: [],
  tx: [
    T("buy", "2026-10-02", -200, "Shoe Shop"),
    T("ret", "2026-10-05", 200, "Shoe Shop", { to: "Card" }), // money back on the card
    T("bnk", "2026-10-08", 200, "Shoe Shop refund"), // the same refund again in the bank
    T("sal", "2026-10-10", 9000, "Salary Acme"),
    T("bit", "2026-10-11", 150, "Bit Dana"),
    T("csh", "2026-10-12", 500, "Cash deposit"),
    T("int", "2026-10-13", 12, "Interest"),
    T("fut", "2099-01-01", 300, "Shoe Shop", { to: "Card" }), // money back still to come
    T("fu2", "2099-01-02", 1000, "Interest"), // other income still to come
  ],
};
const k = kinds(S, "2026-10-20");
const ids = (type) => filterRows(S, S.tx, { q: "", src: "", cat: "", type, tag: "" }, k).map((t) => t.id).sort();

test("the Type filter and group by type show each kind of money in", () => {
  assert.deepEqual(ids("earned"), ["sal"]);
  assert.deepEqual(ids("back"), ["bnk", "fut", "ret"]);
  assert.deepEqual(ids("people"), ["bit"]);
  assert.deepEqual(ids("own"), ["csh"]);
  assert.deepEqual(ids("other"), ["fu2", "int"]);
  // "income" (links from Reports and Recap): the money in In counts, plus upcoming
  assert.deepEqual(ids("income"), ["bit", "fu2", "int", "sal"]);
  const g = Object.fromEntries(groupRows(S.tx, "type", "new", k).map((x) => [x.key, x]));
  assert.deepEqual(Object.keys(g).sort(), ["back", "earned", "expenses", "other", "own", "people"]);
  // each group's In matches the totals: money back lowers Out, own money and the bank copy count nothing
  assert.equal(g.back.T.inc, 0); assert.equal(g.back.T.back, 200);
  assert.equal(g.own.T.inc, 0);
  assert.deepEqual(totals(S.tx, k), { inc: 9162, out: 0, back: 200, net: 9162 });
});

test("still to come in counts money in, not money back", () => {
  const g = groupRows(S.tx, "month", "new", k).find((x) => x.key == "2099-01");
  assert.equal(g.E, 1000);
});

test("a refund on the card and in the bank counts once, and both sides know it", () => {
  const inOf = (t) => inKinds(S).get(t.id), by = (id) => S.tx.find((t) => t.id == id);
  assert.deepEqual(twinState(S, by("bnk"), inOf), { tw: by("ret"), once: true, mine: true });
  assert.deepEqual(twinState(S, by("ret"), inOf), { tw: by("bnk"), once: true, mine: false });
  assert.equal(twinState(S, by("sal"), inOf), null);
});

test("the person's choice is saved in S.inMark and wins; empty goes back to automatic", () => {
  const S2 = structuredClone(S), t = S2.tx.find((x) => x.id == "csh");
  assert.equal(markOf(inKinds(S2).get("csh")), "own");
  assert.equal(setMark(S2, t, "people"), true);
  assert.equal(setMark(S2, t, "people"), false, "nothing changed");
  assert.equal(chosenMark(S2, t), "people");
  assert.equal(markOf(inKinds(S2).get("csh")), "people");
  assert.equal(setMark(S2, t, ""), true);
  assert.equal(chosenMark(S2, t), "");
  assert.equal(markOf(inKinds(S2).get("csh")), "own");
  assert.equal(markOf({ kind: "earned", sub: "salary" }), "salary");
});

test("the line under the totals counts your own money and the bank copy of a refund as not in the totals", async () => {
  const { leftOut } = await import("../src/lib/activity.js");
  const o = leftOut(S.tx, k);
  assert.equal(o.own, 1);
  assert.equal(o.twin, 1);
});
