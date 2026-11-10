// Points and levels (lib/points.js): levels, no daily caps, once-only, points for any update, by hand vs automatic, month results, and Undo.
import test from "node:test";
import assert from "node:assert/strict";
import { POINTS, levelFor, award, earnFromChange, pointsUpkeep, pointsSummary, pointsByMonth, monthParts, setupDone } from "../src/lib/points.js";
import { setField, addTags, roSave, xfOk, dupKeep } from "../src/lib/txactions.js";
import { createDataStore } from "../src/stores/data.js";

const DAY = "2026-11-02";
const total = (S) => pointsSummary(S, DAY, []).total;
// a change as the app makes it: edit a copy, then the points it earns (what the data store does)
const act = (S, fn) => { const next = structuredClone(S); const r = fn(next); const lines = Array.isArray(r) ? r : r?.lines || []; earnFromChange(S, next, lines, DAY); return next; };

test("levels: 100, 250, 450, 700 points, each step 50 more than the last", () => {
  assert.deepEqual(levelFor(0), { level: 1, start: 0, next: 100, into: 0, need: 100 });
  assert.equal(levelFor(99).level, 1);
  assert.deepEqual(levelFor(100), { level: 2, start: 100, next: 250, into: 0, need: 150 });
  assert.equal(levelFor(250).level, 3);
  assert.equal(levelFor(449).level, 3);
  assert.equal(levelFor(450).level, 4);
  assert.deepEqual(levelFor(720), { level: 5, start: 700, next: 1000, into: 20, need: 280 });
});

test("award gives once per key, with no cap on how many a day", () => {
  const S = {};
  assert.equal(award(S, "visit:" + DAY, "visit", 5, DAY), 5);
  assert.equal(award(S, "visit:" + DAY, "visit", 5, DAY), 0);
  for (let i = 0; i < 1000; i++) award(S, "cat:" + i, "cat", 1, DAY);
  assert.equal(pointsSummary(S, DAY, []).byKind.cat, 1000 * POINTS.cat);
  for (let i = 0; i < 300; i++) award(S, "tag:" + i, "tag", 1, DAY);
  assert.equal(pointsSummary(S, DAY, []).byKind.tag, 300 * POINTS.tag);
});

const base = () => ({ tx: [{ id: 1, desc: "Shop", c: "", a: -50, d: "2026-11-01", tags: [] }, { id: 2, desc: "Cafe", c: "", a: -20, d: "2026-11-01", tags: [] }], rules: [], budgets: {}, xf: [{ o: 1, i: 2, st: "auto" }], dismissed: {}, points: {} });

test("a category by hand earns, once per payment; automatic sorting earns nothing", () => {
  let S = act(base(), (n) => setField(n, 1, "c", "Food"));
  assert.equal(total(S), 1);
  S = act(S, (n) => setField(n, 1, "c", "Home")); // the same payment again: an update, once a day
  assert.equal(total(S), 1 + POINTS.edit);
  S = act(S, (n) => setField(n, 1, "c", "Food"));
  assert.equal(total(S), 1 + POINTS.edit);
  S = act(S, (n) => { n.tx[1].c = "Food"; return [["Added categories from an AI file", "x"]]; });
  assert.equal(total(S), 1 + POINTS.edit);
  S = act(S, () => []); // settle's rules fill a category outside any change by hand
  assert.equal(total(S), 1 + POINTS.edit);
});

test("a tag by hand earns; a rule earns once; an alert only the first time it is cleared", () => {
  let S = act(base(), (n) => addTags(n, 1, ["trip", "work"]));
  assert.equal(total(S), 2);
  S = act(S, (n) => roSave(n, 2, "cafe", "Food"));
  assert.equal(S.points["rule:cafe"].pts, POINTS.rule);
  S = act(S, (n) => { n.dismissed.a1 = 1; return []; });
  const t1 = total(S);
  assert.equal(t1, 2 + POINTS.rule + POINTS.alert);
  S = act(S, (n) => { n.dismissed = {}; return []; }); // shown again
  S = act(S, (n) => { n.dismissed.a1 = 1; return []; }); // and cleared again
  assert.equal(total(S), t1);
});

