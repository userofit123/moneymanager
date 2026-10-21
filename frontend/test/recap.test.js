// Recap gives the agreed numbers at the start, middle and end of a month, and shows its parts in the agreed order
// (saved in fixtures/, see golden.js). A day's tooltip lists payees by name.
import test from "node:test";
import assert from "node:assert/strict";
import { matchesSaved } from "./golden.js";
import { buildDemo } from "../../server/src/seed.js";
import { homeModel } from "../src/lib/home.js";
import { recapModel, recapParts, dayBarHeights } from "../src/lib/recap.js";

process.on("unhandledRejection", () => {});
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

// The last case needs R.jarCov (the list of what jars pay, reserveCalc) from lib/home.js: a category a jar pays in full is missing from R.rows.
const JARCOV = (S) => { S.budgets = {}; S.jars[0].cats = [{ c: "Groceries", since: "2026-10-01" }]; S.jars[0].bal = 5000; };
for (const [label, key, day, mod, opt] of [["start of the month", "start", 3], ["middle of the month", "middle", 17], ["end of the month", "end", 28], ["middle, no budgets, a jar paying for groceries in full", "jarpays", 17, JARCOV]]) test("Recap works out the month and picks its parts: " + label, opt || {}, () => {
  const NOW = new Date(2026, 9, day, 12), S = demoState(NOW); if (mod) mod(S);
  const M = homeModel(structuredClone(S), NOW, FX), m = recapModel(M, NOW);
  matchesSaved("recap." + key, { ...pick(m), parts: recapParts(m) });
  assert.equal(dayBarHeights(m).length, m.dim);
  // the day's tooltip names the payee
  const D = m.days.find((x) => x.ex.length); if (D) assert.equal(typeof D.ex[0][0], "string");
});
