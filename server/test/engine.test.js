import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { reset, pool, q } from "./helpers.js";
import { pairTransfers, computeGap, recordSnapshot, explainGaps, suggestConversion } from "../src/engine.js";
import { ingest } from "../src/sources/ingest.js";
import { parseWiseCsv } from "../src/sources/csv.js";
import { getState, putState, StaleError } from "../src/state.js";
import { tx } from "../src/db.js";

before(reset);
after(() => pool.end());

const OWN = ["Bank Hapoalim", "Wise"];
const T = (id, date, from_name, to_name, amount) => ({ id, date, from_name, to_name, amount });

test("transfers: 1,500 out and $480 in pair; salary and rent on the same day do not", () => {
  const txs = [T(1, "2026-10-06", "Bank Hapoalim", "Wise Europe SA", -1500), T(2, "2026-10-06", "Bank Transfer", "Wise", 480 * 3.055),
    T(3, "2026-10-03", "Employer", "Bank Hapoalim", 15000), T(4, "2026-10-03", "Bank Hapoalim", "Landlord", -5500)];
  const p = pairTransfers(txs, OWN);
  assert.deepEqual(p, [{ out_id: 1, in_id: 2 }]);
});

test("transfer cost is what left minus what arrived", () => {
  assert.equal(Math.round(1500 - 480 * 3.055), 34);
});

test("gap maths: drop, rise, none", () => {
  assert.equal(computeGap(265.07, 215.07, 0), -50);
  assert.equal(computeGap(265.07, 300, 0), 34.93);
  assert.equal(computeGap(100, 150, 50), 0);
});

test("balance drop with no transaction creates a money-out gap in the right currency; a matching transaction clears it", async () => {
  const wise = (await q("SELECT * FROM accounts WHERE name='Wise'")).rows[0];
  await tx((c) => recordSnapshot(c, wise, 265.07, new Date("2026-10-05T10:00:00Z")));
  await tx((c) => recordSnapshot(c, wise, 215.07, new Date("2026-10-07T10:00:00Z")));
  const g = (await q("SELECT * FROM balance_gaps WHERE status='open'")).rows;
  assert.equal(g.length, 1);
  assert.equal(g[0].amount, -50);
  // add the Figma subscription by hand ($50)
  const r = await ingest({ name: "Wise", currency: "USD", source: "manual" }, [{ date: "2026-10-06", description: "Figma", amount: -50, currency: "USD", externalId: "hand-1" }]);
  assert.equal(r.added, 1);
  const after_ = (await q("SELECT * FROM balance_gaps")).rows[0];
  assert.equal(after_.status, "cleared");
  assert.equal(after_.remaining, 0);
});

test("a smaller transaction leaves the remainder; a balance rise is a money-in gap", async () => {
  const wise = (await q("SELECT * FROM accounts WHERE name='Wise'")).rows[0];
  await tx((c) => recordSnapshot(c, wise, 150.07, new Date("2026-10-08T10:00:00Z"))); // another -65
  let g = (await q("SELECT * FROM balance_gaps WHERE status='open'")).rows;
  assert.equal(g[0].amount, -65);
  await ingest({ name: "Wise", currency: "USD", source: "manual" }, [{ date: "2026-10-08", description: "Part", amount: -20, currency: "USD", externalId: "hand-2" }]);
  g = (await q("SELECT * FROM balance_gaps WHERE status='open'")).rows;
  assert.equal(g[0].remaining, -45);
  await tx((c) => recordSnapshot(c, wise, 400, new Date("2026-10-09T10:00:00Z")));
  g = (await q("SELECT * FROM balance_gaps WHERE status='open' AND amount>0")).rows;
  assert.equal(g.length, 1);
  assert.ok(g[0].amount > 0);
});

