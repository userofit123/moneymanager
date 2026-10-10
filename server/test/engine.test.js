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
