// Home gives the agreed numbers, bills, budgets, jars and recent payments on made-up bank data from the demo (saved in fixtures/, see golden.js).
import test from "node:test";
import assert from "node:assert/strict";
import { matchesSaved } from "./golden.js";
import { buildDemo } from "../../server/src/seed.js";
import { homeModel, flowSteps } from "../src/lib/home.js";
import { alertsModel, fm } from "../src/lib/alerts.js";

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

const CASES = [["demo", "demo", demoState()], ["no budgets, big card bill", "nobudgets", demoState({ budgets: {}, jarsBuffer: 0 })], ["a repeating bill that stopped", "stopped", (() => { const s = demoState(); s.tx = s.tx.filter((t) => !/netflix/i.test(t.desc) || t.d < "2026-08-01"); return s; })()]];
for (const [name, key, S] of CASES) test("Home shows this month's money, cards, budgets, jars, bills and recent payments: " + name, () => {
  const M = homeModel(structuredClone(S), NOW, FX);
  matchesSaved("home." + key, {
    kpi: ["inc", "ex", "cash", "incLast", "exLast"].map((k) => [k, Math.round(M.kpi[k])]),
    cards: M.cards.map((c) => [c.n, c.now, c.last]),
    budgets: M.budgets.map((b) => [b.k, b.s, b.lim, b.st, Math.round(b.pc * 100) / 100]),
    jars: M.jars.map((j) => [j.id, j.got, j.want, j.bal]),
    free: Math.round(M.flow.free),
    spend: M.spend.map(([k, v]) => [k, Math.round(v)]),
    upcoming: M.upcoming.map((b) => [b.n, b.days, b.status, Math.round(b.pred)]),
    recent: M.recent.map((t) => t.id),
  });
});
