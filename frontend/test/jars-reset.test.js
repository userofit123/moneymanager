// "Reset jars": all the money in the open jars is shared again in order of priority (lib/jars.js resetPlan / resetJars).
import test from "node:test";
import assert from "node:assert/strict";
import { resetPlan, resetJars } from "../src/lib/jars.js";
import { makePatch, applyPatch } from "../src/core/undoPatch.js";
import { fm } from "../src/format.js";

const ctx = { fm };
const after = (S) => Object.fromEntries(resetPlan(S).rows.map((r) => [r.n, r.after]));

test("jars with a target are filled first, in priority order; the rest goes to the jars with no target", () => {
  const S = { jars: [
    { id: 1, n: "Trip", p: 2, bal: 100, need: 1000, cap: 100 },
    { id: 2, n: "Car", p: 1, bal: 900, need: 500, cap: 50 },
    { id: 3, n: "Rainy day", p: 3, bal: 1500, need: 0, cap: 300 },
  ] };
  const P = resetPlan(S);
  assert.equal(P.pool, 2500);
  assert.deepEqual(after(S), { Car: 500, Trip: 1000, "Rainy day": 1000 });
  assert.equal(P.free, 0);
  assert.deepEqual(P.rows.map((r) => r.n), ["Car", "Trip", "Rainy day"], "in priority order");
});

test("a small pool fills the first jars only", () => {
  const S = { jars: [
    { id: 1, n: "A", p: 1, bal: 0, need: 500, cap: 100 },
    { id: 2, n: "B", p: 2, bal: 300, need: 500, cap: 100 },
    { id: 3, n: "C", p: 3, bal: 0, need: 0, cap: 100 },
  ] };
  assert.deepEqual(after(S), { A: 300, B: 0, C: 0 });
  assert.equal(resetPlan(S).free, 0);
});

test("jars with no target share what is left by their monthly amounts, in whole agorot", () => {
  const S = { jars: [
    { id: 1, n: "A", p: 1, bal: 100, need: 0, cap: 100 },
    { id: 2, n: "B", p: 2, bal: 0, need: 0, cap: 200 },
    { id: 3, n: "C", p: 3, bal: 0, need: 0, cap: 0 },
  ] };
  assert.deepEqual(after(S), { A: 33.33, B: 66.67, C: 0 }, "a jar with no monthly amount gets nothing; the last one takes the remainder");
});

test("with no monthly amounts the jars with no target share equally", () => {
  const S = { jars: [
    { id: 1, n: "A", p: 1, bal: 100, need: 0 },
    { id: 2, n: "B", p: 2, bal: 0, need: 0, cap: 0 },
    { id: 3, n: "C", p: 3, bal: 0, need: 0 },
  ] };
  assert.deepEqual(after(S), { A: 33.33, B: 33.33, C: 33.34 });
});

test("money stays free only when every jar has a target and all are full", () => {
  const S = { jars: [
    { id: 1, n: "A", p: 1, bal: 800, need: 500, cap: 100 },
    { id: 2, n: "B", p: 2, bal: 300, need: 400, cap: 100 },
  ] };
  const P = resetPlan(S);
  assert.deepEqual(after(S), { A: 500, B: 400 });
  assert.equal(P.free, 200);
});

test("money held outside your accounts and completed jars are not touched", () => {
  const S = { jars: [
    { id: 1, n: "Loan", p: 1, kind: "payoff", bal: 1500, out: 1000, need: 1200, cap: 200 },
    { id: 2, n: "Sofa", p: 2, bal: 700, need: 700, done: "2026-08-01" },
    { id: 3, n: "Rainy day", p: 3, bal: 400, need: 0, cap: 100 },
  ] };
  const P = resetPlan(S);
  assert.equal(P.pool, 900, "500 held in the loan jar + 400");
  // the loan: 1,000 already paid back, so it takes 200 more to reach what is owed
  assert.deepEqual(after(S), { Loan: 1200, "Rainy day": 700 });
  assert.ok(!P.rows.some((r) => r.n == "Sofa"));
  resetJars(S, ctx);
  assert.equal(S.jars[0].out, 1000);
  assert.equal(S.jars[1].bal, 700);
});

test("one history line; what goes in counts as received this month; one Undo puts every jar back", () => {
  const S = { jars: [
    { id: 1, n: "A", p: 1, bal: 0, need: 300, cap: 100, got: 0 },
    { id: 2, n: "B", p: 2, bal: 500, need: 0, cap: 100, got: 100, moves: [] },
    { id: 3, n: "C", p: 3, bal: 0, need: 0, cap: 100, got: 0 },
  ] };
  const before = structuredClone(S), next = structuredClone(S);
  const L = resetJars(next, ctx);
  assert.deepEqual(L, [["Reset jars", "3 jars · ₪500 shared again"]]);
  const [a, b, c] = next.jars;
  assert.deepEqual([a.bal, b.bal, c.bal], [300, 100, 100]);
  assert.equal(a.balIn, true); assert.equal(a.got, 300); assert.equal(a.moves[0].note, "Reset jars");
  assert.equal(b.balIn, undefined); assert.equal(b.got, 0, "money taken out lowers what it received"); assert.equal(b.moves[0].amt, -400);
  assert.equal(b.balEdit, true);
  const u = makePatch(before, next);
  applyPatch(next, u);
  assert.deepEqual(next.jars.map((j) => [j.bal, j.got]), before.jars.map((j) => [j.bal, j.got]));
});

test("nothing to change gives no history line", () => {
  const S = { jars: [{ id: 1, n: "A", p: 1, bal: 0, need: 0, cap: 100 }] };
  assert.deepEqual(resetJars(S, ctx), []);
});
