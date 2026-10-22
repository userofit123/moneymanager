// The Categories and tags page makes the agreed data changes, history lines and page on fixed data (saved in fixtures/, see golden.js):
// lib/categories.js and views/Categories.vue run on the data and their results are compared with the saved ones.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { matchesSaved, saved } from "./golden.js";
import * as C from "../src/lib/categories.js";

process.on("unhandledRejection", () => {});
const NOW = new Date(2026, 9, 17, 12);

// ---- the data ----
// fixtures/categories-start.json: 13 transactions (Shufersal, Cafe Nero, Netflix, Super-Pharm, Wix salary, a transfer to savings,
// a planned entry, a card charge), categories Food / Dining / Fun / Bills, category, tag and name rules, two budgets, a bill and a jar,
// with the fields the app fills in after loading.
const start = () => structuredClone(saved("categories-start"));
const pick = (S) => ({ cats: S.cats, tx: S.tx.map((t) => [t.id, t.c, t.tags]), rules: S.rules, tagRules: S.tagRules, budgets: S.budgets, bills: S.bills.map((b) => b.cat), jars: S.jars.map((j) => j.cats), names: S.cfg.nameRules, card: S.cardRules, sal: S.salaryRules });

// One action: the data afterwards and the history lines.
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function same(name, edit) {
  test(name, () => {
    const N = start(), lines = edit(N) || [];
    matchesSaved("categories#" + slug(name), { data: pick(N), lines: lines.map(([a, d]) => [a, d]) });
  });
}
const rename = (N, k, v) => { const c = C.renameCheck(N, k, v); return c.err || c.same ? false : C.renameCategory(N, k, c.tg); };
const tagRename = (N, g, v) => { const n = C.normTag(N, v); return !n || n == g ? false : C.renameTag(N, g, n); };
const normList = (N, v) => String(v).split(",").map((x) => C.normTag(N, x)).filter(Boolean);

same("add a category", (N) => C.addCategory(N, " Pets "));
same("add a category that exists: nothing", (N) => C.addCategory(N, "Food"));
same("add an empty category: nothing", (N) => C.addCategory(N, "  "));
same("rename a category everywhere", (N) => rename(N, "Food", " Meals "));
same("rename into a category that exists merges them (budgets, jars)", (N) => rename(N, "Food", "dining"));
same("rename to Uncategorized is refused", (N) => rename(N, "Food", "uncategorized"));
same("rename to nothing is refused", (N) => rename(N, "Food", " "));
same("rename to the same name: nothing", (N) => rename(N, "Food", "Food"));
same("delete a category", (N) => C.deleteCategory(N, "Dining"));
same("rename a tag", (N) => tagRename(N, "food", "#meals"));
same("rename a tag into one that exists merges them", (N) => tagRename(N, "food", "trip"));
same("rename a tag used by a rule", (N) => tagRename(N, "tv", "fun"));
same("delete a tag (and the rules left with no tag)", (N) => C.deleteTag(N, "health"));
same("delete a tag on transactions", (N) => C.deleteTag(N, "food"));
same("add a category rule", (N) => C.addRule(N, " super ", "Food"));
same("a rule for the same text is refused", (N) => C.addRule(N, "SHUFERSAL", "Food"));
same("delete a category rule", (N) => C.deleteRule(N, 0));
same("move past transactions to a rule's new category", (N) => { N.rules[0].c = "Food"; return C.applyRulePast(N, 0, "Dining"); });
same("add a tag rule", (N) => C.addTagRule(N, " nero ", ["fun", "tv"]));
same("a tag rule needs a tag", (N) => C.addTagRule(N, "nero", []));
same("delete a tag rule", (N) => C.deleteTagRule(N, 1));
same("tag earlier transactions", (N) => C.applyTagRulePast(N, 0));
same("add tags to a tag rule", (N) => C.addTagRuleTags(N, 0, normList(N, "Food, #extra, tv")));
same("remove a tag from a tag rule", (N) => C.removeTagRuleTag(N, 0, 0));
same("a tag rule keeps its last tag", (N) => C.removeTagRuleTag(N, 1, 0));
same("add a name rule", (N) => C.addNameRule(N, { k: " nero ", n: " Coffee ", f: "desc", m: "eq" }));
same("a name rule needs both texts", (N) => C.addNameRule(N, { k: "nero", n: " ", f: "any", m: "in" }));
same("delete a name rule", (N) => C.deleteNameRule(N, 0));
same("add a card payment rule", (N) => C.addCardRule(N, " Leumi-Card  חיוב. "));
same("a card rule that exists is refused", (N) => C.addCardRule(N, "MAX charge"));
same("a card rule needs two letters", (N) => C.addCardRule(N, "a."));
same("delete a card payment rule", (N) => C.deleteCardRule(N, 0));
same("add a salary rule (marks the income you have)", (N) => C.addSalaryRule(N, "WIX"));
same("a salary rule with no match", (N) => C.addSalaryRule(N, "acme"));
same("delete a salary rule", (N) => { N.salaryRules = ["wix"]; return C.deleteSalaryRule(N, 0); });

