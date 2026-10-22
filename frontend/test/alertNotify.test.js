import test from "node:test";
import assert from "node:assert/strict";
import { pickToNotify } from "../src/lib/alertNotify.js";

const A = (id, sev = "high") => ({ id, sev });

test("only urgent alerts not told before are notified, at most two", () => {
  const r = pickToNotify([A("a"), A("b", "low"), A("c"), A("d"), A("e")]);
  assert.deepEqual(r.fresh.map((x) => x.id), ["a", "c"]);
  assert.deepEqual(r.keep, ["a", "c"]);
});

test("an alert already told is not notified again after a refresh", () => {
  const r = pickToNotify([A("a"), A("c")], ["a", "c"]);
  assert.deepEqual(r.fresh, []);
  assert.deepEqual(r.keep, ["a", "c"]);
});

test("a told alert that went away is forgotten, so it is announced again if it returns", () => {
  const gone = pickToNotify([A("c")], ["a", "c"]);
  assert.deepEqual(gone.keep, ["c"]);
  const back = pickToNotify([A("a"), A("c")], gone.keep);
  assert.deepEqual(back.fresh.map((x) => x.id), ["a"]);
});

test("the alerts left over by the two-a-time limit are announced next time", () => {
  const first = pickToNotify([A("a"), A("b"), A("c")]);
  assert.deepEqual(first.fresh.map((x) => x.id), ["a", "b"]);
  const next = pickToNotify([A("a"), A("b"), A("c")], first.keep);
  assert.deepEqual(next.fresh.map((x) => x.id), ["c"]);
});