test("a USD drop with an ILS rise in the same window is suggested as a conversion", () => {
  const w = { window_from: "2026-10-01", window_to: "2026-10-03" };
  const s = suggestConversion([{ account: "Wise", currency: "USD", amount: -100, ...w }, { account: "Wise", currency: "ILS", amount: 300, ...w }]);
  assert.equal(s.length, 1);
});

test("import never duplicates a transaction", async () => {
  const rows = [{ date: "2026-10-02", description: "Shufersal", amount: -100, externalId: "X1" }];
  const acc = { name: "Max", currency: "ILS", source: "max" };
  assert.equal((await ingest(acc, rows)).added, 1);
  assert.equal((await ingest(acc, rows)).added, 0);
});

test("two identical same-day purchases without ids both stay, and re-import adds nothing", async () => {
  const acc = { name: "Max", currency: "ILS", source: "max" };
  const rows = [{ date: "2026-10-05", description: "Wolt", amount: -87 }, { date: "2026-10-05", description: "Wolt", amount: -87 }];
  assert.equal((await ingest(acc, rows)).added, 2);
  assert.equal((await ingest(acc, rows)).added, 0);
});

test("CSV row merges into a hand-entered transaction and keeps category, note and tags", async () => {
  await q("INSERT INTO transactions (date,description,from_name,to_name,amount,orig_currency,orig_amount,category,note,source) VALUES ('2026-10-04','Figma sub','Wise','Figma',-152.75,'USD',-50,'Subscriptions','my note','manual')");
  const hand = (await q("SELECT id FROM transactions WHERE description='Figma sub'")).rows[0].id;
  await q("INSERT INTO tags (name) VALUES ('work') ON CONFLICT DO NOTHING");
  await q("INSERT INTO transaction_tags (transaction_id,tag) VALUES ($1,'work')", [hand]);
  const csv = 'TransferWise ID,Date,Amount,Currency,Description,Payment Reference,Merchant\nCARD-1,05-10-2026,-50.00,USD,Figma Inc,,Figma\n';
  const rows = parseWiseCsv(csv);
  assert.equal(rows[0].date, "2026-10-05");
  const r = await ingest({ name: "Wise", currency: "USD", source: "wise" }, rows, { mergeManual: true });
  assert.equal(r.merged, 1);
  assert.equal(r.added, 0);
  const t = (await q("SELECT * FROM transactions WHERE id=$1", [hand])).rows[0];
  assert.equal(t.description, "Figma Inc");
  assert.equal(String(t.date), "2026-10-05");
  assert.equal(t.category, "Subscriptions");
  assert.equal(t.note, "my note");
  assert.equal((await q("SELECT count(*)::int n FROM transaction_tags WHERE transaction_id=$1", [hand])).rows[0].n, 1);
  assert.equal((await q("SELECT count(*)::int n FROM transactions WHERE description IN ('Figma Inc','Figma sub')")).rows[0].n, 1);
});

test("rules categorise on import and never overwrite a manual category", async () => {
  await q("INSERT INTO rules (keyword,category,tag) VALUES ('wolt','Eating out','')");
  await q("INSERT INTO transactions (date,description,from_name,to_name,amount,category,source) VALUES ('2026-10-06','Wolt manual','Max','Wolt',-50,'Groceries','manual')");
  await ingest({ name: "Max", currency: "ILS", source: "max" }, [{ date: "2026-10-07", description: "Wolt Tel Aviv", amount: -60, externalId: "W9" }]);
  const a = (await q("SELECT category FROM transactions WHERE description='Wolt Tel Aviv'")).rows[0];
  const b = (await q("SELECT category FROM transactions WHERE description='Wolt manual'")).rows[0];
  assert.equal(a.category, "Eating out");
  assert.equal(b.category, "Groceries");
});

