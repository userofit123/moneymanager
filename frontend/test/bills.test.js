// The Bills page gives the same bills, numbers, words and markup as the current app, on the same data.
// The old code (web/js) and the new code (lib/bills.js and views/Bills.vue) both run on each state below and their results are compared.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { oldApp } from "./old-app.js";
import { buildDemo } from "../../server/src/seed.js";
import { billState, billsModel, withDetected, addBill, flagBill, cancelBill, restoreBill, deleteBill, setBillType, sugYes, sugNo, payHistory, whyText, evTipText, makeDstr, cadenceOf } from "../src/lib/bills.js";

process.on("unhandledRejection", () => {});
// The page is drawn on the server with the real Vue file (Vite), so no browser is needed.
const vite = await createServer({ root: new URL("..", import.meta.url).pathname, server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "silent" });
// the page loads the Hebrew dictionary (core/heText.js) when the language turns Hebrew: let it finish before the server closes
after(async () => { await vite.ssrLoadModule("/src/core/he-legacy.js"); await new Promise((r) => setTimeout(r, 200)); await vite.close(); });
globalThis.document = { documentElement: { lang: "", classList: { toggle() {} } } };
let mods = null;
const NOW = new Date(2026, 9, 17, 12), old = oldApp(NOW); // 17 Oct 2026
const TODAY = "2026-10-17";

