// The help guide and the small ? signs are the same as the current app's: the same text for every page in both languages,
// the same places for the ?, and each ? finds its section name on the new pages.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { oldApp } from "./old-app.js";
import { buildDemo } from "../../server/src/seed.js";
import EN from "../src/help/en.js";
import HEG from "../src/help/he.js";
import DOTS from "../src/help/dots.js";
import { HDEMO } from "../src/help/demo.js";

process.on("unhandledRejection", () => {});
const vite = await createServer({ root: new URL("..", import.meta.url).pathname, server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "silent" });
after(() => vite.close());
const { guideOf, guideHtml, HELP_PAGE } = await vite.ssrLoadModule("/src/help/help.js");
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

test("the guide text is the same as the current app's, for every page, in English and Hebrew", () => {
  for (const [he, G] of [[false, EN], [true, HEG]]) {
    const o = old.run(`HE.on=${he};HELP`);
    assert.deepEqual(Object.keys(G), Object.keys(o[he ? "he" : "en"]));
    assert.deepEqual(JSON.parse(JSON.stringify(G)), JSON.parse(JSON.stringify(o[he ? "he" : "en"])));
  }
});

test("the panel shows what the current app's panel shows, for every page", () => {
  const src = old.run("helpRender.toString()").replace(/\$\(/g, "__d(");
  const html = (key, he) => {
    const els = { helpB: { innerHTML: "", set scrollTop(v) {} }, helpT: { textContent: "" } };
    old.run(`HE.on=${he};curView=${JSON.stringify(key.split(".")[0] === "set" ? "set" : key)};setTab=${JSON.stringify(key.split(".")[1] || "")};(${src})()`, { __d: (id) => els[id] });
    return els.helpT.textContent + "\n" + els.helpB.innerHTML;
  };
  for (const he of [false, true]) for (const key of Object.keys(EN)) {
    const P = guideOf(key, he);
    assert.equal(P.title + "\n" + guideHtml(P, he), html(key, he), key + (he ? " he" : " en"));
  }
});

test("the ? places are the same as the current app's, with the Hebrew name of each", () => {
  const o = old.run("HELPDOTS");
  assert.equal(DOTS.length, o.length);
  DOTS.forEach((d, i) => assert.deepEqual(d.slice(0, 6).map((x) => x || ""), [...o[i]].concat(["", ""]).slice(0, 6).map((x) => x || ""), "row " + i));
  DOTS.forEach((d) => { if (d[3]) assert.equal(d[6], old.run("HE.on=true;HE.T(__s)", { __s: d[3] }), d[3]); });
});

test("every page the current app has a guide for opens that guide", () => {
  for (const [name, key] of Object.entries(HELP_PAGE)) assert.ok(EN[key], name + " -> " + key);
  assert.ok(Object.keys(HDEMO).length >= 10);
});

// ---- the new pages carry the names the ?s look for ----
globalThis.document = { documentElement: { lang: "", classList: { toggle() {} } }, addEventListener() {}, removeEventListener() {} };
const PAGES = { home: "Home", activity: "Activity", jars: "Jars", bills: "Bills", budgets: "Budgets", reports: "Reports", forecast: "Forecast" };
// Places the current app's own ? does not find either (its Bills title and the Hebrew "Money flow · ahead" never start with the name it looks for), and boxes
// that show only when there is something to show (credit cards, exchange rates, items to review, completed jars): those must at least exist in the page file.
const OLD_GAPS = ["#sec-flow / Money flow", "#bills / Bills and subscriptions"];
const ONLY_WITH_DATA = { "#sec-cards / Credit cards": "Home", "#sec-fx missing": "Home", "#txRev missing": "Activity", "#jars / Completed": "Jars" };
const unesc = (x) => x.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const norm = (t) => String(t).replace(/\s+/g, " ").trim().toLowerCase();
async function render(view, lang) {
  const [V, store, i18nMod] = await Promise.all([`/src/views/${view}.vue`, "/src/stores/data.js", "/src/i18n.js"].map((p) => vite.ssrLoadModule(p)));
  i18nMod.setLang(lang); store.data.state.value = demoState();
  const app = createSSRApp({ render: () => h(V.default) }); app.use(i18nMod.i18n);
  return (await renderToString(app)).replace(/<!--[\s\S]*?-->/g, "");
}
for (const [name, view] of Object.entries(PAGES)) for (const lang of ["en", "he"]) {
  test(`${name} (${lang}): every ? finds its section`, async () => {
    const html = await render(view, lang), key = HELP_PAGE[name], miss = [];
    for (const [k, root, sel, txt, , how, txtHe] of DOTS) {
      if (k !== key) continue;
      const id = root.slice(1), i = html.indexOf(`id="${id}"`);
      if (i < 0) { miss.push(root + " missing"); continue; }
      if (how === "after" || !txt) continue;
      const text = norm(unesc(html.slice(i).replace(/<[^>]*>/g, " ")));
      if (!text.includes(norm(txt)) && !(lang === "he" && txtHe && text.includes(norm(txtHe)))) miss.push(root + " / " + txt);
    }
    const left = miss.filter((m) => {
      if (OLD_GAPS.includes(m)) return false;
      const v = ONLY_WITH_DATA[m]; if (!v) return true;
      const id = m.split(" ")[0].slice(1); return !fs.readFileSync(new URL(`../src/views/${v}.vue`, import.meta.url), "utf8").includes(`id="${id}"`);
    });
    assert.deepEqual(left, []);
  });
}
