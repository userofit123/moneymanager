// The Categories and tags page makes the same data changes, history lines and page as the current app, on the same data.
// The old code (web/js: the act() cases, tagCommit / tagRemove, renderSet) and the new code (lib/categories.js and
// views/Categories.vue) both run on each state below and their results are compared.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { oldApp } from "./old-app.js";
import * as C from "../src/lib/categories.js";

process.on("unhandledRejection", () => {});
const NOW = new Date(2026, 9, 17, 12), old = oldApp(NOW);

// ---- the data ----
let nid = 1;
const T = (d, desc, a, o = {}) => ({ id: nid++, d, desc, from: "Bank", to: desc, a, c: "", tags: [], docs: [], note: "", ...o });
function fixture() {
  nid = 1;
  const tx = [
    T("2026-10-01", "Shufersal deal", -120, { c: "Food", tags: ["food", "home"] }),
    T("2026-10-02", "Shufersal online", -80, { c: "Dining" }),
    T("2026-10-03", "Shufersal", -40, { c: "Dining", tags: ["Trip"] }),
    T("2026-10-04", "Cafe Nero", -25, { c: "Dining", tags: ["food"] }),
    T("2026-10-05", "Netflix.com", -50, { c: "Fun", tags: ["tv"] }),
    T("2026-10-06", "NETFLIX", -50, { c: "Fun" }),
    T("2026-10-07", "Super-Pharm", -60),
    T("2026-10-08", "Wix Ltd salary", 9000, { from: "Wix", to: "Bank" }),
    T("2026-09-08", "Wix Ltd", 9000, { from: "Wix", to: "Bank", c: "Uncategorized" }),
    T("2026-10-09", "Move to savings", -500, { to: "Savings" }),
    T("2026-10-09", "Move to savings", 500, { from: "Bank", to: "Savings" }),
    T("2026-10-10", "Planned food", -100, { c: "Food", virtual: true, tags: ["food"] }),
    T("2026-10-11", "ישראכרט חיוב", -900, { c: "Bills" }),
  ];
  return {
    v: 4, rev: 1, cats: { Food: 0, Dining: 1, Fun: 2, Bills: 3, Income: 99, Uncategorized: 4 },
    rules: [{ k: "shufersal", c: "Dining", t: "" }, { k: "cafe", c: "Dining", t: "" }],
    tagRules: [{ k: "netflix", t: "tv,fun" }, { k: "pharm", t: "health" }],
    tx, budgets: { Food: 1000, Dining: 500 }, bills: [{ n: "Food box", match: "food box", cat: "Food" }],
    jars: [{ id: 1, n: "Fun jar", bal: 0, p: 1, cats: [{ c: "Food", since: "2026-01-01" }, { c: "Dining", since: "2026-02-01" }] }],
    audit: [], xf: [{ o: 10, i: 11, st: "ok" }], cfg: { nameRules: [{ k: "wix", n: "Salary", f: "from", m: "in" }] }, cardRules: ["max charge"], salaryRules: [],
  };
}

// ---- the old code, run on the same data ----
// renderAll and the windows do nothing here: only the change to the data and the history lines are compared.
const prep = `S={...emptyState(),...structuredClone(__S)};S.cfg={...DEF_CFG,...S.cfg};detect();derive();`;
const stubs = `renderAll=function(){};save=function(){};closeSheet=function(){};openSheet=function(){};tagRuleAsk=function(){};renderProfile=function(){};TOASTS=[];toast=function(m){TOASTS.push(String(m))};
document={getElementById:id=>(id in __V?{value:__V[id],focus(){},select(){}}:null),querySelector:()=>null,querySelectorAll:()=>[]};`;
function oldDo(S, code, vals = {}) {
  return JSON.parse(old.run(`(function(){` + prep + stubs + `const __n=S.audit.length;` + code + `;return JSON.stringify({S,TOASTS,lines:S.audit.slice(0,S.audit.length-__n).reverse().map(a=>[a.action,a.detail])})})()`, { __S: S, __V: vals }));
}
// The data as the old app has it after loading (its own fields filled in), so both sides start the same.
const start = () => oldDo(fixture(), "").S;
const pick = (S) => ({ cats: S.cats, tx: S.tx.map((t) => [t.id, t.c, t.tags]), rules: S.rules, tagRules: S.tagRules, budgets: S.budgets, bills: S.bills.map((b) => b.cat), jars: S.jars.map((j) => j.cats), names: S.cfg.nameRules, card: S.cardRules, sal: S.salaryRules });

