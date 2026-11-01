// The Forecast page gives the agreed numbers on fixed data (saved in fixtures/, see golden.js): the balance and range for 12 months,
// every income and spending line, and what each jar will hold and when it is full.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { matchesSaved } from "./golden.js";
import { buildDemo } from "../../server/src/seed.js";
import { forecastModel, periodTotal, direction, chartOf, forecastTable, endPoint, shownLines } from "../src/lib/forecast.js";
import { homeModel, flowSteps } from "../src/lib/home.js";
import { recapModel } from "../src/lib/recap.js";

process.on("unhandledRejection", () => {});
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

const near0 = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, msg);
test("the chart keeps every point inside the picture and finds the first month below zero", () => {
  const M = forecastModel(demoState({ jarsBuffer: 0 }), NOW, FX, { h: 12 }), c = chartOf({ ...M.d, eom: endPoint(M.d) }, 12);
  assert.equal(c.line.split(" ").length, 13, "the last day of this month and 12 months, no point for now");
  assert.equal(c.pts[0].k, "e"); near0(c.pts[1].x - c.pts[0].x, c.pts[2].x - c.pts[1].x, "evenly spaced");
  for (const p of c.line.split(" ")) { const [x, y] = p.split(",").map(Number); assert.ok(x >= c.Pl && x <= c.W - c.Pr && y >= c.Pt - 1 && y <= c.Ht - c.Pb + 1); }
  const low = { bal: [100, 50, -20, -90], lo: [100, 0, -60, -150], hi: [100, 100, 20, -30] }, z = chartOf(low, 3);
  assert.equal(z.fn, 2); assert.equal(z.fl, 2); assert.ok(z.zeroY != null);
  const e = chartOf({ ...low, eom: { v: -5, lo: -10, hi: 0 } }, 3); assert.equal(e.fn, "e", "the last day of this month below zero is found too");
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
  const order = ["fcCtl", "fcK", "fcChart", "fcTab", "fcJars", "fcYears"];
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

// Every place shows the same numbers and every total is the sum of its parts: the table, the step-by-step strip, the chart,
// the top cards and Recap's look at next month.
test("the Forecast's table, steps, chart, cards and Recap's next month all agree", () => {
  for (const n of [3, 6, 12]) {
    const S = demoState(), H = homeModel(S, NOW, FX), M = forecastModel(S, NOW, FX, { n }, H), d = M.d, m1 = d.month1, T = forecastTable(d, 12), R = recapModel(H, NOW);
    const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.01, `${n} months, ${msg}: ${a} != ${b}`), sum = (a) => a.reduce((x, y) => x + y, 0);
    // table: totals are the sum of their lines, and its last row is the chart's point
    // (each month's total is rounded once to whole shekels; the year adds up those 12 whole months)
    near(T.i1, Math.round(sum(d.inc.map((r) => r.at(1)))), "money in next month"); near(T.e1, Math.round(sum(d.ex.map((r) => r.at(1)))), "money out next month");
    assert.ok(Math.abs(T.iH - sum(d.inc.map((r) => periodTotal(r, 12)))) <= 6, "money in, next year"); assert.ok(Math.abs(T.eH - sum(d.ex.map((r) => periodTotal(r, 12)))) <= 6, "money out, next year");
    for (const v of [T.i1, T.e1, T.iH, T.eH, T.end1, T.endH, d.really, d.start, m1.incT, m1.outT, m1.end]) assert.ok(Number.isInteger(v), "whole shekels: " + v);
    near(T.saved1, T.i1 - T.e1, "saved = money in - money out, next month"); near(T.savedH, T.iH - T.eH, "saved, next year");
    near(T.end1, d.really + T.saved1, "the table's next month adds up"); near(T.endH, d.really + T.savedH, "the table's year adds up");
    near(T.end1, d.bal[1], "table = chart, next month"); near(T.endH, d.bal[12], "table = chart, in a year");
    near(d.really, m1.really, "the strip starts from the same really yours"); near(d.really, R.end - R.nextBill, "really yours = Recap's end less its card bill");
    for (const k of [1, 3, 6, 12]) near(forecastTable(d, k).endH, d.bal[k], "the table for " + k + " months = the chart's point");
    for (let k = 2; k <= 12; k++) near(d.bal[k] - d.bal[k - 1], forecastTable(d, k).savedH - forecastTable(d, k - 1).savedH, "month " + k + " = its saved");
    assert.equal(d.W.length, n, "exactly " + n + " months"); assert.equal(d.W.at(-1), M.FH.last, "ending with this month");
    // the steps: really yours at the end of this month + money in - money out = the chart's first point
    near(m1.really + m1.incT - m1.outT, d.bal[1], "steps = chart"); near(m1.incT, T.i1, "steps' money in = table");
    near(m1.outT, T.e1, "steps' money out = table");
    // the top cards are the chart's points; next month's own money is the chart's step
    for (const k of [3, 6, 12]) assert.equal(d.bal[k], M.d.bal[k]);
    near(d.net[1], d.bal[1] - d.really, "next month's saved");
    for (let k = 2; k <= 12; k++) near(d.bal[k], d.bal[k - 1] + d.net[k], "month " + k + " = the month before + saved");
    // Recap's look at next month
    near(R.end, m1.endThis, "Recap's end of this month"); near(d.start, R.reallyNow, "now = Recap's really yours"); near(d.bal[0], d.really, "the line starts at the end of this month");
    // the chart's point for the last day of this month is the strip's "31 Oct" tile (and the top card's end of this month)
    const e = endPoint(d), pt = chartOf({ ...d, eom: e }, 12).pts[0];
    near(e.v, m1.really, "the last day of this month = the strip's tile"); near(pt.v, m1.really, "the chart's first point = the strip's tile"); assert.equal(pt.k, "e");
    near(d.lo[0], d.really, "the range starts at the end of this month"); near(d.hi[0], d.really, "the range starts at the end of this month"); near(R.nextBill, m1.cardBill, "Recap's card bill");
  }
});

// One source for the shown numbers (forecastModel's d.shown): Recap's "A look at …" shows exactly the Forecast table's
// "Expected" amounts, its totals and the strip's end, on any day of the month.
test("Recap's look at next month shows exactly the Forecast's numbers", async () => {
  const num = (s) => +String(s).replace(/[^\d]/g, "") * (/[−-]/.test(s) ? -1 : 1);
  for (const at of [NOW, new Date(2026, 9, 3, 12), new Date(2026, 9, 29, 12)]) for (const n of [3, 6, 12]) {
    const S = demoState({}, at), H = homeModel(S, at, FX), M = forecastModel(S, at, FX, { n }, H), d = M.d, sh = d.shown, x = sh.next, T = forecastTable(d, 12);
    const msg = `${at.getDate()}, ${n} months`;
    d.inc.forEach((r, i) => { const y = x.inc.find((z) => z.k == r.k); assert.equal(y ? y.a : 0, sh.inc.rows[i].next >= 1 ? sh.inc.rows[i].next : 0, msg + ": income " + r.k); });
    d.ex.forEach((r, i) => { const y = x.out.find((z) => z.k == r.k); assert.equal(y ? y.a : 0, sh.out.rows[i].next >= 1 ? sh.out.rows[i].next : 0, msg + ": spending " + r.k); });
    assert.equal(x.incT, T.i1, msg); assert.equal(x.outT, T.e1, msg); assert.equal(x.end, d.bal[1], msg); assert.equal(x.really, d.really, msg);
    assert.equal(x.inc.reduce((s, y) => s + y.a, 0), x.incT, msg + ": the incomes add up"); assert.equal(x.out.reduce((s, y) => s + y.a, 0), x.outT, msg + ": the spending adds up");
  }
  // the Recap page itself: every amount in "A look at November" is one of the Forecast's shown amounts
  globalThis.scrollY ??= 0; // Recap reads the scroll position when it renders
  const [Rc] = await Promise.all([vite.ssrLoadModule("/src/views/Recap.vue")]), m = await load(); await m.setLang("en");
  (await vite.ssrLoadModule("/src/core/clock.js")).setNow(NOW); m.data.state.value = structuredClone(demoState());
  m.data.fx.value = { ...m.data.fx.value, fx: FX };
  const app = createSSRApp({ render: () => h(Rc.default) }); app.use(m.i18n);
  const html = await renderToString(app), sec = (html.match(/<section class="rk rr rknext[\s\S]*?<\/section>/) || [""])[0];
  assert.ok(sec, "Recap shows a look at next month");
  const M = forecastModel(demoState(), NOW, FX, {}), x = M.d.shown.next, top = x.out.slice(0, 4).map((y) => y.a);
  const want = [x.really, x.incT, x.outT, x.end, ...x.inc.map((y) => y.a), ...top, ...(x.outT - top.reduce((s, v) => s + v, 0) >= 1 ? [x.outT - top.reduce((s, v) => s + v, 0)] : [])].map(Math.abs);
  const got = [...words(sec).matchAll(/[−-]?₪[\d,]+/g)].map((y) => Math.abs(num(y[0])));
  for (const v of got) assert.ok(want.includes(v), "Recap's ₪" + v + " is one of the Forecast's numbers");
  for (const v of want) assert.ok(got.includes(v), "the Forecast's ₪" + v + " is on Recap");
});

// Days 1–9, when a card bill is still due this month: the end of this month's parts are Home's own whole amounts and add up
// exactly (amounts with agorot, so the rounding shows).
test("the end of this month adds up exactly on days 1–9, with Home's card and bill amounts", () => {
  for (let day = 1; day <= 9; day++) {
    const at = new Date(2026, 9, day, 12), S0 = demoState({}, at), S = { ...S0, tx: S0.tx.map((t) => ({ ...t, a: Math.round(t.a * 101.37) / 100 })) };
    const H = homeModel(S, at, FX), M = forecastModel(S, at, FX, {}, H), e = M.d.eom, F = H.flow, R = recapModel(H, at);
    assert.equal(e.bank - e.cards - e.due - e.usual + e.inc, e.end, day + ": the parts add up");
    assert.equal(e.cards, Math.round(F.cards), day + ": cards = Home's"); assert.equal(e.due, Math.round(F.up.reduce((s, b) => s + b.amt, 0)), day + ": bills = Home's");
    assert.equal(Math.round(R.cash) - R.sure, R.afterSure, day + ": Recap's still to pay adds up");
  }
});

// "How next month is worked out": every amount is rounded once, so a tile and its tip show the same amount and the
// strip adds up exactly with the amounts shown (today, then the rest of this month, then next month's money in and out).
test("the strip's tiles, their tips and the sums all use the same whole amounts", async () => {
  const num = (s) => +String(s).replace(/[^\d]/g, "") * (/[−-]/.test(s) ? -1 : 1);
  for (const at of [NOW, new Date(2026, 9, 3, 12), new Date(2026, 9, 29, 12)]) {
    await load(); (await vite.ssrLoadModule("/src/core/clock.js")).setNow(at);
    const html = await page(demoState({}, at)), tiles = {};
    for (const m of html.matchAll(/<li class="s-(\w+)">([\s\S]*?)<\/li>/g)) {
      const li = m[2], tip = unesc((li.match(/data-tip="([^"]*)"/) || [])[1] || ""), v = words((li.match(/<b class="v">([\s\S]*?)<\/b>/) || [])[1] || ""), subs = [...li.matchAll(/<small[^>]*>([\s\S]*?)<\/small>/g)].map((x) => words(x[1]));
      tiles[m[1]] = { tip, v: num(v), subs };
    }
    const cal = tiles.cal, next = tiles.in || tiles.out, now = tiles.now, end = tiles.end;
    assert.ok(cal && next && now && end, "four tiles");
    // the end of this month: the amount under the tile = the tip's parts after the bank, and today + that = the tile
    const rest = num((cal.subs[0].match(/\(([^)]*)\)/) || ["", "0"])[1]), rows = cal.tip.split("\n").filter((l) => l.includes("\t")).map((l) => num(l.split("\t")[1]));
    assert.equal(rest, rows.slice(1, -1).reduce((x, y) => x + y, 0), `${at.getDate()}: the tile's amount (${cal.subs[0]}) = its tip's amounts`);
    assert.equal(rows[0], now.v, `${at.getDate()}: the tip starts from today's tile`);
    assert.equal(now.v + rest, cal.v, `${at.getDate()}: today + the rest of this month = the end of this month`);
    // next month: money in − money out = the tile, and the end of this month + the tile = where you land
    const [inc, out] = next.subs[0].split(" − ").map(num);
    assert.equal(inc - out, next.v, `${at.getDate()}: money in − money out = next month's tile`);
    assert.equal(cal.v + next.v, end.v, `${at.getDate()}: the strip adds up`);
  }
  (await vite.ssrLoadModule("/src/core/clock.js")).setNow(NOW);
});

// Home's "Current" money flow, Recap's "Your remaining amount" and the Forecast's "Your amount now" are one sum (reallyYours)
test("Home's remaining amount, Recap's and the Forecast's amount now are the same", () => {
  for (const at of [NOW, new Date(2026, 9, 3, 12), new Date(2026, 9, 29, 12)]) {
    const S = demoState({}, at), H = homeModel(S, at, FX), R = recapModel(H, at), M = forecastModel(S, at, FX, {}, H), w = flowSteps(H.flow, "actual");
    const home = w.eOver > 0 ? -w.eOver : w.eFree, F = H.flow, upTot = F.up.reduce((s, b) => s + b.amt, 0);
    assert.equal(home, R.reallyNow, at.getDate() + ": Home = Recap"); assert.equal(M.d.start, R.reallyNow, at.getDate() + ": Forecast = Recap"); assert.equal(M.d.start, home, at.getDate() + ": the Forecast's amount now = Home");
    assert.equal(home, Math.round(F.cash) - Math.round(F.cards) - Math.round(upTot), at.getDate() + ": the shown parts add up");
  }
});

// The first card and the "31 Oct" tile: the same end-of-month number as the chart's first point, its parts add up exactly,
// and the "Today" tile is Home's "In your accounts".
test("the end of this month: card = tile = chart, its parts add up, and today is Home's accounts", async () => {
  const num = (s) => +String(s).replace(/[^\d]/g, "") * (/[−-]/.test(s) ? -1 : 1);
  for (const at of [NOW, new Date(2026, 9, 3, 12), new Date(2026, 9, 29, 12)]) {
    const fx = (await load()).data.fx.value.fx || {}; // the page's own rates, so the page and the model match
    const S = demoState({}, at), H = homeModel(S, at, fx), M = forecastModel(S, at, fx, {}, H), e = M.d.eom, w = flowSteps(H.flow, "actual");
    for (const v of Object.values(e)) assert.ok(Number.isInteger(v), "whole shekels: " + v);
    assert.equal(e.bank - e.cards - e.due - e.usual + e.inc, e.end, at.getDate() + ": the parts add up");
    assert.equal(e.bank - e.cards - e.due, M.d.start, at.getDate() + ": the first three parts are today's really yours");
    assert.equal(e.end, M.d.really, at.getDate() + ": = the end of this month");
    assert.equal(chartOf({ ...M.d, eom: endPoint(M.d) }, 12).pts[0].v, e.end, at.getDate() + ": = the chart's first point");
    assert.equal(e.bank, Math.round(w.start), at.getDate() + ": today = Home's In your accounts");
    (await vite.ssrLoadModule("/src/core/clock.js")).setNow(at);
    const html = await page(S), card = (html.match(/id="fcK"[\s\S]*?<div class="val">([\s\S]*?)<\/div>/) || [])[1] || "";
    const tile = (k) => { const li = (html.match(new RegExp('<li class="s-' + k + '">([\\s\\S]*?)<\\/li>')) || [])[1] || ""; return { v: num(words((li.match(/<b class="v">([\s\S]*?)<\/b>/) || [])[1] || "")), tip: unesc((li.match(/data-tip="([^"]*)"/) || [])[1] || "") }; };
    const cal = tile("cal"), now = tile("now");
    assert.equal(num(words(card)), e.end, at.getDate() + ": the card = the end of this month");
    // the other cards: "▲ ₪X vs end of October" is exactly the card's number less the first card's
    for (const m of html.matchAll(/<div class="val">([\s\S]*?)<\/div>\s*<div class="sm"><span class="bd[^"]*">([\s\S]*?)<\/span>/g)) {
      const v = num(words(m[1])), g = num(words(m[2]).replace("▼", "−"));
      assert.equal(v - e.end, g, at.getDate() + ": the change = the card − the first card");
    } assert.equal(cal.v, e.end, at.getDate() + ": the tile = the card");
    assert.equal(now.v, e.bank, at.getDate() + ": the Today tile = in your accounts");
    // the tip's rows: the bank, then red ones taken off and green ones added; the last row is the total
    const rows = cal.tip.split("\n").filter((l) => l.includes("\t")).map((l) => l.split("\t")[1]), tot = num(rows.pop());
    assert.ok(rows.slice(1).every((r) => /^~~−.*~~$|^\+\+[^−]*\+\+$/.test(r)), "taken off in red, added in green: " + rows);
    assert.equal(rows.map(num).reduce((x, y) => x + y, 0), tot, at.getDate() + ": the tip's rows add up"); assert.equal(tot, e.end);
  }
  (await vite.ssrLoadModule("/src/core/clock.js")).setNow(NOW);
});

// The table "What drives the forecast": in every column (each month, the average, next month, the next 12 months, this month so
// far, still due and usually still to come) the lines shown add up exactly to the total shown, and the totals stay the chart's
// and Saved's numbers. This month, in every line and in the total: so far + still due + usually still to come = the month shown.
test("the forecast table's lines add up exactly to the totals shown, in every column", () => {
  for (const day of [1, 9, 17, 24, 30]) for (const n of [3, 6, 12]) {
    const at = new Date(2026, 9, day, 12), M = forecastModel(demoState({}, at), at, FX, { n }), d = M.d, T = forecastTable(d, M.fc.h), last = d.last;
    for (const [rows, so, up, i1, iH] of [[d.inc, d.inc.map((r) => (d.IR[r.k] || [])[last] || 0), [], T.i1, T.iH], [d.ex, d.ex.map((r) => (M.ER[r.k] || [])[last] || 0), d.ex.map((r) => M.UP[r.k] || 0), T.e1, T.eH]]) {
      const sh = shownLines(rows, d.W.length, M.fc.h, so, up), at0 = `day ${day}, ${n} months`, add = (f) => sh.rows.reduce((s, r) => s + f(r), 0);
      assert.equal(sh.total.next, i1, at0 + ": next month is the table's total"); assert.equal(sh.total.year, iH, at0 + ": the next 12 months are the table's total");
      assert.equal(sh.total.mean, Math.round(rows.reduce((s, r) => s + r.mean, 0)), at0);
      for (const k of ["mean", "next", "year", "so", "up", "lk"]) assert.equal(add((r) => r[k]), sh.total[k], at0 + ": " + k);
      const nv = d.W.length;
      d.W.forEach((_, i) => { assert.equal(sh.total.v[i], Math.round(rows.reduce((s, r) => s + r.v[i], 0)), at0 + ": month " + i + " rounded in one go"); assert.equal(add((r) => r.v[i]), sh.total.v[i], at0 + ": month " + i); });
      for (const x of [sh.total, ...sh.rows]) { assert.equal(x.so + x.up + x.lk, x.v[nv - 1], at0 + ": this month's parts add up"); assert.ok(x.lk >= 0, at0 + ": still to come is never below ₪0"); }
      for (const r of sh.rows) assert.ok([r.mean, r.next, r.year, r.so, r.up, r.lk, ...r.v].every(Number.isInteger), at0 + ": whole shekels");
    }
  }
});

// The forecast looks at real money only: a bill a jar pays still leaves the bank, so one due and not paid yet counts like
// any other unpaid bill (once), and Home, Recap and the Forecast give the same numbers with or without the jar.
test("a bill a jar pays counts like any other unpaid bill", () => {
  const add = (s) => { [7, 8, 9].forEach((m, i) => s.tx.push({ id: 9100 + i, d: `2026-0${m}-10`, desc: "Gym Club", from: "Bank Hapoalim", to: "Gym Club", a: -319, c: "Sport", tags: [], docs: [], note: "" })); return s; };
  for (const at of [new Date(2026, 9, 10, 12), new Date(2026, 9, 12, 12), NOW]) { // due today, then not paid after its day
    const plain = add(demoState({}, at)), withJar = add(demoState({}, at));
    withJar.jars.push({ id: 99, n: "Gym", p: 9, bal: 2000, got: 0, paid: 0, out: 0, cats: [{ c: "Sport" }], bill: "gym club" });
    const run = (S) => { const H = homeModel(S, at, FX), R = recapModel(H, at), M = forecastModel(S, at, FX, {}, H); return { H, R, M }; };
    const a = run(plain), b = run(withJar), msg = String(at.getDate());
    assert.equal(b.H.flow.up.filter((x) => x.n == "Gym Club").length, 1, msg + ": listed once");
    assert.equal(b.H.flow.up.find((x) => x.n == "Gym Club").amt, 319, msg);
    assert.equal(r2(b.R.billsTot), r2(a.R.billsTot), msg + ": still to pay"); assert.equal(b.R.end, a.R.end, msg + ": Recap's end of this month");
    assert.equal(b.H.flow.really, a.H.flow.really, msg + ": Home"); assert.equal(b.R.reallyNow, b.H.flow.really, msg + ": Home = Recap");
    assert.deepEqual(b.M.d.eom, a.M.d.eom, msg + ": the end of this month"); assert.deepEqual(b.M.d.bal, a.M.d.bal, msg + ": every later point");
  }
});
