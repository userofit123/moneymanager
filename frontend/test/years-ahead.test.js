// Years ahead (Forecast): the money over the years, the monthly amount needed for a goal and when a goal is reached.
import test from "node:test";
import assert from "node:assert/strict";
import { amountAfter, monthsToReach, monthlyFor, pathOf, about, aboutUp, goalAgeOf, yearsAheadModel, yearsChartOf, MAX_YEARS } from "../src/lib/yearsAhead.js";

const near = (a, b, d = 0.01) => assert.ok(Math.abs(a - b) <= d, `${a} ≉ ${b}`);

test("amount after some months: no growth adds the monthly amount; a year of growth grows by exactly the yearly rate", () => {
  assert.equal(amountAfter(10000, 1000, 0, 12), 22000);
  assert.equal(amountAfter(10000, 1000, 0, 0), 10000);
  near(amountAfter(10000, 0, 0.05, 12), 10500);
  near(amountAfter(10000, 0, 0.05, 24), 11025);
  // monthly additions with growth: the sum of each month's amount grown for the months after it
  const r = Math.pow(1.03, 1 / 12) - 1; let b = 5000; for (let k = 0; k < 36; k++) b = b * (1 + r) + 700;
  near(amountAfter(5000, 700, 0.03, 36), b, 1e-6);
});

test("months to reach a goal: already there, simple sums, growth helps, never with nothing set aside", () => {
  assert.equal(monthsToReach(50000, 1000, 0, 40000), 0);
  assert.equal(monthsToReach(0, 1000, 0, 12000), 12);
  assert.equal(monthsToReach(0, 1000, 0, 12001), 13);
  assert.ok(monthsToReach(0, 1000, 0.05, 120000) < 120);
  assert.equal(monthsToReach(10000, 0, 0, 20000), null);
  assert.equal(monthsToReach(10000, -500, 0, 20000), null);
  assert.equal(monthsToReach(0, 100, 0, 1e9), null); // not within 40 years
  // growth alone can get there
  assert.equal(monthsToReach(10000, 0, 0.05, 10500), 12);
});

test("monthly amount needed for a goal by a time: matches the months it takes; 0 when already there; none with no time", () => {
  assert.equal(monthlyFor(0, 0, 12000, 12), 1000);
  assert.equal(monthlyFor(2000, 0, 12000, 10), 1000);
  assert.equal(monthlyFor(20000, 0, 12000, 10), 0);
  assert.equal(monthlyFor(0, 0, 12000, 0), null);
  const need = monthlyFor(30000, 0.04, 1000000, 20 * 12);
  near(amountAfter(30000, need, 0.04, 240), 1000000, 1e-4);
  assert.ok(need < monthlyFor(30000, 0, 1000000, 240));
  // growth on the start alone is enough
  assert.equal(monthlyFor(100000, 0.05, 105000, 12), 0);
});

test("rounding as shown, the path by year and the age aimed for", () => {
  assert.equal(about(12345), 12000); assert.equal(about(9876), 9900); assert.equal(about(-15500), -16000); assert.equal(about(0), 0);
  assert.equal(aboutUp(1231), 1240); assert.equal(aboutUp(1230), 1230); assert.equal(aboutUp(null), null); assert.equal(aboutUp(-5), 0);
  assert.deepEqual(pathOf(1000, 100, 0, 2), [1000, 2200, 3400]);
  assert.equal(goalAgeOf(34), 50); assert.equal(goalAgeOf(48), 55); assert.equal(goalAgeOf(62), 70); assert.equal(goalAgeOf(95), 100);
});

test("the model: defaults from today's pace, ages, and the change from today's pace", () => {
  const Y = yearsAheadModel({ start: 40000, pace: 3000, age: 34 });
  assert.equal(Y.m, 3000); assert.equal(Y.goal, 1000000); assert.equal(Y.at, 50); assert.equal(Y.years, 16); assert.equal(Y.g, 0);
  assert.equal(Y.now.at, about(40000 + 3000 * 16 * 12));
  assert.equal(Y.now.reach.k, Math.ceil((1000000 - 40000) / 3000));
  assert.equal(Y.now.reach.age, Math.floor(34 + Y.now.reach.k / 12));
  assert.equal(Y.play.need, aboutUp((1000000 - 40000) / (16 * 12)));
  assert.equal(Y.diff.need, Y.play.need - 3000);
  assert.equal(Y.diff.sooner, 0);
  assert.equal(Y.changed, false);
  // trying more each month reaches it sooner
  const Z = yearsAheadModel({ start: 40000, pace: 3000, age: 34, pick: { m: 6000 } });
  assert.ok(Z.diff.sooner > 0); assert.equal(Z.changed, true); assert.equal(Z.diff.m, 3000);
});

test("the model's edge cases: no age, already reached, spending more than comes in, ages kept in range", () => {
  const A = yearsAheadModel({ start: 10000, pace: 1000, age: 0, pick: { goal: 100000 } });
  assert.equal(A.hasAge, false); assert.equal(A.at, 15); assert.equal(A.years, 15); assert.equal(A.now.reach.age, null); assert.equal(A.now.reach.k, 90);
  const B = yearsAheadModel({ start: 2000000, pace: 0, age: 40 });
  assert.equal(B.now.reach.k, 0); assert.equal(B.play.need, 0);
  const C = yearsAheadModel({ start: 5000, pace: -800, age: 30 });
  assert.equal(C.m, 0); assert.equal(C.now.reach, null); assert.equal(C.play.reach, null); assert.ok(C.now.at < 5000 - 800 * 12);
  assert.equal(C.diff.sooner, null);
  const D = yearsAheadModel({ start: 0, pace: 1000, age: 30, pick: { at: 200, g: 0.5, goal: "", m: "" } });
  assert.equal(D.at, 30 + MAX_YEARS); assert.equal(D.g, 0.15); assert.equal(D.goal, 1000000); assert.equal(D.m, 1000);
  const E = yearsAheadModel({ start: 0, pace: 1000, age: 30, pick: { at: 10 } });
  assert.equal(E.at, 31);
});

test("the chart: a point a year, the goal line and where it is reached", () => {
  const Y = yearsAheadModel({ start: 0, pace: 5000, age: 30, pick: { goal: 300000, at: 40 } });
  const c = yearsChartOf(Y.chart, 700, 220);
  assert.equal(c.pts.length, Y.chart.years + 1);
  assert.ok(c.hit && c.hit.x > c.Pl && c.hit.x < c.W - c.Pr);
  assert.equal(c.xs[0].i, 0); assert.equal(c.xs[c.xs.length - 1].i, Y.chart.years);
  // three to six round amounts on the left, the goal line among them
  assert.ok(c.ticks.length >= 3 && c.ticks.length <= 6, String(c.ticks.length)); assert.ok(c.ticks.every((x) => /^₪\d+(\.\d+)?[kM]?$/.test(x.label)), c.ticks.map((x) => x.label).join());
});
