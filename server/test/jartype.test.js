import test from "node:test";
import assert from "node:assert/strict";
import { reset } from "./helpers.js";
const { getState, putState } = await import("../src/state.js");

test("changing a jar's type is saved", async () => {
  await reset();
  let s = await getState();
  s.jars.push({ id: 1, n: "Trip", p: 1, need: 5000, cap: 0, auto: false, bal: 100, due: "", bill: "", desc: "", months: 0, cats: [] });
  await putState(s);
  s = await getState();
  const j = s.jars.find((x) => x.id === 1);
  j.need = 0; j.cap = 300;
  await putState(s);
  s = await getState();
  const k = s.jars.find((x) => x.id === 1);
  assert.equal(+k.need, 0); assert.equal(+k.cap, 300);
  k.cap = null; k.need = 1200; k.bill = "*"; k.months = 12;
  await putState(s);
  s = await getState();
  const m = s.jars.find((x) => x.id === 1);
  assert.equal(m.bill, "*"); assert.equal(m.cap, null);
});