// One action, old and new: the same data afterwards and the same history lines.
function same(name, oldCode, vals, edit) {
  test(name, () => {
    const B = start(), o = oldDo(B, oldCode, vals), N = structuredClone(B);
    const lines = edit(N) || [];
    assert.deepEqual(pick(N), pick(o.S));
    assert.deepEqual(lines.map(([a, d]) => [a, d]), o.lines);
  });
}
const rename = (N, k, v) => { const c = C.renameCheck(N, k, v); return c.err || c.same ? false : C.renameCategory(N, k, c.tg); };
const tagRename = (N, g, v) => { const n = C.normTag(N, v); return !n || n == g ? false : C.renameTag(N, g, n); };
const normList = (N, v) => String(v).split(",").map((x) => C.normTag(N, x)).filter(Boolean);

same("add a category", `act("catAdd",{})`, { nc: " Pets " }, (N) => C.addCategory(N, " Pets "));
same("add a category that exists: nothing", `act("catAdd",{})`, { nc: "Food" }, (N) => C.addCategory(N, "Food"));
same("add an empty category: nothing", `act("catAdd",{})`, { nc: "  " }, (N) => C.addCategory(N, "  "));
same("rename a category everywhere", `act("catRenameGo",{k:"Food"})`, { crnN: " Meals " }, (N) => rename(N, "Food", " Meals "));
same("rename into a category that exists merges them (budgets, jars)", `act("catRenameGo",{k:"Food"})`, { crnN: "dining" }, (N) => rename(N, "Food", "dining"));
same("rename to Uncategorized is refused", `act("catRenameGo",{k:"Food"})`, { crnN: "uncategorized" }, (N) => rename(N, "Food", "uncategorized"));
same("rename to nothing is refused", `act("catRenameGo",{k:"Food"})`, { crnN: " " }, (N) => rename(N, "Food", " "));
same("rename to the same name: nothing", `act("catRenameGo",{k:"Food"})`, { crnN: "Food" }, (N) => rename(N, "Food", "Food"));
same("delete a category", `act("catDel",{k:"Dining"})`, {}, (N) => C.deleteCategory(N, "Dining"));
same("rename a tag", `act("tagRenameGo",{tag:"food"})`, { trnN: "#meals" }, (N) => tagRename(N, "food", "#meals"));
same("rename a tag into one that exists merges them", `act("tagRenameGo",{tag:"food"})`, { trnN: "trip" }, (N) => tagRename(N, "food", "trip"));
same("rename a tag used by a rule", `act("tagRenameGo",{tag:"tv"})`, { trnN: "fun" }, (N) => tagRename(N, "tv", "fun"));
same("delete a tag (and the rules left with no tag)", `act("tagDel",{tag:"health"})`, {}, (N) => C.deleteTag(N, "health"));
same("delete a tag on transactions", `act("tagDel",{tag:"food"})`, {}, (N) => C.deleteTag(N, "food"));
same("add a category rule", `act("ruleAdd",{})`, { rk: " super ", rc: "Food" }, (N) => C.addRule(N, " super ", "Food"));
same("a rule for the same text is refused", `act("ruleAdd",{})`, { rk: "SHUFERSAL", rc: "Food" }, (N) => C.addRule(N, "SHUFERSAL", "Food"));
same("delete a category rule", `act("ruleDel",{i:"0"})`, {}, (N) => C.deleteRule(N, 0));
same("move past transactions to a rule's new category", `S.rules[0].c="Food";act("ruleApply",{id:"0|Dining"})`, {}, (N) => { N.rules[0].c = "Food"; return C.applyRulePast(N, 0, "Dining"); });
same("add a tag rule", `NR_TAGS=["fun","tv"];act("trAdd",{})`, { trk: " nero " }, (N) => C.addTagRule(N, " nero ", ["fun", "tv"]));
same("a tag rule needs a tag", `NR_TAGS=[];act("trAdd",{})`, { trk: "nero" }, (N) => C.addTagRule(N, "nero", []));
same("delete a tag rule", `act("trDel",{i:"1"})`, {}, (N) => C.deleteTagRule(N, 1));
same("tag earlier transactions", `act("trApply",{i:"0"})`, {}, (N) => C.applyTagRulePast(N, 0));
same("add tags to a tag rule", `tagCommit({dataset:{tk:"rule",ti:"0"}},"Food, #extra, tv")`, {}, (N) => C.addTagRuleTags(N, 0, normList(N, "Food, #extra, tv")));
same("remove a tag from a tag rule", `tagRemove("rule","0",0)`, {}, (N) => C.removeTagRuleTag(N, 0, 0));
same("a tag rule keeps its last tag", `tagRemove("rule","1",0)`, {}, (N) => C.removeTagRuleTag(N, 1, 0));
same("add a name rule", `act("nameRuleAdd",{})`, { nrk: " nero ", nrn: " Coffee ", nrf: "desc", nrm: "eq" }, (N) => C.addNameRule(N, { k: " nero ", n: " Coffee ", f: "desc", m: "eq" }));
same("a name rule needs both texts", `act("nameRuleAdd",{})`, { nrk: "nero", nrn: " ", nrf: "any", nrm: "in" }, (N) => C.addNameRule(N, { k: "nero", n: " ", f: "any", m: "in" }));
same("delete a name rule", `act("nameRuleDel",{i:"0"})`, {}, (N) => C.deleteNameRule(N, 0));
same("add a card payment rule", `act("ccRuleAdd",{})`, { ccr: " Leumi-Card  חיוב. " }, (N) => C.addCardRule(N, " Leumi-Card  חיוב. "));
same("a card rule that exists is refused", `act("ccRuleAdd",{})`, { ccr: "MAX charge" }, (N) => C.addCardRule(N, "MAX charge"));
same("a card rule needs two letters", `act("ccRuleAdd",{})`, { ccr: "a." }, (N) => C.addCardRule(N, "a."));
same("delete a card payment rule", `act("ccRuleDel",{i:"0"})`, {}, (N) => C.deleteCardRule(N, 0));
same("add a salary rule (marks the income you have)", `act("salRuleAdd",{})`, { slr: "WIX" }, (N) => C.addSalaryRule(N, "WIX"));
same("a salary rule with no match", `act("salRuleAdd",{})`, { slr: "acme" }, (N) => C.addSalaryRule(N, "acme"));
same("delete a salary rule", `S.salaryRules=["wix"];act("salRuleDel",{i:"0"})`, {}, (N) => { N.salaryRules = ["wix"]; return C.deleteSalaryRule(N, 0); });

