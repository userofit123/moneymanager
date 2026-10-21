// Home's numbers follow the current app: totals, accounts, cards, bills, budgets, jars and the money flow.
import test from "node:test";
import assert from "node:assert/strict";
import { homeModel, flowSteps, cadenceOf, instOf, rdOf } from "../src/lib/home.js";

const NOW = new Date(2026, 9, 17, 12); // 17 Oct 2026
const base = () => ({
  cats: { Food: 1 }, cfg: {}, budgets: { Food: 1000 }, jarsBuffer: 500, xf: [], txIgnore: {}, ccOverride: {},
  accounts: [
    { n: "Bank Hapoalim", kind: "bank", v: 10000, cur: "ILS", inNW: true, at: "x" },
    { n: "Wise", kind: "wallet", v: 100, cur: "USD", inNW: true, at: "x" },
    { n: "Max", kind: "card", v: 0, cur: "ILS" },
  ],
  jars: [{ id: 1, n: "Holiday", p: 1, bal: 2000, need: 4000, got: 300 }],
  tx: [
    { id: 1, d: "2026-10-02", desc: "Salary", from: "Work", to: "Bank Hapoalim", a: 8000, c: "Income" },
    { id: 2, d: "2026-10-05", desc: "Shufersal", from: "Max", to: "Shufersal", a: -400, c: "Food" },
    { id: 3, d: "2026-09-05", desc: "Shufersal", from: "Max", to: "Shufersal", a: -600, c: "Food" },
    { id: 4, d: "2026-10-10", desc: "Move", from: "Bank Hapoalim", to: "Wise", a: -1000 },
    { id: 5, d: "2026-10-10", desc: "Move", from: "Bank Hapoalim", to: "Wise", a: 1000 },
    { id: 6, d: "2026-10-30", desc: "Later", from: "Bank Hapoalim", to: "X", a: -50, c: "Food" },
  ],
});

test("totals count income and spending, not transfers or future payments", () => {
  const S = base(); S.xf = [{ o: 4, i: 5, st: "ok" }];
  const M = homeModel(S, NOW, { USD: 3.5 });
  assert.equal(M.kpi.inc, 8000);
  assert.equal(M.kpi.ex, 400);
  assert.equal(M.kpi.net, 7600);
  assert.equal(M.kpi.cash, 10350); // 10,000 + $100 × 3.5
  assert.equal(M.kpi.exLast, 600);
});

test("cards compare this month with last month", () => {
  const M = homeModel(base(), NOW, {});
  assert.deepEqual(M.cards.map((c) => [c.n, c.now, c.last]), [["Max", 400, 600]]);
});

test("budgets, jars and the blocks to show", () => {
  const M = homeModel(base(), NOW, {});
  assert.equal(M.budgets[0].k, "Food");
  assert.equal(M.budgets[0].pc, 40);
  assert.equal(M.jars[0].pc, 50);
  assert.equal(M.flow.inJars, 2000);
  assert.equal(M.has.bills, false);
  assert.equal(M.has.donut, true);
  assert.equal(M.any, true);
  assert.equal(homeModel({}, NOW, {}).any, false);
});

test("the money flow always adds up from the start to what is free", () => {
  const M = homeModel(base(), NOW, {});
  for (const mode of ["left", "actual"]) {
    const W = flowSteps(M.flow, mode), items = W.cols.slice(1, -1);
    const end = W.start - items.reduce((s, c) => s + c.a, 0);
    assert.ok(Math.abs(W.cols.at(-1).lo - Math.max(0, end)) < 0.01, mode);
    assert.equal(W.cols[0].kind, "start");
    assert.equal(W.cols.at(-1).kind, "end");
  }
  // Planned: Food takes off its whole budget (1,000), not only the 400 spent.
  const food = flowSteps(M.flow, "left").cols.find((c) => c.k === "Food");
  assert.equal(food.a, 1000);
  assert.equal(flowSteps(M.flow, "actual").cols.find((c) => c.k === "Food").a, 400);
});

test("a monthly bill is found and its next date predicted", () => {
  const S = base();
  ["2026-07-03", "2026-08-03", "2026-09-03", "2026-10-03"].forEach((d, i) => S.tx.push({ id: 100 + i, d, desc: "Netflix", from: "Max", to: "Netflix", a: -50, c: "Fun" }));
  const M = homeModel(S, NOW, {});
  assert.equal(M.upcoming[0].n, "Netflix");
  assert.equal(M.upcoming[0].nx.getMonth(), 10); // November
  assert.equal(M.upcoming[0].status, "paid");
});

test("rhythm, instalments and moved months", () => {
  assert.equal(cadenceOf([{ d: "2026-01-01", a: -10 }, { d: "2026-01-31", a: -10 }, { d: "2026-03-02", a: -10 }]).every, 1);
  assert.equal(cadenceOf([{ d: "2026-01-01", a: -10 }, { d: "2026-01-09", a: -10 }]), null);
  assert.deepEqual(instOf({ desc: "IKEA תשלום 3 מתוך 10" }), { n: 3, total: 10 });
  assert.equal(rdOf({ d: "2026-10-31", rm: "2026-11" }), "2026-11-30");
});