// ---- the data ----
let nid = 1;
const T = (d, to, a, o = {}) => ({ id: nid++, d, desc: to, from: "Bank", to, a, c: o.c ?? "Subscriptions", tags: [], docs: [], note: "", ...o });
const monthly = (to, day, from, n, a, o) => Array.from({ length: n }, (_, i) => { const d = new Date(2026, from + i, day); return T(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`, to, -(typeof a == "function" ? a(i) : a), o); });
function fixture(over = {}) {
  nid = 1;
  const tx = [
    ...monthly("Netflix", 5, 7, 3, 49.9),                       // found by itself, paid
    ...monthly("Spotify", 10, 5, 4, 31.5),                      // found by itself, the October charge is missing: overdue
    ...monthly("Gym", 12, 6, 4, (i) => [200, 200, 230, 250][i]), // saved by the user, price creeps up
    ...monthly("Cellcom", 14, 8, 2, (i) => [120, 140][i]),      // saved, price changed once
    ...monthly("Arnona", 16, 8, 1, 800),                        // saved, due now
    T("2026-03-20", "Insurance", -3600),                          // saved, every year
    T("2026-02-02", "Electric", -300), T("2026-04-20", "Electric", -350), T("2026-07-30", "Electric", -280), T("2026-09-25", "Electric", -420), // irregular
    ...monthly("Water bill", 1, 6, 4, 90),                      // saved as irregular but looks regular
    T("2026-09-02", "Dentist", -800, { c: "Health" }),            // marked as a one-off bill
    ...monthly("OldGym", 3, 6, 3, 150),                         // canceled
    ...monthly("Hot", 8, 7, 3, 99),                             // marked to cancel
    T("2026-08-02", "Sofa shop", -500, { inst: [1, 10], c: "Home" }), T("2026-09-02", "Sofa shop", -500, { inst: [2, 10], c: "Home" }), T("2026-10-02", "Sofa shop", -500, { inst: [3, 10], c: "Home" }),
    T("2026-10-09", "Laptop store תשלום 4/12", -300, { c: "Home" }),
    ...monthly("Hbo", 5, 0, 3, 40),                             // found, then stopped long ago
    ...monthly("Kiosk", 9, 7, 3, 12),                           // the user removed it for good
    T("2026-10-30", "Netflix", -49.9),                            // later this month: not counted yet
    T("2026-10-01", "Salary", 9000, { from: "Work", to: "Bank", c: "Income" }),
  ];
  const id = (to, d) => tx.find((t) => t.to === to && t.d === d).id;
  return {
    v: 4, rev: 1, cats: { Subscriptions: 2, Health: 3, Home: 4, Income: 99 }, rules: [], tagRules: [], tx, budgets: {}, jars: [], audit: [], xf: [], dismissed: {}, dupOk: {}, adj: {}, jarsBuffer: 0, ccOverride: {}, txIgnore: {}, budgetNo: [], hiddenMerchants: [], cardRules: [], salaryRules: [],
    cfg: { bills: 1, price: 1, billDays: 3, budgetPct: 80, gapDays: 3 }, currencies: ["ILS"], gaps: [], balUpdates: [], connected: {}, locked: {}, connStatus: {}, nwSnaps: [],
    accounts: [{ id: 1, n: "Bank", kind: "bank", v: 5000, cur: "ILS", inNW: true, at: "x" }, { id: 2, n: "Max", kind: "card", src: "max", v: 0, cur: "ILS", tail: "1234" }],
    ignoredBills: ["kiosk"],
    bills: [
      { n: "Gym", every: 1, anchor: 10, dom: 12, src: "Bank", match: "gym", cat: "Health", manual: true, mode: "rule", rec: "recurring", amt: 250, lastPaid: "2026-10-12" },
      { n: "Cellcom", every: 1, anchor: 10, dom: 14, src: "Max", match: "cellcom", cat: "Subscriptions", manual: true, mode: "rule", rec: "recurring", amt: 140 },
      { n: "Arnona", every: 1, anchor: 9, dom: 16, src: "Bank", match: "arnona", cat: "Home", manual: true, mode: "rule", rec: "recurring", amt: 800 },
      { n: "Insurance", every: 12, anchor: 3, dom: 20, src: "Bank", match: "insurance", cat: "Subscriptions", manual: true, mode: "rule", rec: "recurring", amt: 3600 },
      { n: "Electric", src: "Bank", match: "electric", cat: "Home", manual: true, mode: "rule", rec: "irregular", amt: 300 },
      { n: "Water bill", src: "Bank", match: "water bill", cat: "Home", manual: true, mode: "rule", rec: "irregular", amt: 90 },
      { n: "Dentist", mode: "once", ids: [id("Dentist", "2026-09-02")], amt: 800, src: "Bank", cat: "Health", match: "#" + id("Dentist", "2026-09-02"), manual: true, every: 0 },
      { n: "OldGym", every: 1, anchor: 8, dom: 3, src: "Bank", match: "oldgym", cat: "Subscriptions", manual: true, mode: "rule", rec: "recurring", flag: "canceled", canceledAt: "2026-09-04", amt: 150 },
      { n: "Hot", every: 1, anchor: 9, dom: 8, src: "Bank", match: "hot", cat: "Subscriptions", manual: false, mode: "rule", rec: "recurring", flag: "cancel", amt: 99 },
      { n: "Noone yet", every: 1, anchor: 10, dom: 20, src: "Max ·· 9876", match: "noone", cat: "Subscriptions", manual: true, mode: "rule", rec: "recurring", amt: 55, lastPaid: "2026-09-20" },
    ],
    ...over,
  };
}
function demo() {
  const d = buildDemo(NOW); let id = 1;
  const tx = d.rows.map((r) => ({ id: id++, d: r.d, desc: r.desc, from: r.from, to: r.to, a: r.a, ...(r.orig ? { orig: r.orig } : {}), c: r.c || "", tags: r.tags || [], docs: [], note: "", ...(r.pending ? { pending: true } : {}), src: "demo" }));
  const cats = {}; let ci = 0; for (const c of new Set(tx.map((t) => t.c).concat(Object.keys(d.budgets)))) if (c) cats[c] = c === "Income" ? 99 : ci++ % 7;
  const acc = [["Bank Hapoalim", "ILS", "bank", "hapoalim", "Current account", true], ["Max", "ILS", "card", "max", "Credit card", false], ["Isracard", "ILS", "card", "isracard", "Credit card", false], ["Wise", "USD", "wallet", "wise", "USD balance", true]];
  return { v: 4, rev: 1, cats, rules: [], tagRules: [], tx, budgets: d.budgets, bills: [], ignoredBills: [], jars: [], audit: [], xf: [], dismissed: {}, dupOk: {}, adj: {}, jarsBuffer: 0, ccOverride: {}, txIgnore: {}, budgetNo: [], hiddenMerchants: [], cardRules: [], salaryRules: [],
    cfg: { bills: 1, price: 1, billDays: 3, budgetPct: 80, gapDays: 3 }, currencies: ["ILS", "USD"], accounts: acc.map(([n, cur, kind, src, s, inNW], i) => ({ id: i + 1, n, cur, kind, src, s, inNW, v: d.balances[n] ?? 0, at: NOW.toISOString(), sort: i })), nwSnaps: [], gaps: [], balUpdates: [], connected: {}, locked: {}, connStatus: {} };
}
const STATES = [["a mix of every kind of bill", fixture()], ["the made-up demo data", demo()], ["no bills at all", { ...fixture(), tx: [], bills: [], ignoredBills: [] }]];

// ---- the old code, run on the same data ----
const prep = `acReset();S={...emptyState(),...structuredClone(__S)};S.cfg={...DEF_CFG,...S.cfg};detect();derive();detectBills();acReset();BC=billsInfo(true);`;
const oldAll = (S) => JSON.parse(old.run(prep + "JSON.stringify(BC)", { __S: S }));
const oldHtml = (S) => old.run(prep + `(function(){const OUT={};const $=id=>({set innerHTML(v){OUT[id]=v}});eval("("+renderBills.toString()+")")();return OUT})()`, { __S: S });
const oldWhy = (S) => JSON.parse(old.run(prep + `JSON.stringify(billsInfo().map(b=>[b.idx,whyBill(b)]))`, { __S: S }));
const plain = (x) => JSON.parse(JSON.stringify(x));

for (const [name, S] of STATES) {
  test(`every bill's state matches the current app: ${name}`, () => {
    const o = oldAll(S), n = plain(billState(structuredClone(S), NOW).all);
    assert.equal(n.length, o.length);
    o.forEach((b, i) => assert.deepEqual(n[i], b, "bill " + b.n));
  });
  test(`the three numbers, the groups and the instalments match the current app: ${name}`, () => {
    const o = JSON.parse(old.run(prep + `(function(){const bs=billsInfo(),rec=bs.filter(b=>!b.irregular&&!b.once),irr=bs.filter(b=>b.irregular),one=bs.filter(b=>b.once).sort((x,y)=>(y.lp||"").localeCompare(x.lp||"")),mo=bs.reduce((s,b)=>s+b.mo,0),soon=rec.filter(b=>b.days<=14),soonT=soon.reduce((s,b)=>s+b.pred,0),ch=rec.filter(b=>b.fresh&&!b.vari&&Math.abs(b.amt-b.was)>b.was*.001);
      rec.sort((a,b)=>(a.status=="overdue"?-1e4:0)+a.days-((b.status=="overdue"?-1e4:0)+b.days));
      return JSON.stringify({rec:rec.map(b=>b.idx),irr:irr.map(b=>b.idx),one:one.map(b=>b.idx),mo,soonT,soon:soon.length,ch:ch.length,chT:ch.reduce((s,b)=>s+(b.amt-b.was)*12/b.every,0),inst:instSeries().map(x=>[x.name,x.paid,x.total,x.left,x.amt,x.remain,x.last.id]),canceled:billsInfo(true).filter(b=>b.flag=="canceled").map(b=>b.idx)})})()`, { __S: S }));
    const M = billsModel(structuredClone(S), NOW);
    assert.deepEqual(M.rec.map((b) => b.idx), o.rec); assert.deepEqual(M.irr.map((b) => b.idx), o.irr); assert.deepEqual(M.one.map((b) => b.idx), o.one);
    assert.equal(M.mo, o.mo); assert.equal(M.soonT, o.soonT); assert.equal(M.soon.length, o.soon); assert.equal(M.ch.length, o.ch); assert.equal(M.chT, o.chT);
    assert.deepEqual(M.inst.map((x) => [x.name, x.paid, x.total, x.left, x.amt, x.remain, x.last.id]), o.inst);
    assert.deepEqual(M.canceled.map((b) => b.idx), o.canceled);
  });
}

