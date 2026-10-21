// The Alerts page gives the agreed alerts, words and markup on each state below (saved in fixtures/, see golden.js):
// lib/alerts.js, lib/alerttext.js and views/Alerts.vue run on the data and their results are compared with the saved ones.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { matchesSaved } from "./golden.js";
import { buildDemo } from "../../server/src/seed.js";
import { homeModel } from "../src/lib/home.js";
import { alertsModel } from "../src/lib/alerts.js";
import { budgetsModel } from "../src/lib/budgets.js";
import { alertTexts, reverseTable, reverseText } from "../src/lib/alerttext.js";
import en from "../src/locales/en.json" with { type: "json" };

process.on("unhandledRejection", () => {});
const vite = await createServer({ root: new URL("..", import.meta.url).pathname, server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "silent", cacheDir: "/tmp/vite-cache-alerts" });
after(() => vite.close());
globalThis.document = { documentElement: { lang: "", classList: { toggle() {} } }, addEventListener() {}, removeEventListener() {} };
let mods = null;
const NOW = new Date(2026, 9, 17, 12);
const FX = { USD: 3.62 };

// ---- the data ----
const CFG = { jars: 1, bills: 1, price: 1, budget: 1, card: 1, large: 1, xfer: 1, recon: 1, pending: 1, sync: 1, uncat: 1, forecast: 1, docs: 1, cardPct: 10, largeAmt: 5000, billDays: 3, budgetPct: 80, gapDays: 3 };
function demoState(o = {}) {
  const d = buildDemo(NOW); let id = 1;
  const tx = d.rows.map((r) => ({ id: id++, d: r.d, desc: r.desc, from: r.from, to: r.to, a: r.a, ...(r.orig ? { orig: r.orig } : {}), c: r.c || "", tags: r.tags || [], docs: [], note: "", ...(r.pending ? { pending: true } : {}), src: "demo" }));
  const cats = {}; let ci = 0; for (const c of new Set(tx.map((t) => t.c).concat(Object.keys(d.budgets)))) if (c) cats[c] = c === "Income" ? 99 : ci++ % 7;
  const acc = [["Bank Hapoalim", "ILS", "bank", "hapoalim", "Current account", true], ["Max", "ILS", "card", "max", "Credit card", false], ["Isracard", "ILS", "card", "isracard", "Credit card", false], ["Wise", "USD", "wallet", "wise", "USD balance", true], ["Pension", "ILS", "pension", "", "Pension", false]];
  return { v: 4, rev: 1, cats, rules: [], tagRules: [], tx, budgets: d.budgets, bills: [], ignoredBills: [], jars: d.jars.map((j, i) => ({ id: i + 1, got: 0, paid: 0, out: 0, cats: [], ...j })), audit: [], xf: [], dismissed: {}, dupOk: {}, adj: {}, jarsBuffer: 1500, ccOverride: {}, txIgnore: {}, budgetNo: [], hiddenMerchants: [], cardRules: [], salaryRules: [],
    cfg: { ...CFG }, currencies: ["ILS", "USD"], accounts: acc.map(([n, cur, kind, src, s, inNW], i) => ({ id: i + 1, n, cur, kind, src, s, manual: kind === "pension", inNW, v: d.balances[n] ?? 0, at: NOW.toISOString(), sort: i })),
    nwSnaps: d.snaps, gaps: [], balUpdates: [], connected: {}, locked: {}, connStatus: {}, ...o };
}
// A state with many kinds of alerts at once: a stopped bill, a price change, a big payment, a jar that ran out, a failed bank, balance gaps.
function busy() {
  const S = demoState({ budgets: { Groceries: 300, "Eating out": 100, Transport: 80 }, dismissed: { zzz: 1 } });
  let id = 90000; const add = (o) => S.tx.push({ id: id++, c: "", tags: [], docs: [], note: "", from: "Bank Hapoalim", to: "X", desc: "X", a: -1, d: "2026-10-12", ...o });
  add({ d: "2026-10-14", to: "Big furniture", desc: "Big furniture", a: -7400, c: "Shopping & home" });
  add({ d: "2026-10-15", to: "Mystery shop", desc: "Mystery shop", a: -88 });
  add({ d: "2026-10-16", from: "Work", to: "Bank Hapoalim", desc: "Bonus", a: 12000, c: "Income" });
  add({ d: "2026-10-16", to: "Cafe", desc: "Cafe", a: -45, pending: true, from: "Max", c: "Eating out" });
  add({ d: "2026-10-12", to: "Twin", desc: "Twin", a: -33, c: "Eating out" }); add({ d: "2026-10-12", to: "Twin", desc: "Twin", a: -33, c: "Eating out" });
  S.tx = S.tx.filter((t) => !/netflix/i.test(t.desc) || t.d < "2026-08-01");
  S.gaps = [];
  return S;
}
const newAlerts = (S) => { const M = homeModel(structuredClone(S), NOW, FX); return alertsModel(structuredClone(S), { ...M, budgets: budgetsModel(structuredClone(S), NOW).info }, NOW, {}, (e) => e); };
const STATES = [["the made-up demo data", "demo", demoState()], ["many kinds of alerts at once", "busy", busy()], ["everything turned off", "off", demoState({ cfg: Object.fromEntries(Object.keys(CFG).map((k) => [k, 0])) })], ["every alert dismissed", "dismissed", (() => { const S = busy(); S.dismissed = Object.fromEntries(newAlerts(S).map((a) => [a.id, 1])); return S; })()]];

