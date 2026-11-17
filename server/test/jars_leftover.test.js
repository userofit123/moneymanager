// "Fill jars: from last month's leftover": on the 1st the jars share what was left free at the end of last month, in
// priority order; money that comes in during the month waits for next month.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { reset, pool, q, jarsAsap } from "./helpers.js";
const { fillJars } = await import("../src/jars.js");

before(reset);
after(() => pool.end());

const bank = (v) => q("UPDATE accounts SET balance=$1 WHERE name='Bank Hapoalim'", [v]);
const bal = async () => (await q("SELECT id,balance::float FROM jars ORDER BY id")).rows.map((r) => r.balance);
const leftover = async () => (await q("SELECT value FROM settings WHERE key='jars_leftover'")).rows[0]?.value;

test("leftover: the first run after the update fills nothing this month, then the jars share last month's leftover in priority order, once", async () => {
  await q("UPDATE accounts SET balance=0");
  await bank(1000);
  await q("INSERT INTO jars (id,name,priority,target,cap,balance) VALUES (701,'Rainy day',1,0,600,0),(702,'Trip',2,0,600,0)");
  // upgrade day: no leftover recorded yet, so this month counts as already filled
  assert.equal((await fillJars("2026-10")).applied, 0);
  assert.deepEqual(await bal(), [0, 0]);
  assert.equal((await leftover()).free, 1000);
  // the 1st: October ended with 1000 free; Rainy day (first) takes its 600, Trip the 400 left
  const r = await fillJars("2026-11");
  assert.equal(r.total, 1000);
  assert.deepEqual(await bal(), [600, 400]);
  // salary comes in mid-month: nothing more goes in this month, and a second run does not fill twice
  await bank(6000);
  assert.equal((await fillJars("2026-11")).applied, 0);
  assert.deepEqual(await bal(), [600, 400]);
  assert.equal((await leftover()).free, 5000);
  // next month: November's leftover (5000) fills both
  assert.equal((await fillJars("2026-12")).total, 1200);
  assert.deepEqual(await bal(), [1200, 1000]);
});

test("leftover: nothing left over last month means nothing is filled", async () => {
  await q("UPDATE jars SET balance=0");
  await bank(1200);
  await q(`INSERT INTO settings (key,value) VALUES ('jars_leftover','{"month":"2027-01","free":0,"last":0,"filled":0}') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`);
  assert.equal((await fillJars("2027-02")).applied, 0);
  assert.deepEqual(await bal(), [0, 0]);
});

test("leftover: never more than is free now", async () => {
  await q(`INSERT INTO settings (key,value) VALUES ('jars_leftover','{"month":"2027-02","free":3000,"last":0,"filled":0}') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`);
  await bank(500);
  assert.equal((await fillJars("2027-03")).total, 500);
  assert.deepEqual(await bal(), [500, 0]);
});

test("as soon as money comes in: every run shares what is free now, as before", async () => {
  await jarsAsap();
  await q("UPDATE jars SET balance=0"); await q("DELETE FROM jar_movements");
  await q("DELETE FROM settings WHERE key='jars_leftover'");
  await bank(700);
  assert.equal((await fillJars("2027-04")).total, 700);
  await bank(1700);
  assert.equal((await fillJars("2027-04")).total, 500);
  assert.deepEqual(await bal(), [600, 600]);
});
