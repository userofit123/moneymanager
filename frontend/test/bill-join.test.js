// "Same bill as…": a business that changes the name on its charges shows up as two bills; joined, they are one bill
// with one history, counted once, and the old name is not found as a bill again (lib/bills.js joinBills, joinHints).
import test from "node:test";
import assert from "node:assert/strict";
import { billState, billsModel, withDetected, joinBills, joinNo, isBillPayment, deleteBill } from "../src/lib/bills.js";

const NOW = new Date(2026, 9, 17, 12); // 17 Oct 2026
const OLD = "STREAMLY* VIDEO SUB STREAMLY.TV", NEW = "Streamly Video Subscription"; // made-up names
let nid = 1;
const T = (d, to, a) => ({ id: nid++, d, desc: to, from: "Bank", to, a, c: "Subscriptions", tags: [], docs: [], note: "" });
function state() {
  nid = 1;
  const tx = [
    ...["04", "05", "06", "07"].map((m) => T(`2026-${m}-05`, OLD, -40)),
    ...["08", "09", "10"].map((m) => T(`2026-${m}-06`, NEW, -40)),
    T("2026-09-12", "Corner bakery", -25),
  ];
  return withDetected({ tx, bills: [], jars: [{ id: 1, n: "Fun", bill: OLD.toLowerCase() }], accounts: [] }, NOW).next;
}

test("a bill that stopped and a new one with a shared word and the same price: the new one gets a hint", () => {
  const S = state(), M = billsModel(S, NOW), nb = M.all.find((b) => b.n === NEW);
  assert.equal(S.bills.length, 2);
  assert.deepEqual(nb.join, { idx: S.bills.findIndex((b) => b.n === OLD), n: OLD, lp: "2026-07-05" });
  assert.equal(M.all.find((b) => b.n === OLD).join, undefined);
});

test("joining keeps the most recently paid bill, takes in the other's payments and its jar, and counts it once", () => {
  const S = state(), o = S.bills.findIndex((b) => b.n === OLD), n = S.bills.findIndex((b) => b.n === NEW);
  const before = billsModel(S, NOW).mo;
  assert.deepEqual(joinBills(S, o, n, NOW), [["Joined bills", OLD + " → " + NEW]]); // picked from the old one: the new name stays
  assert.equal(S.bills.length, 1);
  assert.deepEqual([S.bills[0].n, S.bills[0].also], [NEW, [OLD.toLowerCase()]]);
  assert.equal(S.jars[0].bill, NEW.toLowerCase());
  const st = billState(S, NOW);
  assert.equal(st.billTx(S.bills[0]).length, 7);
  assert.equal(st.all.length, 1, "the old name is not found as a bill again");
  assert.equal(withDetected(S, NOW).lines.length, 0);
  const M = billsModel(S, NOW);
  assert.equal(M.rec.length, 1); assert.equal(M.all[0].join, undefined);
  assert.ok(Math.abs(M.mo - 40) < 1e-9 && Math.abs(before - 40) < 1e-9, "one bill, one monthly amount");
  assert.ok(isBillPayment(S.bills[0], { desc: OLD, to: OLD, id: 99 }) && !isBillPayment(S.bills[0], { desc: "Corner bakery", to: "Corner bakery", id: 98 }));
});

test("joining needs two different bills that are not one-off; 'Not the same' hides the hint", () => {
  const S = state(), o = S.bills.findIndex((b) => b.n === OLD), n = S.bills.findIndex((b) => b.n === NEW);
  assert.equal(joinBills(S, n, n, NOW), false); assert.equal(joinBills(S, n, 9, NOW), false);
  assert.deepEqual(joinNo(S, n, S.bills[o].match, OLD), [["Kept bills apart", OLD + " · " + NEW]]);
  assert.equal(billsModel(S, NOW).all.find((b) => b.n === NEW).join, undefined);
});

test("removing a joined bill keeps every one of its names from being found as a bill again", () => {
  const S = state(), o = S.bills.findIndex((b) => b.n === OLD), n = S.bills.findIndex((b) => b.n === NEW);
  joinBills(S, o, n, NOW);
  deleteBill(S, 0);
  assert.equal(S.bills.length, 0);
  assert.ok(S.ignoredBills.includes(OLD.toLowerCase()) && S.ignoredBills.includes(NEW.toLowerCase()));
});
