// The Categories and tags page's numbers (lib/catStats.js) on a small made-up set of entries:
// what counts (like Reports), the period and the one before it, the order of the rows, the month-by-month amounts and the latest entries.
import test from "node:test";
import assert from "node:assert/strict";
import { homeModel } from "../src/lib/home.js";
import { catStats, periodOf } from "../src/lib/catStats.js";

const NOW = new Date(2026, 9, 17, 12);
const tx = (id, d, desc, a, c = "", tags = [], o = {}) => ({ id, d, desc, from: "Bank", to: desc, a, c, tags, docs: [], note: "", ...o });
const S = () => ({
  v: 4, cats: { Food: 0, Fun: 1, Empty: 2, Gifts: 3, Salary: 99, Uncategorized: 4 }, budgets: { Food: 1000 },
  rules: [{ k: "super", c: "Food" }, { k: "market", c: "Food" }], tagRules: [{ k: "cinema", t: "fun,out" }], cardRules: ["max charge"],
  accounts: [{ n: "Bank", kind: "bank", cur: "ILS", v: 0 }, { n: "Savings", kind: "bank", cur: "ILS", v: 0 }], xf: [], txIgnore: {}, ccOverride: {}, cfg: {},
  tx: [
    tx(1, "2026-07-05", "Super A", -300, "Food", ["home"]),
    tx(2, "2026-08-05", "Super B", -200, "Food"),
    tx(3, "2026-09-05", "Super C", -100, "Food", ["home"]),
    tx(4, "2026-09-07", "Super refund", 50, "Food"),
    tx(5, "2026-05-10", "Super old", -150, "Food"), // the months before
    tx(6, "2026-08-12", "Cinema", -80, "Fun", ["fun", "out"]),
    tx(7, "2026-09-01", "Pay", 5000, "Salary"),
    tx(8, "2026-06-01", "Pay", 4000, "Salary"), // the months before
    tx(9, "2026-09-10", "Kiosk", -40),
    tx(10, "2026-10-02", "Super D", -70, "Food"), // this month: not in the period, but the latest entry
    tx(11, "2026-10-30", "Super later", -999, "Food"), // still to come: never counted
    tx(12, "2026-08-20", "To savings", -1000, "Food", [], { to: "Savings" }), // between your own accounts
    tx(13, "2026-08-20", "To savings", 1000, "Food", [], { to: "Savings" }),
    tx(14, "2026-09-15", "max charge", -900, "Food"), // the card bill
    tx(15, "2026-08-01", "Gift", 100, "Gifts"), // only money in: read like income
  ],
});
const run = (months = 3, s = S()) => catStats(s, homeModel(s, NOW).rows, NOW, months);
const row = (L, k) => L.rows.find((r) => r.k == k);

test("the period is the last full months, and the one before it has the same length", () => {
  assert.deepEqual(periodOf(NOW, 3), { keys: ["2026-07", "2026-08", "2026-09"], prev: ["2026-04", "2026-05", "2026-06"] });
  assert.equal(periodOf(NOW, 12).keys[0], "2025-10");
  assert.equal(periodOf(new Date(2026, 0, 5), 3).keys.join(), "2025-10,2025-11,2025-12");
});

test("a category: money out and in, average, change, entries, budget, rules", () => {
  const R = run(), f = row(R.cats, "Food");
  assert.deepEqual({ out: f.out, in: f.in, net: f.net, n: f.n, prevOut: f.prevOut, avg: f.avg, change: f.change, main: f.main, budget: f.budget, rules: f.rules, last: f.last },
    { out: 600, in: 50, net: -550, n: 4, prevOut: 150, avg: 200, change: 450, main: "out", budget: 1000, rules: 2, last: "2026-10-02" });
  assert.deepEqual(f.outM, [300, 200, 100]); assert.deepEqual(f.inM, [0, 0, 50]);
  assert.deepEqual(f.recent.map((t) => t.id), [10, 4, 3, 2, 1]);
  assert.equal(R.hasPrev, true);
});

test("transfers, card bills and entries still to come are not counted", () => {
  const R = run(12), f = row(R.cats, "Food");
  assert.equal(f.out, 750); assert.equal(f.in, 50);
  assert.ok(!f.recent.some((t) => [11, 12, 13, 14].includes(t.id)));
});

test("income categories show money in; the order is spending, income, Uncategorized", () => {
  const R = run(), s = row(R.cats, "Salary");
  assert.deepEqual({ inc: s.inc, main: s.main, in: s.in, prevIn: s.prevIn, change: s.change, avg: Math.round(s.avg) }, { inc: true, main: "in", in: 5000, prevIn: 4000, change: 1000, avg: 1667 });
  assert.deepEqual(R.cats.rows.map((r) => r.k), ["Food", "Fun", "Empty", "Salary", "Gifts", "Uncategorized"]);
  assert.equal(row(R.cats, "Uncategorized").out, 40); assert.equal(row(R.cats, "Gifts").main, "in");
  assert.deepEqual(R.cats.totals, { out: 720, in: 5150, net: 4430 });
});

test("tags: an entry with two tags counts once in the totals", () => {
  const R = run();
  assert.deepEqual(R.tags.rows.map((r) => [r.k, r.out, r.n, r.rules]), [["home", 400, 2, 0], ["fun", 80, 1, 1], ["out", 80, 1, 1]]);
  assert.deepEqual(R.tags.totals, { out: 480, in: 0, net: -480 });
});

test("with no earlier entries there is nothing to compare with; no data gives empty lists", () => {
  const s = S(); s.tx = s.tx.filter((t) => t.d >= "2026-07-01");
  assert.equal(run(3, s).hasPrev, false);
  const E = catStats({}, [], NOW, 6);
  assert.deepEqual([E.cats.rows, E.tags.rows, E.cats.totals, E.months.length], [[], [], { out: 0, in: 0, net: 0 }, 6]);
});
