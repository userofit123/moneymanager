// Changing the category of one payment of a purchase paid in instalments: the other payments of the same purchase
// (lib/txactions.js instMates, instCatAll), with made-up names and amounts.
import test from "node:test";
import assert from "node:assert/strict";
import * as A from "../src/lib/txactions.js";
import { instPlanKey } from "../src/lib/activity.js";

const T = (id, d, desc, a, o = {}) => ({ id, d, desc, from: "Max", to: desc, a, c: "", tags: [], docs: [], note: "", ...o });
const data = () => ({ tx: [
  T(1, "2026-07-02", "Sofa shop", -500, { inst: [1, 10] }), T(2, "2026-08-02", "Sofa shop", -500, { inst: [2, 10], c: "Home" }),
  T(3, "2026-09-02", "Sofa shop", -500, { inst: [3, 10] }), T(4, "2026-10-02", "Sofa shop תשלום 4 מתוך 10", -500),
  T(5, "2026-10-03", "Sofa shop", -500, { inst: [1, 3] }), // another plan: 3 payments
  T(6, "2026-10-04", "Sofa shop", -90, { inst: [1, 10] }), // another plan: a much smaller amount
  T(7, "2026-10-05", "Sofa shop", -500), // not an instalment
] });

test("the payments of one plan share its key; other plans and plain payments do not", () => {
  const S = data(), k = instPlanKey(S.tx[0]);
  assert.ok(k);
  assert.equal(instPlanKey(S.tx[3]), k, "the plan read from the bank's text");
  assert.notEqual(instPlanKey(S.tx[4]), k);
  assert.notEqual(instPlanKey(S.tx[5]), k);
  assert.equal(instPlanKey(S.tx[6]), null);
});

test("the other payments of the plan, without those already in the category", () => {
  const S = data();
  assert.deepEqual(A.instMates(S, 3, "Home").map((x) => x.id), [1, 4]);
  assert.deepEqual(A.instMates(S, 3, "Shopping").map((x) => x.id), [1, 2, 4]);
  assert.deepEqual(A.instMates(S, 7, "Home"), [], "not an instalment");
  assert.deepEqual(A.instMates(S, 5, "Home"), [], "no other payments of its plan");
});

test("accepting changes them all in one history line; nothing left gives an error", () => {
  const S = data(), r = A.instCatAll(S, 3, "Home");
  assert.equal(r.n, 2);
  assert.deepEqual(r.lines, [["Same category for all payments of a purchase", "Sofa shop: 2 payments → Home"]]);
  assert.deepEqual(S.tx.map((x) => x.c), ["Home", "Home", "", "Home", "", "", ""]);
  assert.equal(A.instCatAll(S, 3, "Home").err, "none");
  assert.equal(S.rules, undefined, "no rule is made");
});
