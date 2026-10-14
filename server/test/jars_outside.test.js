import test from "node:test";
import assert from "node:assert/strict";
import { reset, q } from "./helpers.js";
const { fillJars } = await import("../src/jars.js");

test("money in a jar that is not in your accounts is not taken off your free money", async () => {
  await reset();
  await q("INSERT INTO accounts (name,currency,kind,source,balance,in_net_worth) VALUES ('Bank','ILS','bank','manual',1000,true) ON CONFLICT (name,currency) DO UPDATE SET balance=1000,kind='bank',in_net_worth=true");
  // 800 already paid back on a loan (outside), nothing set aside from the accounts yet, 500 a month
  await q("INSERT INTO jars (id,name,priority,target,cap,balance,outside,kind) VALUES (901,'Loan',1,10000,500,800,800,'payoff')");
  const r = await fillJars("2026-10");
  assert.equal(r.total, 500); // free is the whole 1000, not 1000 - 800
  const j = (await q("SELECT balance,outside FROM jars WHERE id=901")).rows[0];
  assert.equal(j.balance, 1300);
  assert.equal(j.outside, 800);
});
