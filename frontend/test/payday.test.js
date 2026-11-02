// Free to use right before payday (lib/payday.js): below zero while the usual income has not come in yet. When the income
// still to come this month covers it, the pages show what it will likely be after payday, calmly; when it covers only part,
// what would still be missing; with no income still to come, nothing changes. Made-up (demo) data: the salary comes on the 9th.
import test from "node:test";
import assert from "node:assert/strict";
import { buildDemo } from "../../server/src/seed.js";
import { forecastModel } from "../src/lib/forecast.js";
import { homeModel } from "../src/lib/home.js";
import { recapModel } from "../src/lib/recap.js";
import { keyNumbers } from "../src/lib/keyNumbers.js";
import { paydayOf } from "../src/lib/payday.js";
import { paydayWords } from "../src/pagelogic/payday.js";
import { loadLocale } from "./load-locales.js";

const FX = { USD: 3.62 };
function demoState(at, bank) {
  const d = buildDemo(at); let id = 1;
  const tx = d.rows.map((r) => ({ id: id++, d: r.d, desc: r.desc, from: r.from, to: r.to, a: r.a, c: r.c || "", tags: r.tags || [], docs: [], note: "", ...(r.pending ? { pending: true } : {}), src: "demo" }));
  const cats = {}; let ci = 0; for (const c of new Set(tx.map((t) => t.c).concat(Object.keys(d.budgets)))) if (c) cats[c] = c === "Income" ? 99 : ci++ % 7;
  const acc = [["Bank Hapoalim", "ILS", "bank", "hapoalim", true], ["Max", "ILS", "card", "max", false], ["Isracard", "ILS", "card", "isracard", false], ["Wise", "USD", "wallet", "wise", true]];
  return { v: 4, rev: 1, cats, rules: [], tagRules: [], tx, budgets: d.budgets, bills: [], ignoredBills: [], jars: d.jars.map((j, i) => ({ id: i + 1, got: 0, paid: 0, out: 0, cats: [], ...j })), audit: [], xf: [], dismissed: {}, dupOk: {}, adj: {}, jarsBuffer: 1500, ccOverride: {}, txIgnore: {}, budgetNo: [], hiddenMerchants: [], cardRules: [], salaryRules: [],
    cfg: {}, currencies: ["ILS", "USD"], accounts: acc.map(([n, cur, kind, src, inNW], i) => ({ id: i + 1, n, cur, kind, src, s: "", inNW, v: n === "Bank Hapoalim" ? bank ?? d.balances[n] : d.balances[n] ?? 0, at: at.toISOString(), sort: i })),
    nwSnaps: d.snaps, gaps: [], balUpdates: [], connected: {}, locked: {}, connStatus: {} };
}
const run = (S, at) => { const H = homeModel(S, at, FX), FC = forecastModel(S, at, FX, {}, H); return { H, K: keyNumbers(H, FC), R: recapModel(H, at) }; };
// 2 November 2026: the salary (made up, on the 9th) has not come yet
const BEFORE = new Date(2026, 10, 2, 12);
// the bank balance that puts Free to use at exactly `free` on that day
const bankFor = (free, at = BEFORE) => { const { K } = run(demoState(at), at); return demoState(at).accounts[0].v + (free - K.a.free); };

test("paydayOf: covered, partly covered, no income still to come, not below zero", () => {
  const inc = [{ k: "Salary", a: 9000, days: [3, 8] }, { k: "Gift", a: 200, days: [20] }];
  assert.deepEqual(paydayOf(-4000, 9200, inc), { free: -4000, inc: 9200, after: 5200, covered: true, missing: 0, from: 3, to: 8 });
  assert.deepEqual(paydayOf(-12000, 9200, inc), { free: -12000, inc: 9200, after: -2800, covered: false, missing: 2800, from: 3, to: 8 });
  assert.equal(paydayOf(-4000, 0, []), null, "no income still to come: today's warning stays");
  assert.equal(paydayOf(0, 9200, inc), null); assert.equal(paydayOf(1500, 9200, inc), null);
});

test("before payday, covered: Free to use below zero, after payday is Free to use + likely money in, the same on every page", () => {
  const S = demoState(BEFORE, bankFor(-3000)), { K, R } = run(S, BEFORE), P = K.payday;
  assert.equal(K.a.free, -3000);
  assert.ok(K.a.incLeft >= 3000, "the salary still to come covers it: " + K.a.incLeft);
  assert.ok(P && P.covered); assert.equal(P.after, K.a.free + K.a.incLeft); assert.equal(P.inc, K.a.incLeft); assert.equal(P.missing, 0);
  assert.ok(Number.isInteger(P.after), "whole shekels");
  assert.deepEqual([P.from, P.to], [9, 9], "the salary usually comes on the 9th");
  assert.deepEqual(R.payday, P, "Recap works it out the same way");
  const plans = K.groups.find((g) => g.id == "plans").items, row = plans[plans.length - 1];
  assert.equal(row.id, "afterPay"); assert.equal(row.a, P.after); assert.ok(row.part, "shown under Free to use, not counted");
});

test("before payday, partly covered: what would still be missing after payday", () => {
  const S = demoState(BEFORE, bankFor(-3000)), inc = run(S, BEFORE).K.a.incLeft, S2 = demoState(BEFORE, bankFor(-inc - 2500)), { K } = run(S2, BEFORE);
  assert.equal(K.payday.covered, false); assert.equal(K.payday.missing, 2500); assert.equal(K.payday.after, -2500);
});

test("before payday, no income expected: today's warning stays", () => {
  const S = demoState(BEFORE, bankFor(-3000)); S.tx = S.tx.filter((t) => !(t.a > 0));
  const { K } = run(S, BEFORE);
  assert.ok(K.a.free < 0); assert.equal(K.a.incLeft, 0); assert.equal(K.payday, null);
  assert.ok(!K.groups.find((g) => g.id == "plans").items.some((x) => x.id == "afterPay"));
});

test("after payday: the salary came in, so it is no longer expected and nothing extra shows", () => {
  const AFTER = new Date(2026, 10, 10, 12), S = demoState(AFTER), { K, R } = run(S, AFTER);
  assert.ok(S.tx.some((t) => t.a > 0 && t.d.startsWith("2026-11-09")), "the made-up salary is in");
  assert.ok(!R.incRest.some((x) => /Salary/.test(x.k)), "the salary is not counted as still to come");
  assert.equal(K.payday, null);
});

test("the words: English and Hebrew, the same amounts", () => {
  for (const lang of ["en", "he"]) {
    const L = loadLocale(lang), t = (k, p = {}) => String(k.split(".").reduce((o, x) => o?.[x], L)).replace(/\{(\w+)\}/g, (_, x) => p[x]);
    const W = paydayWords(t, paydayOf(-3000, 17900, [{ k: "Salary", a: 17900, days: [3, 8] }]), lang == "he");
    assert.ok(W.covered); assert.match(W.after, /₪14,900/); assert.match(W.note, /₪17,900/);
    assert.match(W.tip, lang == "en" ? /between the 3rd and the 8th/ : /בין ה־3 ל־8/); assert.ok(!/\n\n/.test(W.tip));
    const P2 = paydayWords(t, paydayOf(-20000, 17900, []), lang == "he");
    assert.ok(!P2.covered); assert.match(P2.note, /₪2,100/); assert.ok(!/\{when\}|undefined/.test(P2.tip));
  }
});
