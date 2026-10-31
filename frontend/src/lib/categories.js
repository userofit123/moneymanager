// The Categories and tags page's logic: categories, tags, category rules, tag rules, name rules, card rules and money coming in rules.
// Each change works on a copy of the data (S) and returns the change-history lines [action, detail] in English (saved as is, shown in Hebrew through tx(), core/heSaved.js),
// or false when nothing changes. Numbers the page shows afterwards (how many moved) go into `out`.
import { ruleHit, ruleTags, normD, transferIds } from "./activity.js";
import { RULE_KINDS, MARK_EN, inRules } from "./moneyIn.js";
import { FIELDS, USUAL, WHERE_EN, HOW_EN, isWhere, isHow, fieldText, ruleText, ruleWhere, ruleHow, textMatch } from "./ruleFields.js";

export { ruleTags };
const CNC = new Intl.Collator(undefined, { sensitivity: "base" });
const pl = (n, w) => n + " " + w + (n == 1 ? "" : "s");

// ---- what the page shows ----
// How many transactions each category has (uncategorized transfers are not counted), like renderSet's catCount.
export function catCounts(S) {
  const xs = transferIds(S), m = {};
  for (const t of S.tx || []) { if (t.virtual) continue; const k = t.c || "Uncategorized"; if (k == "Uncategorized" && xs.has(t.id)) continue; m[k] = (m[k] || 0) + 1; }
  return m;
}
// The category tiles: Uncategorized last, the most used first, otherwise in name order.
export function catTiles(S) {
  const n = catCounts(S);
  return Object.keys(S.cats || {}).sort(CNC.compare).sort((a, b) => (a == "Uncategorized") - (b == "Uncategorized") || (n[b] || 0) - (n[a] || 0)).map((k) => ({ k, n: n[k] || 0, letter: (Array.from(k)[0] || "?").toUpperCase() }));
}
// Tags used anywhere with their counts, the most used first (tags only in tag rules count 0).
// Every tag in use (with how often) and "#food" → the tag already in use: the shared ones in lib/activity.js.
export { allTags, normTag } from "./activity.js";
import { allTags } from "./activity.js";
// The tag tiles, and which tags a tag rule adds.
export function tagTiles(S) {
  const by = new Set((S.tagRules || []).flatMap(ruleTags));
  return allTags(S).map(([g, n]) => ({ g, n, rule: by.has(g) }));
}
// What the tag editor offers: existing tags not on the item that contain the typed text (up to 40), and whether to offer "Create".
export function tagSuggest(all, cur, typed) {
  const have = cur.map((x) => x.toLowerCase()), q = String(typed || "").trim().replace(/^#+/, ""), lc = q.toLowerCase();
  const items = all.filter(([t]) => !have.includes(t.toLowerCase()) && (!lc || t.toLowerCase().includes(lc))).slice(0, 40);
  const create = q && !all.some(([t]) => t.toLowerCase() == lc) && !have.includes(lc) ? q : "";
  return { items, create };
}

// ---- categories ----
// Checks a new category name: { err: "empty" | "dup" } or { n } (the name to add). "dup": one exists already, in any case.
export function addCategoryCheck(S, name) {
  const n = String(name || "").trim().slice(0, 60);
  if (!n) return { err: "empty" };
  if (Object.keys(S.cats || {}).some((x) => x.toLowerCase() == n.toLowerCase())) return { err: "dup", ex: Object.keys(S.cats).find((x) => x.toLowerCase() == n.toLowerCase()) };
  return { n };
}
export function addCategory(S, name) {
  const n = String(name || "").trim();
  if (!n || S.cats[n]) return false;
  S.cats[n] = Object.keys(S.cats).length % 7;
  return [["Added category", n]];
}
// Checks a new name: { err: "empty" | "reserved" } or { same } or { tg, ex } (ex: another category with that name, any case).
export function renameCheck(S, k, value) {
  const n = String(value || "").trim().slice(0, 60);
  if (!n) return { err: "empty" };
  if (n == k) return { same: true };
  if (n.toLowerCase() == "uncategorized") return { err: "reserved" };
  const ex = Object.keys(S.cats).find((x) => x.toLowerCase() == n.toLowerCase() && x != k);
  return { tg: ex || n, ex: ex || "" };
}
// Renames (or merges) a category on every transaction, rule, budget, bill and jar.
export function renameCategory(S, k, tg) {
  if (S.cats[tg] == null) S.cats[tg] = S.cats[k];
  delete S.cats[k];
  let c = 0;
  for (const t of S.tx) if (t.c == k) { t.c = tg; c++; }
  for (const r of S.rules) if (r.c == k) r.c = tg;
  if (k in S.budgets) { if (!(tg in S.budgets)) S.budgets[tg] = S.budgets[k]; delete S.budgets[k]; }
  for (const b of S.bills || []) if (b.cat == k) b.cat = tg;
  for (const j of S.jars || []) if (j.cats) { for (const x of j.cats) if (x.c == k) x.c = tg; const seen = new Set(); j.cats = j.cats.filter((x) => !seen.has(x.c) && seen.add(x.c)); }
  return [["Renamed category", `${k} → ${tg} · ${pl(c, "transaction")}`]];
}
// Its transactions become uncategorized; its rules and budget go. Bills and jars keep the name.
export function deleteCategory(S, k) {
  delete S.cats[k];
  for (const t of S.tx) if (t.c == k) t.c = "";
  S.rules = S.rules.filter((r) => r.c != k);
  delete S.budgets[k];
  return [["Deleted category", k]];
}

// ---- tags ----
// Checks a new tag ("#trip" and "trip" are the same): { err: "empty" | "dup", ex } or { g } (the tag to add).
export function addTagCheck(S, name) {
  const g = String(name || "").trim().replace(/^#+/, "").trim().slice(0, 60);
  if (!g) return { err: "empty" };
  const ex = allTags(S).find(([x]) => x.toLowerCase() == g.toLowerCase());
  return ex ? { err: "dup", ex: ex[0] } : { g };
}
// A tag kept in the tag list, so it shows (and can be picked) before any transaction has it.
export function addTag(S, g) {
  if (!g || addTagCheck(S, g).err) return false;
  S.tagList = [...(S.tagList || []), g];
  return [["Added tag", "#" + g]];
}
export const tagUses = (S, g) => S.tx.filter((t) => (t.tags || []).includes(g)).length;
export function renameTag(S, g, n) {
  let c = 0;
  for (const t of S.tx) { const i = (t.tags || []).indexOf(g); if (i >= 0) { t.tags.splice(i, 1); if (!t.tags.includes(n)) t.tags.splice(i, 0, n); c++; } }
  for (const r of S.tagRules) { const L = ruleTags(r), i = L.indexOf(g); if (i >= 0) { L.splice(i, 1, n); r.t = [...new Set(L)].join(","); } }
  if (S.tagList) S.tagList = [...new Set(S.tagList.map((x) => (x == g ? n : x)))];
  return [["Renamed tag", `#${g} → #${n} · ${pl(c, "transaction")}`]];
}
export function deleteTag(S, g) {
  for (const t of S.tx) if (t.tags) t.tags = t.tags.filter((x) => x != g);
  for (const r of S.tagRules) r.t = ruleTags(r).filter((x) => x != g).join(",");
  S.tagRules = S.tagRules.filter((r) => r.t);
  if (S.tagList) S.tagList = S.tagList.filter((x) => x != g);
  return [["Deleted tag", "#" + g]];
}

// ---- category rules ----
export const ruleExists = (S, k) => S.rules.some((r) => r.k.toLowerCase() == k.toLowerCase());
// f: where the rule looks (lib/ruleFields.js); left out when it is the usual place for this kind of rule.
// m: how it compares its text; left out when it is "contains" (as before).
const own = (f, kind, m) => ({ ...(isWhere(f) && f != USUAL[kind] ? { f } : {}), ...(isHow(m) && m != "in" ? { m } : {}) });
export function addRule(S, k, c, f, m) {
  k = String(k || "").trim();
  if (!k || ruleExists(S, k)) return false;
  S.rules.push({ k, c, t: "", ...own(f, "cat", m) });
  return [["Added rule", '"' + k + '" → ' + c]];
}
export function deleteRule(S, i) { const r = S.rules.splice(+i, 1)[0]; return r ? [["Deleted rule", '"' + r.k + '" → ' + r.c]] : false; }
export function setRuleText(S, i, v) {
  const r = S.rules[+i]; v = String(v).trim();
  if (!r || !v || v == r.k) return false;
  const line = ["Changed rule", '"' + r.k + '" → "' + v + '"'];
  r.k = v;
  return [line];
}
// Past transactions still in the old category that the rule's text matches (offered to move after a category change).
export const ruleMoveCount = (S, k, old, f, m) => S.tx.filter((x) => !x.virtual && x.c == old && ruleHit(x, k, f, m)).length;
export function setRuleCat(S, i, c) {
  const r = S.rules[+i];
  if (!r || r.c == c) return false;
  const old = r.c; r.c = c;
  return [["Changed rule", '"' + r.k + '" → ' + c + " (was " + old + ")"]];
}
export function applyRulePast(S, i, old, out = {}) {
  const r = S.rules[+i]; if (!r) return false;
  let n = 0;
  for (const t of S.tx) if (!t.virtual && t.c == old && ruleHit(t, r.k, r.f, r.m)) { t.c = r.c; n++; }
  out.n = n; out.c = r.c;
  return [["Updated past transactions", n + ' · "' + r.k + '" → ' + r.c]];
}
export const uncategorized = (S) => S.tx.filter((t) => !t.c).length;

// ---- tag rules ----
// Transactions the rule's text matches that miss at least one of its tags.
export function tagRuleMatches(S, r) { const kw = r.k.toLowerCase(), tags = ruleTags(r); return S.tx.filter((t) => !t.virtual && ruleHit(t, kw, r.f, r.m) && tags.some((g) => !(t.tags || []).includes(g))); }
export function addTagRule(S, k, tags, f, m) {
  k = String(k || "").trim();
  if (!k || !tags.length) return false;
  const r = { k, t: tags.join(","), ...own(f, "tag", m) };
  S.tagRules.push(r);
  return [["Added tag rule", '"' + k + '" → ' + r.t]];
}
export function deleteTagRule(S, i) { const r = S.tagRules.splice(+i, 1)[0]; return r ? [["Deleted tag rule", '"' + r.k + '" → ' + r.t]] : false; }
export function setTagRuleText(S, i, v) {
  const r = S.tagRules[+i]; v = String(v).trim();
  if (!r || !v || v == r.k) return false;
  const line = ["Changed tag rule", '"' + r.k + '" → "' + v + '"'];
  r.k = v;
  return [line];
}
// list: the tags typed (already made the same as tags in use)
export function addTagRuleTags(S, i, list) {
  const r = S.tagRules[+i]; if (!r) return false;
  const tg = ruleTags(r), add = list.filter((g) => !tg.includes(g));
  if (!add.length) return false;
  r.t = [...tg, ...add].join(",");
  return [["Changed tag rule", '"' + r.k + '" tags: ' + r.t]];
}
// false when it is the rule's last tag (a rule needs one)
export function removeTagRuleTag(S, i, at) {
  const r = S.tagRules[+i]; if (!r) return false;
  const L = ruleTags(r); L.splice(at, 1);
  if (!L.length) return false;
  r.t = L.join(",");
  return [["Changed tag rule", '"' + r.k + '" tags: ' + r.t]];
}
export function applyTagRulePast(S, i, out = {}) {
  const r = S.tagRules[+i]; if (!r) return false;
  const tags = ruleTags(r), kw = r.k.toLowerCase();
  let n = 0;
  if (tags.length) for (const t of S.tx) { if (t.virtual || !ruleHit(t, kw, r.f, r.m)) continue; t.tags = t.tags || []; let ch = false; for (const g of tags) if (!t.tags.includes(g)) { t.tags.push(g); ch = true; } if (ch) n++; }
  out.n = n;
  return [["Tagged past transactions", n + ' · "' + r.k + '" → ' + r.t]];
}

// ---- name rules ----
export const NFIELDS = FIELDS;
export function addNameRule(S, { k, n, f, m }) {
  k = String(k || "").trim(); n = String(n || "").trim();
  if (!k || !n) return false;
  S.cfg.nameRules = S.cfg.nameRules || [];
  S.cfg.nameRules.push({ k, n, f, m });
  return [["Added name rule", '"' + k + '" → ' + n]];
}
export function deleteNameRule(S, i) { const r = (S.cfg.nameRules || []).splice(+i, 1)[0]; return r ? [["Deleted name rule", '"' + r.k + '" → ' + r.n]] : false; }
// field: k (text), n (name), f (where to look), m (in / eq). Saved even when left empty (the page warns).
export function setNameRule(S, i, field, v) {
  const r = (S.cfg.nameRules || [])[+i]; if (!r) return false;
  r[field] = field == "k" || field == "n" ? String(v).trim() : v;
  return [["Changed name rule", r.k + " → " + r.n]];
}

// ---- card payment and salary rules ----
// Card payments the app knows by itself, shown under the card rules.
export const CARD_NAMES = ["Isracard · ישראכרט", "Visa Cal · כ.א.ל · ויזה כאל", "Max · מקס · מקס איט פי", "American Express · אמריקן אקספרס", "Diners · דיינרס", "Leumi Card · לאומי קארד"];
// "short" (less than 2 letters) or "dup", or "" when the text can be added
export const genCheck = (list, v) => { const x = normD(v); return x.length < 2 ? "short" : (list || []).map((r) => normD(ruleText(r))).includes(x) ? "dup" : ""; };
// A card rule is saved as its text, or { k, f, m } when it looks somewhere other than the usual place or does not just contain.
export function addCardRule(S, v, f, m) {
  if (genCheck(S.cardRules, v)) return false;
  const txt = normD(v), w = own(f, "card", m);
  S.cardRules = [...(S.cardRules || []), w.f || w.m ? { k: txt, ...w } : txt];
  return [["Card payment rule", '"' + txt + '" counts as a card payment']];
}
// Changes a card rule's text (kept with its where and how); false when it is too short or already a rule.
export function setCardRuleText(S, i, v) {
  const L = S.cardRules || [], r = L[+i]; if (r == null) return false;
  const old = ruleText(r), txt = normD(v);
  if (txt == old || genCheck(L.filter((_, j) => j != +i), v)) return false;
  S.cardRules = L.map((x, j) => (j == +i ? (typeof x == "object" ? { ...x, k: txt } : txt) : x));
  return [["Changed card payment rule", '"' + old + '" → "' + txt + '"']];
}
export function deleteCardRule(S, i) { if (!S.cardRules || S.cardRules[+i] == null) return false; const line = ["Removed card payment rule", '"' + ruleText(S.cardRules[+i]) + '"']; S.cardRules.splice(+i, 1); return [line]; }

// ---- money coming in rules (Settings → Money coming in): text → Salary or Money back ----
// S.moneyInRules [{ k: text (normD), kind: one of RULE_KINDS }], read through inRules (lib/moneyIn.js).
export const inRuleCheck = (S, v) => genCheck(inRules(S).map((r) => r.k), v);
// Money coming in (not a move between your own accounts, xs: transferIds) whose name or payer holds the text (already normD).
// f, m: where the rule looks and how it compares, when the person chose them.
export const inHit = (x, txt, xs, f, m) => !x.virtual && x.a > 0 && !xs.has(x.id) && textMatch(normD(f ? fieldText(x, f) : x.desc + " " + (x.from || "")), txt, m);
// Adds a rule (it changes no entry: the app reads the rules each time). out.n: how many entries it matches now.
export function addInRule(S, v, kind, out = {}, f, m) {
  if (!RULE_KINDS.includes(kind) || inRuleCheck(S, v)) return false;
  const txt = normD(v), xs = transferIds(S), w = own(f, "in", m);
  S.moneyInRules = [...inRules(S), { k: txt, kind, ...w }];
  out.n = S.tx.filter((x) => inHit(x, txt, xs, w.f, w.m)).length;
  return [["Money coming in rule", '"' + txt + '" → ' + MARK_EN[kind]]];
}
export function setInRuleKind(S, i, kind) {
  const L = inRules(S), r = L[+i]; if (!r || r.kind == kind || !RULE_KINDS.includes(kind)) return false;
  S.moneyInRules = L.map((x, j) => (j == +i ? { ...x, kind } : x));
  return [["Changed money coming in rule", '"' + r.k + '" → ' + MARK_EN[kind]]];
}
// Changes a money coming in rule's text (kept with its kind, where and how); false when too short or already a rule.
export function setInRuleText(S, i, v) {
  const L = inRules(S), r = L[+i]; if (!r) return false;
  const txt = normD(v);
  if (txt == r.k || genCheck(L.filter((_, j) => j != +i).map((x) => x.k), v)) return false;
  S.moneyInRules = L.map((x, j) => (j == +i ? { ...x, k: txt } : x));
  return [["Changed money coming in rule", '"' + r.k + '" → "' + txt + '"']];
}
export function deleteInRule(S, i) {
  const L = inRules(S), r = L[+i]; if (!r) return false;
  S.moneyInRules = L.filter((_, j) => j != +i);
  return [["Removed money coming in rule", '"' + r.k + '" → ' + MARK_EN[r.kind]]];
}

// ---- where a rule looks and how it compares (category, tag, card payment and money coming in rules) ----
// kind: cat, tag, card or in. key: "f" (where, one of whereOptions(kind) in lib/ruleFields.js) or "m" (how, one of HOWS).
// The usual place and "contains" are saved as no choice, so the rule reads exactly what it read before the choice existed.
export function setRuleMatch(S, kind, i, key, v) {
  if (key == "f" ? !isWhere(v) : key == "m" ? !isHow(v) : true) return false;
  const usual = key == "f" ? USUAL[kind] : "in", cur = (r) => (key == "f" ? ruleWhere(r, kind) : ruleHow(r));
  const set = (x) => { const { [key]: _, ...rest } = x; return v == usual ? rest : { ...rest, [key]: v }; };
  let r;
  if (kind == "cat" || kind == "tag") {
    const L = kind == "cat" ? S.rules : S.tagRules; r = L[+i]; if (!r || cur(r) == v) return false;
    L[+i] = set(r);
  } else if (kind == "card") {
    r = (S.cardRules || [])[+i]; if (r == null || cur(r) == v) return false;
    const o = set(typeof r == "object" ? r : { k: r });
    S.cardRules = S.cardRules.map((x, j) => (j == +i ? (o.f || o.m ? o : o.k) : x));
  } else if (kind == "in") {
    const L = inRules(S); r = L[+i]; if (!r || cur(r) == v) return false;
    S.moneyInRules = L.map((x, j) => (j == +i ? set(x) : x));
  } else return false;
  const k = '"' + ruleText(r) + '"';
  return [key == "f" ? ["Changed where a rule looks", k + " looks in: " + WHERE_EN[v]] : ["Changed how a rule matches", k + " match: " + HOW_EN[v]]];
}
