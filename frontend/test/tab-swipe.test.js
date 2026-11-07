// Swiping sideways between the phone's tabs (lib/tabSwipe.js): which tab a swipe opens, mirrored in Hebrew.
import test from "node:test";
import assert from "node:assert/strict";
import { swipeTarget, awayFromEdges, tabStep, tabTap } from "../src/lib/tabSwipe.js";

const tabs = ["recap", "home", "activity", "more"];
const go = (dx, at = "home", o = {}) => swipeTarget({ dx, dy: 0, ms: 200, tabs, at, ...o });

test("a swipe towards the left opens the next tab, towards the right the previous one", () => {
  assert.equal(go(-80), "activity");
  assert.equal(go(80), "recap");
});

test("in Hebrew the direction is mirrored", () => {
  assert.equal(go(-80, "home", { rtl: true }), "recap");
  assert.equal(go(80, "home", { rtl: true }), "activity");
});

test("no wrapping past the first or last tab", () => {
  assert.equal(go(80, "recap"), null);
  assert.equal(go(-80, "more"), null);
  assert.equal(go(-80, "more", { rtl: false }), null);
  assert.equal(go(80, "more", { rtl: true }), null);
});

test("short, slanted, slow swipes and unknown tabs do nothing", () => {
  assert.equal(go(-40), null, "too short");
  assert.equal(go(-80, "home", { dy: 70 }), null, "mostly up or down: a scroll");
  assert.equal(go(-80, "home", { dy: 30 }), "activity", "a little drift is fine");
  assert.equal(go(-80, "home", { ms: 1200 }), null, "a slow drag");
  assert.equal(go(-80, "accounts"), null);
});

test("a swipe may not start at the screen's sides", () => {
  assert.equal(awayFromEdges(10, 400), false);
  assert.equal(awayFromEdges(390, 400), false);
  assert.equal(awayFromEdges(200, 400), true);
});

test("the slide between tabs follows the tab bar's order", () => {
  assert.equal(tabStep(tabs, "home", "activity"), 1);
  assert.equal(tabStep(tabs, "recap", "more"), 1);
  assert.equal(tabStep(tabs, "activity", "recap"), -1);
  assert.equal(tabStep(tabs, "home", "home"), 0, "the same tab");
  assert.equal(tabStep(tabs, "home", "accounts"), 0, "not a tab");
});

test("a swipe and the slide it plays agree, in both directions and languages", () => {
  for (const rtl of [false, true]) for (const dx of [-80, 80]) {
    const to = go(dx, "home", { rtl });
    // towards the start side opens the next tab, which slides in from the end side
    const towardsStart = rtl ? dx > 0 : dx < 0;
    assert.equal(tabStep(tabs, "home", to), towardsStart ? 1 : -1);
  }
});

test("a tap while moving to another tab counts from the tab being opened", () => {
  assert.deepEqual(tabTap({ tabs, at: "home", name: "activity" }), { open: true, step: 1 });
  assert.deepEqual(tabTap({ tabs, at: "home", name: "home" }), { open: false, busy: false }, "the open tab: to its top");
  assert.deepEqual(tabTap({ tabs, at: "recap", pending: "activity", name: "recap" }), { open: true, step: -1 }, "back to where it was");
  assert.deepEqual(tabTap({ tabs, at: "recap", pending: "home", name: "more" }), { open: true, step: 1 }, "step from the tab being opened");
  assert.deepEqual(tabTap({ tabs, at: "recap", pending: "home", name: "home" }), { open: false, busy: true }, "already on its way");
});
