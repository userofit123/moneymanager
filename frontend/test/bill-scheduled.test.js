// A bill whose payment the bank already lists for a day after the due day (a card charge dated tomorrow) is on its way:
// no "not seen yet" row next to the real one, and no overdue warning once the due day has passed.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { billState } from "../src/lib/bills.js";
import { homeModel } from "../src/lib/home.js";
import { createServer } from "vite";
import "vue"; // loaded before the stand-in document below

globalThis.document = { documentElement: { lang: "", classList: { toggle() {} } } };
// lib/txrows.js loads the texts, so it runs through Vite
const vite = await createServer({ root: new URL("..", import.meta.url).pathname, server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "silent" });
after(() => vite.close());
const { upBillRows } = await vite.ssrLoadModule("/src/lib/txrows.js");

let nid = 1;
const T = (d, a, o = {}) => ({ id: nid++, d, desc: "Sunny Car Insurance", from: "Blue Card", to: "Sunny Car Insurance", a, c: "Insurance", tags: [], docs: [], note: "", ...o });
// charged on the 27th, the last one on the 28th; the October payment (6 of 10) is listed for 28 Oct
const S = () => ({ tx: [T("2026-06-27", -178), T("2026-07-27", -178), T("2026-08-27", -178), T("2026-09-28", -178, { inst: [5, 10] }), T("2026-10-28", -178, { inst: [6, 10] })], bills: [], accounts: [] });
const ymd = (d) => d.toISOString().slice(0, 10);

test("a payment the bank lists for after the due day counts as coming, not missing", () => {
  const now = new Date(2026, 9, 27, 12), today = "2026-10-27";
  const b = billState(S(), now).all.find((x) => x.n == "Sunny Car Insurance");
  assert.equal(b.status, "pending"); assert.equal(b.sched, "2026-10-28");
  const BC = homeModel(S(), now).billsAll;
  assert.equal(BC.find((x) => x.n == "Sunny Car Insurance").sched, "2026-10-28", "Home works the bill out the same way");
  const rows = upBillRows(S(), BC, now, today);
  assert.deepEqual(rows.filter((r) => r.late), [], "no 'not seen yet' row next to the real charge");
  assert.ok(rows.every((r) => r.d != "2026-10-27"));
});

test("a few days past the due day it is still coming, never overdue", () => {
  const now = new Date(2026, 9, 31, 12);
  const b = billState(S(), now).all.find((x) => x.n == "Sunny Car Insurance");
  assert.notEqual(b.status, "overdue"); assert.ok(!b.ended);
});

test("without the listed charge the due bill is still 'not seen yet'", () => {
  const now = new Date(2026, 9, 27, 12), s = S(); s.tx.pop();
  const BC = homeModel(s, now).billsAll, b = BC.find((x) => x.n == "Sunny Car Insurance");
  assert.equal(b.status, "pending"); assert.equal(b.sched, null);
  const late = upBillRows(s, BC, now, "2026-10-27").filter((r) => r.late);
  assert.equal(late.length, 1); assert.equal(late[0].d, ymd(new Date(2026, 9, 27, 12)));
});

test("still to pay counts the listed payment's own amount, not the bill's usual one", () => {
  const now = new Date(2026, 9, 27, 12), s = S(); s.tx[s.tx.length - 1].a = -181.37;
  const up = homeModel(s, now).flow.up.find((x) => x.n == "Sunny Car Insurance");
  assert.ok(up, "the bill is still to pay"); assert.equal(up.amt, 181.37);
});