test("Needs review: a transfer looked at and a kept duplicate earn once each", () => {
  let S = act(base(), (n) => xfOk(n, 1));
  S = act(S, (n) => dupKeep(n, 2));
  assert.equal(total(S), 2 * POINTS.review);
  S = act(S, (n) => { n.xf[0].st = "rej"; return [["Not a transfer", "x"]]; }); // changed its mind: only an update
  assert.equal(total(S), 2 * POINTS.review + POINTS.edit);
  S = act(S, (n) => { n.xf[0].st = "rej"; return [["Not a transfer", "x"]]; }); // nothing changed: nothing more
  assert.equal(total(S), 2 * POINTS.review + POINTS.edit);
});

test("any update to items earns, each item once a day, with no daily cap", () => {
  // marking bills: each bill once a day; switching back and forth on the same day adds nothing more
  let S = { ...base(), bills: [{ n: "Gym", flag: "" }, { n: "Phone", flag: "" }] };
  S = act(S, (n) => { n.bills[0].flag = "cancel"; return [["Marked to cancel", "Gym"]]; });
  S = act(S, (n) => { n.bills[1].flag = "cancel"; return [["Marked to cancel", "Phone"]]; });
  assert.equal(total(S), 2 * POINTS.edit);
  S = act(S, (n) => { n.bills[0].flag = ""; return [["Kept bill", "Gym"]]; });
  S = act(S, (n) => { n.bills[0].flag = "cancel"; return [["Marked to cancel", "Gym"]]; });
  assert.equal(total(S), 3 * POINTS.edit);
  assert.equal(S.points["edit:Marked to cancel:Gym:" + DAY].d, "Marked to cancel");
  // a change to many payments at once: a point for each payment
  const many = { tx: Array.from({ length: 1000 }, (_, i) => ({ id: i, desc: "Shop", c: "Food", a: -5, d: "2026-11-01" })), points: {} };
  const M = act(many, (n) => { n.tx.forEach((t) => { t.note = "checked"; }); return [["Edited note", "1000 payments"]]; });
  assert.equal(total(M), 1000 * POINTS.edit);
  // a history line that changed nothing (an export) and a change made by the app earn nothing
  S = act(S, () => [["Exported data", "all data"]]);
  S = act(S, (n) => { n.budgets.Food = 100; return [["Set budget", "Food", null, "System"]]; });
  assert.equal(total(S), 3 * POINTS.edit);
});

test("setup steps are recorded once and stay when the thing is deleted", () => {
  const S = { tx: [], accounts: [{ n: "Main bank", kind: "bank" }, { n: "Pension", kind: "pension", manual: true, v: 0 }, { n: "Wallet", custom: true, ck: "cash", kind: "custom", manual: true }], budgets: { Food: 500 }, jars: [] };
  assert.deepEqual(setupDone(S).map((x) => x.key), ["setup:bank", "setup:budget", "setup:cash"]);
  pointsUpkeep(S, DAY, []);
  assert.equal(total(S), 100 + 50 + 50);
  S.budgets = {};
  pointsUpkeep(S, DAY, []);
  assert.equal(total(S), 200);
});

// made-up months: October income 10,000; out 8,000 (kept 20%). September: income 10,000, out 9,000 (kept 10%).
const R = [
  { d: "2026-09-01", a: 10000, c: "Salary" }, { d: "2026-09-05", a: -1000, c: "Food" }, { d: "2026-09-06", a: -100, c: "Fun" }, { d: "2026-09-07", a: -7900, c: "Rent" },
  { d: "2026-10-01", a: 10000, c: "Salary" }, { d: "2026-10-05", a: -800, c: "Food" }, { d: "2026-10-06", a: -50, c: "Fun" }, { d: "2026-10-07", a: -7150, c: "Rent" },
];