// The edits typed into a rule row, with their exact lines.
test("editing a rule row writes the right history lines", () => {
  const N = start();
  assert.deepEqual(C.setRuleText(N, 0, " super "), [["Changed rule", '"shufersal" → "super"']]); assert.equal(N.rules[0].k, "super");
  assert.equal(C.setRuleText(N, 0, "super"), false); assert.equal(C.setRuleText(N, 0, " "), false);
  assert.deepEqual(C.setRuleCat(N, 1, "Food"), [["Changed rule", '"cafe" → Food (was Dining)']]); assert.equal(C.setRuleCat(N, 1, "Food"), false);
  assert.equal(C.ruleMoveCount(N, "cafe", "Dining"), 1);
  assert.deepEqual(C.setTagRuleText(N, 0, "netflix com"), [["Changed tag rule", '"netflix" → "netflix com"']]);
  assert.deepEqual(C.setNameRule(N, 0, "n", " Pay "), [["Changed name rule", "wix → Pay"]]); assert.equal(N.cfg.nameRules[0].n, "Pay");
  assert.deepEqual(C.setNameRule(N, 0, "f", "any"), [["Changed name rule", "wix → Pay"]]); assert.equal(N.cfg.nameRules[0].f, "any");
  assert.deepEqual(C.setNameRule(N, 0, "k", " "), [["Changed name rule", " → Pay"]]); // saved empty, the page warns
});

// ---- what the page lists ----
test("tags, their counts and the tag rule matches", () => {
  const B = start();
  matchesSaved("categories#tags", { tags: C.allTags(B), m: B.tagRules.map((r) => C.tagRuleMatches(B, r).map((t) => t.id)), n: [C.normTag(B, "TRIP"), C.normTag(B, "#new")] });
});
test("the tag editor offers the tags in use", () => {
  const B = start(), all = C.allTags(B);
  assert.deepEqual(C.tagSuggest(all, ["tv"], "").items.map(([g]) => g), all.map(([g]) => g).filter((g) => g != "tv"));
  assert.deepEqual(C.tagSuggest(all, ["tv"], "o"), { items: [["food", 2], ["home", 1]], create: "o" });
  assert.deepEqual(C.tagSuggest(all, [], "#FOOD").create, "");
  assert.deepEqual(C.tagSuggest(all, ["Mine"], "mine").create, "");
});

