// Years ahead (Forecast): the money over the years, the monthly amount needed for a goal and when a goal is reached.
// Every expected number below is worked out by hand in the comment next to it, not by calling the same code.
import test from "node:test";
import assert from "node:assert/strict";
import { amountAfter, monthsToReach, monthlyFor, pathOf, about, aboutUp, niceUp, sliderOf, goalAgeOf, keptEachMonth, yearsAheadModel, yearsChartOf } from "../src/lib/yearsAhead.js";

const near = (a, b, d = 0.01) => assert.ok(Math.abs(a - b) <= d, `${a} ≉ ${b}`);

test("amount after some months: no growth adds the monthly amount; growth is the yearly rate spread over 12 months", () => {
  assert.equal(amountAfter(10000, 1000, 0, 12), 22000); // 10,000 + 12 × 1,000
  assert.equal(amountAfter(10000, 1000, 0, 0), 10000); // no months: just the start
  near(amountAfter(10000, 0, 0.05, 12), 10500); // 10,000 × 1.05
  near(amountAfter(10000, 0, 0.05, 24), 11025); // 10,000 × 1.05²
  near(amountAfter(100000, 0, 0.03, 120), 134391.64); // 100,000 × 1.03¹⁰ = 134,391.64
  // ₪1,000 at the end of each month for a year at 5%: a month's share is r = 1.05^(1/12) − 1 = 0.0040741238,
  // and 1,000 × (1.05 − 1) / r = 12,272.58
  near(amountAfter(0, 1000, 0.05, 12), 12272.58);
});

test("months to reach a goal: already there, simple sums, growth alone, never with nothing set aside", () => {
  assert.equal(monthsToReach(50000, 1000, 0, 40000), 0); // already more than the goal
  assert.equal(monthsToReach(0, 1000, 0, 12000), 12); // 12 × 1,000 = 12,000
  assert.equal(monthsToReach(0, 1000, 0, 12001), 13); // one shekel more needs one more month
  assert.equal(monthsToReach(10000, 0, 0.05, 10500), 12); // 10,000 × 1.05 after a year
  assert.equal(monthsToReach(10000, 0, 0, 20000), null); // nothing added, no growth
  assert.equal(monthsToReach(10000, -500, 0, 20000), null);
  assert.equal(monthsToReach(0, 100, 0, 1e9), null); // 480 × 100 = 48,000 in 40 years
  assert.equal(monthsToReach(0, 1000, 0, 30000, 24), null); // the limit given: 24 × 1,000 = 24,000 < 30,000
});

test("monthly amount needed for a goal by a time", () => {
  assert.equal(monthlyFor(0, 0, 12000, 12), 1000); // 12,000 / 12
  assert.equal(monthlyFor(2000, 0, 12000, 10), 1000); // (12,000 − 2,000) / 10
  assert.equal(monthlyFor(20000, 0, 12000, 10), 0); // already there
  assert.equal(monthlyFor(0, 0, 12000, 0), null); // no time left
  near(monthlyFor(0, 0.05, 12272.58, 12), 1000, 0.01); // the 5% example above, the other way round
  assert.equal(monthlyFor(100000, 0.05, 105000, 12), 0); // 100,000 × 1.05 = 105,000: growth alone gets there
});

test("rounding as shown, the slider's round end, the path by year and the age aimed for", () => {
  assert.equal(about(12345), 12000); assert.equal(about(9876), 9900); assert.equal(about(-15500), -16000); assert.equal(about(0), 0);
  assert.equal(aboutUp(1231), 1240); assert.equal(aboutUp(1230), 1230); assert.equal(aboutUp(null), null); assert.equal(aboutUp(-5), 0);
  assert.equal(niceUp(9000), 10000); assert.equal(niceUp(10000), 10000); assert.equal(niceUp(10001), 20000); assert.equal(niceUp(21000), 25000); assert.equal(niceUp(0), 0);
  assert.deepEqual(pathOf(1000, 100, 0, 2), [1000, 2200, 3400]); // + 12 × 100 a year
  assert.equal(goalAgeOf(34), 50); assert.equal(goalAgeOf(48), 55); assert.equal(goalAgeOf(62), 70); assert.equal(goalAgeOf(95), 100); assert.equal(goalAgeOf(98), 100);
});