test("month results: kept, kept more than last month, less spent by category, budgets kept, all with a category", () => {
  const P = Object.fromEntries(monthParts(R, { Food: 900, Rent: 7000 }, "2026-10").map((x) => [x.key.slice(14), x.pts]));
  assert.deepEqual(P, {
    kept: 20 * POINTS.keptPerPct, // 20% kept
    better: 10 * POINTS.betterPerPct, // 10 points better than 10%
    "cat:Food": 40, // 20% less → 40 points
    "cat:Rent": 18, // 9% less (7,900 → 7,150) → 18 points; Fun was under ₪200 last month, so it is left out
    "bud:Food": POINTS.budgetKept, // 800 within 900; Rent went over 7,000
    allcat: POINTS.allCat,
  });
  // kept is capped at 30%, and nothing for a month with no income
  assert.equal(monthParts([{ d: "2026-10-01", a: 1000 }, { d: "2026-10-02", a: -100, c: "Food" }], {}, "2026-10").find((x) => x.kind == "kept").pts, 300);
  assert.equal(monthParts([{ d: "2026-10-02", a: -100, c: "Food" }], {}, "2026-10").find((x) => x.kind == "kept"), undefined);
});

test("a month is on the way while it runs and counted once after it ends", () => {
  const S = { tx: [], budgets: {}, points: {} };
  const sum = pointsSummary(S, "2026-10-20", R);
  assert.equal(sum.total, 0);
  assert.equal(sum.monthPreview.month, "2026-10");
  assert.ok(sum.monthPreview.total > 0);
  pointsUpkeep(S, "2026-11-01", R); // too early: late bank rows may still come
  assert.equal(total(S), 0);
  assert.ok(pointsSummary(S, "2026-11-01", R).waiting.total > 0);
  pointsUpkeep(S, "2026-11-03", R);
  const got = total(S);
  assert.equal(got, 200 + 50 + 40 + 18 + 50);
  assert.equal(pointsSummary(S, "2026-11-03", R).waiting, null);
  pointsUpkeep(S, "2026-11-04", R.slice(0, 4)); // the rows change later: the month stays as counted
  assert.equal(total(S), got);
});

test("while a month runs, last month is compared up to the same day; once it ends, whole month to whole month", () => {
  const rows = [
    { d: "2026-10-01", a: 10000, c: "Salary" }, { d: "2026-10-02", a: -300, c: "Food" }, { d: "2026-10-20", a: -900, c: "Food" }, { d: "2026-10-31", a: -100, c: "Food" },
    { d: "2026-11-01", a: 10000, c: "Salary" }, { d: "2026-11-02", a: -300, c: "Food" },
  ];
  // Nov 2: Food 300 against Oct 1-2 (300), not all of October (1,300): no "spent less" yet
  const sum = pointsSummary({ tx: [], budgets: {}, points: {} }, "2026-11-02", rows);
  assert.equal(sum.monthPreview.parts.find((x) => x.kind == "catLess"), undefined);
  assert.equal(sum.monthPreview.parts.find((x) => x.kind == "better"), undefined); // 97% kept both ways
  // a counted month still compares whole months: October against all of September
  const prev = [{ d: "2026-09-01", a: 10000 }, { d: "2026-09-02", a: -300, c: "Food" }, { d: "2026-09-30", a: -1700, c: "Food" }];
  assert.equal(monthParts([...prev, ...rows], {}, "2026-10").find((x) => x.kind == "catLess").pts, POINTS.catLessMax); // 2,000 → 1,300: 35% less
});

test("points this month: only what was given since the first of the month", () => {
  const S = { points: { a: { kind: "visit", pts: 5, day: "2026-10-31" }, b: { kind: "cat", pts: 2, day: "2026-11-01" }, c: { kind: "tag", pts: 3, day: "2026-11-02" }, _old: { "2026-06": { visit: 40 } } } };
  assert.equal(pointsSummary(S, DAY, []).month, 5);
});

test("points by month: actions by the day given, month results by the month they are about, old folded points kept", () => {
  const S = { points: {
    "visit:2026-11-02": { kind: "visit", pts: 5, day: "2026-11-02" },
    "month:2026-10:kept": { kind: "kept", pts: 150, day: "2026-11-03" }, // given in November, about October
    "month:2026-10": { kind: "monthDone", pts: 0, day: "2026-11-03" },
    "alert:x": { kind: "alert", pts: 10, day: "2026-10-20" },
    _old: { "2026-06": { visit: 40, cat: 12 } },
  } };
  assert.deepEqual(pointsByMonth(S), [
    { month: "2026-11", actions: 5, results: 0, total: 5, best: false },
    { month: "2026-10", actions: 10, results: 150, total: 160, best: true },
    { month: "2026-06", actions: 52, results: 0, total: 52, best: false },
  ]);
  assert.equal(pointsSummary(S, "2026-11-04", []).total, 217);
});

