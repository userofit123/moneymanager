import test from "node:test";
import assert from "node:assert/strict";
import { fitChips } from "../src/lib/fitChips.js";

const C = (cls, label = cls) => ({ cls, label, tip: "tip " + cls });

test("two or fewer labelled pills stay as they are", () => {
  const l = [C("p-up", "Upcoming"), C("p-bill", "Bill")];
  assert.deepEqual(fitChips(l, 2), l);
});

test("more than two: the first two show and the rest become one +N pill that names them", () => {
  const r = fitChips([C("p-inst", "6/10"), C("p-up", "Upcoming"), C("p-bill", "Bill"), C("p-xf", "Transfer")], 2);
  assert.deepEqual(r.map((c) => c.label), ["6/10", "Upcoming", "+2"]);
  assert.equal(r[2].tip, "Bill · Transfer");
});

test("the icon-only note pill is never counted or hidden", () => {
  const r = fitChips([C("p-inst", "6/10"), C("p-up", "Upcoming"), C("p-bill", "Bill"), C("p-note", "")], 2);
  assert.deepEqual(r.map((c) => c.label), ["6/10", "Upcoming", "+1", ""]);
});

test("the payment pills (instalment, expected bill, upcoming, pending) always show; others make way", () => {
  const r = fitChips([C("p-bill", "Bill"), C("p-xf", "Transfer"), C("p-inst", "3/4"), C("p-exp", "Expected bill"), C("p-pend", "Pending")], 2);
  assert.deepEqual(r.map((c) => c.label), ["3/4", "Expected bill", "Pending", "+2"]);
  assert.equal(r.at(-1).tip, "Bill · Transfer");
});

test("an urgent pill does not take the place of a payment pill", () => {
  const r = fitChips([C("p-xf", "Transfer"), C("p-up", "Upcoming"), C("p-bill", "Bill")], 2);
  assert.deepEqual(r.map((c) => c.label), ["Transfer", "Upcoming", "+1"]);
});

test("by default up to three labelled pills show", () => {
  const r = fitChips([C("a", "A"), C("b", "B"), C("c", "C"), C("d", "D")]);
  assert.deepEqual(r.map((c) => c.label), ["A", "B", "C", "+1"]);
});
