// Recap gives the same numbers as the current app's Recap (web/recap.js model()) on the same data, at the start, middle and end of a month,
// and shows the same parts in the same order. One known difference: a day's tooltip lists payees by name (the old page showed "days ago" numbers).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { oldApp } from "./old-app.js";
import { buildDemo } from "../../server/src/seed.js";
import { homeModel } from "../src/views/home.js";
import { recapModel, recapParts, dayBarHeights } from "../src/lib/recap.js";

process.on("unhandledRejection", () => {});
const RECAP = fs.readFileSync(new URL("../../web/recap.js", import.meta.url), "utf8").replace("window.renderRecap=function(){", "window.__recapModel=model;window.__recapOrder=m=>{const o=m.phase==\"start\"?[hero,startPart,inPart,nowPart,aheadPart,outPart,budgetsPart,endPart]:m.phase==\"end\"?[hero,startPart,inPart,outPart,budgetsPart,aheadPart,nowPart,endPart]:[hero,startPart,inPart,outPart,nowPart,aheadPart,budgetsPart,endPart];return o.map(f=>{try{return f(m)?f.name:\"\"}catch(e){return \"\"}}).filter(Boolean)};window.renderRecap=function(){");
const FX = { USD: 3.62 };
function demoState(NOW, o = {}) {
  const d = buildDemo(NOW); let id = 1;
  const tx = d.rows.map((r) => ({ id: id++, d: r.d, desc: r.desc, from: r.from, to: r.to, a: r.a, ...(r.orig ? { orig: r.orig } : {}), c: r.c || "", tags: r.tags || [], docs: [], note: "", ...(r.pending ? { pending: true } : {}), src: "demo" }));
  const cats = {}; let ci = 0; for (const c of new Set(tx.map((t) => t.c).concat(Object.keys(d.budgets)))) if (c) cats[c] = c === "Income" ? 99 : ci++ % 7;
  const acc = [["Bank Hapoalim", "ILS", "bank", "hapoalim", "Current account", true], ["Max", "ILS", "card", "max", "Credit card", false], ["Isracard", "ILS", "card", "isracard", "Credit card", false], ["Wise", "USD", "wallet", "wise", "USD balance", true], ["Pension", "ILS", "pension", "", "Pension", false]];
  return { v: 4, rev: 1, cats, rules: [], tagRules: [], tx, budgets: d.budgets, bills: [], ignoredBills: [], jars: d.jars.map((j, i) => ({ id: i + 1, got: 0, paid: 0, out: 0, cats: [], ...j })), audit: [], xf: [], dismissed: {}, dupOk: {}, adj: {}, jarsBuffer: 1500, ccOverride: {}, txIgnore: {}, budgetNo: [], hiddenMerchants: [], cardRules: [], salaryRules: [],
    cfg: { budgetPct: 80 }, currencies: ["ILS", "USD"], accounts: acc.map(([n, cur, kind, src, s, inNW], i) => ({ id: i + 1, n, cur, kind, src, s, manual: kind === "pension", inNW, v: d.balances[n] ?? 0, at: NOW.toISOString(), sort: i })),
    nwSnaps: d.snaps, gaps: [], balUpdates: [], connected: {}, locked: {}, connStatus: {}, ...o };
}
const r0 = (n) => Math.round(n);
const pick = (m) => ({
  nums: ["day", "dim", "cash", "inc", "ex", "cardsU", "cardsPrev", "cardPaid", "cardLeft", "same", "billsTot", "limitsLeft", "end", "start", "w1", "w0", "nextBills", "inJars", "buffer"].map((k) => [k, r0(m[k])]),
  phase: m.phase, sal: m.sal && m.sal.id, incs: m.incs.map((t) => t.id), bills: m.bills.map((b) => [b.n, r0(b.amt)]),
  over: m.over.map((b) => b.k), risk: m.risk.map((b) => b.k), okB: m.okB.map((b) => b.k), above: m.above.map((x) => x.k), below: m.below.map((x) => x.k),
  days: m.days.map((D) => [D.d, r0(D.spent), r0(D.inc), D.ex.map((x) => r0(x[1])), D.inn.map((x) => r0(x[1])), D.up.map((x) => [x[0], r0(x[1])])]),
});
const PART = { hero: "hero", startPart: "start", inPart: "in", outPart: "out", nowPart: "now", aheadPart: "ahead", budgetsPart: "budgets", endPart: "end" };

// The last case needs R.jarCov (the list of what jars pay, reserveCalc) from views/home.js: a category a jar pays in full is missing from R.rows.
const JARCOV = (S) => { S.budgets = {}; S.jars[0].cats = [{ c: "Groceries", since: "2026-10-01" }]; S.jars[0].bal = 5000; };
for (const [label, day, mod, opt] of [["start of the month", 3], ["middle of the month", 17], ["end of the month", 28], ["middle, no budgets, a jar paying for groceries in full", 17, JARCOV, { todo: "views/home.js R.jarCov" }]]) test("Recap matches the current app: " + label, opt || {}, () => {
  const NOW = new Date(2026, 9, day, 12), old = oldApp(NOW), S = demoState(NOW); if (mod) mod(S);
  old.run(RECAP);
  const o = JSON.parse(old.run(`localStorage.setItem("moneyFc","{}");S={...emptyState(),...structuredClone(__S)};S.cfg={...DEF_CFG,...S.cfg};fx={ILS:1,...__FX};fxSrc="live";detect();derive();detectBills();BC=billsInfo(true);JPC=null;acReset();
    const m=__recapModel();JSON.stringify({m,order:__recapOrder(m)})`, { __S: S, __FX: FX }));
  const M = homeModel(structuredClone(S), NOW, FX), m = recapModel(M, NOW);
  const a = pick(m), b = pick(o.m);
  for (const k of Object.keys(a)) assert.deepEqual(a[k], b[k], k);
  assert.deepEqual(recapParts(m), o.order.map((n) => PART[n]));
  assert.equal(dayBarHeights(m).length, m.dim);
  // the day's tooltip names the payee
  const D = m.days.find((x) => x.ex.length); if (D) assert.equal(typeof D.ex[0][0], "string");
});
