import test from "node:test";
import assert from "node:assert/strict";
import { reset, q } from "./helpers.js";
const { monthStarts, getState } = await import("../src/state.js");

test("what each account held when the month began: saved balances by the end of the day before, Israel time", async () => {
  await reset();
  const id = async (n) => (await q("SELECT id FROM accounts WHERE name=$1", [n])).rows[0].id;
  const bank = await id("Bank Hapoalim"), wise = await id("Wise");
  await q("INSERT INTO exchange_rates (date,base,quote,rate) VALUES ('2026-10-31','USD','ILS',3.1),('2026-11-02','USD','ILS',3.5)");
  // the bank: 20:00 on 31 October in Israel counts; 00:30 on 1 November (22:30 UTC the day before) does not
  await q("INSERT INTO balance_snapshots (account_id,balance,taken_at) VALUES ($1,1000,'2026-10-31T18:00:00Z'),($1,999,'2026-10-31T22:30:00Z')", [bank]);
  await q("INSERT INTO balance_snapshots (account_id,balance,taken_at) VALUES ($1,100,'2026-10-20T09:00:00Z')", [wise]);
  // a hand-entered account: its balance by then; one never changed keeps its balance
  const cash = (await q("INSERT INTO accounts (name,currency,kind,source,manual,custom,in_net_worth,balance,sort) VALUES ('Cash jar','ILS','custom','manual',TRUE,TRUE,TRUE,260,60) RETURNING id")).rows[0].id;
  await q("INSERT INTO account_updates (account_id,at,old_balance,new_balance) VALUES ($1,'2026-09-01T10:00:00Z',NULL,150),($1,'2026-10-15T10:00:00Z',150,200),($1,'2026-11-01T10:00:00Z',200,260)", [cash]);
  const still = (await q("INSERT INTO accounts (name,currency,kind,source,manual,custom,in_net_worth,balance,sort) VALUES ('Coin box','ILS','custom','manual',TRUE,TRUE,TRUE,50,61) RETURNING id")).rows[0].id;

  const M = await monthStarts("2026-11-05");
  assert.equal(M["2026-11"].on, "2026-10-31");
  // USD at the rate of 31 October (3.1), not a later one
  assert.deepEqual(M["2026-11"].acc, { [bank]: 1000, [wise]: 310, [cash]: 200, [still]: 50 });
  // October: the bank and Wise have nothing saved before then, so they are left out
  assert.equal(M["2026-10"].on, "2026-09-30");
  assert.deepEqual(M["2026-10"].acc, { [cash]: 150, [still]: 50 });
  // January looks back to December of the year before
  assert.deepEqual(Object.keys(await monthStarts("2027-01-03")), ["2027-01", "2026-12"]);
  assert.ok((await getState()).monthStart);
});
