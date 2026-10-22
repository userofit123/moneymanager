// Sorting with an AI chat: the person downloads the texts of their own transactions, an AI of their choice turns them into
// categories, category rules and tag rules, and the file it gives back is checked here and added. Nothing is overwritten.
import { ruleHit, ruleTags, normTag } from "./activity.js";
import { ruleExists } from "./categories.js";

export const LIMITS = { cats: 200, rules: 5000, tagRules: 5000, name: 40, text: 60 };
const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
const low = (v) => clean(v).toLowerCase();

// What goes to the AI: each different transaction text once, how often it appears and whether money went out or came in.
// No amounts, dates or accounts. The person's own category and tag names are included so the AI can reuse them.
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
  return { language, myCategories: Object.keys(S?.cats || {}).filter((k) => k != "Uncategorized"), myTags: [...new Set((S?.tagRules || []).flatMap(ruleTags))], texts };
}

// The shape the AI is asked to answer in (the names are examples, given in the person's language).
export const answerExample = ({ cat, inc, tag, shop, stay }) => JSON.stringify({
  categories: [{ name: cat, income: false }, { name: inc, income: true }],
  rules: [{ contains: shop, category: cat }],
  tagRules: [{ contains: stay, tags: [tag] }],
}, null, 2);

// The AI's answer: the JSON itself, or a chat reply with the JSON inside it (often in a ``` block).
function readJson(raw) {
  const s = String(raw || "");
  try { return JSON.parse(s); } catch { /* look for the JSON inside */ }
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}

// Checks the answer against what is already there: { error: "bad" } or { plan: { cats, rules, tagRules }, skipped }.
// cats: [{ name, income }] new ones only; rules: [{ k, c }]; tagRules: [{ k, tags }]. A category name that exists in another case is the existing one.
export function readAnswer(S, raw) {
  const j = readJson(raw);
  if (!j || typeof j != "object" || ![j.categories, j.rules, j.tagRules].some(Array.isArray)) return { error: "bad" };
  let skipped = 0;
  const known = new Map(Object.keys(S.cats || {}).map((k) => [k.toLowerCase(), k]));
  const cats = [];
  for (const x of (Array.isArray(j.categories) ? j.categories : []).slice(0, LIMITS.cats)) {
    const name = clean(x?.name);
    if (!name || name.length > LIMITS.name) { skipped++; continue; }
    if (known.has(name.toLowerCase())) continue;
    known.set(name.toLowerCase(), name);
    cats.push({ name, income: x.income === true });
  }
  const rules = [], seen = new Set();
  for (const x of (Array.isArray(j.rules) ? j.rules : []).slice(0, LIMITS.rules)) {
    const k = clean(x?.contains), c = known.get(low(x?.category));
    if (k.length < 2 || k.length > LIMITS.text || !c) { skipped++; continue; }
    if (ruleExists(S, k) || seen.has(k.toLowerCase())) continue;
    seen.add(k.toLowerCase());
    rules.push({ k, c });
  }
  const tagRules = [], seenT = new Set((S.tagRules || []).map((r) => low(r.k) + "|" + ruleTags(r).map(low).sort().join(",")));
  for (const x of (Array.isArray(j.tagRules) ? j.tagRules : []).slice(0, LIMITS.tagRules)) {
    const k = clean(x?.contains), tags = [...new Set((Array.isArray(x?.tags) ? x.tags : []).map((g) => normTag(S, clean(g))).filter((g) => g && g.length <= LIMITS.name))];
    if (k.length < 2 || k.length > LIMITS.text || !tags.length) { skipped++; continue; }
    const key = k.toLowerCase() + "|" + tags.map(low).sort().join(",");
    if (seenT.has(key)) continue;
    seenT.add(key);
    tagRules.push({ k, tags });
  }
  return { plan: { cats, rules, tagRules }, skipped };
}

// Leaves out the new categories the person unchecked, with their rules.
export function choose(plan, off) {
  const drop = new Set(off);
  return { cats: plan.cats.filter((x) => !drop.has(x.name)), rules: plan.rules.filter((r) => !drop.has(r.c)), tagRules: plan.tagRules };
}

// How many entries with no category the new rules would sort (the first matching rule wins, as everywhere).
export const wouldSort = (S, plan) => (S.tx || []).filter((t) => !t.virtual && !t.c && plan.rules.some((r) => ruleHit(t, r.k))).length;

// Adds the plan: categories, rules after the person's own, tag rules; then sorts the entries that have no category yet and adds
// the new tags to the entries that match. Entries the person sorted by hand keep their category. Returns the change-history line.
export function addAnswer(S, plan) {
  if (!plan.cats.length && !plan.rules.length && !plan.tagRules.length) return false;
  let n = Object.keys(S.cats).length;
  for (const x of plan.cats) S.cats[x.name] = x.income ? 99 : n++ % 7;
  for (const r of plan.rules) S.rules.push({ k: r.k, c: r.c, t: "" });
  for (const r of plan.tagRules) S.tagRules.push({ k: r.k, t: r.tags.join(",") });
  let sorted = 0;
  for (const t of S.tx) {
    if (t.virtual) continue;
    if (!t.c) { const r = plan.rules.find((x) => ruleHit(t, x.k)); if (r) { t.c = r.c; sorted++; } }
    for (const r of plan.tagRules) if (ruleHit(t, r.k)) t.tags = [...new Set([...(t.tags || []), ...r.tags])];
  }
  return [["Added categories from an AI file", `${plan.cats.length} categories, ${plan.rules.length} rules, ${plan.tagRules.length} tag rules, ${sorted} sorted`]];
}
