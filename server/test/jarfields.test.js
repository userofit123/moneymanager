import test from "node:test";
import assert from "node:assert/strict";
import { reset } from "./helpers.js";
const { getState, putState } = await import("../src/state.js");

// every field the jar form can change must come back from the database exactly as saved
test("every jar edit is saved: name, description, goal, monthly amount, deadline, type, outside money, categories", async () => {
  await reset();
  let s = await getState();
  s.cats.Groceries ??= 1; s.cats.Fuel ??= 2;
  s.jars.push({ id: 1, n: "Trip", p: 1, need: 5000, cap: 0, auto: false, bal: 100, out: 0, kind: "", due: "", bill: "", desc: "", months: 0, cats: [] });
  await putState(s);
  const edit = async (fn) => { s = await getState(); fn(s.jars.find((x) => x.id === 1)); await putState(s); s = await getState(); return s.jars.find((x) => x.id === 1); };
  let j = await edit((x) => { x.n = "Loan"; x.desc = "car"; x.kind = "payoff"; x.out = 100; x.need = 100000; x.cap = 1000; });
  assert.deepEqual([j.n, j.desc, j.kind, j.out, j.need, j.cap], ["Loan", "car", "payoff", 100, 100000, 1000]);
  j = await edit((x) => { x.kind = ""; x.out = 0; });   // only the type changes
  assert.deepEqual([j.kind, j.out], ["", 0]);
  j = await edit((x) => { x.kind = "payoff"; });        // only the type changes, back
  assert.equal(j.kind, "payoff");
  j = await edit((x) => { x.due = "2027-05-01"; x.auto = true; });
  assert.deepEqual([String(j.due).slice(0, 10), j.auto], ["2027-05-01", true]);
  j = await edit((x) => { x.cats = [{ c: "Groceries", since: "2026-10-01" }]; });
  assert.deepEqual(j.cats.map((c) => c.c), ["Groceries"]);
});
