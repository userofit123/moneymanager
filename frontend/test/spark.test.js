// The small trend line on Home's totals: the lowest value near the bottom, the highest near the top, the area closed at the bottom.
import test from "node:test";
import assert from "node:assert/strict";
import { sparkPath } from "../src/lib/home.js";

test("sparkPath scales a series into the box", () => {
  const p = sparkPath([10, 30, 20]);
  assert.equal(p.line, "0,40 100,8 200,24");
  assert.equal(p.area, "0,46 0,40 100,8 200,24 200,46");
});

test("sparkPath keeps a flat series on one line", () => {
  assert.equal(sparkPath([5, 5]).line, "0,40 200,40");
});
