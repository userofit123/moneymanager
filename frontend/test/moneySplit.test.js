// Money in counted by kind (lib/moneyIn.js splitIn, countedTx, Activity totals, Home): money back and your own money are
// never "money in". Made-up data only.
import test from "node:test";
import assert from "node:assert/strict";
import { inKinds, splitIn, isIn, isOut, partOf } from "../src/lib/moneyIn.js";
import { countedTx } from "../src/lib/bills.js";
import { kinds, totals } from "../src/lib/activity.js";
import { homeModel } from "../src/lib/home.js";
import { seriesN, trSeries } from "../src/lib/reports.js";
import { recapModel, afterToday } from "../src/lib/recap.js";
import { budgetsModel } from "../src/lib/budgets.js";
import { forecastHistory } from "../src/lib/jars.js";

const ACC = [{ n: "Bank", kind: "bank", inNW: true, v: 1000, cur: "ILS" }, { n: "Card", kind: "card" }];
const base = () => ({
  accounts: ACC, cats: { Food: 1, Clothes: 2 },
  tx: [
    { id: "s1", d: "2026-10-01", a: 8000, desc: "Salary Acme", from: "Acme", to: "Bank" },
    { id: "p1", d: "2026-10-02", a: 150, desc: "Bit", from: "Dana", to: "Bank" },
    { id: "o1", d: "2026-10-03", a: 20, desc: "Interest", from: "Bank", to: "Bank" },
    { id: "c1", d: "2026-10-04", a: 500, desc: "Cash deposit", from: "", to: "Bank" },
    { id: "b0", d: "2026-10-05", a: -300, desc: "Fashion Shop", from: "Card", to: "Fashion Shop", c: "Clothes" },
    { id: "b1", d: "2026-10-08", a: 100, desc: "Fashion Shop", from: "Fashion Shop", to: "Card", c: "Refunds" },
    { id: "f1", d: "2026-10-06", a: -200, desc: "Grocer", from: "Bank", to: "Grocer", c: "Food" },
  ],
});

test("splitIn: money in is earned + people + other, salary its own part, money back apart", () => {
  const { A } = countedTx(base(), "2026-10-17");
  assert.deepEqual(splitIn(A), { in: 8170, earned: 8000, salary: 8000, people: 150, other: 20, back: 100 });
  assert.deepEqual(splitIn(A, (t) => t.d < "2026-10-02"), { in: 8000, earned: 8000, salary: 8000, people: 0, other: 0, back: 0 });
  assert.deepEqual(splitIn([]), { in: 0, earned: 0, salary: 0, people: 0, other: 0, back: 0 });
});

test("countedTx: your own money put in is left out (notIn), money back is marked and takes the purchase's category", () => {
  const { A, notIn } = countedTx(base(), "2026-10-17");
  assert.deepEqual(notIn.map((t) => t.id), ["c1"]);
  const b = A.find((t) => t.id == "b1");
  assert.equal(b.back, true); assert.equal(b.c, "Clothes");
  assert.equal(isIn(b), false); assert.equal(isOut(b), true);
  assert.equal(A.find((t) => t.id == "s1").sal, true);
  // the saved entry itself is never changed
  const S = base(); countedTx(S, "2026-10-17"); assert.equal(S.tx[5].c, "Refunds"); assert.equal(S.tx[5].back, undefined);
});

test("partOf: own money and a bank copy of a card refund do not count", () => {
  assert.equal(partOf(undefined), "in");
  assert.equal(partOf({ kind: "own" }), null);
  assert.equal(partOf({ kind: "back", twin: "x" }), null);
  assert.equal(partOf({ kind: "back" }), "back");
  assert.equal(partOf({ kind: "people" }), "in");
});

test("inKinds works it out once while the data is the same, again after a change", () => {
  const S = base(), a = inKinds(S);
  assert.equal(inKinds(S), a);
  assert.equal(inKinds({ ...S }), a);
  assert.notEqual(inKinds({ ...S, tx: [...S.tx] }), a);
  assert.notEqual(inKinds({ ...S, moneyInRules: [] }), a);
});

