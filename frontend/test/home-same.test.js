// Home gives the same numbers, bills, budgets, jars, recent payments and alerts as the current app, on the same data (made-up bank data from the demo).
import test from "node:test";
import assert from "node:assert/strict";
import { oldApp } from "./old-app.js";
import { buildDemo } from "../../server/src/seed.js";
import { homeModel, flowSteps } from "../src/views/home.js";
import { alertsModel, fm } from "../src/views/alerts.js";

process.on("unhandledRejection", () => {});
const NOW = new Date(2026, 9, 17, 12), old = oldApp(NOW);
function demoState(o = {}) {
  const d = buildDemo(NOW); let id = 1;
  const tx = d.rows.map((r) => ({ id: id++, d: r.d, desc: r.desc, from: r.from, to: r.to, a: r.a, ...(r.orig ? { orig: r.orig } : {}), c: r.c || "", tags: r.tags || [], docs: [], note: "", ...(r.pending ? { pending: true } : {}), src: "demo" }));
  const cats = {}; let ci = 0; for (const c of new Set(tx.map((t) => t.c).concat(Object.keys(d.budgets)))) if (c) cats[c] = c === "Income" ? 99 : ci++ % 7;
  const acc = [["Bank Hapoalim", "ILS", "bank", "hapoalim", "Current account", true], ["Max", "ILS", "card", "max", "Credit card", false], ["Isracard", "ILS", "card", "isracard", "Credit card", false], ["Wise", "USD", "wallet", "wise", "USD balance", true], ["Pension", "ILS", "pension", "", "Pension", false]];
  return { v: 4, rev: 1, cats, rules: [], tagRules: [], tx, budgets: d.budgets, bills: [], ignoredBills: [], jars: d.jars.map((j, i) => ({ id: i + 1, got: 0, paid: 0, out: 0, cats: [], ...j })), audit: [], xf: [], dismissed: {}, dupOk: {}, adj: {}, jarsBuffer: 1500, ccOverride: {}, txIgnore: {}, budgetNo: [], hiddenMerchants: [], cardRules: [], salaryRules: [],
    cfg: { jars: 1, bills: 1, price: 1, budget: 1, card: 1, large: 1, xfer: 1, recon: 1, pending: 1, sync: 1, uncat: 1, forecast: 1, docs: 1, cardPct: 10, largeAmt: 5000, billDays: 3, budgetPct: 80, gapDays: 3 },
    currencies: ["ILS", "USD"], accounts: acc.map(([n, cur, kind, src, s, inNW], i) => ({ id: i + 1, n, cur, kind, src, s, manual: kind === "pension", inNW, v: d.balances[n] ?? 0, at: NOW.toISOString(), sort: i })),
    nwSnaps: d.snaps, gaps: [], balUpdates: [], connected: {}, locked: {}, connStatus: {}, ...o };
}
const FX = { USD: 3.62 };
const oldVals = (S) => JSON.parse(JSON.stringify(old.run(`localStorage.setItem("moneyFc","{}");S={...emptyState(),...structuredClone(__S)};S.cfg={...DEF_CFG,...S.cfg};fx={ILS:1,...__FX};fxSrc="live";detect();derive();detectBills();BC=billsInfo(true);JPC=null;
  ({inc:monthSum(MK,1),ex:monthSum(MK,-1),cash:cashNow()+custNW(),incLast:hist.inc[4],exLast:hist.exp[4],cards:cardsD,budgets:budgetInfo().map(b=>[b.k,b.s,b.lim,b.st,Math.round(b.pc*100)/100]),
   jars:jarCalc().out.map(j=>[j.id,j.got,j.want,j.bal]),free:jarFree().free,spend:spend(),
   bills:billsInfo().filter(b=>b.nx).sort((a,b)=>(a.status=="overdue"?-1e3:0)+a.days-((b.status=="overdue"?-1e3:0)+b.days)).slice(0,4).map(b=>[b.n,b.days,b.status,Math.round(b.pred)]),
   recent:ALL().filter(t=>!isXf(t)&&t.d>=MK&&!isFuture(t)).sort((a,b)=>b.d.localeCompare(a.d)).slice(0,5).map(t=>t.id),
   alerts:alerts().map(a=>[a.id,a.sev,a.title,a.text])})`, { __S: S, __FX: FX })));

for (const [name, S] of [["demo", demoState()], ["no budgets, big card bill", demoState({ budgets: {}, jarsBuffer: 0 })], ["a repeating bill that stopped", (() => { const s = demoState(); s.tx = s.tx.filter((t) => !/netflix/i.test(t.desc) || t.d < "2026-08-01"); return s; })()]]) test("Home matches the current app: " + name, () => {
  const o = oldVals(S), M = homeModel(structuredClone(S), NOW, FX);
  assert.equal(Math.round(M.kpi.inc), Math.round(o.inc)); assert.equal(Math.round(M.kpi.ex), Math.round(o.ex));
  assert.equal(Math.round(M.kpi.cash), Math.round(o.cash)); assert.equal(Math.round(M.kpi.incLast), Math.round(o.incLast)); assert.equal(Math.round(M.kpi.exLast), Math.round(o.exLast));
  assert.deepEqual(M.cards.map((c) => [c.n, c.now, c.last]), o.cards.map((c) => c.slice(0, 3)));
  assert.deepEqual(M.budgets.map((b) => [b.k, b.s, b.lim, b.st, Math.round(b.pc * 100) / 100]), o.budgets.sort((a, b) => b[4] - a[4]));
  assert.deepEqual(M.jars.map((j) => [j.id, j.got, j.want, j.bal]), o.jars);
  assert.equal(Math.round(M.flow.free), Math.round(o.free));
  assert.deepEqual(M.spend.map(([k, v]) => [k, Math.round(v)]), o.spend.map(([k, v]) => [k, Math.round(v)]));
  assert.deepEqual(M.upcoming.map((b) => [b.n, b.days, b.status, Math.round(b.pred)]), o.bills);
  assert.deepEqual(M.recent.map((t) => t.id), o.recent);
});
