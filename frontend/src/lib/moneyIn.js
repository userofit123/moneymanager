// What each money coming in is: earned (pay for work; sub "salary" when it is a salary), back (money back for something
// bought, optionally linked to that purchase), people (from a person, through Bit or PayBox), own (your own money moved
// or put in: not income) or other (interest, dividends, anything else). Worked out from the data only, never from the
// category. Nothing here changes the data or the screen.
import { transferIds, isCardPay, cardInfo, ruleHit, normD } from "./activity.js";
import { refundTwin } from "./txactions.js";
import { plainOf, nameKey, incKey } from "./recap.js";

export const KINDS = ["earned", "back", "people", "own", "other"];
// how far back a purchase can be for money in from the same shop to be its money back
export const BACK_DAYS = 120;
// a payer is a salary when it pays in 3 or more months, usually at least this much, most payments within 35% of the usual
export const PAY_MONTHS = 3, PAY_MIN = 1500, PAY_NEAR = 0.35;

// The words that say what money is, in English and Hebrew (a Hebrew word may start with ו, ה, ב, ל or מ).
const BACK_W = ["זיכוי", "זיכויים", "החזר", "החזרים", "refund", "refunds", "refunded"], BACK_P = ["מס הכנסה", "tax refund"];
const CASH_W = ["מזומן", "cash"], DEPOSIT_W = ["הפקדה", "הפקדת"], CHEQUE_W = ["שיק", "שיקים", "צק", "צקים", "check", "cheque"];
const PEOPLE_W = ["bit", "ביט", "paybox", "פייבוקס"];
const SALARY_W = ["משכורת", "salary", "payroll", "wages", "שכר"], SALARY_P = ["שכר עבודה"];
const OTHER_W = ["ריבית", "interest", "dividend", "dividends", "דיבידנד", "דיבידנדים"];

const words = (s) => plainOf(s).toLowerCase().split(" ").filter(Boolean);
const strip1 = (x) => x.replace(/^[והבלמ]/, ""), strip2 = (x) => x.replace(/^[והבלמ]{2}/, "");
const hasWord = (W, L) => L.some((x) => W.includes(x) || W.includes(strip1(x)) || W.includes(strip2(x)));
const hasPhrase = (txt, P) => P.some((p) => (" " + txt + " ").includes(" " + p + " "));
const textOf = (t) => [t.desc, t.memo, t.bd, t.from].filter(Boolean).join(" ");
const dayOf = (d) => Date.parse(String(d).slice(0, 10) + "T12:00:00Z") / 864e5;
// two shop names are the same when equal, or when one holds the other as whole words (4 letters at least)
const sameName = (a, b) => !!a && !!b && (a == b || (Math.min(a.length, b.length) >= 4 && ((" " + a + " ").includes(" " + b + " ") || (" " + b + " ").includes(" " + a + " "))));
const kindOf = (k) => (k == "salary" ? { kind: "earned", sub: "salary" } : KINDS.includes(k) ? { kind: k } : null);

