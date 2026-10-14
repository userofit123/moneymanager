import test from "node:test";
import assert from "node:assert/strict";
import "./helpers.js";
const { toRows } = await import("../src/sync.js");

const acc = (t) => ({ accountNumber: "1234", txns: [{ date: "2026-10-01T00:00:00.000Z", description: "Store", chargedAmount: -100, chargedCurrency: "ILS", identifier: 7, ...t }] });

test("an instalment keeps its number, reads it from the text when the bank sends only the total, and is left out when unknown", () => {
  assert.deepEqual([toRows(acc({ installments: { number: 2, total: 3 } }))[0].instN, toRows(acc({ installments: { number: 2, total: 3 } }))[0].instTotal], [2, 3]);
  const fromText = toRows(acc({ installments: { total: 3 }, memo: "תשלום 2 מתוך 3" }))[0];
  assert.deepEqual([fromText.instN, fromText.instTotal], [2, 3]);
  const unknown = toRows(acc({ installments: { total: 3 } }))[0];
  assert.equal(unknown.instN, undefined);
  assert.equal(unknown.instTotal, undefined); // never "null of 3"
});
