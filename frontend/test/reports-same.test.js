// Reports gives the agreed periods, comparisons, monthly series, merchants, tags, net worth and "this month vs last month" on fixed data
// (saved in fixtures/, see golden.js).
import test from "node:test";
import assert from "node:assert/strict";
import { matchesSaved } from "./golden.js";
import { buildDemo } from "../../server/src/seed.js";
import { homeModel } from "../src/lib/home.js";
import { block, merchants, sumBy, seriesN, trOptions, trSeries, nwSeries, monthCompare } from "../src/lib/reports.js";

process.on("unhandledRejection", () => {});
const NOW = new Date(2026, 9, 17, 12);
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

const R1 = (o) => Math.round(o * 100) / 100;
const PERIODS = ["month", "lastmonth", "30d", "90d", "year", "lastyear", "all", "week", "lastweek"];
const rounded = (o) => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === "number" ? R1(v) : v)));

for (const [name, key, S] of [["demo", "demo", demoState()], ["hidden merchant and tags", "hidden", (() => { const s = demoState(); s.hiddenMerchants = ["netflix"]; s.tx.slice(0, 40).forEach((t, i) => { if (t.a < 0 && i % 3 == 0) t.tags = ["vacation"]; }); return s; })()]]) {
  test("Reports adds up every time frame and comparison, the monthly series, net worth and this month vs last: " + name, () => {
    const blocks = {};
    for (const p of PERIODS) for (const cm of ["none", "prev", "yoy"]) {
      const RNG = { p, from: "", to: "" }, M = homeModel(structuredClone(S), NOW, FX), out = {};
      for (const [id, key] of [["cat", (t) => [t.c || "Uncategorized"]], ["merch", (t) => [t.to]], ["tag", (t) => t.tags]]) {
        const B = block(M, RNG, cm, NOW, "sun");
        out[id] = rounded(sumBy(B.cur, key));
        if (cm != "none") out[id + " before"] = { range: B.cr, sums: B.prev ? rounded(sumBy(B.prev, key)) : null };
        else assert.equal(B.prev, null);
      }
      out.merchRows = merchants(M, block(M, RNG, cm, NOW, "sun"), M.S).rows.map((r) => [r.n, R1(r.v)]);
      // the totals and the top merchants of a time frame do not depend on what it is compared with
      const own = blocks[p] || (blocks[p] = {});
      for (const k of ["cat", "merch", "tag", "merchRows"]) { if (cm == "none") own[k] = out[k]; else assert.deepEqual(out[k], own[k], k + " " + p + " " + cm); }
      for (const k of ["cat", "merch", "tag"]) if (out[k + " before"]) own[k + " before " + cm] = out[k + " before"];
    }
    const M = homeModel(structuredClone(S), NOW, FX);
    const MK = "2026-10", pick = (x) => rounded({ keys: x.keys, inc: x.inc, exp: x.exp, cat: x.cat });
    const op = trOptions(M), ms = Array.from({ length: 12 }, (_, i) => { const d = new Date(2026, 9 - (11 - i), 1); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); });
    const c = monthCompare(M, MK);
    matchesSaved("reports." + key + ".blocks", blocks);
    matchesSaved("reports." + key + ".series", {
      bars: pick(seriesN(M, 6, "exp", MK)), lines: pick(seriesN(M, 12, "inc", MK)), bars0: pick(seriesN(M, 0, "exp", MK)),
      options: { cat: op.cat, tag: op.tag, src: op.src.map((k) => (k.length > 34 ? k.slice(0, 34) + "…" : k)) },
      nw: rounded(nwSeries(M.S, M, MK)),
      tr: Object.fromEntries(["inc", "exp", "net", "bills", "cat:Groceries", "tag:vacation", "src:Salary"].map((s) => [s, rounded(trSeries(M, M.S, s, ms))])),
      cmp: rounded({ lastTot: c.lastTot, same: c.same, thisTot: c.thisTot, rows: c.rows }),
    });
  });
}
