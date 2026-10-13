import test from "node:test";
import assert from "node:assert/strict";
import { reset, q } from "./helpers.js";
const { createAccount, updateAccount, setBalance, deleteAccount, alertsSeen, alertHistory } = await import("../src/accounts.js");
const { getState, putState } = await import("../src/state.js");

test("a custom account: created, shown, renamed with its transactions, balance history, removed only when empty", async () => {
  await reset();
  const { id } = await createAccount({ name: "Cash drawer", kind: "cash", currency: "ILS", balance: 500, countNW: true });
  await assert.rejects(createAccount({ name: "Cash drawer" }), /already exists/);
  let s = await getState();
  const a = s.accounts.find((x) => x.id === id);
  assert.ok(a && a.custom && a.manual && a.ck === "cash" && a.v === 500 && a.inNW);
  await q("INSERT INTO transactions (date,description,from_name,to_name,amount,source) VALUES ('2026-10-01','Coffee','Cash drawer','Cafe',-20,'manual')");
  await updateAccount(id, { name: "Wallet", countNW: false });
  assert.equal((await q("SELECT count(*)::int AS n FROM transactions WHERE from_name='Wallet'")).rows[0].n, 1);
  await setBalance(id, 450, "counted");
  s = await getState();
  assert.deepEqual(s.balUpdates.filter((u) => u.acc === "Wallet").map((u) => [u.old, u.nu]), [[500, 450], [null, 500]]);
  await assert.rejects(deleteAccount(id), /transaction/);
  await q("DELETE FROM transactions");
  await deleteAccount(id);
});

test("the pension is hidden until it has a value, and every change to it is remembered", async () => {
  await reset();
  let s = await getState();
  const p = s.accounts.find((x) => x.kind === "pension");
  assert.equal(p.hide, true);
  p.v = 412000;
  await putState({ ...s, accounts: s.accounts.map((x) => (x.id === p.id ? p : x)) });
  s = await getState();
  assert.equal(s.accounts.find((x) => x.kind === "pension").hide, false);
  assert.equal(s.balUpdates.length, 1);
  assert.equal(s.balUpdates[0].nu, 412000);
});

test("alert history: an alert keeps one row while it lasts, and is closed when it goes away", async () => {
  await reset();
  await alertsSeen([{ key: "gap:1", title: "Missing money", detail: "₪434", sev: "high" }, { key: "bill:x", title: "Bill due", detail: "", sev: "med" }]);
  await alertsSeen([{ key: "gap:1", title: "Missing money", detail: "₪434", sev: "high" }]);
  let h = await alertHistory();
  assert.equal(h.rows.length, 2);
  assert.equal(h.rows.find((r) => r.key === "gap:1").resolved_at, null);
  assert.ok(h.rows.find((r) => r.key === "bill:x").resolved_at);
  await alertsSeen([]);
  h = await alertHistory();
  assert.ok(h.rows.every((r) => r.resolved_at));
  assert.equal(h.more, false);
});
