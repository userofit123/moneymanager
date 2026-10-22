// The Budgets page gives the agreed numbers, suggestions, words and markup on each state below (saved in fixtures/, see golden.js):
// lib/budgets.js and views/Budgets.vue run on the data and their results are compared with the saved ones.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { matchesSaved } from "./golden.js";
import { buildDemo } from "../../server/src/seed.js";
import { budgetsModel, acceptBudget, acceptAll, dismissSuggestion, laterReview, resetDismissed, applyBudget, setBudget, removeBudget, changeBudget, formSuggestion, formCategories } from "../src/lib/budgets.js";

process.on("unhandledRejection", () => {});
// The page is drawn on the server with the real Vue file (Vite), so no browser is needed.
const vite = await createServer({ root: new URL("..", import.meta.url).pathname, server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "silent" });
after(() => vite.close());
globalThis.document = { documentElement: { lang: "", classList: { toggle() {} } } };
let mods = null;
const NOW = new Date(2026, 9, 17, 12); // 17 Oct 2026

// ---- the data ----
let nid = 1;
const T = (d, to, a, o = {}) => ({ id: nid++, d, desc: to, from: "Bank", to, a, c: "Other", tags: [], docs: [], note: "", ...o });
const day = (m, d) => `2026-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
// spending of one category: one payment a month, May to October
const spendIn = (c, vals) => vals.map((v, i) => (v ? T(day(5 + i, 6 + i), c + " shop", -v, { c }) : null)).filter(Boolean);
function fixture(over = {}) {
  nid = 1;
  const tx = [
    ...spendIn("Groceries", [1500, 1500, 1400, 1500, 1600, 600]),   // budget 1000, went over three months: raise
    ...spendIn("Dining", [200, 180, 220, 200, 190, 100]),            // budget 2000, far under: lower
    ...spendIn("Transport", [500, 500, 500, 500, 500, 480]),         // budget 500: almost at the limit
    ...spendIn("Fun", [300, 300, 300, 300, 300, 350]),               // budget 300: over
    ...[800, 750, 900, 820, 780, 700].map((v, i) => T(day(5 + i, 6 + i), "Pet shop " + i, -v, { c: "Pets" })), // different shops each month, so no bill is found              // budget 1000: pace
    ...spendIn("Health", [100, 100, 100, 100, 100, 100]),            // budget 1000: fine
    ...spendIn("Home", [900, 900, 900, 900, 900, 400]),              // budget 1200, with two bills inside
    ...spendIn("Clothes", [400, 450, 500, 420, 480, 300]),           // no budget: suggested
    ...spendIn("Books", [300, 280, 320, 310, 290, 100]),             // no budget: suggested
    ...spendIn("Gifts", [150, 150, 160, 140, 150, 50]),              // no budget: suggested
    ...spendIn("Toys", [120, 130, 110, 120, 125, 40]),               // no budget: suggested
    ...spendIn("Insurance", [600, 600, 600, 600, 600, 600]),         // mostly a bill: not suggested
    T(day(10, 3), "Mystery", -75, { c: "" }),                          // no category, no budget
    T(day(10, 1), "Salary", 9000, { from: "Work", to: "Bank", c: "Income" }),
    ...[7, 8, 9].map((m) => T(day(m, 16), "Arnona", -800, { c: "Home" })),
    ...[5, 6, 7, 8, 9].map((m) => T(day(m, 25), "Insure Co", -600, { c: "Insurance" })),
  ];
  return {
    v: 4, rev: 1, cats: { Groceries: 0, Dining: 1, Transport: 2, Fun: 3, Pets: 4, Health: 5, Home: 6, Clothes: 0, Books: 1, Gifts: 2, Toys: 3, Insurance: 4, Income: 99, Other: 0 }, rules: [], tagRules: [], tx,
    budgets: { Groceries: 1000, Dining: 2000, Transport: 500, Fun: 300, Pets: 1000, Health: 1000, Home: 1200 }, budgetNo: [],
    jars: [{ id: 1, n: "Car jar", bal: 340, p: 1, goal: 1000, cats: [{ c: "Transport", since: "2026-01-01" }] }],
    audit: [], xf: [], dismissed: {}, dupOk: {}, adj: {}, jarsBuffer: 0, ccOverride: {}, txIgnore: {}, hiddenMerchants: [], cardRules: [], salaryRules: [],
    cfg: { bills: 1, price: 1, billDays: 3, budgetPct: 80, gapDays: 3 }, currencies: ["ILS"], gaps: [], balUpdates: [], connected: {}, locked: {}, connStatus: {}, nwSnaps: [],
    accounts: [{ id: 1, n: "Bank", kind: "bank", v: 5000, cur: "ILS", inNW: true, at: "x" }],
    ignoredBills: [],
    bills: [
      { n: "Arnona", every: 1, anchor: 9, dom: 16, src: "Bank", match: "arnona", cat: "Home", manual: true, mode: "rule", rec: "recurring", amt: 800, lastPaid: "2026-09-16" },
      { n: "Water", src: "Bank", match: "water", cat: "Home", manual: true, mode: "rule", rec: "irregular", amt: 120 },
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
const STATES = [
  ["every kind of budget and suggestion", "all", fixture()],
  ["some suggestions dismissed", "dismissed", fixture({ budgetNo: ["new|Gifts", "new|Toys", "rev|Groceries|2026-10"] })],
  ["only one budget left, no suggestions", "one", fixture({ budgets: { Health: 1000 }, budgetNo: ["new|Groceries", "new|Dining", "new|Transport", "new|Fun", "new|Pets", "new|Home", "new|Clothes", "new|Books", "new|Gifts", "new|Toys"] })],
  ["the made-up demo data", "demo", demo()],
  ["no budgets and only one month of history", "onemonth", { ...fixture({ budgets: {} }), tx: fixture().tx.filter((t) => t.d >= "2026-09-01") }],
  ["nothing at all", "empty", { ...fixture({ budgets: {}, bills: [] }), tx: [] }],
];


for (const [name, key, S] of STATES) {
  test(`budgets, suggestions and the month's numbers: ${name}`, () => {
    const M = budgetsModel(structuredClone(S), NOW);
    matchesSaved(`budgets#numbers-${key}`, { info: M.info, fresh: M.fresh, review: M.review, months: M.budMonths, spend: M.spend, un: M.un, DAYN: M.DAYN, DIM: M.DIM });
  });
}

