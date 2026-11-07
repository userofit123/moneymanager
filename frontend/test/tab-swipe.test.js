// Swiping sideways between the phone's tabs (lib/tabSwipe.js): which tab a swipe opens, mirrored in Hebrew.
import test from "node:test";
import assert from "node:assert/strict";
import { swipeTarget, awayFromEdges } from "../src/lib/tabSwipe.js";

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
