// Sorting with an AI chat: the person downloads the texts of their own transactions, an AI of their choice turns them into
// categories, category rules, tag rules, display names, card payment texts and salary texts, and the file it gives back is
// checked here and added. Nothing is overwritten.
import { ruleHit, ruleTags, normTag, normD, transferIds } from "./activity.js";
import { CAT_HE } from "../catnames.js";
import { ruleExists, genCheck, addSalaryRule, salaryHit } from "./categories.js";

export const LIMITS = { cats: 200, rules: 5000, tagRules: 5000, names: 2000, cards: 50, salary: 50, name: 40, text: 60, mine: 300 };
// The kinds of rows in a plan, in the order the preview shows them.
export const KINDS = ["cats", "rules", "tagRules", "names", "cards", "salary"];
const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
const low = (v) => clean(v).toLowerCase();

// What goes to the AI: each different transaction text once, how often it appears and whether money went out or came in.
// No amounts, dates or accounts. The person's own categories, tags, display names, card payment and salary texts are included
// so the AI can reuse them and does not repeat them.
export function exportTexts(S, language) {
  const by = new Map();
  for (const t of S?.tx || []) {
    if (t.virtual) continue;
    const text = clean(t.desc || (t.a < 0 ? t.to : t.from));
    if (!text) continue;
    const k = low(text) + (t.a < 0 ? "|out" : "|in"), e = by.get(k);
    if (e) e.times++; else by.set(k, { text, times: 1, money: t.a < 0 ? "out" : "in" });
  }
  const texts = [...by.values()].sort((a, b) => b.times - a.times || a.text.localeCompare(b.text));
  const mine = (xs) => xs.slice(0, LIMITS.mine);
  return {
    language, myCategories: Object.keys(S?.cats || {}).filter((k) => k != "Uncategorized"), myTags: [...new Set((S?.tagRules || []).flatMap(ruleTags))],
    myDisplayNames: mine((S?.cfg?.nameRules || []).map((r) => ({ contains: r.k, name: r.n }))), myCardPayments: mine(S?.cardRules || []), mySalary: mine(S?.salaryRules || []),
    texts,
  };
}

// The shape the AI is asked to answer in (the values are examples, given in the person's language).
export const answerExample = ({ cat, inc, tag, shop, stay, messy, shown, card, pay }) => JSON.stringify({
  categories: [{ name: cat, income: false }, { name: inc, income: true }],
  rules: [{ contains: shop, category: cat }],
  tagRules: [{ contains: stay, tags: [tag] }],
  displayNames: [{ contains: messy, name: shown }],
  cardPayments: [card],
  salary: [pay],
}, null, 2);

// The AI's answer: the JSON itself, or a chat reply with the JSON inside it (often in a ``` block).
function readJson(raw) {
  const s = String(raw || "");
  try { return JSON.parse(s); } catch { /* look for the JSON inside */ }
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}

// Checks the answer against what is already there: { error: "bad" } or { plan, skipped }. The plan holds new rows only:
// cats [{ name, income }], rules [{ k, c }], tagRules [{ k, tags }], names [{ k, n }], cards [text], salary [text].
// A category name that exists in another case is the existing one. Rows already there are left out without counting.
export function readAnswer(S, raw) {
  const j = readJson(raw), list = (v) => (Array.isArray(v) ? v : []);
  if (!j || typeof j != "object" || ![j.categories, j.rules, j.tagRules, j.displayNames, j.cardPayments, j.salary].some(Array.isArray)) return { error: "bad" };
  let skipped = 0;
  // A name the AI wrote in Hebrew for a category that exists under its English name (shown in Hebrew, e.g. "משכורת" for Salary) is that category.
  const known = new Map(Object.keys(S.cats || {}).flatMap((k) => [[k.toLowerCase(), k], ...(CAT_HE[k] ? [[CAT_HE[k].toLowerCase(), k]] : [])]));
  const cats = [];
  for (const x of list(j.categories).slice(0, LIMITS.cats)) {
    const name = clean(x?.name);
    if (!name || name.length > LIMITS.name) { skipped++; continue; }
    if (known.has(name.toLowerCase())) continue;
    known.set(name.toLowerCase(), name);
    cats.push({ name, income: x.income === true });
  }
  const okText = (k) => k.length >= 2 && k.length <= LIMITS.text;
  const rules = [], seen = new Set();
  for (const x of list(j.rules).slice(0, LIMITS.rules)) {
    const k = clean(x?.contains), c = known.get(low(x?.category));
    if (!okText(k) || !c) { skipped++; continue; }
    if (ruleExists(S, k) || seen.has(k.toLowerCase())) continue;
    seen.add(k.toLowerCase());
    rules.push({ k, c });
  }
  const tagRules = [], seenT = new Set((S.tagRules || []).map((r) => low(r.k) + "|" + ruleTags(r).map(low).sort().join(",")));
  for (const x of list(j.tagRules).slice(0, LIMITS.tagRules)) {
    const k = clean(x?.contains), tags = [...new Set(list(x?.tags).map((g) => normTag(S, clean(g))).filter((g) => g && g.length <= LIMITS.name))];
    if (!okText(k) || !tags.length) { skipped++; continue; }
    const key = k.toLowerCase() + "|" + tags.map(low).sort().join(",");
    if (seenT.has(key)) continue;
    seenT.add(key);
    tagRules.push({ k, tags });
  }
  const names = [], seenN = new Set((S.cfg?.nameRules || []).map((r) => low(r.k)));
  for (const x of list(j.displayNames).slice(0, LIMITS.names)) {
    const k = clean(x?.contains), n = clean(x?.name);
    if (!okText(k) || !n || n.length > LIMITS.name) { skipped++; continue; }
    if (seenN.has(k.toLowerCase())) continue;
    seenN.add(k.toLowerCase());
    names.push({ k, n });
  }
  // Card payment and salary texts: the same checks as adding one by hand (genCheck), saved the same way (normD).
  const texts = (xs, have, max) => {
    const out = [], all = [...(have || [])];
    for (const x of list(xs).slice(0, max)) {
      const v = clean(typeof x == "string" ? x : x?.contains), why = genCheck(all, v);
      if (why == "short" || normD(v).length > LIMITS.text) { skipped++; continue; }
      if (why == "dup") continue;
      all.push(normD(v)); out.push(normD(v));
    }
    return out;
  };
  const cards = texts(j.cardPayments, S.cardRules, LIMITS.cards), salary = texts(j.salary, S.salaryRules, LIMITS.salary);
  return { plan: { cats, rules, tagRules, names, cards, salary }, skipped };
}