test("the fixture really covers every kind of budget", () => {
  const M = budgetsModel(fixture(), NOW), st = Object.fromEntries(M.info.map((b) => [b.k, b.st]));
  assert.deepEqual(st, { Groceries: "pace", Dining: "ok", Transport: "warn", Fun: "over", Pets: "pace", Health: "ok", Home: "ok" });
  assert.deepEqual(M.review.map((r) => [r.k, r.kind]).sort(), [["Dining", "lower"], ["Groceries", "raise"], ["Health", "lower"], ["Home", "raise"]]);
  assert.deepEqual(M.fresh.map((x) => x.k).sort(), ["Books", "Clothes", "Gifts", "Toys"].sort());
  assert.ok(!M.fresh.some((x) => x.k === "Insurance"), "a category that is mostly bills gets no suggestion");
  assert.equal(M.billsIn("Home").length, 2); assert.equal(M.catJars.Transport.j.n, "Car jar");
});

// ---- the page ----
async function load() {
  if (mods) return mods;
  const [Budgets, store, i18nMod] = await Promise.all(["/src/views/Budgets.vue", "/src/stores/data.js", "/src/i18n.js"].map((p) => vite.ssrLoadModule(p)));
  (await vite.ssrLoadModule("/src/core/clock.js")).setNow(NOW); // the page works out its numbers for a fixed day
  return (mods = { Budgets: Budgets.default, data: store.data, i18n: i18nMod.i18n, setLang: i18nMod.setLang });
}
async function page(S, lang = "en") {
  const m = await load(); await m.setLang(lang); m.data.state.value = structuredClone(S);
  const app = createSSRApp({ render: () => h(m.Budgets) }); app.use(m.i18n);
  const html = await renderToString(app), i = html.indexOf("<section");
  // the dots between parts (<span class="dt">·</span> in a <span>, made by vite-dots.js) are left out: only blocks and words are compared
  return html.slice(i).replace(/<!--[\s\S]*?-->/g, "").replace(/<span>([^<]*(?:<span class="dt">·<\/span>[^<]*)+)<\/span>/g, "$1").replace(/<span class="dt">·<\/span>/g, " · ");
}
const unesc = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const text = (html) => unesc(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
// Every tag with its classes and its data-a / data-k / id, in order: the same blocks in the same order.
const skeleton = (html) => [...html.matchAll(/<([a-z0-9]+)([^>]*)>/g)].map(([, tag, at]) => {
  const g = (n) => (new RegExp(`(?:^|\\s)${n}="([^"]*)"`).exec(at) || [])[1];
  return [tag, (g("class") || "").split(/\s+/).filter((c) => c && c !== "on").sort().join("."), g("data-a") || "", g("data-k") ?? g("data-bp") ?? g("data-cat") ?? "", g("data-i") ?? "", g("id") || ""].join("|");
});
const tips = (html) => [...html.matchAll(/data-tip="([^"]*)"/g)].map((m) => unesc(m[1]));

for (const [name, key, S] of STATES) {
  test(`the English page has the agreed blocks, words and tips: ${name}`, async () => {
    const b = await page(S, "en");
    matchesSaved(`budgets#page-${key}`, { blocks: skeleton(b), text: text(b), tips: tips(b) });
  });
}

test("the Hebrew page shows no English words from the app (only names from the data)", async () => {
  const S = fixture(), b = await page(S, "he"), names = new Set(S.tx.flatMap((t) => String(t.to + " " + t.desc + " " + t.c).toLowerCase().split(/[^a-z]+/)).concat(S.bills.flatMap((x) => x.n.toLowerCase().split(/[^a-z]+/))).concat(S.jars.flatMap((j) => j.n.toLowerCase().split(/[^a-z]+/))));
  const left = (text(b).match(/[A-Za-z]{2,}/g) || []).filter((w) => !names.has(w.toLowerCase()));
  assert.deepEqual(left, [], "English left on the Hebrew page: " + left.join(", "));
  assert.match(b, /תקציב/);
});
test("a page without enough history says suggestions need two months, in both languages", async () => {
  const S = STATES[4][2];
  assert.match(text(await page(S, "en")), /Suggestions need at least two full months/);
  assert.match(text(await page(S, "he")), /הצעות דורשות/);
});

// ---- the changes ----
test("accepting a suggestion sets the budget, rounded, and writes the same history line", () => {
  const S = fixture();
  assert.deepEqual(acceptBudget(S, "Clothes", "450.4"), [["Accepted a suggested budget", "Clothes: ₪450 / month", { type: "budget", k: "Clothes", old: null }]]);
  assert.equal(S.budgets.Clothes, 450);
  assert.equal(acceptBudget(S, "Books", "0"), false); assert.equal(acceptBudget(S, "Books", ""), false); assert.ok(!("Books" in S.budgets));
});
test("accept all only adds new amounts above zero, and counts them", () => {
  const S = fixture();
  assert.deepEqual(acceptAll(S, [["Clothes", "500"], ["Books", "0"], ["Groceries", "900"], ["Gifts", "200"]]), [["Accepted suggested budgets", "2 budgets"]]);
  assert.deepEqual([S.budgets.Clothes, S.budgets.Gifts, S.budgets.Groceries, "Books" in S.budgets], [500, 200, 1000, false]);
  assert.deepEqual(acceptAll(fixture(), [["Clothes", "500"]]), [["Accepted suggested budgets", "1 budget"]]);
  assert.equal(acceptAll(fixture(), [["Books", "0"]]), false);
});
test("'Not this one', 'Not now' and 'show dismissed again' change only the dismissed list", () => {
  const S = fixture();
  assert.deepEqual(dismissSuggestion(S, "Books"), []); assert.deepEqual(laterReview(S, "Dining", "2026-10"), []);
  assert.deepEqual(S.budgetNo, ["new|Books", "rev|Dining|2026-10"]);
  const M = budgetsModel(S, NOW);
  assert.ok(!M.fresh.some((x) => x.k === "Books")); assert.ok(!M.review.some((x) => x.k === "Dining"));
  assert.deepEqual(resetDismissed(S), []); assert.deepEqual(S.budgetNo, []);
  assert.ok(budgetsModel(S, NOW).fresh.some((x) => x.k === "Books"));
});
test("use the suggested amount, set, change and remove write the same lines and undo notes", () => {
  const S = fixture();
  assert.deepEqual(applyBudget(S, "Groceries", "1650"), [["Updated a budget (suggested)", "Groceries: ₪1,000 → ₪1,650", { type: "budget", k: "Groceries", old: 1000 }]]);
  assert.deepEqual(setBudget(S, "Books", "300"), [["Set budget", "Books: ₪300 / month", { type: "budget", k: "Books", old: null }]]);
  assert.equal(setBudget(S, "", "300"), false); assert.equal(setBudget(S, "Gifts", "0"), false); assert.equal(setBudget(S, "Gifts", ""), false);
  assert.deepEqual(changeBudget(S, "Fun", "400"), [["Changed budget", "Fun: ₪300 → ₪400", { type: "budget", k: "Fun", old: 300 }]]);
  assert.deepEqual(removeBudget(S, "Pets"), [["Removed budget", "Pets", { type: "budget", k: "Pets", old: 1000 }]]);
  assert.ok(!("Pets" in S.budgets));
  assert.equal(S.budgets.Fun, 400);
});
test("a saved change shows up in the numbers", () => {
  const S = fixture(), before = budgetsModel(S, NOW);
  changeBudget(S, "Fun", "600");
  const after = budgetsModel(S, NOW);
  assert.equal(after.totL - before.totL, 300); assert.equal(after.info.find((b) => b.k === "Fun").st, "ok");
});
test("the add-a-budget sheet offers the categories with no budget and a starting amount", () => {
  const M = budgetsModel(fixture(), NOW), cats = formCategories(M, "");
  assert.ok(cats.includes("Clothes") && !cats.includes("Groceries") && !cats.includes("Income") && !cats.includes("Uncategorized"));
  assert.ok(formCategories(M, "Groceries").includes("Groceries"));
  assert.equal(formSuggestion(M, "Groceries"), 1500);
  assert.equal(formSuggestion(M, "Nothing here"), "");
});