test("the slider runs from ₪0 to a round amount above 3 × the average and 1.5 × the amount needed, at least ₪5,000", () => {
  assert.deepEqual(sliderOf(0, null), { max: 5000, step: 50 });
  assert.deepEqual(sliderOf(3000, 5000), { max: 10000, step: 50 }); // 3 × 3,000 = 9,000 → 10,000
  assert.deepEqual(sliderOf(12000, 30000), { max: 50000, step: 100 }); // 1.5 × 30,000 = 45,000 → 50,000
  assert.deepEqual(sliderOf(3000, 100000), { max: 200000, step: 500 }); // 150,000 → 200,000
});

test("what you kept each month: the last full months only, never this month or a month before the data starts", () => {
  // Jul … Nov; Nov is this month (left out)
  const FH = { keys: ["2026-07", "2026-08", "2026-09", "2026-10", "2026-11"], last: 4, first: 0, inc: [5000, 6000, 7000, 8000, 100], exp: [4000, 7000, 4000, 5000, 9000] };
  // Aug −1,000, Sep +3,000, Oct +3,000 → 5,000 / 3 = 1,666.67 → 1,667
  assert.deepEqual(keptEachMonth(FH, 3), { avg: 1667, months: ["2026-08", "2026-09", "2026-10"] });
  // all four full months: +1,000 −1,000 +3,000 +3,000 = 6,000 / 4 = 1,500
  assert.deepEqual(keptEachMonth(FH, 12), { avg: 1500, months: ["2026-07", "2026-08", "2026-09", "2026-10"] });
  // the data starts in October: only October (+3,000)
  assert.deepEqual(keptEachMonth({ ...FH, first: 3 }, 6), { avg: 3000, months: ["2026-10"] });
  // the data starts this month: no full month yet
  assert.deepEqual(keptEachMonth({ ...FH, first: 4 }, 3), { avg: null, months: [] });
  assert.deepEqual(keptEachMonth(null, 3), { avg: null, months: [] });
});

test("the model at your average: every sentence's number, worked out by hand", () => {
  const Y = yearsAheadModel({ start: 40000, pace: 3000, age: 34 });
  assert.equal(Y.m, 3000); assert.equal(Y.kept, 3000); assert.equal(Y.changed, false);
  assert.equal(Y.goal, 1000000); assert.equal(Y.at, 50); assert.equal(Y.years, 16); assert.equal(Y.g, 0);
  assert.equal(Y.total, 616000); // 40,000 + 3,000 × 192 months = 616,000
  assert.equal(Y.reach.k, 320); // (1,000,000 − 40,000) / 3,000 = 320 months
  assert.equal(Y.reach.age, 61); // 34 + 27 years (320 / 12 = 26.7, rounded)
  assert.equal(Y.need, 5000); // 960,000 / 192 = 5,000
  assert.equal(Y.needDiff, 2000); // 5,000 − 3,000
  assert.equal(Y.sooner, null); // the same as your average
  assert.deepEqual(Y.slider, { max: 10000, step: 50 }); // 3 × 3,000 = 9,000; 1.5 × 5,000 = 7,500 → 10,000
  assert.equal(Y.chart.pace, null); // no second line when it is your average
  assert.equal(Y.chart.years, 27); // on to when the goal is reached: 320 / 12 = 26.7 → 27 years
});

test("the model with another amount: the sentences follow it, and sooner is the difference of the ages shown", () => {
  const Z = yearsAheadModel({ start: 40000, pace: 3000, age: 34, pick: { m: 6000 } });
  assert.equal(Z.changed, true);
  assert.equal(Z.total, 1192000); // 40,000 + 6,000 × 192 = 1,192,000
  assert.equal(Z.reach.k, 160); assert.equal(Z.reach.age, 47); // 960,000 / 6,000 = 160 months = 13.3 years; 34 + 13
  assert.deepEqual(Z.sooner, { n: 14 }); // age 61 at your average − age 47
  assert.equal(Z.needDiff, -1000); // 5,000 − 6,000
  assert.ok(Z.chart.pace && Z.chart.pace.length == Z.chart.mine.length);
  // a little more: 960,000 / 3,010 = 318.9 → 319 months = 26.6 years, still age 61 like 320 months: "a few months sooner"
  assert.deepEqual(yearsAheadModel({ start: 40000, pace: 3000, age: 34, pick: { m: 3010 } }).sooner, { months: 1 });
  // less: 960,000 / 2,000 = 480 months = 40 years = age 74 against age 61 → 13 years later
  assert.deepEqual(yearsAheadModel({ start: 40000, pace: 3000, age: 34, pick: { m: 2000 } }).sooner, { n: -13 });
  // your average never gets there, the amount chosen does
  assert.deepEqual(yearsAheadModel({ start: 0, pace: 100, age: 30, pick: { m: 5000 } }).sooner, { never: true });
});

