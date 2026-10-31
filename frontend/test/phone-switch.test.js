// The phone or computer switch (mobile.js): it follows the window's width, and a window with almost no size
// (minimised, hidden, or squeezed for a moment by a full-page screenshot) keeps the current choice,
// so the computer frame is not swapped for the phone app and back.
import test from "node:test";
import assert from "node:assert/strict";
import { isPhone, startMobile } from "../src/mobile.js";

function fakeWindow(width, height, touch = false) {
  const on = {}, cls = new Set();
  const root = { get clientWidth() { return win.innerWidth; }, classList: { toggle: (c, v) => (v ? cls.add(c) : cls.delete(c)) } };
  const win = { innerWidth: width, innerHeight: height, matchMedia: () => ({ matches: touch }), addEventListener: (e, f) => (on[e] = f) };
  const resize = (w, h) => { win.innerWidth = w; win.innerHeight = h; on.resize(); };
  return { root, win, resize, phoneClass: () => cls.has("phone") };
}

test("the switch follows the width, and ignores a window with almost no size", () => {
  const f = fakeWindow(1360, 860);
  startMobile(f.root, f.win);
  assert.equal(isPhone.value, false);
  f.resize(1, 1);
  assert.equal(isPhone.value, false, "a 1x1 window is not a phone");
  assert.equal(f.phoneClass(), false);
  f.resize(390, 844);
  assert.equal(isPhone.value, true);
  assert.equal(f.phoneClass(), true);
  f.resize(0, 0);
  assert.equal(isPhone.value, true, "a hidden window keeps the phone app");
  f.resize(1360, 860);
  assert.equal(isPhone.value, false);
  assert.equal(f.phoneClass(), false);
});