test("Activity In leaves out money back and your own money; money back lowers Out", () => {
  const S = base(), k = kinds(S, "2026-10-17");
  assert.deepEqual(totals(S.tx, k), { inc: 8170, out: 400, back: 100, net: 7770 });
});

test("Home money in this month is the same number as splitIn, with money back apart", () => {
  const S = base(), M = homeModel(S, new Date(2026, 9, 17), {});
  const sp = splitIn(M.rows, (t) => t.d.startsWith("2026-10"));
  assert.equal(M.kpi.inc, sp.in);
  assert.equal(M.kpi.inc, 8170);
  assert.equal(M.kpi.back, 100);
});

test("Reports and Recap show the same money in as Home", () => {
  const S = base(), M = homeModel(S, new Date(2026, 9, 17), {});
  assert.equal(seriesN(M, 1, "inc", "2026-10").inc[0], M.kpi.inc);
  assert.deepEqual(trSeries(M, S, "inc", ["2026-10"]), [M.kpi.inc]);
  const R = recapModel(M, new Date(2026, 9, 17));
  assert.equal(R.inc, M.kpi.inc);
  assert.deepEqual(R.incs.map((t) => t.id), ["s1", "p1", "o1"]);
  // Recap's walk through the bank still has every money that reached it, your own money put in too (not the card refund:
  // it lowers the card bill)
  const got = R.steps.reduce((s, x) => s + (x.kind == "in" ? x.a : x.kind == "spend" ? x.small : 0), 0);
  assert.equal(got, 8000 + 150 + 20 + 500);
});

test("money back lowers spending: Home, Budgets, Reports and Categories' category, in its month", () => {
  const S = { ...base(), budgets: { Clothes: 500 } }, NOW = new Date(2026, 9, 17), M = homeModel(S, NOW, {});
  assert.equal(M.kpi.ex, 300 - 100 + 200);
  assert.deepEqual(Object.fromEntries(M.spend), { Clothes: 200, Food: 200 });
  const B = budgetsModel(S, NOW);
  assert.equal(B.info.find((x) => x.k == "Clothes").s, 200);
  assert.deepEqual(Object.fromEntries(B.spend), Object.fromEntries(M.spend));
  assert.deepEqual(trSeries(M, S, "exp", ["2026-10"]), [M.kpi.ex]);
  assert.deepEqual(trSeries(M, S, "cat:Clothes", ["2026-10"]), [200]);
  assert.equal(seriesN(M, 1, "exp", "2026-10").exp[0], M.kpi.ex);
  // net stays money in less money out
  assert.deepEqual(trSeries(M, S, "net", ["2026-10"]), [M.kpi.inc - M.kpi.ex]);
});

test("money back on a card lowers the card's part; a category with only money back this month is not listed", () => {
  const S = base(); S.tx = S.tx.filter((t) => t.id != "b0");
  S.tx.push({ id: "b9", d: "2026-08-05", a: -300, desc: "Fashion Shop", from: "Card", to: "Fashion Shop", c: "Clothes" });
  const M = homeModel(S, new Date(2026, 9, 17), {});
  assert.equal(M.spend.some(([c]) => c == "Clothes"), false);
  const R = recapModel(M, new Date(2026, 9, 17));
  assert.equal(R.cardsU, -100);
  assert.equal(R.bankSpent, R.ex - R.cardsU);
});

test("Forecast and Recap's still to come never expect money back or your own money as income", () => {
  const S = base(), M = homeModel(S, new Date(2026, 11, 3), {});
  const H = forecastHistory(S, M), i = H.keys.indexOf("2026-10");
  assert.equal(H.inc[i], 8170);
  assert.equal(H.cat.Clothes[i], 200);
  assert.ok(!Object.keys(H.incSrc).some((k) => /fashion|cash/i.test(k)));
  const AT = afterToday(S, M.rows, "2026-12", 3, new Set(["Card"]));
  assert.ok(!AT.inc.some((x) => /fashion|cash/i.test(x.k)));
});
