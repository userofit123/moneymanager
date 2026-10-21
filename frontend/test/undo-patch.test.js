// Undo for any change: the history line keeps what the change replaced, and Undo puts only that back.
import test from "node:test";
import assert from "node:assert/strict";
import { makePatch, applyPatch } from "../src/core/undoPatch.js";
import { createDataStore } from "../src/stores/data.js";

const base = () => ({ rev: 1, tx: [{ id: 1, desc: "Shop", c: "", a: -50, tags: [] }, { id: 2, desc: "Cafe", c: "Food", a: -20, tags: [] }], jars: [{ id: 7, n: "Trip", bal: 300 }], budgets: { Food: 500 }, rules: [{ k: "shop", c: "Home" }], audit: [] });
const edit = (S, fn) => { const n = structuredClone(S); fn(n); return n; };

test("a changed field, an added budget and a new rule are put back; later changes elsewhere stay", () => {
  const a = base(), b = edit(a, (S) => { S.tx[0].c = "Home"; S.budgets.Fun = 100; S.rules.push({ k: "cafe", c: "Food" }); });
  const p = makePatch(a, b);
  const later = edit(b, (S) => { S.tx[1].note = "kept"; });
  applyPatch(later, p);
  assert.equal(later.tx[0].c, ""); assert.equal(later.tx[1].note, "kept");
  assert.deepEqual(later.budgets, { Food: 500 }); assert.deepEqual(later.rules, a.rules);
});

test("a new jar is removed and a deleted jar comes back in its place", () => {
  const a = base(), added = edit(a, (S) => S.jars.push({ id: 8, n: "Car", bal: 0 }));
  const S1 = structuredClone(added); applyPatch(S1, makePatch(a, added)); assert.deepEqual(S1.jars.map((j) => j.id), [7]);
  const gone = edit(a, (S) => { S.jars = []; });
  const S2 = structuredClone(gone); applyPatch(S2, makePatch(a, gone)); assert.deepEqual(S2.jars, a.jars);
});

test("money put back in a jar is told to the server as an undo", () => {
  const a = base(), b = edit(a, (S) => { S.jars[0].bal = 100; S.jars[0].balEdit = true; });
  const S = structuredClone(b); applyPatch(S, makePatch(a, b));
  assert.equal(S.jars[0].bal, 300); assert.equal(S.jars[0].balEdit, true); assert.equal(S.jars[0].balUndo, 1);
});

test("deleting a transaction, or changing nothing, gives no undo", () => {
  const a = base();
  assert.equal(makePatch(a, edit(a, (S) => S.tx.pop())), null);
  assert.equal(makePatch(a, structuredClone(a)), null);
});

test("the store adds the undo to the first line of a change, and Undo puts it back", async () => {
  const D = createDataStore({ fetchJson: async () => base(), connect: () => () => {}, send: async () => ({ ok: true, status: 200, json: { rev: 2, auditIds: [] } }), delay: 5 });
  await D.load();
  const [e] = D.change((S) => { delete S.budgets.Food; return [["Removed budget", "Food"]]; });
  assert.equal(e.undo.type, "patch");
  D.undo(e);
  assert.deepEqual(D.state.value.budgets, { Food: 500 });
  assert.equal(D.state.value.audit[0].action, "Undid a change");
});