// The kind of every money coming in (a > 0) in S.tx, as a Map of entry id → { kind, sub?, link?, twin?, why }.
// sub: "salary" for a salary. link: the id of the purchase money back is for. twin: the card entry a bank deposit repeats
// (the same refund, to be counted once). why: the rule that decided it:
//   "chosen" the entry's own choice (t.mk) · "rule" a money coming in rule (S.moneyInRules [{ k, kind }]) · "transfer" ·
//   "card" came in on a credit card · "purchase" same shop as an earlier purchase · "twin" · "refund" refund words ·
//   "cash" · "app" Bit or PayBox · "salary" salary words or your salary texts · "regular" the same payer every month ·
//   "interest" · "rest" nothing else matched.
// The rules are tried in this order, the first that matches wins. t.mk and a rule's kind are one of KINDS, or "salary".
export function moneyIn(S) {
  const tx = S?.tx || [], S1 = { ...S, tx, accounts: S?.accounts || [] }, xs = transferIds(S1), ci = cardInfo(S1);
  const acc = new Map(S1.accounts.map((a) => [a.n, a.kind]));
  const onCard = (t) => acc.get(t.to) == "card";
  const ins = tx.filter((t) => t.a > 0 && !t.virtual);

  // purchases by shop name, to find what money back is for
  const buys = tx.filter((t) => t.a < 0 && !t.virtual && !xs.has(t.id) && !isCardPay(S1, t, ci)).map((t) => ({ t, keys: [nameKey(t.to), nameKey(t.desc)].filter(Boolean), day: dayOf(t.d) }));
  const purchaseOf = (t) => {
    const keys = [nameKey(t.from), nameKey(t.desc)].filter(Boolean), d = dayOf(t.d); if (!keys.length) return null;
    let best = null;
    for (const b of buys) {
      if (b.day > d || d - b.day > BACK_DAYS || -b.t.a < t.a - 0.005) continue;
      if (!b.keys.some((x) => keys.some((y) => sameName(x, y)))) continue;
      // the one with the same amount first, then the latest
      const exact = Math.abs(-b.t.a - t.a) < 0.005, be = best && Math.abs(-best.t.a - t.a) < 0.005;
      if (!best || (exact && !be) || (exact == be && b.day > best.day)) best = b;
    }
    return best ? best.t.id : null;
  };

  // your salary texts (Settings → Salary), and the payers that pay about the same every month
  const mine = (S1.salaryRules || []).map(normD).filter((x) => x.length > 1);
  const regular = new Set(), byPayer = new Map();
  ins.filter((t) => !xs.has(t.id) && !onCard(t)).forEach((t) => { const k = incKey(S1, t).toLowerCase(); if (k) (byPayer.get(k) || byPayer.set(k, []).get(k)).push(t); });
  byPayer.forEach((L) => {
    if (new Set(L.map((t) => String(t.d).slice(0, 7))).size < PAY_MONTHS) return;
    const a = L.map((t) => t.a).sort((x, y) => x - y), med = a[Math.floor(a.length / 2)]; if (med < PAY_MIN) return;
    const near = L.filter((t) => Math.abs(t.a - med) <= med * PAY_NEAR);
    if (new Set(near.map((t) => String(t.d).slice(0, 7))).size < PAY_MONTHS || near.length < L.length * 0.6) return;
    near.forEach((t) => regular.add(t.id));
  });
  const salaryWhy = (t, W, txt) => (hasWord(SALARY_W, W) || hasPhrase(txt, SALARY_P) || mine.some((m) => normD(t.desc + " " + (t.from || "")).includes(m)) ? "salary" : regular.has(t.id) ? "regular" : "");

  const out = new Map();
  for (const t of ins) {
    const W = words(textOf(t)), txt = W.join(" "), sw = salaryWhy(t, W, txt);
    const set = (o, why) => {
      const r = { ...o, why };
      if (r.kind == "earned" && !r.sub && sw) r.sub = "salary";
      if (r.kind == "back" && r.link === undefined) { const l = purchaseOf(t); if (l != null) r.link = l; }
      out.set(t.id, r);
    };
    // 1. your own choice on the entry, or a money coming in rule
    const own = kindOf(t.mk); if (own) { set(own, "chosen"); continue; }
    const rule = (S1.moneyInRules || []).find((r) => kindOf(r.kind) && ruleHit(t, r.k)); if (rule) { set(kindOf(rule.kind), "rule"); continue; }
    // 2. moved between your own accounts
    if (xs.has(t.id)) { set({ kind: "own" }, "transfer"); continue; }
    // 3. came in on a credit card: money back, which lowers that card's bill
    if (onCard(t)) { set({ kind: "back" }, "card"); continue; }
    // 4. the same shop as a purchase in the last months, and not more than it
    const p = purchaseOf(t); if (p != null) { set({ kind: "back", link: p }, "purchase"); continue; }
    // 5. a bank deposit that repeats a refund on a card: the same money back, counted once (on the card)
    const tw = refundTwin(S1, t); if (tw && onCard(tw)) { set({ kind: "back", twin: tw.id, link: purchaseOf(tw) ?? undefined }, "twin"); continue; }
    // 6. refund words (a salary that a bank calls "זיכוי" stays a salary)
    if (!sw && (hasWord(BACK_W, W) || hasPhrase(txt, BACK_P))) { set({ kind: "back", link: null }, "refund"); continue; }
    // 7. cash you put in (a cheque someone gave you is not your own money)
    if (hasWord(CASH_W, W) || (hasWord(DEPOSIT_W, W) && !hasWord(CHEQUE_W, W))) { set({ kind: "own" }, "cash"); continue; }
    // 8. from a person, through Bit or PayBox
    if (hasWord(PEOPLE_W, W)) { set({ kind: "people" }, "app"); continue; }
    // 9. salary words, your salary texts, or the same payer at about the same amount every month
    if (sw) { set({ kind: "earned", sub: "salary" }, sw); continue; }
    // 10. interest and dividends, and anything else
    set({ kind: "other" }, hasWord(OTHER_W, W) ? "interest" : "rest");
  }
  // link: null means "looked, none found"; leave it out
  out.forEach((r) => { if (r.link == null) delete r.link; if (r.twin == null) delete r.twin; });
  return out;
}