// How many rows a plan holds.
export const planSize = (plan) => KINDS.reduce((n, k) => n + (plan?.[k] || []).length, 0);

// Each row's key within its kind (what the person unchecks).
export const rowKey = (kind, x) => (kind == "cats" ? x.name : kind == "tagRules" ? x.k + "|" + x.tags.join(",") : kind == "cards" || kind == "salary" ? x : x.k);
// off: the unchecked rows, { kind: [keys] } (an array alone is unchecked category names). A category rule is off with its category.
const offSets = (off) => {
  const o = Array.isArray(off) ? { cats: off } : off || {};
  return Object.fromEntries(KINDS.map((k) => [k, new Set(o[k] || [])]));
};
export function rowState(off, kind, x) {
  const o = offSets(off), locked = kind == "rules" && o.cats.has(x.c);
  return { on: !locked && !o[kind].has(rowKey(kind, x)), locked };
}
// Checks or unchecks rows (keys) of one kind; gives back a new off.
export function flip(off, kind, keys, on) {
  const o = offSets(off), s = o[kind];
  for (const k of keys) if (on) s.delete(k); else s.add(k);
  return Object.fromEntries(KINDS.map((k) => [k, [...o[k]]]));
}
// Leaves out the rows the person unchecked; the rules of an unchecked new category go with it.
export function choose(plan, off) {
  const out = {};
  for (const k of KINDS) out[k] = (plan[k] || []).filter((x) => rowState(off, k, x).on);
  return out;
}

// How many entries with no category it would sort: the new rules (the first matching rule wins, as everywhere), then the salary texts.
export function wouldSort(S, plan) {
  const xs = transferIds(S), sal = plan.salary || [];
  return (S.tx || []).filter((t) => !t.virtual && ((!t.c && plan.rules.some((r) => ruleHit(t, r.k))) || sal.some((v) => salaryHit(t, v, xs)))).length;
}

// Adds the plan: categories, rules after the person's own, tag rules, display names, card payment and salary texts; then sorts
// the entries that have no category yet, adds the new tags to the entries that match, and marks matching income with no category
// as Salary (as adding a salary text by hand does). Entries the person sorted by hand keep their category. Returns the change-history line.
export function addAnswer(S, plan) {
  const p = Object.fromEntries(KINDS.map((k) => [k, plan[k] || []]));
  if (!planSize(p)) return false;
  let n = Object.keys(S.cats).length;
  for (const x of p.cats) S.cats[x.name] = x.income ? 99 : n++ % 7;
  for (const r of p.rules) S.rules.push({ k: r.k, c: r.c, t: "" });
  for (const r of p.tagRules) S.tagRules.push({ k: r.k, t: r.tags.join(",") });
  if (p.names.length) { S.cfg = S.cfg || {}; S.cfg.nameRules = [...(S.cfg.nameRules || []), ...p.names.map((r) => ({ k: r.k, n: r.n, f: "any", m: "in" }))]; }
  for (const v of p.cards) S.cardRules = [...(S.cardRules || []), v];
  let sorted = 0;
  for (const t of S.tx) {
    if (t.virtual) continue;
    if (!t.c) { const r = p.rules.find((x) => ruleHit(t, x.k)); if (r) { t.c = r.c; sorted++; } }
    for (const r of p.tagRules) if (ruleHit(t, r.k)) t.tags = [...new Set([...(t.tags || []), ...r.tags])];
  }
  for (const v of p.salary) { const o = {}; if (addSalaryRule(S, v, o)) sorted += o.n; }
  return [["Added categories from an AI file", `${p.cats.length} categories, ${p.rules.length} rules, ${p.tagRules.length} tag rules, ${p.names.length} display names, ${p.cards.length} card payment rules, ${p.salary.length} salary rules, ${sorted} sorted`]];
}
