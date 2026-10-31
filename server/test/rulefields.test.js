// Where a category or tag rule looks (Settings → Automatic sorting): a rule saved before the choice existed reads the
// transaction name only, exactly as before; a rule with a field reads that part.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { reset, pool, q } from "./helpers.js";
import { applyRules, applyTagRules } from "../src/engine.js";
import { getState, putState } from "../src/state.js";
import { tx } from "../src/db.js";

before(async () => { await reset(); await q("INSERT INTO categories (name,color) VALUES ('Eating out',1),('Groceries',2),('Income',3) ON CONFLICT DO NOTHING"); });
after(() => pool.end());

const add = async (desc, from, to, amount, details = null) => (await q(
  "INSERT INTO transactions (date,description,from_name,to_name,amount,source,details) VALUES ('2026-10-06',$1,$2,$3,$4,'manual',$5) RETURNING id",
  [desc, from, to, amount, details && JSON.stringify(details)])).rows[0].id;
const cat = async (id) => (await q("SELECT category FROM transactions WHERE id=$1", [id])).rows[0].category;
const tagsOf = async (id) => (await q("SELECT tag FROM transaction_tags WHERE transaction_id=$1 ORDER BY tag", [id])).rows.map((r) => r.tag);

test("category rules: no field reads the name only (as before); a field reads that part", async () => {
  const a = await add("Card 1234", "Max", "Fake Cafe", -30, { memo: "lunch with team" });
  const b = await add("Fake Cafe Haifa", "Max", "Fake Cafe", -20);
  const c = await add("Transfer", "Acme Payroll", "Bank Hapoalim", 9000, { category: "Salary stuff" });
  await q("INSERT INTO rules (keyword,category,tag,position) VALUES ('fake cafe','Eating out','',0)"); // old rule, no field
  await q("INSERT INTO rules (keyword,category,tag,position,field) VALUES ('lunch','Groceries','',1,'memo'),('acme','Income','',2,'from')");
  await q("INSERT INTO rules (keyword,category,tag,position,field,how) VALUES ('shop','Eating out','',3,'desc','starts'),('cafe','Income','',4,'desc','eq')");
  const d = await add("Shop near me", "Max", "X", -5), e = await add("My shop", "Max", "X", -5), f = await add("Cafe", "Max", "X", -5);
  await tx((cl) => applyRules(cl));
  assert.equal(await cat(a), "Groceries"); // "fake cafe" is only in Paid to: the old rule does not read it on the server
  assert.equal(await cat(b), "Eating out");
  assert.equal(await cat(c), "Income");
  assert.equal(await cat(d), "Eating out", "starts with");
  assert.equal(await cat(e), null);
  assert.equal(await cat(f), "Income", "is exactly");
});

test("tag rules: no field reads the name only; bank's category and your account work", async () => {
  const a = await add("Shop 1", "Isracard", "Fake Shop", -10, { category: "Fashion" });
  const b = await add("fashion week", "Isracard", "Fake Shop", -10);
  await q("INSERT INTO tag_rules (keyword,tag,position) VALUES ('fashion','old',0)");
  await q("INSERT INTO tag_rules (keyword,tag,position,field) VALUES ('fashion','bank',1,'bc'),('isracard','card',2,'acct')");
  await tx((cl) => applyTagRules(cl, [a, b]));
  assert.deepEqual(await tagsOf(a), ["bank", "card"]);
  assert.deepEqual(await tagsOf(b), ["card", "old"]);
});

test("state keeps each rule's field; unknown fields and old rules come back with none", async () => {
  const S = await getState();
  assert.equal(S.rules[0].f, undefined);
  assert.equal(S.rules[1].f, "memo");
  S.rules.push({ k: "x1", c: "Groceries", t: "", f: "nope" });
  S.cardRules = ["max charge", { k: "isracard", f: "memo" }, { k: "amex", f: "bad" }, { k: "cal", m: "eq" }];
  S.moneyInRules = [{ k: "acme", kind: "salary" }, { k: "wix", kind: "back", f: "memo", m: "ends" }];
  S.tagRules[0].f = "note"; S.tagRules[0].m = "not";
  await putState(S);
  const S2 = await getState();
  assert.equal(S2.rules.find((r) => r.k == "x1").f, undefined);
  assert.equal(S2.tagRules[0].f, "note");
  assert.equal(S2.tagRules[0].m, "not");
  assert.deepEqual(S2.cardRules, ["max charge", { k: "isracard", f: "memo" }, "amex", { k: "cal", m: "eq" }]);
  assert.deepEqual(S2.moneyInRules, [{ k: "acme", kind: "salary" }, { k: "wix", kind: "back", f: "memo", m: "ends" }]);
  assert.equal(S2.tx.find((t) => t.desc == "Shop 1").bc, "Fashion");
});