// moneyIn(S), worked out once and kept while the entries, accounts, transfers and rules stay the same (every change
// makes new entries, so a change always works it out again).
const memo = new WeakMap(), NONE = [];
export function inKinds(S) {
  const tx = S?.tx || NONE, key = [S?.accounts, S?.xf?.length, S?.salaryRules, S?.moneyInRules], m = memo.get(tx);
  if (m && m.key.every((x, i) => x === key[i])) return m.out;
  const out = moneyIn(S); memo.set(tx, { key, out }); return out;
}

// How a money coming in counts: "in" money in (earned, people, other), "back" money back (lowers spending), or null
// not counted (your own money, and a bank deposit that repeats a card refund, which counts once on the card).
export const partOf = (r) => (!r ? "in" : r.kind == "own" || r.twin ? null : r.kind == "back" ? "back" : "in");

// The counted row for money coming in (t.a > 0), or null when it does not count. r: its moneyIn entry; byId: entries by id.
// Money in gets ik (its kind) and sal (a salary). Money back gets back: true and the category of the purchase it is for,
// so it lowers that category's spending in its month.
export function inRow(t, r, byId) {
  const p = partOf(r); if (!p) return null;
  if (p == "back") { const b = r.link != null ? byId.get(r.link) : null; return { ...t, back: true, c: (b && b.c) || t.c }; }
  return { ...t, ik: r ? r.kind : "other", ...(r && r.sub == "salary" ? { sal: true } : {}) };
}

// For counted rows (countedTx): money in (not money back), and spending (money back counts as less spending: add -t.a).
export const isIn = (t) => t.a > 0 && !t.back;
export const isOut = (t) => t.a < 0 || !!t.back;

// Counted rows split by kind: in (earned + people + other: "money in" everywhere), earned with its salary part, people,
// other, and back (money back, kept apart: it lowers spending). on(t): which rows (a month, a period).
export function splitIn(rows, on = () => true) {
  const o = { in: 0, earned: 0, salary: 0, people: 0, other: 0, back: 0 };
  for (const t of rows || NONE) {
    if (!(t.a > 0) || !on(t)) continue;
    if (t.back) { o.back += t.a; continue; }
    o.in += t.a; o[KINDS.includes(t.ik) && t.ik != "own" ? t.ik : "other"] += t.a; if (t.sal) o.salary += t.a;
  }
  return o;
}
