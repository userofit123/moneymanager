// The app's key numbers (lib/keyNumbers.js): one list, each amount rounded once, and every page shows the same number.
// Home's money flow, Recap, the Forecast and the Jars page are checked against the list on made-up (demo) data.
import test from "node:test";
import assert from "node:assert/strict";
import { buildDemo } from "../../server/src/seed.js";
import { forecastModel } from "../src/lib/forecast.js";
import { homeModel, flowSteps } from "../src/lib/home.js";
import { recapModel } from "../src/lib/recap.js";
import { jarsModel } from "../src/lib/jars.js";
import { keyNumbers, NUM_GROUPS, numText } from "../src/lib/keyNumbers.js";
import { loadLocale } from "./load-locales.js";

const NOW = new Date(2026, 9, 17, 12);
function demoState(o = {}, at = NOW) {
  const d = buildDemo(at); let id = 1;
  const tx = d.rows.map((r) => ({ id: id++, d: r.d, desc: r.desc, from: r.from, to: r.to, a: r.a, ...(r.orig ? { orig: r.orig } : {}), c: r.c || "", tags: r.tags || [], docs: [], note: "", ...(r.pending ? { pending: true } : {}), src: "demo" }));
  const cats = {}; let ci = 0; for (const c of new Set(tx.map((t) => t.c).concat(Object.keys(d.budgets)))) if (c) cats[c] = c === "Income" ? 99 : ci++ % 7;
  const acc = [["Bank Hapoalim", "ILS", "bank", "hapoalim", "Current account", true], ["Max", "ILS", "card", "max", "Credit card", false], ["Isracard", "ILS", "card", "isracard", "Credit card", false], ["Wise", "USD", "wallet", "wise", "USD balance", true], ["Pension", "ILS", "pension", "", "Pension", false]];
  return { v: 4, rev: 1, cats, rules: [], tagRules: [], tx, budgets: d.budgets, bills: [], ignoredBills: [], jars: d.jars.map((j, i) => ({ id: i + 1, got: 0, paid: 0, out: 0, cats: [], ...j })), audit: [], xf: [], dismissed: {}, dupOk: {}, adj: {}, jarsBuffer: 1500, ccOverride: {}, txIgnore: {}, budgetNo: [], hiddenMerchants: [], cardRules: [], salaryRules: [],
    cfg: { jars: 1, bills: 1, price: 1, budget: 1, card: 1, large: 1, xfer: 1, recon: 1, pending: 1, sync: 1, uncat: 1, forecast: 1, docs: 1, cardPct: 10, largeAmt: 5000, billDays: 3, budgetPct: 80, gapDays: 3 },
    currencies: ["ILS", "USD"], accounts: acc.map(([n, cur, kind, src, s, inNW], i) => ({ id: i + 1, n, cur, kind, src, s, manual: kind === "pension", inNW, v: d.balances[n] ?? 0, at: at.toISOString(), sort: i })),
    nwSnaps: d.snaps, gaps: [], balUpdates: [], connected: {}, locked: {}, connStatus: {}, ...o };
}
const FX = { USD: 3.62 };

const cases = [["demo", demoState()], ["little money, low buffer", demoState({ jarsBuffer: 0, accounts: demoState().accounts.map((a) => (a.kind === "bank" ? { ...a, v: 800 } : a)) })],
  ["start of the month", demoState({}, new Date(2026, 9, 2, 12)), new Date(2026, 9, 2, 12)],
  // 2 November: a card bill is still due this month and a few purchases are already on December's bill
  ["start of the month, card bills in two months", demoState({}, new Date(2026, 10, 2, 12)), new Date(2026, 10, 2, 12)],
  ["hand-added accounts", withCustom()]];

// Made-up hand-added accounts: one marked to count (ILS), one in USD marked to count, one not counted.
function withCustom() {
  const S = demoState(), n = S.accounts.length;
  const add = (n2, cur, v, inNW, i) => ({ id: n + i, n: n2, cur, kind: "custom", custom: true, ck: "account", src: "", s: "", manual: true, inNW, v, at: NOW.toISOString(), sort: n + i });
  S.accounts.push(add("Home safe", "ILS", 2500, true, 1), add("Travel cash", "USD", 100, true, 2), add("Old savings", "ILS", 9000, false, 3));
  return S;
}

