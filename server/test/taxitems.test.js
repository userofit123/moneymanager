// Taxes and reports: the report items (with moved dates and done periods) and the business types survive a save and a
// load; bad entries are dropped; an older app that does not send them leaves them as they are.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { reset, pool } from "./helpers.js";
import { getState, putState, cleanTaxItems, cleanBizTypes } from "../src/state.js";

before(reset);
after(() => pool.end());

const ITEM = {
  id: 1, n: "VAT report", ex: "vat", repeat: { every: 2, month: 1, day: 15 }, covers: 2,
  money: { in: { cats: ["Freelance & business income"], salary: false }, out: { cats: ["Business expenses"] }, tags: [], add: [], skip: [], tagPct: { car: 66.67 } },
  amount: { kind: "vat", vatRate: 18, inclVat: true }, when: { type: "murshe" },
  moved: { "2027-01-15": "2027-01-22" }, done: { "2027-01-15": { sent: true, paid: 1620, at: "2027-01-20" } },
};
const TYPES = [{ id: "patur", n: "Patur", from: "2026-01-01" }, { id: "murshe", nk: "taxes.type.murshe", from: "2026-07-01" }];

test("report items and business types are kept through a save and a load", async () => {
  let s = await getState();
  assert.deepEqual(s.taxItems, []); assert.deepEqual(s.bizTypes, []);
  await putState({ ...s, taxItems: [ITEM], bizTypes: TYPES });
  s = await getState();
  assert.deepEqual(s.taxItems, [ITEM]);
  assert.deepEqual(s.bizTypes, TYPES);
  // an older app sends neither: they stay
  const { taxItems, bizTypes, ...old } = s;
  await putState(old);
  s = await getState();
  assert.deepEqual(s.taxItems, [ITEM]); assert.deepEqual(s.bizTypes, TYPES);
  // all deleted
  await putState({ ...s, taxItems: [], bizTypes: [] });
  s = await getState();
  assert.deepEqual(s.taxItems, []); assert.deepEqual(s.bizTypes, []);
});

test("bad report items and business types are dropped", () => {
  const L = cleanTaxItems([ITEM, { ...ITEM }, { id: "2" }, null, { id: 3, moved: { soon: "2027-01-01", "2027-02-15": "x" }, done: { "2027-02-15": { paid: "lots", sent: 1 }, bad: {} } }]);
  assert.deepEqual(L.map((x) => x.id), [1, 3], "an id used twice or not a whole number is dropped");
  assert.deepEqual(L[1].moved, {});
  assert.deepEqual(L[1].done, { "2027-02-15": { sent: true, paid: null } });
  assert.deepEqual(cleanTaxItems("x"), []);
  assert.deepEqual(cleanBizTypes([...TYPES, { id: "x", from: "July" }, { n: "No id", from: "2026-01-01" }]), TYPES);
});
