// "Reset jars": money the app shares out again is recorded as received this month, so the monthly fill does not add it twice.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { reset, pool, q } from "./helpers.js";
import { getState, putState } from "../src/state.js";

before(reset);
after(() => pool.end());

test("money put into a jar by Reset jars is recorded and counts as received this month", async () => {
  await q("DELETE FROM jar_movements"); await q("DELETE FROM jars");
  await q("DELETE FROM settings WHERE key IN ('jars_buffer','jars_reserve')");
  await q("UPDATE accounts SET balance=50000 WHERE name='Bank Hapoalim'");
  await q("INSERT INTO jars (id,name,priority,target,cap,balance) VALUES (801,'Car',1,600,100,1000),(802,'Rainy day',2,0,200,0)");
  const S = await getState();
  const [a, b] = S.jars;
  // what resetJars (frontend/src/lib/jars.js) sends: 400 out of Car, 400 into Rainy day
  a.bal = 600; a.balEdit = true; a.balNote = "Reset jars";
  b.bal = 400; b.balEdit = true; b.balNote = "Reset jars"; b.balIn = true;
  const r = await putState(S);
  const mv = (await q("SELECT jar_id,amount::float,note FROM jar_movements ORDER BY jar_id")).rows;
  assert.deepEqual(mv, [{ jar_id: 801, amount: -400, note: "Reset jars" }, { jar_id: 802, amount: 400, note: "Reset jars" }]);
  // the monthly fill does not add Rainy day's 200 on top: it already received 400 this month
  assert.equal(r.jars.find((j) => j.id == 802).bal, 400);
  assert.equal(r.jars.find((j) => j.id == 802).got, 400);
});