for (const [name, S, at = NOW] of cases) test("every page shows the key numbers' amounts: " + name, () => {
  const H = homeModel(structuredClone(S), at, FX), FC = forecastModel(structuredClone(S), at, FX, {}, H), R = recapModel(H, at), J = jarsModel(structuredClone(S), at, FX);
  const K = keyNumbers(H, FC), a = K.a, F = H.flow, P = R.freeParts;
  for (const [k, v] of Object.entries(a)) assert.ok(Number.isInteger(v), `${k} is whole shekels: ${v}`);
  // now
  assert.equal(a.inAccounts, FC.d.eom.bank, "Forecast: in your accounts"); assert.equal(a.inAccounts, Math.round(R.cash), "Recap: in your accounts");
  assert.equal(a.cardsUnpaid, FC.d.eom.cards, "Forecast: card purchases"); assert.equal(a.cardsUnpaid, P.cards, "Recap: card purchases");
  assert.equal(a.upcoming, FC.d.eom.due, "Forecast: upcoming payments"); assert.equal(a.upcoming, P.up, "Recap: upcoming payments"); assert.equal(a.upcoming, J.F.up, "Jars: upcoming payments");
  assert.equal(a.afterKnown, a.inAccounts - a.cardsUnpaid - a.upcoming, "after known payments adds up");
  // card purchases not paid yet, in two parts: the card bills still due this month and the purchases charged after it
  assert.ok(a.cardBills >= 0 && a.cardsLater >= 0); assert.equal(a.cardBills + a.cardsLater, a.cardsUnpaid, "the two card parts add up");
  assert.equal(a.cardBills, P.cardBills, "Recap: card bills still due this month"); assert.equal(a.cardsLater, P.later, "Recap: charged after this month");
  assert.equal(a.cardBills + a.upcoming, R.sure, "Recap: You still have to pay = card bills this month + bills still due");
  // Recap's card purchases charged after this month start from what is left after this month's payments and end at after known payments
  assert.equal((R.sure >= 1 ? R.afterSure : Math.round(R.cash)) - a.cardsLater, a.afterKnown, "Recap: after the later card bills = after known payments");
  const parts = K.groups[0].items.filter((x) => x.part).map((x) => x.id);
  assert.deepEqual(parts, a.cardBills >= 1 && a.cardsLater >= 1 ? ["cardBills", "cardsLater"] : [], "the two parts show only when both are there");
  const act = flowSteps(F, "actual"), plan = flowSteps(F, "left");
  assert.equal(a.afterKnown, act.eOver > 0 ? -act.eOver : act.eFree, "Home Current ends at after known payments"); assert.equal(a.afterKnown, R.reallyNow, "Recap: after known payments"); assert.equal(a.afterKnown, FC.d.start, "Forecast: after known payments");
  assert.equal(a.putAside, Math.round(plan.jarsA + F.buffer), "Home: put aside tile"); assert.equal(a.putAside, P.aside, "Recap: put aside"); assert.equal(a.putAside, J.F.aside, "Jars: put aside");
  // Your plans: after known payments − left in your budgets − put aside = free to use, exactly
  assert.equal(a.leftBudgets, Math.round(plan.leftTot), "Home Planned: Left in your budgets"); assert.equal(a.leftBudgets, P.toCome, "Recap: left in your budgets");
  assert.equal(a.leftBudgets, plan.cols.filter((c) => c.plan).reduce((t, c) => t + c.a, 0), "Home Planned: the budget bars add up to it");
  assert.equal(a.free, a.afterKnown - a.leftBudgets - a.putAside, "free adds up");
  const ks = plan.cols.map((c) => c.k || c.kind), firstPlan = plan.cols.findIndex((c) => c.plan), jars = ks.findIndex((k) => k == "jars" || k == "cushion");
  if (firstPlan > 0 && jars > 0) assert.ok(firstPlan < jars, "Home Planned: left in your budgets comes before put aside");
  assert.equal(a.free, plan.eOver > 0 ? -plan.eOver : plan.eFree, "Home Planned ends at free"); assert.equal(plan.cols.at(-1).lo, Math.max(0, a.free), "the last What's left is free"); assert.equal(a.free, P.free, "Recap: free");
  assert.equal(Math.max(0, a.free), F.free, "Home and Jars: free"); assert.equal(F.free, J.F.free, "Jars page: free");
  // this month
  assert.equal(a.saved, a.moneyIn - a.moneyOut, "saved adds up"); assert.equal(a.saved, H.kpi.net, "Home: saved");
  assert.equal(a.likely, FC.d.eom.usual, "Forecast: the end of this month's usual spending part"); assert.equal(a.likely, R.likely, "Recap: likely spending");
  assert.equal(a.likely, FC.d.shown.out.total.lk, "Forecast: money out, usually still to come this month");
  assert.equal(a.endMonth, a.inAccounts - a.cardsUnpaid - a.upcoming - a.likely + FC.d.eom.inc, "end of this month adds up from its parts");
  assert.equal(a.incLeft, R.incLeft, "Recap: likely money in for the rest of the month"); assert.equal(a.incLeft, FC.d.eom.inc, "Forecast: income still to come");
  assert.equal(a.endMonth, a.afterKnown + a.incLeft - a.likely, "end of this month = after known payments + likely money in − likely spending");
  assert.equal(a.endMonth, R.endMonth, "Recap: end of this month"); assert.equal(a.endMonth, FC.d.endMonth, "Forecast: end of this month");
  assert.equal(a.endMonth, FC.d.shown.next.really, "Forecast strip and Recap's next month start there"); assert.equal(a.endMonth, FC.d.eom.end, "Forecast tip ends there");
  // next month
  assert.equal(a.endNext, a.endMonth + a.nextIn - a.nextOut, "end of next month adds up");
  assert.ok(Math.abs(a.endNext - FC.d.bal[1]) < 1, "the chart's first month");
});