test("the model's edge cases: no age, already reached, more going out than coming in, ages and limits", () => {
  // no age: years from today (15 by default); 90,000 / 1,000 = 90 months = 7.5 years → about 8
  const A = yearsAheadModel({ start: 10000, pace: 1000, age: 0, pick: { goal: 100000 } });
  assert.equal(A.hasAge, false); assert.equal(A.at, 15); assert.equal(A.years, 15); assert.equal(A.reach.k, 90); assert.equal(A.reach.years, 8); assert.equal(A.reach.age, null);
  assert.equal(A.total, 190000); // 10,000 + 1,000 × 180
  // already reached
  const B = yearsAheadModel({ start: 2000000, pace: 0, age: 40 });
  assert.equal(B.reach.k, 0); assert.equal(B.need, 0); assert.equal(B.total, 2000000);
  // more goes out than comes in: the average counts as ₪0, nothing added
  const C = yearsAheadModel({ start: 5000, pace: -800, age: 30 });
  assert.equal(C.kept, 0); assert.equal(C.m, 0); assert.equal(C.changed, false); assert.equal(C.reach, null); assert.equal(C.total, 5000);
  // out-of-range choices are kept in range; an empty box keeps the default
  const D = yearsAheadModel({ start: 0, pace: 1000, age: 30, pick: { at: 200, g: 0.5, goal: "", m: "" } });
  assert.equal(D.at, 70); assert.equal(D.g, 0.15); assert.equal(D.goal, 1000000); assert.equal(D.m, 1000);
  assert.equal(yearsAheadModel({ start: 0, pace: 1000, age: 30, pick: { at: 10 } }).at, 31); // an age already passed → next year
  assert.equal(yearsAheadModel({ start: 0, pace: 0, age: 30, pick: { m: -50 } }).m, 0);
  // age 80: up to age 100 (20 years); 1,000 × 240 = 240,000 never reaches 1,000,000
  const E = yearsAheadModel({ start: 0, pace: 1000, age: 80 });
  assert.equal(E.hi, 100); assert.equal(E.at, 85); assert.equal(E.reach, null); assert.ok(E.chart.years <= 20);
  const F = yearsAheadModel({ start: 0, pace: 1000, age: 105 });
  assert.equal(F.lo, 106); assert.equal(F.hi, 106); assert.equal(F.at, 106);
  // very large and very small numbers stay finite and rounded
  const G = yearsAheadModel({ start: 5e9, pace: 1e7, age: 30, pick: { g: 0.05 } });
  assert.ok(Number.isFinite(G.total) && G.total % 1000 == 0); assert.equal(G.reach.k, 0);
  const H = yearsAheadModel({ start: 0, pace: 1, age: 30, pick: { goal: 1 } });
  assert.equal(H.reach.k, 1); assert.ok(H.reach.soon);
});

test("growth: the sentences use the yearly growth spread over the months", () => {
  // no age, 1 year, ₪1,000 a month at 5%: 12,272.58 → about 12,000; the goal 12,272 is reached in month 12
  const Y = yearsAheadModel({ start: 0, pace: 1000, age: 0, pick: { yrs: 1, g: 0.05, goal: 12272 } });
  assert.equal(Y.total, 12000); assert.equal(Y.reach.k, 12);
  assert.equal(Y.need, 1000); // just under 1,000 (12,272 < 12,272.58), rounded up to the next ₪10
});

test("the chart: a point a year, the goal line and the dot where the line crosses it", () => {
  // ₪5,000 a month from ₪0: ₪60,000 a year, ₪300,000 after exactly 5 years
  const Y = yearsAheadModel({ start: 0, pace: 5000, age: 30, pick: { goal: 300000, at: 40 } });
  assert.equal(Y.chart.years, 10);
  const c = yearsChartOf(Y.chart, 700, 220);
  assert.equal(c.pts.length, 11);
  near(c.hit.x, c.X(5), 1e-6); near(c.hit.y, c.goalY, 1e-6);
  assert.equal(c.pace, null);
  assert.equal(c.xs[0].i, 0); assert.equal(c.xs[c.xs.length - 1].i, 10);
  assert.ok(c.ticks.length >= 3 && c.ticks.length <= 6, String(c.ticks.length)); assert.ok(c.ticks.every((x) => /^₪\d+(\.\d+)?[kM]?$/.test(x.label)), c.ticks.map((x) => x.label).join());
  // the chart's amount at the age chosen is the same rounded amount as the sentence
  assert.equal(about(Y.chart.mine[Y.years]), Y.total);
});
