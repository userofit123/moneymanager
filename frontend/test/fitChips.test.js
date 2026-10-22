import test from "node:test";
import assert from "node:assert/strict";
import { fitChips } from "../src/lib/fitChips.js";

const C = (cls, label = cls) => ({ cls, label, tip: "tip " + cls });

test("two or fewer labelled pills stay as they are", () => {
  const l = [C("p-up", "Upcoming"), C("p-bill", "Bill")];
  assert.deepEqual(fitChips(l), l);
});

test("more than two: the first two show and the rest become one +N pill that names them", () => {
  const r = fitChips([C("p-inst", "6/10"), C("p-up", "Upcoming"), C("p-bill", "Bill"), C("p-xf", "Transfer")]);
  assert.deepEqual(r.map((c) => c.label), ["6/10", "Upcoming", "+2"]);
  assert.equal(r[2].tip, "Bill · Transfer");
});

test("the icon-only note pill is never counted or hidden", () => {
  const r = fitChips([C("p-inst", "6/10"), C("p-up", "Upcoming"), C("p-bill", "Bill"), C("p-note", "")]);
  assert.deepEqual(r.map((c) => c.label), ["6/10", "Upcoming", "+1", ""]);
});

test("the payment pills (instalment, expected bill, upcoming, pending) always show; others make way", () => {
  const r = fitChips([C("p-bill", "Bill"), C("p-xf", "Transfer"), C("p-inst", "3/4"), C("p-exp", "Expected bill"), C("p-pend", "Pending")]);
  assert.deepEqual(r.map((c) => c.label), ["3/4", "Expected bill", "Pending", "+2"]);
  assert.equal(r.at(-1).tip, "Bill · Transfer");
});

test("an urgent pill does not take the place of a payment pill", () => {
  const r = fitChips([C("p-xf", "Transfer"), C("p-up", "Upcoming"), C("p-bill", "Bill")]);
  assert.deepEqual(r.map((c) => c.label), ["Transfer", "Upcoming", "+1"]);
});
