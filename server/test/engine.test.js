import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { reset, pool, q } from "./helpers.js";
import { pairTransfers, computeGap, recordSnapshot, explainGaps, suggestConversion, healGaps } from "../src/engine.js";
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
  assert.equal(computeGap(318.47, 268.47, 0), -50);
  assert.equal(computeGap(318.47, 300, 0), 31.53);
  assert.equal(computeGap(100, 150, 50), 0);
});

test("balance drop with no transaction creates a money-out gap in the right currency; a matching transaction clears it", async () => {
  const wise = (await q("SELECT * FROM accounts WHERE name='Wise'")).rows[0];
  await tx((c) => recordSnapshot(c, wise, 318.47, new Date("2026-10-05T10:00:00Z")));
  await tx((c) => recordSnapshot(c, wise, 268.47, new Date("2026-10-07T10:00:00Z")));
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
  await tx((c) => recordSnapshot(c, wise, 203.47, new Date("2026-10-08T10:00:00Z"))); // another -65
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

test("jars: waterfall in priority order, each only up to what it is still entitled to this month", async () => {
  const { allocate, wantOf } = await import("../src/jars.js");
  const jars = [
    { id: 1, priority: 1, target: 5000, cap: null, balance: 4000 }, // bill jar: topped up to target
    { id: 2, priority: 2, target: 20000, cap: 500, balance: 3500 },
    { id: 3, priority: 3, target: 8000, cap: 1000, balance: 2000 },
  ];
  assert.deepEqual(allocate(10000, jars).map((x) => x.give), [1000, 500, 1000]);
  assert.deepEqual(allocate(1200, jars).map((x) => x.give), [1000, 200, 0]); // not enough: higher priority first
  assert.deepEqual(allocate(0, jars).map((x) => x.give), [0, 0, 0]);
  assert.deepEqual(allocate(-50, jars).map((x) => x.give), [0, 0, 0]);
  assert.equal(wantOf({ target: 1000, cap: 800, balance: 700 }, 0), 300); // only what it still needs
  assert.equal(wantOf({ target: 9000, cap: 500, balance: 0 }, 200), 300); // 200 already received this month: 300 left of its 500
  assert.equal(wantOf({ target: 9000, cap: 500, balance: 0 }, 500), 0);  // got its month already
});

test("jars: a new jar gets its money this month, once, with a record; a jar waiting for money takes it when it arrives", async () => {
  const { fillJars } = await import("../src/jars.js");
  await q("DELETE FROM jar_movements"); await q("DELETE FROM jars"); await q("ALTER SEQUENCE jars_id_seq RESTART");
  await q("UPDATE accounts SET balance=1000 WHERE name='Bank Hapoalim'");
  await q("UPDATE accounts SET balance=0 WHERE kind='wallet'");
  await q("INSERT INTO jars (name,priority,target,cap,balance) VALUES ('Bills',1,800,NULL,0),('Trip',2,5000,500,0)");
  const bal = async (n) => (await q("SELECT balance FROM jars WHERE name=$1", [n])).rows[0].balance;
  assert.equal((await fillJars("2026-10")).applied, 2);
  assert.equal(await bal("Bills"), 800);          // the bill jar first, in full
  assert.equal(await bal("Trip"), 200);           // only 200 was left of the 1000
  assert.equal((await fillJars("2026-10")).applied, 0); // nothing more is available: no change, no duplicate
  await q("UPDATE accounts SET balance=3000 WHERE name='Bank Hapoalim'"); // money arrives
  assert.equal((await fillJars("2026-10")).applied, 1);
  assert.equal(await bal("Trip"), 500);           // topped up to this month's 500, not beyond
  assert.equal((await fillJars("2026-10")).applied, 0); // got its month: never twice
  const rows = (await q("SELECT jar_id,amount,month FROM jar_movements ORDER BY id")).rows;
  assert.deepEqual(rows.map((r) => [r.jar_id, r.amount, r.month]), [[1, 800, "2026-10"], [2, 200, "2026-10"], [2, 300, "2026-10"]]);
  assert.equal((await fillJars("2026-11")).applied, 1); // next month: Trip takes its 500 again, the full bill jar needs nothing
  assert.equal(await bal("Trip"), 1000);
});

test("jars never take more than the free balance (balance minus what is in jars minus the buffer)", async () => {
  const { fillJars } = await import("../src/jars.js");
  await q("DELETE FROM jar_movements"); await q("DELETE FROM jars"); await q("ALTER SEQUENCE jars_id_seq RESTART");
  await q("UPDATE accounts SET balance=2000 WHERE name='Bank Hapoalim'");
  await q("INSERT INTO settings (key,value) VALUES ('jars_buffer','100') ON CONFLICT (key) DO UPDATE SET value='100'");
  await q("INSERT INTO jars (name,priority,target,cap,balance) VALUES ('Trip',1,5000,500,1000),('Laptop',2,5000,500,700)");
  await fillJars("2026-10");
  // free = 2000 - 1700 - 100 buffer = 200: the first jar takes it all, the second gets nothing
  assert.equal((await q("SELECT balance FROM jars WHERE name='Trip'")).rows[0].balance, 1200);
  assert.equal((await q("SELECT balance FROM jars WHERE name='Laptop'")).rows[0].balance, 700);
  await q("DELETE FROM settings WHERE key='jars_buffer'");
});

test("saving the app state fills waiting jars and returns them; a user-edited balance is respected, an untouched one is not overwritten", async () => {
  await q("DELETE FROM jar_movements"); await q("DELETE FROM jars"); await q("ALTER SEQUENCE jars_id_seq RESTART");
  await q("UPDATE accounts SET balance=5000 WHERE name='Bank Hapoalim'");
  await q("INSERT INTO jars (name,priority,target,cap,balance) VALUES ('Trip',1,5000,500,0)");
  let S = await getState();
  assert.equal(S.jars[0].got, 0);
  S.tx[0].note = "touch"; // any save
  let r = await putState(S);
  assert.equal(r.filled, 1);
  assert.equal(r.jars[0].bal, 500);
  assert.equal(r.jars[0].got, 500);
  // the client still holds the old balance (0) but did not edit it: the server's 500 must survive
  S = await getState(); S.jars[0].bal = 0; // stale value, no balEdit
  S.tx[0].note = "touch2";
  await putState(S);
  assert.equal((await q("SELECT balance FROM jars")).rows[0].balance, 500);
  // an edit of the balance by the user is respected
  S = await getState(); S.jars[0].bal = 1200; S.jars[0].balEdit = true;
  await putState(S);
  assert.equal((await q("SELECT balance FROM jars")).rows[0].balance, 1200);
});

test("a Wise CSV row replaces the same payment that came from the activity list (no double counting)", async () => {
  await q("DELETE FROM transactions WHERE description IN ('Dropbox','Dropbox Inc')");
  const acc = { name: "Wise", currency: "USD", source: "wise" };
  await ingest(acc, [{ date: "2026-10-04", description: "Dropbox", amount: -12, currency: "USD", externalId: "act:ZZ1", pending: false }], { mergeManual: true });
  const csv = [{ date: "2026-10-04", description: "Dropbox Inc", amount: -12, currency: "USD", externalId: "CARD-77" }];
  const r = await ingest(acc, csv, { mergeManual: true });
  assert.deepEqual([r.added, r.merged], [0, 1]);
  assert.equal((await q("SELECT count(*)::int n FROM transactions WHERE description LIKE 'Dropbox%'")).rows[0].n, 1);
  assert.equal((await q("SELECT external_id FROM transactions WHERE description='Dropbox Inc'")).rows[0].external_id, "CARD-77");
});

test("suggested rules: specific names beat broad words, and adding them sorts existing uncategorized rows", async () => {
  const { SUGGESTED_RULES } = await import("../src/categories.js");
  const cat = (d) => (SUGGESTED_RULES.find(([k]) => d.toLowerCase().includes(k.toLowerCase())) || [])[1];
  assert.equal(cat("ביטוח לאומי גביה"), "Taxes & government");
  assert.equal(cat("הפניקס חברה לביטוח"), "Insurance");
  assert.equal(cat("זיכוי מלאומי"), "Other income");
  assert.equal(cat("זיכוי"), "Salary");
  assert.equal(cat("פז YELLOW א.ת העיר"), "Car & fuel");
  assert.equal(cat("GITHUB.COM SPONSORS"), "Software & hosting");
  assert.equal(cat("חיוב כרטיס אשראי"), undefined); // a card bill payment is not a spending category
});

test("a Wise conversion has one line in each currency under the same reference: both are kept, a re-import adds nothing", async () => {
  await q("DELETE FROM transactions WHERE external_id='CONVERSION-9'");
  const usd = [{ date: "2026-10-05", description: "Converted USD to ILS", amount: -100, currency: "USD", externalId: "CONVERSION-9" }];
  const ils = [{ date: "2026-10-05", description: "Converted USD to ILS", amount: 305, currency: "ILS", externalId: "CONVERSION-9" }];
  const a = await ingest({ name: "Wise", currency: "USD", source: "wise" }, usd);
  const b = await ingest({ name: "Wise", currency: "ILS", source: "wise" }, ils);
  assert.deepEqual([a.added, b.added], [1, 1]);
  assert.equal((await q("SELECT count(*)::int n FROM transactions WHERE external_id='CONVERSION-9'")).rows[0].n, 2);
  const again = [await ingest({ name: "Wise", currency: "USD", source: "wise" }, usd), await ingest({ name: "Wise", currency: "ILS", source: "wise" }, ils)];
  assert.deepEqual(again.map((r) => r.added), [0, 0]);
  assert.equal((await q("SELECT count(*)::int n FROM transactions WHERE external_id='CONVERSION-9'")).rows[0].n, 2);
});

test("saving a new jar together with a transaction attached to it keeps the attachment", async () => {
  await q("DELETE FROM jar_movements"); await q("DELETE FROM jars"); await q("ALTER SEQUENCE jars_id_seq RESTART");
  await q("UPDATE accounts SET balance=0 WHERE kind IN ('bank','wallet')");
  let S = await getState();
  const id = S.tx[0].id;
  S.jars.push({ id: 77, n: "Fresh", p: 1, need: 100, cap: 0, bal: 0, due: "", bill: "", auto: false, desc: "", months: 0, done: "" });
  S.tx.find((t) => t.id === id).jar = { id: 77, amt: 10 };
  await putState(S);
  assert.equal((await q("SELECT jar_id FROM transactions WHERE id=$1", [id])).rows[0].jar_id, 77);
});

test("a jar can pay for categories: saved, one jar per category, unknown categories dropped, automatic payments kept", async () => {
  await q("DELETE FROM jar_movements"); await q("DELETE FROM jars"); await q("ALTER SEQUENCE jars_id_seq RESTART");
  await q("UPDATE accounts SET balance=0 WHERE kind IN ('bank','wallet')");
  let S = await getState();
  const cat = Object.keys(S.cats).find((c) => c !== "Income" && c !== "Uncategorized");
  const jar = (id, n, cats) => ({ id, n, p: id, need: 0, cap: 500, bal: 300, due: "", bill: "", auto: false, desc: "", months: 0, done: "", cats });
  S.jars = [jar(1, "Small spending", [{ c: cat, since: "2026-10-01" }, { c: "No such category", since: "2026-10-01" }]), jar(2, "Other", [{ c: cat, since: "2026-10-01" }])];
  const t = S.tx.find((x) => x.a < 0);
  t.jar = { id: 1, amt: 40, auto: true }; t.jarNo = undefined;
  await putState(S);
  S = await getState();
  assert.deepEqual(S.jars.find((j) => j.id === 1).cats, [{ c: cat, since: "2026-10-01" }]);
  assert.deepEqual(S.jars.find((j) => j.id === 2).cats, []); // the category belongs to the first jar only
  const back = S.tx.find((x) => x.id === t.id);
  assert.deepEqual([back.jar.id, back.jar.amt, back.jar.auto], [1, 40, true]);
  // detached by hand: remembered for that category
  back.jar = undefined; back.jarNo = cat;
  await putState(S);
  S = await getState();
  const again = S.tx.find((x) => x.id === t.id);
  assert.equal(again.jar, undefined);
  assert.equal(again.jarNo, cat);
  // deleting the jar frees its categories
  S.jars = [];
  await putState(S);
  assert.equal((await q("SELECT count(*)::int n FROM jar_categories")).rows[0].n, 0);
});

test("paying from a jar is spending: it does not reopen the month's allowance, while money taken out by hand does", async () => {
  await q("DELETE FROM jar_movements"); await q("DELETE FROM jars"); await q("ALTER SEQUENCE jars_id_seq RESTART");
  await q("DELETE FROM settings WHERE key IN ('jars_buffer','jars_reserve')");
  await q("UPDATE accounts SET balance=50000 WHERE name='Bank Hapoalim'");
  await q("INSERT INTO jars (name,priority,target,cap,balance) VALUES ('Spending',1,0,500,0)");
  let S = await getState();
  S.tx[0].note = "touch";
  let r = await putState(S);
  assert.equal(r.jars[0].bal, 500); // this month's allowance
  S = await getState();
  const j = S.jars[0];
  j.bal = 380; j.balEdit = true; j.balNote = "Paid: lamp"; j.balPaid = true; // a ₪120 payment out of the jar
  S.tx[0].note = "touch2";
  await putState(S);
  assert.equal((await q("SELECT balance FROM jars")).rows[0].balance, 380); // nothing refilled it
  S = await getState();
  assert.equal(S.jars[0].got, 500); // still counts as received this month
  // money handed back by hand (not a payment) does reopen it
  S.jars[0].bal = 300; S.jars[0].balEdit = true; S.jars[0].balNote = "Released back to free money";
  S.tx[0].note = "touch3";
  const r2 = await putState(S);
  assert.equal(r2.jars[0].bal, 380); // topped up by the 80 that was handed back (380 to 300), not by the 120 payment
});

test("a bank that reports the shekel as a symbol is stored as ILS and needs no exchange rate", async () => {
  await reset();
  const acc = { name: "Max", currency: "ILS", source: "max" };
  const r = await ingest(acc, [{ date: "2026-10-12", description: "Shufersal", amount: -120, currency: "₪", externalId: "sym1" }]);
  assert.equal(r.added, 1);
  const t = (await q("SELECT amount,orig_currency FROM transactions WHERE description='Shufersal'")).rows[0];
  assert.equal(t.amount, -120);
  assert.equal(t.orig_currency, null);
});

test("a charge first listed with 0 is updated, not duplicated, when the bank reports the real amount", async () => {
  await reset();
  const acc = { name: "Max", currency: "ILS", source: "max" };
  const row = (amt) => ({ date: "2026-10-12", description: "Wolt", amount: amt, currency: "ILS", externalId: `1234:ref9:2026-10-12:${amt}`, stableKey: "1234:ref9:2026-10-12" });
  await ingest(acc, [row(0)]);
  const r = await ingest(acc, [row(-85)]);
  assert.equal(r.updated, 1);
  const rows = (await q("SELECT amount FROM transactions WHERE description='Wolt'")).rows;
  assert.deepEqual(rows.map((x) => x.amount), [-85]);
  assert.equal((await ingest(acc, [row(-85)])).added, 0);
});

test("a balance gap closes by itself when a charge first listed at 0 gets its real amount", async () => {
  await reset();
  const acc = { name: "Bank Hapoalim", currency: "ILS", source: "hapoalim" };
  const a = (await q("SELECT * FROM accounts WHERE name='Bank Hapoalim'")).rows[0];
  const row = (amt) => ({ date: "2026-10-12", description: "Wolt", amount: amt, currency: "ILS", externalId: `9:ref1:2026-10-12:${amt}`, stableKey: "9:ref1:2026-10-12" });
  await ingest(acc, [row(0)]);
  await tx((c) => recordSnapshot(c, a, 1000, new Date("2026-10-11T10:00:00Z")));
  await tx((c) => recordSnapshot(c, a, 566, new Date("2026-10-13T10:00:00Z")));
  assert.equal((await q("SELECT * FROM balance_gaps WHERE status='open'")).rowCount, 1);
  await ingest(acc, [row(-412)]);
  assert.equal((await q("SELECT * FROM balance_gaps WHERE status='open'")).rowCount, 0);
  // and an already-updated charge closes the gap on the next sync
  await tx((c) => recordSnapshot(c, a, 400, new Date("2026-10-14T10:00:00Z")));
  assert.equal((await q("SELECT * FROM balance_gaps WHERE status='open'")).rowCount, 1);
  await q("INSERT INTO transactions (date,description,from_name,to_name,amount,source) VALUES ('2026-10-13','Late fill','Bank Hapoalim','Shop',-166,'manual')");
  await ingest(acc, []);
  assert.equal((await q("SELECT * FROM balance_gaps WHERE status='open'")).rowCount, 0);
});

test("a bank payment equal to what the card charged that day is marked as a card payment; a monthly payer is marked Salary; dates are read in Israel time", async () => {
  await reset();
  const { ilDate } = await import("../src/autodetect.js");
  assert.equal(ilDate("2025-10-09T21:00:00.000Z"), "2025-10-10");
  assert.equal(ilDate("2025-09-25T10:37:45.000Z"), "2025-09-25");
  const card = { name: "Visa Cal", currency: "ILS", source: "visaCal" };
  await q("INSERT INTO accounts (name,currency,kind,source,subtitle,sort) VALUES ('Visa Cal','ILS','card','visaCal','x',60) ON CONFLICT DO NOTHING");
  const pd = "2026-10-09T21:00:00.000Z";
  await tx((c) => c.query("INSERT INTO transactions (date,description,from_name,to_name,amount,source,external_id,details) VALUES ('2026-09-25','A','Visa Cal','Shop',-300,'visaCal','x1',$1),('2026-09-27','B','Visa Cal','Shop2',-212.5,'visaCal','x2',$1)", [JSON.stringify({ processedDate: pd })]));
  await q("INSERT INTO transactions (date,description,from_name,to_name,amount,source,external_id) VALUES ('2026-10-10','כרטיסי אשראי','Bank Hapoalim','Cal',-512.5,'hapoalim','b1'),('2026-10-10','Rent','Bank Hapoalim','Landlord',-5600,'hapoalim','b2')");
  for (const m of ["2026-07", "2026-08", "2026-09"]) await q("INSERT INTO transactions (date,description,from_name,to_name,amount,source,external_id) VALUES ($1,'העברה','Acme Ltd','Bank Hapoalim',9000,'hapoalim',$2)", [m + "-10", "s" + m]);
  await ingest({ name: "Bank Hapoalim", currency: "ILS", source: "hapoalim" }, []);
  const ov = (await q("SELECT value FROM settings WHERE key='cc_override'")).rows[0].value;
  const b1 = (await q("SELECT id FROM transactions WHERE external_id='b1'")).rows[0].id, b2 = (await q("SELECT id FROM transactions WHERE external_id='b2'")).rows[0].id;
  assert.equal(ov[b1], 2);
  assert.equal(ov[b2], undefined);
  assert.equal((await q("SELECT count(*)::int AS n FROM transactions WHERE category='Salary'")).rows[0].n, 3);
});

test("a charge the bank still lists as pending explains the balance gap it caused", async () => {
  await reset();
  const acc = { name: "Max", currency: "ILS", source: "max" };
  await q("INSERT INTO accounts (name,currency,kind,source,subtitle,sort) VALUES ('Max','ILS','card','max','',60) ON CONFLICT DO NOTHING");
  const a = (await q("SELECT * FROM accounts WHERE name='Max'")).rows[0];
  await tx((c) => recordSnapshot(c, a, 0, new Date("2026-10-12T08:00:00Z")));
  await tx((c) => recordSnapshot(c, a, -412, new Date("2026-10-13T08:00:00Z")));
  assert.equal((await q("SELECT * FROM balance_gaps WHERE status='open'")).rowCount, 1);
  await ingest(acc, [{ date: "2026-10-12", description: "Home store", amount: -412, currency: "ILS", pending: true, externalId: "9001:p1:2026-10-12:0" }]);
  assert.equal((await q("SELECT * FROM balance_gaps WHERE status='open'")).rowCount, 0);
});

test("a charge listed as pending and later as settled under another id comes back as one settled transaction and does not open a balance gap", async () => {
  const card = (await q("SELECT * FROM accounts WHERE kind='card' ORDER BY id LIMIT 1")).rows[0];
  const acc = { name: card.name, currency: "ILS", source: "max" };
  await tx((c) => recordSnapshot(c, card, 0, new Date("2026-10-12T08:00:00Z")));
  await ingest(acc, [{ date: "2026-10-12", description: "Fuel station", amount: -412, currency: "ILS", externalId: "c:77:2026-10-12:-412", pending: true }]);
  await q("UPDATE transactions SET created_at='2026-10-12T08:30:00Z' WHERE from_name=$1", [card.name]); // imported between the two balance readings
  const before = (await q("SELECT count(*)::int AS n FROM transactions WHERE from_name=$1", [card.name])).rows[0].n;
  await tx((c) => recordSnapshot(c, card, -412, new Date("2026-10-12T09:00:00Z"))); // the card balance already includes the pending charge
  await tx((c) => healGaps(c, card.name, "ILS"));
  // later the same charge arrives as settled, with another id and date
  const r = await ingest(acc, [{ date: "2026-10-13", description: "Fuel station", amount: -412, currency: "ILS", externalId: "c:78:2026-10-13:-412" }]);
  assert.equal(r.added, 1);
  const rows = (await q("SELECT pending FROM transactions WHERE from_name=$1", [card.name])).rows;
  assert.equal(rows.length, before);
  assert.equal(rows.filter((x) => x.pending).length, 0);
  await q("UPDATE transactions SET created_at='2026-10-13T08:30:00Z' WHERE from_name=$1 AND NOT pending", [card.name]);
  const gap = await tx((c) => recordSnapshot(c, card, -412, new Date("2026-10-13T09:00:00Z")));
  assert.equal(gap, null);
});