test("past months are counted once: up to 12 back, from the first full month of bank data, dated when they would have been counted", () => {
  const rows = [];
  ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10"].forEach((m) => { rows.push({ d: m + "-15", a: 10000, c: "Salary" }, { d: m + "-16", a: -9000, c: "Food" }); });
  const S = { budgets: {}, points: {} };
  pointsUpkeep(S, "2026-11-04", rows);
  const done = Object.keys(S.points).filter((k) => /^month:\d{4}-\d{2}$/.test(k)).sort();
  assert.equal(done.length, 12); // every month in the last year is marked counted, even those with no data
  assert.equal(S.points["month:2026-06:kept"], undefined); // June is the first month of data: only part of a month
  assert.deepEqual(S.points["month:2026-07:kept"], { pts: 10 * POINTS.keptPerPct, kind: "kept", day: "2026-08-03", d: "10" }); // d: the share kept
  assert.equal(S.points["month:2026-10:kept"].day, "2026-11-04"); // the month just ended: given today
  const again = pointsUpkeep(S, "2026-11-05", rows);
  assert.equal(again, 0); // never counted twice
});

test("the month results are counted once more, one time only; points for things done stay", () => {
  const rows = [];
  ["2026-08", "2026-09"].forEach((m) => { rows.push({ d: m + "-15", a: 10000, c: "Salary" }, { d: m + "-16", a: -9000, c: "Food" }); });
  const S = { budgets: {}, points: {
    "month:2026-09:kept": { pts: 999, kind: "kept", day: "2026-10-03", d: "50" }, "month:2026-09": { pts: 0, kind: "monthDone", day: "2026-10-03" },
    "alert:a1": { pts: 10, kind: "alert", day: "2026-10-20" },
  } };
  pointsUpkeep(S, "2026-11-04", rows);
  assert.equal(S.points["month:2026-09:kept"].pts, 10 * POINTS.keptPerPct); // counted again from the data
  assert.equal(S.points["alert:a1"].pts, 10);
  assert.ok(S.points["recount:1"]);
  S.points["month:2026-09:kept"].pts = 7; // later: never counted again
  pointsUpkeep(S, "2026-11-05", rows);
  assert.equal(S.points["month:2026-09:kept"].pts, 7);
});

test("old daily points fold into their month", () => {
  const S = { points: { "visit:2026-06-10": { kind: "visit", pts: 5, day: "2026-06-10" } } };
  pointsUpkeep(S, "2026-11-02", []);
  assert.deepEqual(S.points._old, { "2026-06": { visit: 5 } });
  assert.equal(pointsByMonth(S)[0].month, "2026-06");
});

test("Undo of a change takes its points back; later points stay", async () => {
  const D = createDataStore({ fetchJson: async () => ({ rev: 1, audit: [], ...base() }), connect: () => () => {}, send: async () => ({ ok: true, status: 200, json: { rev: 2, auditIds: [] } }), delay: 5, earn: (a, b, L) => earnFromChange(a, b, L, DAY) });
  await D.load();
  const [e] = D.change((S) => setField(S, 1, "c", "Food").lines);
  D.change((S) => addTags(S, 2, ["trip"]).lines);
  assert.equal(total(D.state.value), 2);
  D.undo(e);
  assert.equal(D.state.value.tx[0].c, "");
  assert.deepEqual(Object.keys(D.state.value.points), ["tag:2:trip"]);
  D.change((S) => { award(S, "visit:" + DAY, "visit", 5, DAY); return []; }, { quiet: true }); // saved quietly: no history line
  assert.equal(D.state.value.audit.length, 3); // Edited category, Added tag, Undid a change
  assert.equal(total(D.state.value), 1 + POINTS.visit);
});