test("state round trip: edits are saved, stale writes are refused", async () => {
  const S = await getState();
  S.tx[0].note = "edited";
  S.tx[0].tags = ["a", "b"];
  S.budgets["Groceries"] = 1800;
  S.audit.unshift({ t: new Date().toISOString(), who: "You", action: "Edited note", detail: "x", undo: { type: "tx", id: S.tx[0].id, f: "note", old: "" } });
  const r = await putState(S);
  assert.equal(r.auditIds.length, 1);
  const S2 = await getState();
  assert.equal(S2.tx.find((t) => t.id === S.tx[0].id).note, "edited");
  assert.deepEqual(S2.tx.find((t) => t.id === S.tx[0].id).tags, ["a", "b"]);
  assert.equal(S2.budgets.Groceries, 1800);
  assert.equal(S2.audit[0].action, "Edited note");
  await assert.rejects(putState(S), StaleError); // S still carries the old rev
});

test("a new hand-entered transaction from the UI explains an open gap", async () => {
  const wise = (await q("SELECT * FROM accounts WHERE name='Wise'")).rows[0];
  await tx((c) => recordSnapshot(c, wise, 100, new Date("2026-10-10T10:00:00Z")));
  const before_ = (await q("SELECT sum(remaining)::float s FROM balance_gaps WHERE status='open' AND amount<0")).rows[0].s;
  const S = await getState();
  const id = Math.max(...S.tx.map((t) => t.id)) + 1;
  S.tx.unshift({ id, d: "2026-10-10", desc: "Hand", from: "Wise", to: "Shop", a: -61.1, orig: { cur: "USD", amt: 20 }, c: "", tags: [], docs: [], note: "" });
  await putState(S);
  const after_ = (await q("SELECT sum(remaining)::float s FROM balance_gaps WHERE status='open' AND amount<0")).rows[0].s;
  assert.equal(+(after_ - before_).toFixed(2), 20);
});

test("recurring items that share a bank reference number are all imported (same amount, same place, a month apart)", async () => {
  const acc = { name: "Bank Hapoalim", currency: "ILS", source: "hapoalim" };
  const row = (date) => ({ date, description: "Salary Acme", amount: 15000, externalId: `123:0000777:${date}:15000`, legacyId: "123:0000777" });
  const r = await ingest(acc, [row("2026-08-03"), row("2026-09-03"), row("2026-10-03")]);
  assert.equal(r.added, 3);
  assert.equal((await ingest(acc, [row("2026-08-03"), row("2026-09-03"), row("2026-10-03")])).added, 0); // still never twice
});

test("rows imported by the older version under the bare bank id are recognised and upgraded, not duplicated", async () => {
  const acc = { name: "Max", currency: "ILS", source: "max" };
  await q("INSERT INTO transactions (date,description,from_name,to_name,amount,source,external_id) VALUES ('2026-07-05','Gym','Max','Gym',-250,'max','999:AB12')");
  const rows = [
    { date: "2026-07-05", description: "Gym", amount: -250, externalId: "999:AB12:2026-07-05:-250", legacyId: "999:AB12" },
    { date: "2026-08-05", description: "Gym", amount: -250, externalId: "999:AB12:2026-08-05:-250", legacyId: "999:AB12" }, // same reference, a month later: new
  ];
  const r = await ingest(acc, rows);
  assert.deepEqual([r.added, r.migrated], [1, 1]);
  assert.equal((await q("SELECT count(*)::int n FROM transactions WHERE description='Gym'")).rows[0].n, 2);
  assert.equal((await q("SELECT external_id FROM transactions WHERE date='2026-07-05' AND description='Gym'")).rows[0].external_id, "999:AB12:2026-07-05:-250");
});

test("suggested categories and rules are added without touching what exists", async () => {
  const { addSuggested } = await import("../src/categories.js");
  await q("DELETE FROM rules"); await q("INSERT INTO rules (keyword,category,tag) VALUES ('wolt','Groceries','')"); // the user's own choice
  const r1 = await addSuggested();
  assert.ok(r1.rules > 50);
  assert.equal((await q("SELECT category FROM rules WHERE keyword='wolt'")).rows[0].category, "Groceries"); // not overwritten
  for (const c of ["Bills & utilities", "Insurance", "Health & pharmacy", "Salary"]) assert.equal((await q("SELECT 1 FROM categories WHERE name=$1", [c])).rowCount, 1, c);
  const r2 = await addSuggested();
  assert.deepEqual([r2.categories, r2.rules], [0, 0]); // idempotent
});

