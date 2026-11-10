// The Jars page's numbers: what is free, the monthly fill, each jar's state, goals and completed jars.
import test from "node:test";
import assert from "node:assert/strict";
import { jarsModel, takeBackAmt } from "../src/lib/jars.js";

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

// jarProject on a made-up forecast line that saves 1,000 a month and nothing free today.
test("a jar that gets nothing says whether the jars before it took the money", async () => {
  const { jarProject } = await import("../src/lib/jars.js");
  const line = { cash: 0, bal: Array.from({ length: 13 }, (_, k) => k * 1000) }, H = { flow: { free: 0, over: 0, R: { total: 0 } } };
  const S = { jars: [{ id: 1, n: "Big goal", p: 1, bal: 0, need: 50000, cap: 2000 }, { id: 2, n: "Extras", p: 2, bal: 0, need: 0, cap: 500 }] };
  const [big, extras] = jarProject(S, H, NOW, {}, 24, line).J;
  assert.equal(big.series[12], 12000); // takes the whole 1,000 a month
  assert.equal(extras.series[12], 0);
  assert.equal(extras.ahead12, 12000);
  assert.equal(big.ahead12, 0);
  // with no jar before it, nothing taken by others: the reason is too little money
  const [alone] = jarProject({ jars: [S.jars[1]] }, { flow: { free: 0, over: 0, R: { total: 0 } } }, NOW, {}, 24, { cash: 0, bal: Array(13).fill(0) }).J;
  assert.equal(alone.series[12], 0);
  assert.equal(alone.ahead12, 0);
});

// MM-19: short of money while the jars hold less than ₪1 (or nothing): no "Your jars hold ₪0 more than you have. Lower them by ₪0."
test("take back from the jars: never offers ₪0, and is rounded once", () => {
  const S = base(); S.jarsBuffer = 20000; S.jars = [{ id: 1, n: "Trip", p: 1, bal: 0.3, need: 5000, cap: 0, got: 0 }];
  const F = jarsModel(S, NOW).F;
  assert.ok(F.over >= 1 && F.inJars > 0 && F.inJars < 0.5); // short, with a fraction of a shekel in the jar
  assert.equal(takeBackAmt(F.over, F.inJars), 0);
  assert.equal(takeBackAmt(5, 0), 0);
  assert.equal(takeBackAmt(0, 300), 0);
  assert.equal(takeBackAmt(100, 250.6), 100);
  assert.equal(takeBackAmt(400, 250.6), 251);
});