// ---- the new side ----
async function load() {
  if (mods) return mods;
  const [Alerts, store, i18nMod, dates, cn] = await Promise.all(["/src/views/Alerts.vue", "/src/stores/data.js", "/src/i18n.js", "/src/dates.js", "/src/catnames.js"].map((p) => vite.ssrLoadModule(p)));
  (await vite.ssrLoadModule("/src/core/clock.js")).setNow(NOW); // the page works out its numbers for a fixed day
  return (mods = { Alerts: Alerts.default, data: store.data, i18n: i18nMod.i18n, setLang: i18nMod.setLang, dstr: dates.dstr, categoryName: cn.categoryName });
}
async function ctxOf(lang) {
  const m = await load(); m.setLang(lang);
  const t = (k, p) => m.i18n.global.t(k, p || {}), loc = lang === "he" ? "he-IL" : "en-GB";
  return { t, catName: (c) => (!c || c === "Uncategorized" ? t("home.uncategorizedCat") : m.categoryName(c, lang)), an: (n) => m.categoryName(n, lang), dstr: m.dstr, monthYear: (mm) => new Date(+mm.slice(0, 4), +mm.slice(5, 7) - 1, 1).toLocaleDateString(loc, { month: "short", year: "numeric" }), m };
}

for (const [name, key, S] of STATES) {
  test(`the alerts, their order and their English words: ${name}`, async () => {
    const c = await ctxOf("en"), n = newAlerts(S).map((x) => { const [title, text] = alertTexts(x, c); return { id: x.id, sev: x.sev, go: x.go, title, text, attach: x.attach, ids: x.ids, tab: x.tab }; });
    // the list of duplicates behind "N possible duplicates" is not shown (only the count), so it is left out
    const noDup = (L) => L.map((x) => (x.id.startsWith("dp-") ? { ...x, ids: undefined } : x));
    matchesSaved(`alerts#list-${key}`, noDup(JSON.parse(JSON.stringify(n))));
  });
}
test("the busy state really has many kinds of alerts", () => {
  const k = new Set(newAlerts(STATES[1][2]).map((x) => x.key));
  for (const w of ["large", "uncat", "pending", "dup"]) assert.ok(k.has(w), "missing " + w);
  assert.ok(k.size >= 7, "only " + [...k].join(", "));
});

// ---- the page ----
async function page(S, lang = "en") {
  const c = await ctxOf(lang), m = c.m; m.data.state.value = structuredClone(S);
  const app = createSSRApp({ render: () => h(m.Alerts) }); app.use(m.i18n);
  const html = await renderToString(app), i = html.indexOf("<section");
  return html.slice(i, html.indexOf("</section>") + 10).replace(/<!--[\s\S]*?-->/g, "");
}
const unesc = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const text = (html) => unesc(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
const skeleton = (html) => [...html.matchAll(/<([a-z0-9]+)([^>]*)>/g)].map(([, tag, at]) => {
  const g = (n) => (new RegExp(`(?:^|\\s)${n}="([^"]*)"`).exec(at) || [])[1];
  return [tag, (g("class") || "").split(/\s+/).filter((c) => c && c !== "on").sort().join("."), g("data-a") || "", g("data-id") ?? g("data-t") ?? "", g("id") || ""].join("|");
});
for (const [name, key, S] of STATES) {
  test(`the English page has the agreed blocks and words: ${name}`, async () => {
    const b = await page(S, "en");
    matchesSaved(`alerts#page-${key}`, { blocks: skeleton(b).filter((s) => !s.endsWith("|alHist")), text: text(b) });
  });
}
test("the Hebrew page shows no English words from the app (only names from the data)", async () => {
  const S = busy(), b = await page(S, "he"), names = new Set(S.tx.flatMap((t) => String(t.to + " " + t.desc + " " + t.from + " " + t.c).toLowerCase().split(/[^a-z]+/)).concat(S.accounts.flatMap((a) => a.n.toLowerCase().split(/[^a-z]+/))).concat(Object.keys(S.budgets).flatMap((k) => k.toLowerCase().split(/[^a-z]+/))).concat(S.jars.flatMap((j) => String(j.n).toLowerCase().split(/[^a-z]+/))).concat(["otp"]));
  const left = (text(b).match(/[A-Za-z]{2,}/g) || []).filter((w) => !names.has(w.toLowerCase()));
  assert.deepEqual(left, [], "English left on the Hebrew page: " + left.join(", "));
});
test("an empty page says all is clear, in both languages", async () => {
  const S = STATES[2][2];
  assert.match(text(await page(S, "en")), /All clear\. Nothing needs your attention\./);
  assert.match(text(await page(S, "he")), /הכול תקין/);
});

// ---- the history keeps English sentences; in Hebrew they are written again from the same words ----
test("an English history sentence is written again in Hebrew, the same as the live alert in Hebrew", async () => {
  const E = await ctxOf("en"), table = reverseTable(en), alerts = newAlerts(STATES[1][2]), seen = [];
  const eng = alerts.map((x) => alertTexts(x, E)); // the English first: the language is switched to Hebrew after that
  const H = await ctxOf("he");
  for (const [i, x] of alerts.entries()) {
    const [et, ex] = eng[i];
    const [ht, hx] = alertTexts(x, H);
    const fix = { catName: H.catName, an: H.an, monthYear: (d) => d.toLocaleDateString("he-IL", { month: "short", year: "numeric" }) };
    const rt = reverseText(table, H.t, et, fix), rx = reverseText(table, H.t, ex, fix);
    seen.push(x.key);
    if (x.key === "price") { assert.equal(rt?.text, ht); continue; }
    assert.equal(rt?.text, ht, "title of " + x.key); assert.equal(rx?.text, hx, "text of " + x.key);
  }
  assert.ok(seen.length >= 7);
});