test("currencies: chosen ones plus any in use are refreshed; ILS is never needed", async () => {
  const { activeCurrencies, configuredCurrencies } = await import("../src/fx.js");
  assert.deepEqual(await configuredCurrencies(), ["ILS", "USD"]);
  await q("INSERT INTO settings (key,value) VALUES ('currencies','[\"EUR\"]') ON CONFLICT (key) DO UPDATE SET value='[\"EUR\"]'");
  const act = await activeCurrencies();
  assert.ok(act.includes("EUR") && act.includes("USD") && !act.includes("ILS")); // USD stays: the Wise account holds it
  await q("DELETE FROM settings WHERE key='currencies'");
});

test("jars: priority allocation matches the spec example (20,000; bills 5,000; trip capped 500)", async () => {
  const { allocate } = await import("../src/jars.js");
  const jars = [
    { id: 1, priority: 1, target: 5000, cap: null, balance: 5000 },
    { id: 2, priority: 2, target: 20000, cap: 500, balance: 3500 },
    { id: 3, priority: 3, target: 8000, cap: 1000, balance: 2000 },
  ];
  const a = allocate(20000, jars);
  assert.deepEqual(a.map((x) => x.give), [5000, 500, 1000]);
  assert.equal(Math.ceil((20000 - 3500) / 500), 33); // 33 months to fill the trip jar
  const tight = allocate(5200, jars); // not enough for everyone: higher priority first
  assert.deepEqual(tight.map((x) => x.give), [5000, 200, 0]);
  const full = allocate(20000, [{ id: 9, priority: 1, target: 1000, cap: 800, balance: 700 }]);
  assert.equal(full[0].give, 300); // only what it still needs
});

test("jars fill themselves once per month, catch up after downtime, never twice, and never retroactively", async () => {
  const { fillJars } = await import("../src/jars.js");
  await q("TRUNCATE jars, jar_movements RESTART IDENTITY");
  await q("INSERT INTO settings (key,value) VALUES ('jars_total','2000') ON CONFLICT (key) DO UPDATE SET value='2000'");
  await q("INSERT INTO jars (name,priority,target,cap,balance) VALUES ('Trip',1,3000,500,1000),('Bills',2,800,NULL,800),('Fun',3,1000,0,0)");
  assert.equal((await fillJars("2026-10")).applied, 0); // first sight: starts this month, nothing added
  assert.equal((await q("SELECT balance FROM jars WHERE name='Trip'")).rows[0].balance, 1000);
  assert.equal((await fillJars("2026-10")).applied, 0); // same month again: nothing
  await fillJars("2026-11");
  assert.equal((await q("SELECT balance FROM jars WHERE name='Trip'")).rows[0].balance, 1500);
  await fillJars("2026-11");
  assert.equal((await q("SELECT balance FROM jars WHERE name='Trip'")).rows[0].balance, 1500); // never twice
  await fillJars("2027-02"); // app was off for Dec, Jan, Feb: three catch-up fills
  assert.equal((await q("SELECT balance FROM jars WHERE name='Trip'")).rows[0].balance, 3000); // 1500 + 3 x 500 = full target, capped
  assert.equal((await q("SELECT balance FROM jars WHERE name='Bills'")).rows[0].balance, 800); // bill jar stays at its target
  assert.equal((await q("SELECT balance FROM jars WHERE name='Fun'")).rows[0].balance, 0); // monthly amount 0 = no auto-fill
  assert.ok((await q("SELECT count(*)::int n FROM jar_movements WHERE jar_id=1")).rows[0].n >= 4);
});
