// The activity text format is taken from Wise's documentation as far as it could be read; these tests encode the
// assumptions (incoming money is marked <positive>, amounts are display strings) and the fallback behaviour.
import test from "node:test";
import assert from "node:assert/strict";
import { parseActivityAmount, activityToRow, fetchWise } from "../src/sources/wise.js";

test("amount strings: incoming marked positive, outgoing plain or minus, currency and thousands separators", () => {
  assert.deepEqual(parseActivityAmount("<positive>+ 1,234.50 USD</positive>"), { amount: 1234.5, currency: "USD" });
  assert.deepEqual(parseActivityAmount("<positive>480 USD</positive>"), { amount: 480, currency: "USD" });
  assert.deepEqual(parseActivityAmount("- 12.30 ILS"), { amount: -12.3, currency: "ILS" });
  assert.deepEqual(parseActivityAmount("45 EUR"), { amount: -45, currency: "EUR" });
  assert.equal(parseActivityAmount("nonsense"), null);
  assert.equal(parseActivityAmount(undefined), null);
});

test("an activity becomes a transaction row; cancelled and unreadable ones are skipped; in-progress is pending", () => {
  const a = { id: "TU1", status: "COMPLETED", title: "<strong>Figma</strong>", primaryAmount: "- 50 USD", createdOn: "2026-10-04T10:00:00.000Z" };
  assert.deepEqual(activityToRow(a), { date: "2026-10-04", description: "Figma", amount: -50, currency: "USD", externalId: "act:TU1", counterparty: "Figma", pending: false });
  assert.equal(activityToRow({ ...a, status: "CANCELLED" }), null);
  assert.equal(activityToRow({ ...a, primaryAmount: "?" }), null);
  assert.equal(activityToRow({ ...a, status: "IN_PROGRESS" }).pending, true);
});

const fakeWise = (routes) => { globalThis.fetch = async (url) => { const u = new URL(url); for (const [k, v] of Object.entries(routes)) if (u.pathname.includes(k)) return v(u); return { ok: false, status: 404, json: async () => ({}) }; }; };
const ok = (j) => ({ ok: true, status: 200, json: async () => j });
const base = { "/v2/profiles": () => ok([{ id: 7, type: "PERSONAL" }]), "/balances": () => ok([{ id: 1, currency: "USD", amount: { value: 265.07 } }]) };

test("statements refused (403) -> falls back to the activity list, with paging", async () => {
  const real = globalThis.fetch;
  let calls = 0;
  fakeWise({ ...base, "statement.json": () => ({ ok: false, status: 403, json: async () => ({}) }),
    "/activities": (u) => { calls++; return ok(u.searchParams.get("nextCursor") ? { activities: [{ id: "B", status: "COMPLETED", title: "Shop", primaryAmount: "- 5 USD", createdOn: "2026-10-02T00:00:00Z" }], cursor: null } : { activities: [{ id: "A", status: "COMPLETED", title: "Salary", primaryAmount: "<positive>100 USD</positive>", createdOn: "2026-10-03T00:00:00Z" }], cursor: "c2" }); } });
  const w = await fetchWise("t");
  globalThis.fetch = real;
  assert.equal(calls, 2);
  assert.deepEqual(w.transactions.map((t) => [t.externalId, t.amount]), [["act:A", 100], ["act:B", -5]]);
  assert.match(w.note, /Activity list used/);
});

test("both refused -> balances only, with a clear note, never an exception", async () => {
  const real = globalThis.fetch;
  fakeWise({ ...base, "statement.json": () => ({ ok: false, status: 403, json: async () => ({}) }), "/activities": () => ({ ok: false, status: 403, json: async () => ({}) }) });
  const w = await fetchWise("t");
  globalThis.fetch = real;
  assert.equal(w.transactions.length, 0);
  assert.equal(w.balances[0].value, 265.07);
  assert.match(w.note, /Balances only/);
});

test("statements available -> used, activities not called", async () => {
  const real = globalThis.fetch; let act = 0;
  fakeWise({ ...base, "statement.json": () => ok({ transactions: [{ date: "2026-10-01T00:00:00Z", amount: { value: -9, currency: "USD" }, referenceNumber: "R1", details: { description: "Coffee" } }] }), "/activities": () => { act++; return ok({ activities: [] }); } });
  const w = await fetchWise("t");
  globalThis.fetch = real;
  assert.equal(act, 0); assert.equal(w.transactions[0].externalId, "R1");
});
