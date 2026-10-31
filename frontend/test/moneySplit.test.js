// Money in counted the same everywhere (lib/moneyIn.js splitIn, countedTx, Activity totals, Home, Reports, Recap):
// money back is never money in and never lowers spending; a card credit still lowers the card's bill. Made-up data only.
import test from "node:test";
import assert from "node:assert/strict";
import { inKinds, splitIn, isIn, isOut } from "../src/lib/moneyIn.js";
import { countedTx } from "../src/lib/bills.js";
import { kinds, totals } from "../src/lib/activity.js";
import { homeModel } from "../src/lib/home.js";
import { seriesN, trSeries } from "../src/lib/reports.js";
import { recapModel, afterToday } from "../src/lib/recap.js";
import { budgetsModel } from "../src/lib/budgets.js";
import { forecastHistory } from "../src/lib/jars.js";

const ACC = [{ n: "Bank", kind: "bank", inNW: true, v: 1000, cur: "ILS" }, { n: "Card", kind: "card" }];
const base = () => ({
  accounts: ACC, cats: { Food: 1, Clothes: 2 }, moneyInRules: [{ k: "acme", kind: "salary" }],
  tx: [
    { id: "s1", d: "2026-10-01", a: 8000, desc: "זיכוי", from: "Acme", to: "Bank" },
    { id: "z1", d: "2026-10-02", a: 150, desc: "זיכוי", from: "", to: "Bank" },
    { id: "c1", d: "2026-10-04", a: 500, desc: "הפקדת מזומן", from: "", to: "Bank" },
    { id: "b0", d: "2026-10-05", a: -300, desc: "Fashion Shop", from: "Card", to: "Fashion Shop", c: "Clothes" },
    { id: "b1", d: "2026-10-08", a: 100, desc: "Fashion Shop", from: "Fashion Shop", to: "Card", c: "Refunds" },
    { id: "f1", d: "2026-10-06", a: -200, desc: "Grocer", from: "Bank", to: "Grocer", c: "Food" },
  ],
});
const NOW = new Date(2026, 9, 17);

test("splitIn: money in (salary too), its salary part, and money back apart", () => {
  const { A } = countedTx(base(), "2026-10-17");
  assert.deepEqual(splitIn(A), { in: 8650, salary: 8000, back: 100 });
  assert.deepEqual(splitIn(A, (t) => t.d < "2026-10-02"), { in: 8000, salary: 8000, back: 0 });
  assert.deepEqual(splitIn([]), { in: 0, salary: 0, back: 0 });
});

test("countedTx: every money in counts; money back is marked and keeps its own category", () => {
  const { A } = countedTx(base(), "2026-10-17");
  assert.equal(A.length, 6);
  const b = A.find((t) => t.id == "b1");
  assert.equal(b.back, true); assert.equal(b.c, "Refunds");
  assert.equal(isIn(b), false); assert.equal(isOut(b), false);
  assert.equal(A.find((t) => t.id == "s1").sal, true);
  assert.equal(isIn(A.find((t) => t.id == "c1")), true);
  // the saved entry itself is never changed
  const S = base(); countedTx(S, "2026-10-17"); assert.equal(S.tx[4].back, undefined);
});

test("inKinds works it out once while the data is the same, again after a change", () => {
  const S = base(), a = inKinds(S);
  assert.equal(inKinds(S), a);
  assert.equal(inKinds({ ...S }), a);
  assert.notEqual(inKinds({ ...S, tx: [...S.tx] }), a);
  assert.notEqual(inKinds({ ...S, moneyInRules: [] }), a);
});

test("Activity: In leaves out money back, Out is not lowered by it, money back is its own total", () => {
  const S = base(), k = kinds(S, "2026-10-17");
  assert.deepEqual(totals(S.tx, k), { inc: 8650, out: 500, back: 100, net: 8150 });
});

test("Home, Reports and Recap show the same money in, money out and money back", () => {
  const S = base(), M = homeModel(S, NOW, {});
  assert.equal(M.kpi.inc, 8650); assert.equal(M.kpi.ex, 500); assert.equal(M.kpi.back, 100); assert.equal(M.kpi.sal, 8000);
  assert.equal(M.kpi.inc, splitIn(M.rows, (t) => t.d.startsWith("2026-10")).in);
  assert.equal(seriesN(M, 1, "inc", "2026-10").inc[0], M.kpi.inc);
  assert.equal(seriesN(M, 1, "exp", "2026-10").exp[0], M.kpi.ex);
  assert.deepEqual(trSeries(M, S, "inc", ["2026-10"]), [M.kpi.inc]);
  assert.deepEqual(trSeries(M, S, "exp", ["2026-10"]), [M.kpi.ex]);
  assert.deepEqual(trSeries(M, S, "net", ["2026-10"]), [M.kpi.inc - M.kpi.ex]);
  const R = recapModel(M, NOW);
  assert.equal(R.inc, M.kpi.inc);
  assert.deepEqual(R.incs.map((t) => t.id), ["s1", "c1", "z1"]);
});

test("money back does not lower spending: the purchase counts in full in Home, Budgets and Reports", () => {
  const S = { ...base(), budgets: { Clothes: 500 } }, M = homeModel(S, NOW, {});
  assert.deepEqual(Object.fromEntries(M.spend), { Clothes: 300, Food: 200 });
  const B = budgetsModel(S, NOW);
  assert.equal(B.info.find((x) => x.k == "Clothes").s, 300);
  assert.deepEqual(trSeries(M, S, "cat:Clothes", ["2026-10"]), [300]);
});

test("a credit on a credit card still lowers that card's bill", () => {
  const S = base(), M = homeModel(S, NOW, {});
  assert.equal(M.cards.find((c) => c.n == "Card").now, 200);
  const R = recapModel(M, NOW);
  assert.equal(R.cardsU, 300); // spending on the card, not lowered
  assert.equal(R.cardsThis + R.cardsNext, 200); // what the bank will take for it
});

test("Forecast and Recap's still to come never expect money back again", () => {
  const S = base(), M = homeModel(S, new Date(2026, 11, 3), {});
  const H = forecastHistory(S, M), i = H.keys.indexOf("2026-10");
  assert.equal(H.inc[i], 8650);
  assert.equal(H.cat.Clothes[i], 300);
  assert.ok(!Object.keys(H.incSrc).some((k) => /fashion/i.test(k)));
  const AT = afterToday(S, M.rows, "2026-12", 3, new Set(["Card"]));
  assert.ok(!AT.inc.some((x) => /fashion/i.test(x.k)));
});