// ---- the page ----
const vite = await createServer({ root: new URL("..", import.meta.url).pathname, server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "silent" });
after(() => vite.close());
globalThis.document = { documentElement: { lang: "", classList: { toggle() {} } } };
let mods = null;
async function load() {
  if (mods) return mods;
  const [V, store, i18nMod] = await Promise.all(["/src/views/Categories.vue", "/src/stores/data.js", "/src/i18n.js"].map((p) => vite.ssrLoadModule(p)));
  (await vite.ssrLoadModule("/src/core/clock.js")).setNow(NOW);
  return (mods = { V: V.default, data: store.data, i18n: i18nMod.i18n, setLang: i18nMod.setLang });
}
async function page(S, lang = "en") {
  const m = await load(); await m.setLang(lang); m.data.state.value = structuredClone(S);
  const app = createSSRApp({ render: () => h(m.V) }); app.use(m.i18n);
  return (await renderToString(app)).replace(/<!--[\s\S]*?-->/g, "");
}
// The inside of <div id="…">, found by counting the divs.
function inner(html, id) {
  const i = html.indexOf(`id="${id}"`), s = html.indexOf(">", i) + 1; let d = 1, j = s;
  const re = /<(\/?)div\b[^>]*>/g; re.lastIndex = s; let m;
  while ((m = re.exec(html))) { d += m[1] ? -1 : 1; if (!d) { j = m.index; break; } }
  return html.slice(s, j);
}
const unesc = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
// Lists of choices and the tag suggestions are filled when opened, so they are left out.
const tidy = (h) => h.replace(/<select([^>]*)>[\s\S]*?<\/select>/g, "<select$1></select>").replace(/<div class="tsug"[^>]*>[\s\S]*?<\/div>/g, '<div class="tsug"></div>');
const text = (h) => unesc(tidy(h).replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
const skeleton = (h) => [...tidy(h).matchAll(/<([a-z0-9]+)([^>]*)>/g)].map(([, tag, at]) => tag + "." + ((/(?:^|\s)class="([^"]*)"/.exec(at) || [])[1] || "").split(/\s+/).filter((c) => c && c != "hi").sort().join("."));
const tips = (h) => [...h.matchAll(/data-tip="([^"]*)"/g)].map((m) => unesc(m[1]));
const PANES = ["setCats", "setRules", "setTags", "setTagrules", "setNames", "setGen"];
// The search bar at the top of each tab is checked on its own.
const noBar = (h) => (h.startsWith('<div class="rtool">') ? h.slice(h.indexOf("</div>") + 6) : h);

for (const [name, key, mk] of [["the test data", "data", () => start()], ["nothing at all", "empty", () => ({ ...start(), rules: [], tagRules: [], cardRules: [], salaryRules: [], cfg: { ...start().cfg, nameRules: [] }, tx: [] })]]) {
  test(`every tab has the agreed blocks, words and tips: ${name}`, async () => {
    const S = mk(), html = await page(S, "en");
    for (const id of PANES) {
      const b = noBar(inner(html, id));
      matchesSaved(`categories#page-${key}-${id}`, { blocks: skeleton(b), text: text(b), tips: tips(b) }, id);
    }
  });
}
test("the search bars have their words, and Name rules has none", async () => {
  const html = await page(start(), "en"), bar = (id) => (/<div class="rtool">([\s\S]*?)<\/div>/.exec(inner(html, id)) || [])[1] || "";
  assert.match(bar("setCats"), /placeholder="Search categories…"[\s\S]*placeholder="New category name"[\s\S]*\+ Add category/);
  assert.match(bar("setRules"), /Search rules by text or category…/); assert.match(bar("setTags"), /Search tags…/);
  assert.match(bar("setTagrules"), /Search rules by text or tag…/); assert.match(bar("setGen"), /Search rules…/); assert.equal(bar("setNames"), "");
});
test("the Hebrew page shows no English words from the app (only names from the data)", async () => {
  const S = start(), b = text(await page(S, "he"));
  const names = new Set([...S.tx.flatMap((t) => [t.desc, t.to, t.from, ...t.tags]), ...S.rules.map((r) => r.k), ...S.tagRules.flatMap((r) => [r.k, ...r.t.split(",")]), ...S.cardRules, "wix", "Salary", "Isracard", "Visa", "Cal", "Max", "American", "Express", "Diners", "Leumi", "Card", "salary", "payroll", "netflix", "streaming", "Acme", "Ltd", "ChatGPT", "Claude", "Gemini", "JSON", "categories", "name", "income", "true", "false", "rules", "contains", "category", "tagRules", "tags", "Bills", "Food", "Dining", "Fun"].join(" ").toLowerCase().split(/[^a-z]+/));
  const left = (b.match(/[A-Za-z]{2,}/g) || []).filter((w) => !names.has(w.toLowerCase()));
  assert.deepEqual(left, [], "English left on the Hebrew page: " + left.join(", "));
  assert.match(b, /כללי קטגוריות/);
  // the Hebrew for saved texts loads by itself in Hebrew; wait for it so nothing is still loading when the test ends
  const { tx } = await vite.ssrLoadModule("/src/core/heText.js");
  for (let i = 0; i < 60 && tx("Undid a change") === "Undid a change"; i++) await new Promise((r) => setTimeout(r, 50));
});
