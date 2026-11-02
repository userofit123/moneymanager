// A card bill or a bill counts as still due until the bank's row that pays it appears, not just because its day came:
// on its day, the day after with no row yet, and the day the row arrives (made-up data).
import test from "node:test";
import assert from "node:assert/strict";
import { now, setNow } from "../src/core/clock.js";
import { homeModel } from "../src/lib/home.js";
import { recapModel, cardsDue } from "../src/lib/recap.js";

const cardPay = (id, d, a) => ({ id, d, desc: "ישראכרט חיוב", from: "Bank Hapoalim", to: "Isracard", a, c: "" });
const rent = (id, d) => ({ id, d, desc: "Rent", from: "Bank Hapoalim", to: "Landlord", a: -3000, c: "Rent" });
// October's purchases leave the bank on 2 November (500), one from 1 November on 2 December (100). September's bill was
// paid by the bank's row on 2 October, so this card's bills are paid by rows the app can see.
function state({ bank = 10000, extra = [], paidBefore = true, bills = [] } = {}) {
  return {
    cats: { Food: 1, Rent: 2 }, cfg: {}, budgets: {}, jarsBuffer: 0, jars: [], xf: [], txIgnore: {}, ccOverride: {}, bills,
    accounts: [{ n: "Bank Hapoalim", kind: "bank", v: bank, cur: "ILS", inNW: true, at: "x" }, { n: "Isracard", kind: "card", v: 0, cur: "ILS" }],
    tx: [
      { id: 1, d: "2026-09-10", desc: "Shop", from: "Isracard", to: "Shop", a: -500, c: "Food", ch: "2026-10-02" },
      ...(paidBefore ? [cardPay(2, "2026-10-02", -500)] : []),
      { id: 3, d: "2026-10-05", desc: "Shop", from: "Isracard", to: "Shop", a: -300, c: "Food", ch: "2026-11-02" },
      { id: 4, d: "2026-10-20", desc: "Shop", from: "Isracard", to: "Shop", a: -200, c: "Food", ch: "2026-11-02" },
      { id: 5, d: "2026-11-01", desc: "Shop", from: "Isracard", to: "Shop", a: -100, c: "Food", ch: "2026-12-02" },
      ...extra,
    ],
  };
}
const at = (y, m, d) => { setNow(new Date(y, m - 1, d, 12)); return now.value; };
const flow = (S, day) => { const H = homeModel(S, day, {}); return { H, F: H.flow, R: recapModel(H, day) }; };
const sumUp = (F) => F.up.reduce((s, b) => s + b.amt, 0);
// In your accounts − card purchases not paid yet − payments still due = money after known payments, on Home and Recap
const addsUp = ({ F, R }) => { assert.equal(Math.round(F.cash) - Math.round(F.cards) - Math.round(sumUp(F)), F.really); assert.equal(R.reallyNow, F.really); };

test("a card bill on its day, before the bank's row: still due, the balance still holds it", () => {
  const x = flow(state(), at(2026, 11, 2));
  assert.equal(x.F.cards, 600); assert.equal(x.F.cardsLater, 100); assert.equal(x.R.freeParts.cardBills, 500);
  addsUp(x);
});

test("the day after, the bank late and no row yet: still due", () => {
  const x = flow(state(), at(2026, 11, 3));
  assert.equal(x.F.cards, 600); addsUp(x);
});

test("the day the bank's row appears: no longer due, and money after known payments stays the same", () => {
  const day = at(2026, 11, 3), before = flow(state(), day), after = flow(state({ bank: 9500, extra: [cardPay(9, "2026-11-03", -500)] }), day);
  assert.equal(after.F.cards, 100); addsUp(after);
  assert.equal(after.F.really, before.F.really, "never taken off twice, never dropped early");
});

test("a card paid from an account that is not connected (no rows ever): its date counts", () => {
  const x = flow(state({ paidBefore: false }), at(2026, 11, 2));
  assert.equal(x.F.cards, 100); addsUp(x);
});

test("more than 10 days late with no row: the bill is taken as paid", () => {
  const x = flow(state(), at(2026, 11, 13));
  assert.equal(x.F.cards, 100);
});

test("a card bill paid a few days early: not due again on its day", () => {
  const S = state({ bank: 9500, extra: [cardPay(9, "2026-10-30", -500)] }), day = at(2026, 10, 31);
  const H = homeModel(S, day, {}), CC = new Set(["Isracard"]);
  assert.equal(cardsDue({ S, A: H.rows, k: H.k, CC, TODAY: H.today, MK: H.MK }).thisMonth, 0);
});

const rentBill = [{ n: "Rent", match: "landlord", every: 1, anchor: 1, dom: 2, manual: true, mode: "rule", amt: 3000, cat: "Rent" }];
test("a regular bill due today stays due until its row appears", () => {
  const day = at(2026, 11, 2), base = { bills: rentBill, extra: [rent(20, "2026-09-02"), rent(21, "2026-10-02")] };
  const due = flow(state(base), day);
  assert.ok(due.F.up.some((b) => b.n == "Rent" && b.amt == 3000)); addsUp(due);
  const paid = flow(state({ ...base, bank: 7000, extra: [...base.extra, rent(22, "2026-11-02")] }), day);
  assert.ok(!paid.F.up.some((b) => b.n == "Rent")); addsUp(paid);
  assert.equal(paid.F.really, due.F.really);
});

test("a bill paid early is not still to pay on its day", () => {
  const day = at(2026, 10, 31), S = state({ bills: rentBill, extra: [rent(20, "2026-09-02"), rent(21, "2026-10-02"), rent(22, "2026-10-30")] });
  const x = flow(S, day);
  assert.ok(!x.F.up.some((b) => b.n == "Rent")); addsUp(x);
});

// A monthly bill due on the 1st whose payment has not come yet on the 2nd: still to pay, dated the 1st of this month (not
// next month's 1st), counted once; once its payment comes it is gone from the list.
const gym = { n: "Gym", match: "gym", every: 1, anchor: 10, dom: 1, manual: true, mode: "rule", rec: "recurring", amt: 100, src: "Bank Hapoalim", cat: "Sport" };
const gymPay = (id, d) => ({ id, d, desc: "Gym", from: "Bank Hapoalim", to: "Gym", a: -100, c: "Sport" });
test("a bill due on the 1st, not paid yet on the 2nd: listed on this month's 1st, never on next month's", () => {
  const S = state({ bills: [gym], extra: [gymPay(10, "2026-09-01"), gymPay(11, "2026-10-01")] });
  const x = flow(S, at(2026, 11, 2)), rows = x.F.up.filter((b) => b.n == "Gym");
  assert.equal(rows.length, 1); assert.equal(rows[0].amt, 100);
  const d = rows[0].nx; assert.equal(d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(), "2026-11-1");
  assert.ok(x.R.bills.every((b) => !b.nx || b.nx.getMonth() == 10), "no row in this month's list is dated next month");
  addsUp(x);
  const y = flow(state({ bills: [gym], extra: [gymPay(10, "2026-09-01"), gymPay(11, "2026-10-01"), gymPay(12, "2026-11-02")] }), at(2026, 11, 2));
  assert.equal(y.F.up.filter((b) => b.n == "Gym").length, 0);
});