test("the key numbers come in groups, in order, with their names in English and Hebrew", () => {
  const S = demoState(), H = homeModel(S, NOW, FX), K = keyNumbers(H, forecastModel(S, NOW, FX, {}, H));
  assert.deepEqual(K.groups.map((g) => g.id), ["known", "plans", "soFar", "likelyThis", "likelyNext"]);
  assert.deepEqual(K.groups.map((g) => g.id), NUM_GROUPS.map((g) => g[0]));
  // each group that adds up does so on screen: the start (or the group before's result) and its parts make the "=" row
  for (const g of K.groups) {
    const res = g.items.find((x) => x.op == "="); if (!res) continue;
    const sum = g.items.filter((x) => x.op != "=" && !x.part).reduce((t, x) => t + (x.op == "−" ? -x.a : x.a), 0);
    assert.equal(sum, res.a, g.id + " adds up");
  }
  assert.ok(K.groups[1].items[0].from && K.groups[1].items[0].id == "afterKnown", "Your plans starts from after known payments");
  const get = (o, k) => k.split(".").reduce((x, p) => x?.[p], o);
  for (const lang of ["en", "he"]) {
    const L = loadLocale(lang);
    for (const g of K.groups) {
      assert.equal(typeof get(L, g.name), "string", lang + ": " + g.name);
      for (const x of g.items) for (const k of [x.name, x.short, x.tip].filter(Boolean)) assert.equal(typeof get(L, k), "string", lang + ": " + k);
    }
  }
  const en = loadLocale("en").num, he = loadLocale("he").num;
  const sayLikely = (id) => /likely/i.test(en[numText(id).name.slice(4)]);
  for (const id of ["incLeft", "likely", "endMonth", "nextIn", "nextOut", "endNext"]) assert.ok(sayLikely(id) && he[numText(id).name.slice(4)].includes("כנראה"), id + " says likely");
  for (const id of ["inAccounts", "cardsUnpaid", "cardBills", "cardsLater", "upcoming", "afterKnown", "leftBudgets", "putAside", "free", "moneyIn", "moneyOut", "saved"]) assert.ok(!sayLikely(id) && !/צפוי|כנראה/.test(he[id]), id + " never says likely");
  assert.equal(K.byId.likely.mk, "2026-10"); assert.equal(K.byId.endMonth.mk, "2026-10"); assert.equal(K.byId.endNext.mk, "2026-11"); assert.equal(K.byId.endNext.name, K.byId.endMonth.name);
});

test("a hand-added account marked to count is in \"In your accounts\" once, everywhere; one not marked is left out", () => {
  const base = demoState(), S = withCustom();
  const H0 = homeModel(structuredClone(base), NOW, FX), H = homeModel(structuredClone(S), NOW, FX), FC = forecastModel(structuredClone(S), NOW, FX, {}, H), R = recapModel(H, NOW);
  const a = keyNumbers(H, FC).a, add = 2500 + 100 * FX.USD;
  assert.equal(H.flow.cash, H0.flow.cash + add, "counted once, the one not marked left out");
  assert.equal(Math.round(H.kpi.cash), a.inAccounts, "Home tile"); assert.equal(a.inAccounts, FC.d.eom.bank, "Forecast: bank today"); assert.equal(a.inAccounts, Math.round(R.cash), "Recap");
  assert.equal(H.kpi.cash, H.kpi.cashAccts.reduce((t, x) => t + x.ils, 0), "the tile's list adds up");
  assert.ok(H.kpi.cashAccts.some((x) => x.n === "Home safe") && !H.kpi.cashAccts.some((x) => x.n === "Old savings"));
  assert.ok(!H.kpi.missing.includes("Home safe"), "a hand-added account is never 'not read yet'");
  const noFx = homeModel(structuredClone(S), NOW, {});
  assert.ok(noFx.kpi.noRate.includes("Travel cash"), "with no rate it is listed as not counted");
});
