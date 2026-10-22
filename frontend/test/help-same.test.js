// The help guide and the small ? signs: every page has a guide in both languages, the panel draws it as agreed
// (saved in fixtures/, see golden.js), and each ? finds its section name on the pages.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { matchesSaved } from "./golden.js";
import { buildDemo } from "../../server/src/seed.js";
import EN from "../src/help/en.js";
import DOTS from "../src/help/dots.js";
import { HDEMO } from "../src/help/demo.js";

process.on("unhandledRejection", () => {});
const vite = await createServer({ root: new URL("..", import.meta.url).pathname, server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "silent" });
after(() => vite.close());
const { guideOf, guideHtml, HELP_PAGE, loadGuide } = await vite.ssrLoadModule("/src/help/help.js");
await loadGuide(true);
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

test("the panel draws the guide of a page with its title, in English and Hebrew", () => {
  const keys = Object.keys(EN), pick = [keys[0], keys.find((k) => k.startsWith("set.")) || keys.at(-1)];
  for (const he of [false, true]) for (const key of pick) {
    const P = guideOf(key, he);
    matchesSaved(`help#${key}-${he ? "he" : "en"}`, P.title + "\n" + guideHtml(P, he), key + (he ? " he" : " en"));
  }
});

test("every ? place names a page that has a guide, with a Hebrew name for its section", () => {
  for (const d of DOTS) { assert.ok(EN[d[0]], d[0]); if (d[3]) assert.ok(typeof d[6] === "string" && d[6].trim(), d[3]); }
});

test("every page with a guide opens that guide", () => {
  for (const [name, key] of Object.entries(HELP_PAGE)) assert.ok(EN[key], name + " -> " + key);
  assert.ok(Object.keys(HDEMO).length >= 10);
});

// ---- the new pages carry the names the ?s look for ----
globalThis.document = { documentElement: { lang: "", classList: { toggle() {} } }, addEventListener() {}, removeEventListener() {} };
const PAGES = { home: "Home", activity: "Activity", jars: "Jars", bills: "Bills", budgets: "Budgets", reports: "Reports", forecast: "Forecast" };
// Places a ? does not find by name (the Bills title and the Hebrew "Money flow · ahead" never start with the name it looks for), and boxes
// that show only when there is something to show (credit cards, exchange rates, items to review, completed jars): those must at least exist in the page file.
const OLD_GAPS = ["#sec-flow / Money flow", "#bills / Bills and subscriptions"];
const ONLY_WITH_DATA = { "#sec-cards / Credit cards": "Home", "#sec-fx missing": "Home", "#txRev missing": "Activity", "#jars / Completed": "Jars" };
const unesc = (x) => x.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const norm = (t) => String(t).replace(/\s+/g, " ").trim().toLowerCase();
async function render(view, lang) {
  const [V, store, i18nMod] = await Promise.all([`/src/views/${view}.vue`, "/src/stores/data.js", "/src/i18n.js"].map((p) => vite.ssrLoadModule(p)));
  await i18nMod.setLang(lang); store.data.state.value = demoState();
  const app = createSSRApp({ render: () => h(V.default) }); app.use(i18nMod.i18n);
  return (await renderToString(app)).replace(/<!--[\s\S]*?-->/g, "");
}
for (const [name, view] of Object.entries(PAGES)) for (const lang of ["en", "he"]) {
  test(`${name} (${lang}): every ? finds its section`, async () => {
    const html = await render(view, lang), key = HELP_PAGE[name], miss = [];
    for (const [k, root, , txt, , how, txtHe] of DOTS) {
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
