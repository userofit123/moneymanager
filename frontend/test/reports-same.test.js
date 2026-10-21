// Reports gives the same periods, comparisons, monthly series, merchants, tags, net worth and "this month vs last month" as the current app, on the same data.
import test from "node:test";
import assert from "node:assert/strict";
import { oldApp } from "./old-app.js";
import { buildDemo } from "../../server/src/seed.js";
import { homeModel } from "../src/lib/home.js";
import { block, merchants, sumBy, byAmount, totalOf, seriesN, trOptions, trSeries, nwSeries, monthCompare, cmpRange } from "../src/lib/reports.js";

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

const SETUP = `localStorage.setItem("moneyFc","{}");S={...emptyState(),...structuredClone(__S)};S.cfg={...DEF_CFG,...S.cfg};fx={ILS:1,...__FX};fxSrc="live";detect();derive();detectBills();BC=billsInfo();`;
const R1 = (o) => Math.round(o * 100) / 100;
const PERIODS = ["month", "lastmonth", "30d", "90d", "year", "lastyear", "all", "week", "lastweek"];
function oldAll(S, ctl) {
  return JSON.parse(JSON.stringify(old.run(SETUP + `Object.assign(RNG,__C.RNG);Object.assign(CMP,__C.CMP);Object.assign(RN,__C.RN);(()=>{
  const all=A(),blk=id=>{const r=RNG[id],cr=CMP[id]!="none"?cmpRange(r,CMP[id]):null;return{cur:all.filter(t=>inRange(rdOf(t),r)&&t.a<0),prev:cr?all.filter(t=>inRange(rdOf(t),cr)&&t.a<0):null,cr,r}};
  const sumBy=(L,key)=>{const m={};L.forEach(t=>key(t).forEach(k=>m[k]=(m[k]||0)+Math.abs(t.a)));return m};
  const out={};for(const id of ["cat","merch","tag"]){const B=blk(id);out[id]={cur:sumBy(B.cur,t=>id=="cat"?[t.c||"Uncategorized"]:id=="merch"?[t.to]:t.tags),prev:B.prev?sumBy(B.prev,t=>id=="cat"?[t.c||"Uncategorized"]:id=="merch"?[t.to]:t.tags):null,cr:B.cr}}
  out.merchRows=(()=>{const B=blk("merch"),f1=L=>L.filter(t=>!(S.hiddenMerchants||[]).includes(String(t.to).toLowerCase())),cur=sumBy(f1(B.cur),t=>[t.to]);return Object.entries(cur).sort((a,b)=>b[1]-a[1]).slice(0,7)})();
  out.bars=seriesN(RN.bars);out.lines=seriesN(RN.lines,RN.lt);out.bars0=seriesN(0);
  out.opts=trOptions();out.nw={hap:NW.hap,wise:NW.wise,pen:NW.pen,oth:NW.oth,first:NW.first,keys:NW.keys};
  out.tr=Object.fromEntries(["inc","exp","net","bills","cat:Groceries","tag:vacation","src:Salary"].map(s=>[s,trSeries(s,Array.from({length:12},(_,i)=>addM(MK,-(11-i))))]));
  const cur=Object.fromEntries(spend()),ks=Object.keys(hist.cat),pm=hist.keys[4],lastTot=hist.exp[4],same=A().filter(t=>t.a<0&&rdOf(t).startsWith(pm)&&+rdOf(t).slice(8)<=DAYN).reduce((s,t)=>s-t.a,0),thisTot=monthSum(MK,-1);
  out.cmp={ks,lastTot,same,thisTot,rows:ks.map(k=>({k,a:cur[k]||0,b:hist.cat[k][4]||0})).filter(r=>r.a>0||r.b>0).sort((x,y)=>(y.a+y.b)-(x.a+x.b))};
  return out})()`, { __S: S, __FX: FX, __C: ctl })));
}
const rounded = (o) => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === "number" ? R1(v) : v)));

for (const [name, S] of [["demo", demoState()], ["hidden merchant and tags", (() => { const s = demoState(); s.hiddenMerchants = ["netflix"]; s.tx.slice(0, 40).forEach((t, i) => { if (t.a < 0 && i % 3 == 0) t.tags = ["vacation"]; }); return s; })()]]) {
  test("Reports: " + name, () => {
    for (const p of PERIODS) for (const cm of ["none", "prev", "yoy"]) {
      const ctl = { RNG: { cat: { p, from: "", to: "" }, merch: { p, from: "", to: "" }, tag: { p, from: "", to: "" } }, CMP: { cat: cm, merch: cm, tag: cm }, RN: { bars: 6, lines: 12, lt: "exp" } };
      const o = rounded(oldAll(S, ctl)), M = homeModel(structuredClone(S), NOW, FX);
      for (const [id, key] of [["cat", (t) => [t.c || "Uncategorized"]], ["merch", (t) => [t.to]], ["tag", (t) => t.tags]]) {
        const B = block(M, ctl.RNG[id], ctl.CMP[id], NOW, "sun");
        assert.deepEqual(rounded(sumBy(B.cur, key)), o[id].cur, id + " " + p + " " + cm);
        assert.deepEqual(B.prev ? rounded(sumBy(B.prev, key)) : null, o[id].prev, id + " prev " + p + " " + cm);
        assert.deepEqual(B.cr, o[id].cr);
      }
      assert.deepEqual(merchants(M, block(M, ctl.RNG.merch, ctl.CMP.merch, NOW, "sun"), M.S).rows.map((r) => [r.n, R1(r.v)]), o.merchRows);
    }
    const ctl = { RNG: {}, CMP: {}, RN: { bars: 6, lines: 12, lt: "exp" } }, o = rounded(oldAll(S, ctl)), M = homeModel(structuredClone(S), NOW, FX), MK = "2026-10";
    const pick = (x) => rounded({ keys: x.keys, inc: x.inc, exp: x.exp, cat: x.cat });
    assert.deepEqual(pick(seriesN(M, 6, "exp", MK)), pick({ ...o.bars, keys: o.bars.keys }));
    assert.deepEqual(pick(seriesN(M, 12, "inc", MK)), pick(oldAllLines(S, "inc")));
    assert.deepEqual(pick(seriesN(M, 0, "exp", MK)), pick(o.bars0));
    const op = trOptions(M), og = (p) => o.opts.flatMap((g) => g[1]).map((x) => x[0]).filter((v) => v.startsWith(p)).map((v) => v.slice(p.length));
    assert.deepEqual(op.cat, og("cat:")); assert.deepEqual(op.tag, og("tag:")); assert.deepEqual(op.src.map((k) => (k.length > 34 ? k.slice(0, 34) + "…" : k)), og("src:"));
    const nw = nwSeries(M.S, M, MK); assert.deepEqual(rounded(nw), o.nw);
    const ms = Array.from({ length: 12 }, (_, i) => { const d = new Date(2026, 9 - (11 - i), 1); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); });
    for (const [s, v] of Object.entries(o.tr)) assert.deepEqual(rounded(trSeries(M, M.S, s, ms)), v, s);
    const c = monthCompare(M, MK); assert.deepEqual(rounded({ lastTot: c.lastTot, same: c.same, thisTot: c.thisTot }), rounded({ lastTot: o.cmp.lastTot, same: o.cmp.same, thisTot: o.cmp.thisTot }));
    assert.deepEqual(rounded(c.rows), o.cmp.rows);
  });
}
function oldAllLines(S, lt) { return JSON.parse(JSON.stringify(old.run(SETUP + `RN.lt="${lt}";seriesN(12,"${lt}")`, { __S: S, __FX: FX }))); }
