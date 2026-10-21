// The Reports page says the same things as the current app on the same data: every card's words, numbers and labels,
// drawn with the real Vue file and compared with what the old code (web/js reps, renderNW, renderCmp) writes into its page.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { oldApp } from "./old-app.js";
import { buildDemo } from "../../server/src/seed.js";

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
const IDS = ["nwc", "cmp", "merch", "donutRep", "catCmp", "donutTag", "tagCmp"];

// What the current app writes into each block of its Reports page.
const oldBlocks = (S, ctl = {}) => old.run(`localStorage.setItem("moneyFc","{}");S={...emptyState(),...structuredClone(__S)};S.cfg={...DEF_CFG,...S.cfg};fx={ILS:1,...__FX};fxSrc="live";detect();derive();detectBills();BC=billsInfo();Object.assign(RNG,__C.RNG||{});Object.assign(CMP,__C.CMP||{});(()=>{
  const P=new Proxy(function(){},{get:(t,k)=>k===Symbol.toPrimitive?()=>"":k==="length"?0:P,apply:()=>P,set:()=>true}),cap={};
  document={getElementById:id=>cap[id]||(cap[id]=new Proxy({innerHTML:"",textContent:"",style:{},dataset:{},className:"",classList:{add(){},remove(){},toggle(){}},clientWidth:900,clientHeight:250,querySelector:()=>P,querySelectorAll:()=>[]},{get:(t,k)=>k in t?t[k]:P,set:(t,k,v)=>{t[k]=v;return true}})),querySelector:()=>null,querySelectorAll:()=>[],documentElement:{classList:{contains:()=>false}}};
  reps();return Object.fromEntries(${JSON.stringify(IDS)}.map(k=>[k,cap[k]?cap[k].innerHTML:""]))})()`, { __S: S, __FX: FX, __C: ctl });

const vite = await createServer({ root: new URL("..", import.meta.url).pathname, server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "silent" });
after(() => vite.close());
// the choices the page remembers (moneyRanges), set per test
const LS = {}; globalThis.localStorage = { getItem: (k) => LS[k] ?? null, setItem: (k, v) => { LS[k] = String(v); }, removeItem: (k) => { delete LS[k]; } };
globalThis.document = { documentElement: { lang: "", classList: { toggle() {}, contains: () => false } } };
let mods = null;
async function load() {
  if (mods) return mods;
  const [Rep, store, i18nMod, clock] = await Promise.all(["/src/views/Reports.vue", "/src/stores/data.js", "/src/i18n.js", "/src/core/clock.js"].map((p) => vite.ssrLoadModule(p)));
  clock.setNow(NOW);
  return (mods = { Rep: Rep.default, data: store.data, i18n: i18nMod.i18n, setLang: i18nMod.setLang });
}
async function page(S, lang = "en", ctl = {}) {
  LS.moneyRanges = JSON.stringify({ ...(ctl.RNG || {}), CMP: ctl.CMP || {} });
  const m = await load(); m.setLang(lang); m.data.state.value = structuredClone(S); m.data.fx.value = { ...m.data.fx.value, fx: FX };
  const app = createSSRApp({ render: () => h(m.Rep) }); app.use(m.i18n);
  const html = await renderToString(app), i = html.indexOf("<section");
  // the dots between parts (<span class="dt">·</span> in a <span>, made by vite-dots.js) are added on the page in the current app too, not in its HTML strings
  return html.slice(i).replace(/<!--[\s\S]*?-->/g, "").replace(/<span>([^<]*(?:<span class="dt">·<\/span>[^<]*)+)<\/span>/g, "$1").replace(/<span class="dt">·<\/span>/g, " · ");
}
// the inside of the element with this id (its tags balanced)
function inner(html, id) {
  const i = html.indexOf(`id="${id}"`); if (i < 0) return null;
  const s = html.indexOf(">", i) + 1, tag = html.slice(html.lastIndexOf("<", i) + 1).match(/^[a-z0-9]+/)[0], re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "g"); re.lastIndex = s;
  let depth = 1, m; while ((m = re.exec(html))) { depth += m[1] ? -1 : 1; if (!depth) return html.slice(s, m.index); }
  return html.slice(s);
}
const unesc = (x) => x.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
// the words a block shows (the main chart's drawing and hover box are left out: they depend on the page's width)
const words = (html) => unesc(html.replace(/<svg[\s\S]*?<\/svg>/g, (s) => (/class="dsvg"/.test(s) ? s : " ")).replace(/<div class="trtip[\s\S]*?<\/div>/g, " ").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

const STATES = [["demo", demoState()], ["a hidden merchant and tags", (() => { const s = demoState(); s.hiddenMerchants = ["netflix"]; s.tx.forEach((t, i) => { if (t.a < 0 && t.d >= "2026-10-01" && i % 3 == 0) t.tags = ["vacation"]; }); return s; })()], ["no tags", (() => { const s = demoState(); s.tx.forEach((t) => (t.tags = [])); return s; })()]];
const MONTH = { p: "month", from: "", to: "" }, cmpAll = (c, p = MONTH) => ({ RNG: { cat: p, merch: p, tag: p }, CMP: { cat: c, merch: c, tag: c } });
STATES.push(["compared with the month before", demoState(), cmpAll("prev")], ["compared with last year, over 90 days", demoState(), cmpAll("yoy", { p: "90d", from: "", to: "" })],
  ["a custom time frame compared with the one before", STATES[1][1], cmpAll("prev", { p: "custom", from: "2026-08-01", to: "2026-09-15" })]);
for (const [name, S, ctl = {}] of STATES) test("the English page shows the same words and numbers as the current app: " + name, async () => {
  const o = oldBlocks(S, ctl), html = await page(S, "en", ctl);
  for (const id of IDS) {
    const b = inner(html, id); assert.ok(b != null, "block " + id + " is on the page");
    assert.equal(words(b), words(o[id]), id); if (!/Cmp$/.test(id) || ctl.CMP) assert.ok(words(o[id]).length > 20, id + " has words"); if (process.env.SHOWW) console.log(id, words(b).slice(0, 160));
  }
});

test("the Hebrew page has Hebrew words only (apart from names) and no broken numbers", async () => {
  const S = demoState(), html = await page(S, "he"), w = words(html);
  assert.ok(!/undefined|NaN|\[object/.test(w), w.match(/.{20}(undefined|NaN|\[object).{20}/)?.[0]);
  const names = new Set([...S.tx.map((t) => t.desc + " " + t.to + " " + t.from + " " + t.c + " " + (t.tags || []).join(" ")), ...Object.keys(S.cats || {})].flatMap((x) => String(x).split(/[^A-Za-z]+/)));
  const eng = (w.match(/[A-Za-z]{3,}/g) || []).filter((x) => !names.has(x) && x !== "Wise");
  assert.deepEqual(eng, []);
  await page(S, "en");
});
