// The Forecast page gives the agreed numbers on fixed data (saved in fixtures/, see golden.js): the balance and range for 12 months,
// every income and spending line, and what each jar will hold and when it is full.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { matchesSaved } from "./golden.js";
import { buildDemo } from "../../server/src/seed.js";
import { forecastModel, periodTotal, direction, chartOf } from "../src/lib/forecast.js";

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
const r2 = (v) => Math.round(v * 100) / 100;

const cases = [["demo", "demo", demoState(), {}], ["demo, 3 months, average", "avg3", demoState(), { n: 3, m: "avg", h: 6 }], ["demo, 12 months, trend line", "trend12", demoState(), { n: 12, m: "trend", h: 3 }],
  ["little money, low buffer", "lowcash", demoState({ jarsBuffer: 0, accounts: demoState().accounts.map((a) => (a.kind === "bank" ? { ...a, v: 800 } : a)) }), {}],
  ["a card bill paid from the bank", "cardbill", (() => { const s = demoState(); s.tx.push({ id: 9001, d: "2026-09-15", desc: "ישראכרט חיוב", from: "Bank Hapoalim", to: "Isracard", a: -2500, c: "", tags: [], docs: [], note: "" }); return s; })(), {}]];
for (const [name, key, S, fcOpt] of cases) test("Forecast works out the balance, every line and the jars: " + name, () => {
  const M = forecastModel(structuredClone(S), NOW, FX, fcOpt), d = M.d, rs = (a) => a.map((x) => r2(x));
  assert.ok(d.inc.length >= 1 && d.ex.length >= 3);
  const row = (r) => [r.k, r2(r.mean), r2(r.at(1)), r2(periodTotal(r, M.fc.h)), r2(r.sl), r.v.map(r2), r.nn];
  matchesSaved("forecast." + key, {
    start: r2(d.start), bal: rs(d.bal), lo: rs(d.lo), hi: rs(d.hi), nm: r2(d.nm), sd: r2(d.sd), nEff: d.nEff,
    inc: d.inc.map(row), ex: d.ex.map(row), cardPays: M.cardPays, first: M.FH.first,
    jars: M.jars.J.map((j) => [j.id, j.eta, rs(j.series), rs(j.planned)]), pool0: r2(M.jars.pool0), sur: rs(M.jars.sur), net: r2(M.jars.net),
  });
});

test("the chart keeps every point inside the picture and finds the first month below zero", () => {
  const M = forecastModel(demoState({ jarsBuffer: 0 }), NOW, FX, { h: 12 }), c = chartOf(M.d, 12);
  assert.equal(c.line.split(" ").length, 13);
  for (const p of c.line.split(" ")) { const [x, y] = p.split(",").map(Number); assert.ok(x >= c.Pl && x <= c.W - c.Pr && y >= c.Pt - 1 && y <= c.Ht - c.Pb + 1); }
  const low = { bal: [100, 50, -20, -90], lo: [100, 0, -60, -150], hi: [100, 100, 20, -30] }, z = chartOf(low, 3);
  assert.equal(z.fn, 2); assert.equal(z.fl, 2); assert.ok(z.zeroY != null);
});

test("a line moving less than 2% a month is steady, and rising spending is bad news", () => {
  assert.equal(direction({ sl: 1, mean: 100 }, "out").word, "steady");
  assert.equal(direction({ sl: 10, mean: 100 }, "out").cls, "up");
  assert.equal(direction({ sl: 10, mean: 100 }, "in").cls, "dn");
  assert.equal(direction({ sl: -10, mean: 100 }, "out").cls, "dn");
});

// ---- the page itself, drawn with the real Vue file ----
const vite = await createServer({ root: new URL("..", import.meta.url).pathname, server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "silent" });
after(() => vite.close());
globalThis.document = { documentElement: { lang: "", classList: { toggle() {} } } };
let mods = null;
async function load() {
  if (mods) return mods;
  const [Fc, store, i18nMod] = await Promise.all(["/src/views/Forecast.vue", "/src/stores/data.js", "/src/i18n.js"].map((p) => vite.ssrLoadModule(p)));
  (await vite.ssrLoadModule("/src/core/clock.js")).setNow(NOW); // the page works out its numbers for a fixed day
  return (mods = { Fc: Fc.default, data: store.data, i18n: i18nMod.i18n, setLang: i18nMod.setLang });
}
async function page(S, lang = "en") {
  const m = await load(); await m.setLang(lang); m.data.state.value = structuredClone(S);
  const app = createSSRApp({ render: () => h(m.Fc) }); app.use(m.i18n);
  const html = await renderToString(app), i = html.indexOf("<section");
  return html.slice(i).replace(/<!--[\s\S]*?-->/g, "");
}
const unesc = (x) => x.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const words = (html) => unesc(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

test("the English page shows every block, in order, with the agreed words", async () => {
  const S = demoState(), html = await page(S), got = {};
  const order = ["fcCtl", "fcK", "fcDiag", "fcChart", "fcTab", "fcJars"];
  // the new page, cut at each block
  const at = order.map((id) => html.indexOf(`id="${id}"`)); assert.ok(at.every((x, i) => x >= 0 && (i === 0 || x > at[i - 1])), "blocks in the same order: " + at);
  const open = (i) => html.lastIndexOf("<", at[i]);
  const cut = (id) => { const i = order.indexOf(id); return html.slice(open(i), i + 1 < order.length ? open(i + 1) : html.length); };
  for (const id of order) {
    got[id] = words(cut(id));
  }
  matchesSaved("forecast.page.en", got);
});

test("the Hebrew page has Hebrew words only (apart from names) and no broken numbers", async () => {
  const html = await page(demoState(), "he"), w = words(html);
  assert.ok(!/undefined|NaN|\[object/.test(w), w.match(/.{20}(undefined|NaN|\[object).{20}/)?.[0]);
  const eng = (w.match(/[A-Za-z]{3,}/g) || []).filter((x) => !["Wise", "Netflix", "Rent", "Salary"].includes(x));
  const st = demoState();
  const names = new Set([...st.tx.map((t) => t.desc + " " + t.to + " " + t.from + " " + t.c), ...(st.jars || []).map((j) => j.n), ...Object.keys(st.cats || {})].flatMap((x) => String(x).split(/[^A-Za-z]+/)));
  assert.deepEqual(eng.filter((x) => !names.has(x)), []);
  // the page loads the Hebrew for names from the data (core/heText.js): let it finish before the test ends
  await vite.ssrLoadModule("/src/core/heSaved.js"); await new Promise((r) => setTimeout(r, 300));
  await page(demoState(), "en");
});