test("the fixture really covers every kind of bill", () => {
  const M = billsModel(fixture(), NOW), by = (n) => M.all.find((b) => b.n === n);
  assert.equal(by("Netflix").status, "paid"); assert.equal(by("Spotify").status, "overdue"); assert.equal(by("Arnona").status, "pending");
  assert.equal(by("Cellcom").fresh && !by("Cellcom").vari, true); assert.equal(by("Gym").vari, true);
  assert.equal(by("Electric").irregular, true); assert.equal(by("Water bill").sug, 1); assert.equal(by("Dentist").once, true);
  assert.equal(by("Hbo").ended, true); assert.ok(!M.all.some((b) => /kiosk/i.test(b.n)), "a removed bill stays removed");
  assert.equal(M.found.length, 4); assert.ok(M.inst.length >= 2); assert.equal(M.canceled.length, 1);
});

// ---- the words ----
test("'Why is this a bill?' reads the same as the current app", async () => {
  const { t } = await i18n("en"), S = fixture(), st = billState(S, NOW);
  const o = Object.fromEntries(oldWhy(S));
  for (const b of st.info(false)) assert.equal(whyText(b, t), o[b.idx], b.n);
});

// ---- the page, drawn like the current app ----
async function load() {
  if (mods) return mods;
  const [Bills, store, i18nMod, bills] = await Promise.all(["/src/views/Bills.vue", "/src/stores/data.js", "/src/i18n.js", "/src/lib/bills.js"].map((p) => vite.ssrLoadModule(p)));
  (await vite.ssrLoadModule("/src/core/clock.js")).setNow(NOW); // the page works out its numbers for the same day as the old app
  return (mods = { Bills: Bills.default, data: store.data, i18n: i18nMod.i18n, setLang: i18nMod.setLang });
}
async function i18n(lang) { const m = await load(); m.setLang(lang); return { t: (k, v, n) => (n == null ? m.i18n.global.t(k, v || {}) : m.i18n.global.t(k, v || {}, n)), ...m }; }
async function page(S, lang = "en") {
  const m = await load(); m.setLang(lang); m.data.state.value = structuredClone(S);
  const app = createSSRApp({ render: () => h(m.Bills) }); app.use(m.i18n);
  const html = await renderToString(app), i = html.indexOf("<section");
  return html.slice(i).replace(/<!--[\s\S]*?-->/g, "");
}
const unesc = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const text = (html) => unesc(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
// Every tag with its classes and its data-a / data-i / id, in order: the same blocks in the same order.
const skeleton = (html) => [...html.matchAll(/<([a-z0-9]+)([^>]*)>/g)].map(([, tag, at]) => {
  const g = (n) => (new RegExp(`(?:^|\\s)${n}="([^"]*)"`).exec(at) || [])[1];
  return [tag, (g("class") || "").split(/\s+/).filter((c) => c && c !== "on").sort().join("."), g("data-a") || "", g("data-i") ?? g("data-id") ?? "", g("id") || ""].join("|");
});
// The " · " dots in the templates are drawn as <span class="dt">·</span> inside a plain <span> around the text (vite-dots.js); the old app
// adds them on the page, not in its HTML strings, so both are left out of the comparison.
const noDots = (L) => L.filter((x, i) => x !== "span|dt|||" && !(x === "span||||" && L[i + 1] === "span|dt|||"));
const tips = (html) => [...html.matchAll(/data-tip="([^"]*)"/g)].map((m) => unesc(m[1]));
const oldPage = (S) => { const o = oldHtml(S); return `<section class="view on" id="bills"><div class="grid g3" id="billK">${o.billK}</div><div class="billbar"><button class="btn o s" data-a="billNew">+ Add bill</button></div><div id="billL">${o.billL}</div><div id="billCw">${o.billCw || ""}</div></section>`; };

for (const [name, S] of STATES) {
  test(`the English page has the same blocks, words and tips as the current app: ${name}`, async () => {
    const a = oldPage(S), b = await page(S, "en");
    assert.deepEqual(noDots(skeleton(b)), noDots(skeleton(a)));
    assert.equal(text(b), text(a));
    assert.deepEqual(tips(b), tips(a));
  });
}

test("the Hebrew page shows no English words from the app (only names from the data)", async () => {
  const S = fixture(), b = await page(S, "he"), names = new Set(S.tx.flatMap((t) => String(t.to + " " + t.desc + " " + t.from).toLowerCase().split(/[^a-z]+/)).concat(S.bills.flatMap((x) => (x.n + " " + x.src).toLowerCase().split(/[^a-z]+/))));
  const left = (text(b).match(/[A-Za-z]{2,}/g) || []).filter((w) => !names.has(w.toLowerCase()));
  assert.deepEqual(left, [], "English left on the Hebrew page: " + left.join(", "));
  assert.match(b, /בעוד|באיחור/);
});
test("an empty page says how to get a bill, in both languages", async () => {
  const S = STATES[2][1];
  assert.match(text(await page(S, "en")), /You have no bills yet/);
  assert.match(text(await page(S, "he")), /עדיין אין לכם תשלומים קבועים/);
});

// ---- the changes ----
test("bills the app found are saved on the first change, with the same history lines", () => {
  const { next, lines } = withDetected(fixture(), NOW), before = fixture().bills.length;
  assert.equal(next.bills.length, before + 4);
  assert.ok(lines.every(([a, d, who]) => a === "Bill detected" && who === "System" && /about ₪/.test(d)));
  assert.ok(lines.some(([, d]) => /^Netflix · monthly · about ₪50$/.test(d)));
  assert.equal(withDetected(next, NOW).lines.length, 0, "nothing new the second time");
});
test("add, mark to cancel, cancel, restore and remove do what the current app does", () => {
  const S = withDetected(fixture(), NOW).next, n0 = S.bills.length;
  assert.deepEqual(addBill(S, { n: "Pool", amt: "120", every: "1", dom: 40, src: "Bank", match: "" }, NOW), [["Added bill", "Pool · ₪120"]]);
  const p = S.bills.at(-1); assert.deepEqual([p.match, p.every, p.dom, p.anchor, p.rec, p.manual, p.lastPaid, p.cat], ["pool", 1, 28, 10, "recurring", true, TODAY, "Subscriptions"]);
  assert.deepEqual(addBill(S, { n: "Taxi club", amt: "30", every: "0", dom: 1, src: "Bank", match: "Taxi" }, NOW), [["Added bill", "Taxi club · ₪30 · irregular"]]);
  assert.deepEqual([S.bills.at(-1).rec, S.bills.at(-1).every, S.bills.at(-1).match], ["irregular", undefined, "taxi"]);
  assert.equal(addBill(S, { n: "", amt: 5 }, NOW), false); assert.equal(addBill(S, { n: "x", amt: 0 }, NOW), false);
  S.ignoredBills.push("pool2"); addBill(S, { n: "Pool2", amt: 1, every: "2", dom: 1, src: "Bank" }, NOW); assert.ok(!S.ignoredBills.includes("pool2"));
  const i = S.bills.findIndex((b) => b.n === "Gym");
  assert.deepEqual(flagBill(S, i), [["Marked to cancel", "Gym"]]); assert.equal(S.bills[i].flag, "cancel");
  assert.deepEqual(flagBill(S, i), [["Kept bill", "Gym"]]); assert.equal(S.bills[i].flag, "");
  assert.deepEqual(cancelBill(S, i, TODAY), [["Marked bill as canceled", "Gym"]]); assert.deepEqual([S.bills[i].flag, S.bills[i].canceledAt], ["canceled", TODAY]);
  assert.deepEqual(restoreBill(S, i), [["Restored bill", "Gym"]]); assert.deepEqual([S.bills[i].flag, S.bills[i].canceledAt], ["", undefined]);
  const w = S.bills[i].match;
  assert.deepEqual(deleteBill(S, i), [["Removed bill", "Gym · it will not be detected again"]]);
  assert.ok(S.ignoredBills.includes(w)); assert.equal(S.bills.some((b) => b.n === "Gym"), false);
  assert.ok(S.bills.length >= n0);
});
test("change type and 'make it regular' work out the day and month from the last payment", () => {
  const S = withDetected(fixture(), NOW).next, st = billState(S, NOW), i = S.bills.findIndex((b) => b.n === "Water bill"), tx = st.billTx(S.bills[i]);
  assert.deepEqual(sugYes(S, i, 1, tx, NOW), [["Bill became regular", "Water bill → monthly"]]);
  assert.deepEqual([S.bills[i].rec, S.bills[i].every, S.bills[i].anchor, S.bills[i].dom, S.bills[i].sugNo], ["recurring", 1, 10, 1, undefined]);
  assert.deepEqual(setBillType(S, i, "12", tx, NOW), [["Changed bill type", "Water bill → every 12 months"]]);
  assert.deepEqual(setBillType(S, i, "irregular", tx, NOW), [["Changed bill type", "Water bill → irregular"]]);
  assert.deepEqual([S.bills[i].rec, S.bills[i].every, S.bills[i].anchor, S.bills[i].dom], ["irregular", undefined, undefined, undefined]);
  assert.deepEqual(setBillType(S, i, "1", tx, NOW), [["Changed bill type", "Water bill → every 1 month"]]);
  const e = S.bills.findIndex((b) => b.n === "Electric"); sugNo(S, e, st.billTx(S.bills[e])); assert.equal(S.bills[e].sugNo, 4);
  assert.equal(billState(S, NOW).all.find((b) => b.n === "Electric").sug, 0);
});
test("a saved change shows up in the numbers (cancel takes a bill out of the total)", () => {
  const S = withDetected(fixture(), NOW).next, before = billsModel(S, NOW), g = S.bills.findIndex((b) => b.n === "Gym"), gm = before.all.find((b) => b.n === "Gym").mo;
  cancelBill(S, g, TODAY);
  const after = billsModel(S, NOW);
  assert.ok(Math.abs(before.mo - after.mo - gm) < 1e-9); assert.equal(after.canceled.length, 2);
});
test("payment history: newest first, with the change from the one before", () => {
  const S = fixture(), st = billState(S, NOW), g = st.bills.find((b) => b.n === "Cellcom"), h = payHistory(st.billTx(g));
  assert.deepEqual(h.rows.map((r) => [r.t.d, r.diff]), [["2026-10-14", 20], ["2026-09-14", 0]]);
  assert.equal(h.tot, 260); assert.equal(h.mn, 120); assert.equal(h.mx, 140); assert.equal(payHistory([]), null);
  assert.deepEqual(h.bars, [], "the little chart needs more than two payments");
  const e = payHistory(st.billTx(st.bills.find((b) => b.n === "Electric")));
  assert.equal(e.bars.length, 4); assert.deepEqual(e.bars.map((t) => t.d), ["2026-02-02", "2026-04-20", "2026-07-30", "2026-09-25"]);
});
test("dates follow the choice in Settings", () => { assert.equal(makeDstr("dmy")("2026-10-05"), "05/10/2026"); assert.equal(makeDstr("mdy")("2026-10-05"), "10/05/2026"); assert.equal(makeDstr()(new Date(2026, 9, 5)), "05/10/2026"); });
test("the rhythm finder needs a steady gap and a steady amount", () => {
  const L = (ds, a) => ds.map((d, i) => ({ d, a: -(a[i] ?? a[0]) }));
  assert.equal(cadenceOf(L(["2026-01-05", "2026-02-05"], [10])), null, "two monthly payments are not enough");
  assert.equal(cadenceOf(L(["2026-01-05", "2026-02-05", "2026-03-05"], [10])).every, 1);
  assert.equal(cadenceOf(L(["2026-01-05", "2026-02-05", "2026-03-05"], [10, 10, 20])), null, "the amount jumps");
  assert.equal(cadenceOf(L(["2025-03-01", "2026-03-02"], [100])).every, 12);
});
