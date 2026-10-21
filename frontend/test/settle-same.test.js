// The upkeep after every load and change (core/settle.js) gives the agreed data on fixed states (saved in fixtures/, see golden.js):
// transfers found, bills found, "all bills" jar targets, category rules, jars paying for categories, and the amount held back.
import test from "node:test";
import assert from "node:assert/strict";
import { matchesSaved } from "./golden.js";
import { buildDemo } from "../../server/src/seed.js";
import { settle } from "../src/core/settle.js";

const NOW = new Date(2026, 9, 17, 12);
function demo() {
  const d = buildDemo(NOW); let id = 1;
  const tx = d.rows.map((r) => ({ id: id++, d: r.d, desc: r.desc, from: r.from, to: r.to, a: r.a, ...(r.orig ? { orig: r.orig } : {}), c: r.c || "", tags: r.tags || [], docs: [], note: "", ...(r.pending ? { pending: true } : {}), src: "demo" }));
  const cats = {}; let ci = 0; for (const c of new Set(tx.map((t) => t.c).concat(Object.keys(d.budgets)))) if (c) cats[c] = c === "Income" ? 99 : ci++ % 7;
  const acc = [["Bank Hapoalim", "ILS", "bank", "hapoalim", true], ["Max", "ILS", "card", "max", false], ["Isracard", "ILS", "card", "isracard", false], ["Wise", "USD", "wallet", "wise", true]];
  return { v: 4, rev: 1, cats, rules: [], tagRules: [], tx, budgets: d.budgets, bills: [], ignoredBills: [], jars: [], audit: [], xf: [], dismissed: {}, dupOk: {}, adj: {}, jarsBuffer: 0, ccOverride: {}, txIgnore: {}, budgetNo: [], hiddenMerchants: [], cardRules: [], salaryRules: [],
    cfg: {}, currencies: ["ILS", "USD"], accounts: acc.map(([n, cur, kind, src, inNW], i) => ({ id: i + 1, n, cur, kind, src, inNW, v: d.balances[n] ?? 0, at: NOW.toISOString(), sort: i })), nwSnaps: [], gaps: [], balUpdates: [], connected: {}, locked: {}, connStatus: {} };
}
function own() {
  const S = demo();
  S.tx = S.tx.filter((t) => t.d < "2026-10-18");
  S.tx.forEach((t) => { if (/wolt|shufersal/i.test(t.desc)) t.c = ""; }); // left for the rules
  S.rules = [{ k: "wolt", c: "Eating out" }, { k: "SHUFERSAL", c: "Groceries" }];
  S.accounts.push({ id: 9, n: "Savings", cur: "ILS", kind: "bank", inNW: true, v: 10000, at: NOW.toISOString() });
  S.tx.push({ id: 90001, d: "2026-10-05", desc: "To savings", from: "Bank Hapoalim", to: "Savings", a: -1000, c: "", tags: [], docs: [], note: "" });
  S.tx.push({ id: 90002, d: "2026-10-06", desc: "From main", from: "Bank Hapoalim", to: "Savings", a: 1000, c: "", tags: [], docs: [], note: "" });
  S.jars = [
    { id: 1, n: "Food jar", p: 1, bal: 800, need: 0, cap: 300, got: 0, cats: [{ c: "Groceries", since: "2026-10-01" }] },
    { id: 2, n: "Bills jar", p: 2, bal: 1000, need: 0, cap: 500, got: 0, bill: "*", months: 6 },
    { id: 3, n: "Trip", p: 3, bal: 200, need: 5000, cap: 400, got: 0 },
  ];
  S.jarsBuffer = 1500;
  return S;
}
const STATES = [["the made-up demo data", "demo", demo], ["rules, a transfer and jars that pay for things", "own", own]];

const pick = (S) => ({
  xf: S.xf, bills: S.bills, jarsReserve: S.jarsReserve,
  tx: S.tx.map((t) => ({ id: t.id, c: t.c, jar: t.jar ? { id: t.jar.id, amt: t.jar.amt, auto: t.jar.auto } : null, jarNo: t.jarNo || null })),
  jars: S.jars.map((j) => ({ id: j.id, bal: j.bal, need: j.need, paid: j.paid || 0, out: j.out || 0, moves: (j.moves || []).map((m) => [m.amt, m.note]) })),
  audit: (S.audit || []).filter((a) => a.who === "System").map((a) => [a.action, a.detail]),
});

for (const [name, key, make] of STATES) {
  test("the upkeep finds transfers and bills, applies rules and fills jars: " + name, () => {
    const b = make(); b.cfg = { ...b.cfg }; const lines = settle(b, NOW, {});
    b.audit = [...lines.map(([action, detail, , who]) => ({ action, detail, who })).reverse(), ...b.audit];
    const B = pick(b);
    matchesSaved(`settle.${key}`, B);
  });
}
test("a second run changes nothing (so a load does not save again and again)", () => {
  const S = own(); settle(S, NOW, {}); const once = JSON.stringify(S);
  assert.deepEqual(settle(S, NOW, {}), []);
  assert.equal(JSON.stringify(S), once);
});