// The edits typed into a rule row (the old change handlers in web/js/09 and 08), with their exact lines.
test("editing a rule row writes the same lines as the current app", () => {
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
test("tags, their counts and the tag rule matches are the same as the current app", () => {
  const B = start(), o = JSON.parse(old.run(`(function(){` + prep + `return JSON.stringify({tags:allTags(),m:S.tagRules.map(r=>tagRuleMatches(r).map(t=>t.id)),n:normTag("TRIP"),n2:normTag("#new")})})()`, { __S: B }));
  assert.deepEqual(C.allTags(B), o.tags);
  assert.deepEqual(B.tagRules.map((r) => C.tagRuleMatches(B, r).map((t) => t.id)), o.m);
  assert.deepEqual([C.normTag(B, "TRIP"), C.normTag(B, "#new")], [o.n, o.n2]);
});
test("the tag editor offers the same tags as the current app", () => {
  const B = start(), all = C.allTags(B);
  assert.deepEqual(C.tagSuggest(all, ["tv"], "").items.map(([g]) => g), all.map(([g]) => g).filter((g) => g != "tv"));
  assert.deepEqual(C.tagSuggest(all, ["tv"], "o"), { items: [["food", 2], ["home", 1]], create: "o" });
  assert.deepEqual(C.tagSuggest(all, [], "#FOOD").create, "");
  assert.deepEqual(C.tagSuggest(all, ["Mine"], "mine").create, "");
});

// ---- the page, drawn like the current app ----
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
  const m = await load(); m.setLang(lang); m.data.state.value = structuredClone(S);
  const app = createSSRApp({ render: () => h(m.V) }); app.use(m.i18n);
  return (await renderToString(app)).replace(/<!--[\s\S]*?-->/g, "");
}
const oldPanes = (S) => JSON.parse(old.run(`(function(){` + prep + stubs + `const OUT={};const el=id=>({style:{},classList:{toggle(){}},set innerHTML(v){OUT[id]=v}});document={getElementById:el,querySelector:()=>null,querySelectorAll:()=>[]};renderSet();return JSON.stringify(OUT)})()`, { __S: S, __V: {} }));
// The inside of <div id="…">, found by counting the divs.
function inner(html, id) {
  const i = html.indexOf(`id="${id}"`), s = html.indexOf(">", i) + 1; let d = 1, j = s;
  const re = /<(\/?)div\b[^>]*>/g; re.lastIndex = s; let m;
  while ((m = re.exec(html))) { d += m[1] ? -1 : 1; if (!d) { j = m.index; break; } }
  return html.slice(s, j);
}
const unesc = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
// Lists of choices and the tag suggestions are filled when opened (the old page lists only the chosen one), so they are left out.
const tidy = (h) => h.replace(/<select([^>]*)>[\s\S]*?<\/select>/g, "<select$1></select>").replace(/<div class="tsug"[^>]*>[\s\S]*?<\/div>/g, '<div class="tsug"></div>');
const text = (h) => unesc(tidy(h).replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
const skeleton = (h) => [...tidy(h).matchAll(/<([a-z0-9]+)([^>]*)>/g)].map(([, tag, at]) => tag + "." + ((/(?:^|\s)class="([^"]*)"/.exec(at) || [])[1] || "").split(/\s+/).filter((c) => c && c != "hi").sort().join("."));
const tips = (h) => [...h.matchAll(/data-tip="([^"]*)"/g)].map((m) => unesc(m[1]));
const PANES = ["setCats", "setRules", "setTags", "setTagrules", "setNames", "setGen"];
// The new page also has the search bar the old one adds after drawing (rsApply); it is checked on its own.
const noBar = (h) => (h.startsWith('<div class="rtool">') ? h.slice(h.indexOf("</div>") + 6) : h);

for (const [name, mk] of [["the test data", () => start()], ["nothing at all", () => ({ ...start(), rules: [], tagRules: [], cardRules: [], salaryRules: [], cfg: { ...start().cfg, nameRules: [] }, tx: [] })]]) {
  test(`every tab has the same blocks, words and tips as the current app: ${name}`, async () => {
    const S = mk(), o = oldPanes(S), html = await page(S, "en");
    for (const id of PANES) {
      const a = o[id], b = noBar(inner(html, id));
      assert.deepEqual(skeleton(b), skeleton(a), id);
      assert.equal(text(b), text(a), id);
      assert.deepEqual(tips(b), tips(a), id);
    }
  });
}
test("the search bars have the old words, and Name rules has none", async () => {
  const html = await page(start(), "en"), bar = (id) => (/<div class="rtool">([\s\S]*?)<\/div>/.exec(inner(html, id)) || [])[1] || "";
  assert.match(bar("setCats"), /placeholder="Search categories…"[\s\S]*placeholder="New category name"[\s\S]*\+ Add category/);
  assert.match(bar("setRules"), /Search rules by text or category…/); assert.match(bar("setTags"), /Search tags…/);
  assert.match(bar("setTagrules"), /Search rules by text or tag…/); assert.match(bar("setGen"), /Search rules…/); assert.equal(bar("setNames"), "");
});
test("the Hebrew page shows no English words from the app (only names from the data)", async () => {
  const S = start(), b = text(await page(S, "he"));
  const names = new Set([...S.tx.flatMap((t) => [t.desc, t.to, t.from, ...t.tags]), ...S.rules.map((r) => r.k), ...S.tagRules.flatMap((r) => [r.k, ...r.t.split(",")]), ...S.cardRules, "wix", "Salary", "Isracard", "Visa", "Cal", "Max", "American", "Express", "Diners", "Leumi", "Card", "salary", "payroll", "netflix", "streaming", "Acme", "Ltd", "Bills", "Food", "Dining", "Fun"].join(" ").toLowerCase().split(/[^a-z]+/));
  const left = (b.match(/[A-Za-z]{2,}/g) || []).filter((w) => !names.has(w.toLowerCase()));
  assert.deepEqual(left, [], "English left on the Hebrew page: " + left.join(", "));
  assert.match(b, /כללי קטגוריות/);
  // the Hebrew dictionary for saved texts loads by itself in Hebrew; wait for it so nothing is still loading when the test ends
  const { tx } = await vite.ssrLoadModule("/src/core/heText.js");
  for (let i = 0; i < 60 && tx("Delete") === "Delete"; i++) await new Promise((r) => setTimeout(r, 50));
});
