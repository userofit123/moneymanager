// The Jars page's numbers follow the current app: what is free, the monthly fill, each jar's state, goals and completed jars.
import test from "node:test";
import assert from "node:assert/strict";
import { jarsModel } from "../src/views/jars.js";

const NOW = new Date(2026, 9, 17, 12); // 17 Oct 2026
const base = () => ({
  cats: {}, cfg: { reserveAvg: false }, budgets: {}, jarsBuffer: 1000, xf: [], txIgnore: {}, ccOverride: {},
  accounts: [{ n: "Bank", kind: "bank", v: 10000, cur: "ILS", inNW: true, at: "x" }],
  jars: [
    { id: 1, n: "Trip", p: 1, bal: 2000, need: 5000, cap: 500, got: 500 },
    { id: 2, n: "Rainy day", p: 2, bal: 1000, need: 0, cap: 300, got: 0 },
    { id: 3, n: "Laptop", p: 3, bal: 4000, need: 4000, cap: 0 },
    { id: 4, n: "Sofa", p: 0, bal: 0, need: 2500, done: "2026-08-01" },
  ],
  tx: [{ id: 1, d: "2026-08-02", desc: "Sofa shop", from: "Bank", to: "Sofa shop", a: -2400, c: "Home", jar: { id: 4, amt: 2400 } }],
});

test("free money is the accounts minus jars and the amount kept untouched", () => {
  const M = jarsModel(base(), NOW);
  assert.equal(M.F.inJars, 7000);
  assert.equal(M.F.free, 2000); // 10,000 − 7,000 − 1,000
  assert.equal(M.F.over, 0);
});

test("the monthly fill and each jar's state", () => {
  const M = jarsModel(base(), NOW);
  assert.deepEqual(M.jars.map((j) => [j.n, j.state.key, j.type]), [["Trip", "funded", "goal"], ["Rainy day", "needs", "month"], ["Laptop", "noAuto", "goal"]]);
  assert.equal(M.month.got, 500);
  assert.equal(M.month.still, 300);
  assert.equal(M.jars[1].give, 300);
  assert.equal(M.jars[0].pc, 40);
});

test("too much in jars: nothing is free and the extra is shown", () => {
  const S = base(); S.jarsBuffer = 4000;
  const M = jarsModel(S, NOW);
  assert.equal(M.F.free, 0);
  assert.equal(M.F.over, 1000);
  assert.equal(M.month.waiting, true);
});

test("goals and completed jars", () => {
  const M = jarsModel(base(), NOW);
  assert.deepEqual(M.goals.map((g) => [g.n, g.st]), [["Trip", "saving"], ["Laptop", "reached"]]);
  assert.deepEqual(M.done.map((d) => [d.n, d.count, d.paid]), [["Sofa", 1, 2400]]);
});

test("a goal with a deadline asks for more when the monthly amount is too small", () => {
  const S = base(); S.jars[0].due = "2027-04-17"; S.jars[0].cap = 100;
  const g = jarsModel(S, NOW).goals[0];
  assert.equal(g.st, "behind");
  assert.equal(g.m, 6);
  assert.equal(g.fix, 500); // ₪3,000 left over 6 months, rounded up to tens
});

test("no data shows no jars", () => {
  const M = jarsModel({}, NOW);
  assert.equal(M.has.any, false);
  assert.equal(M.goals.length, 0);
});
