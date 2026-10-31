// What each money coming in is: income (sub "salary" when it is a salary) or back (money back: not income, and the
// purchase still counts in full). Nothing is guessed from words or shops: money back is only money that came in on a
// credit card, or what the person chose (in the entry's window or a money coming in rule); salary only comes from the
// person's choice or rule. Money moved between your own accounts (transfers) is not here: it is not counted at all.
// Nothing here changes the data or the screen.
import { transferIds, normD } from "./activity.js";

export const KINDS = ["income", "back"];
// What a money coming in rule can set (Settings → Money coming in).
export const RULE_KINDS = ["salary", "back"];
// Choices saved by an older version of the app, read as today's (own money is no longer a choice: the app decides).
const OLD = { earned: "income", people: "income", other: "income", own: "" };
const fix = (v) => (v in OLD ? OLD[v] : v);
// Rules saved by an older version: earned and salary → Salary, back → Money back, the rest are dropped.
const ruleKind = (v) => (v == "earned" ? "salary" : RULE_KINDS.includes(v) ? v : "");

// The money coming in rules (Settings → Money coming in): [{ k: text, kind: "salary" | "back" }]. Before they existed,
// salary texts (S.salaryRules) did this job: the server moves them over once (→ Salary); until it has, they are read as such.
export const inRules = (S) => (Array.isArray(S?.moneyInRules) ? S.moneyInRules.map((r) => ({ ...r, kind: ruleKind(r?.kind) })).filter((r) => r.kind) : (S?.salaryRules || []).map((k) => ({ k, kind: "salary" })));
const kindOf = (v) => (v == "salary" ? { kind: "income", sub: "salary" } : v == "back" ? { kind: "back" } : v == "income" ? { kind: "income" } : null);

// The kind of every money coming in (a > 0, not a transfer) in S.tx, as a Map of entry id → { kind, sub?, why, rule? }.
// sub: "salary" for a salary. why: what decided it, tried in this order:
//   "chosen" the person's choice on the entry (t.mk, or S.inMark[id], where the app saves it) ·
//   "rule" a money coming in rule (its text, rule, is in the entry's name or payer) · "card" it came in on a credit card ·
//   "income" anything else.
export function moneyIn(S) {
  const tx = S?.tx || [], S1 = { ...S, tx, accounts: S?.accounts || [] }, xs = transferIds(S1);
  const acc = new Map(S1.accounts.map((a) => [a.n, a.kind]));
  const rules = inRules(S1).map((r) => ({ k: normD(r?.k), raw: String(r?.k || "").trim(), o: kindOf(r.kind) })).filter((r) => r.k.length > 0);
  // the bank's note is read too: some banks put the real payer there (the name says only "זיכוי", the note "המבצע: <payer>")
  const ruleOf = (t) => { const h = normD(t.desc + " " + (t.from || "") + " " + (t.memo || "")); return rules.find((r) => h.includes(r.k)); };
  const out = new Map();
  for (const t of tx) {
    if (!(t.a > 0) || t.virtual || xs.has(t.id)) continue;
    const own = kindOf(fix(t.mk || S1.inMark?.[t.id] || "")); if (own) { out.set(t.id, { ...own, why: "chosen" }); continue; }
    const r = ruleOf(t); if (r) { out.set(t.id, { ...r.o, why: "rule", rule: r.raw }); continue; }
    out.set(t.id, acc.get(t.to) == "card" ? { kind: "back", why: "card" } : { kind: "income", why: "income" });
  }
  return out;
}

// moneyIn(S), worked out once and kept while the entries, accounts, transfers, rules and choices stay the same (every
// change makes new entries, so a change always works it out again).
const memo = new WeakMap(), NONE = [];
export function inKinds(S) {
  const tx = S?.tx || NONE, key = [S?.accounts, S?.xf, S?.salaryRules, S?.moneyInRules, S?.inMark], m = memo.get(tx);
  if (m && m.key.every((x, i) => x === key[i])) return m.out;
  const out = moneyIn(S); memo.set(tx, { key, out }); return out;
}

// How a money coming in counts: "in" money in (income, salary too) or "back" money back (its own total).
export const partOf = (r) => (r?.kind == "back" ? "back" : "in");

// The counted row for money coming in (t.a > 0). r: its moneyIn entry. Money back gets back: true, a salary sal: true.
export const inRow = (t, r) => (partOf(r) == "back" ? { ...t, back: true } : r?.sub == "salary" ? { ...t, sal: true } : t);

// For counted rows (countedTx): money in (not money back), and spending (money back does not lower it).
export const isIn = (t) => t.a > 0 && !t.back;
export const isOut = (t) => t.a < 0;

// Counted rows split: in (all money in, salary too), its salary part, and back (money back, its own total).
// on(t): which rows (a month, a period).
export function splitIn(rows, on = () => true) {
  const o = { in: 0, salary: 0, back: 0 };
  for (const t of rows || NONE) {
    if (!(t.a > 0) || !on(t)) continue;
    if (t.back) o.back += t.a; else { o.in += t.a; if (t.sal) o.salary += t.a; }
  }
  return o;
}

// The choices in "What is this money?" (the transaction window), in their order.
export const MARKS = ["income", "salary", "back"];
// The choices in English, for the change history (shown in Hebrew through core/heSaved.js).
export const MARK_EN = { income: "Income", salary: "Salary", back: "Money back" };
// The choice that shows as picked for one entry's moneyIn entry r.
export const markOf = (r) => (!r ? "income" : r.sub == "salary" ? "salary" : r.kind);
// The person's own choice saved for an entry, or "" when the app decides.
export const chosenMark = (S, t) => { const v = fix(t?.mk || S?.inMark?.[t?.id] || ""); return MARKS.includes(v) ? v : ""; };
// Saves (or clears, with "") the person's choice on a copy of the data. Returns false when nothing changed.
export function setMark(S, t, v) {
  if (chosenMark(S, t) == (v || "") && (S.inMark?.[t.id] || "") == (v || "")) return false;
  S.inMark = { ...(S.inMark || {}) };
  if (v && MARKS.includes(v)) S.inMark[t.id] = v; else delete S.inMark[t.id];
  return true;
}
