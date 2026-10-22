// The Categories and tags page's numbers: for each category and each tag, the money out and in over the last
// few full months, the change against the months before, the month-by-month amounts and the latest entries.
// It counts exactly what Reports counts: the rows of the Home numbers (lib/home.js homeModel → rows), which leave out
// money moved between your own accounts, card bill payments, upcoming entries and rows you left out.
// A payment moved to another month counts in that month (rdOf), like on Reports.
import { addM, rdOf } from "./home.js";
import { allTags, ruleTags } from "./activity.js";
import { roundBudget } from "./budgets.js";

const p2 = (n) => String(n).padStart(2, "0");
const CNC = new Intl.Collator(undefined, { sensitivity: "base" });
const RECENT = 5;
const NO_BUDGET = ["Income", "Uncategorized"]; // like the add-budget form (lib/budgets.js formCategories)

// The months of the period (the last n full months, oldest first) and of the n months before it.
export function periodOf(now, n) {
  const MK = now.getFullYear() + "-" + p2(now.getMonth() + 1), keys = [], prev = [];
  for (let i = n; i >= 1; i--) keys.push(addM(MK, -i));
  for (let i = 2 * n; i > n; i--) prev.push(addM(MK, -i));
  return { keys, prev, now: MK, last: addM(MK, -1) };
}

// One list of rows (categories or tags). keyOf(t) gives the names an entry belongs to; mainOf(row) "out" or "in".
// P.now / P.last: this calendar month (so far) and the one before it.
function build(names, rows, P, keyOf, mainOf, extra) {
  const blank = (k) => ({ k, out: 0, in: 0, prevOut: 0, prevIn: 0, thisOut: 0, thisIn: 0, lastOut: 0, lastIn: 0, n: 0, last: "", outM: P.keys.map(() => 0), inM: P.keys.map(() => 0), recent: [] });
  const at = new Map(names.map((k) => [k, blank(k)]));
  const tot = { out: 0, in: 0 }, cur = new Set(P.keys), old = new Set(P.prev);
  // newest first, so the latest entries are the first ones met
  const sorted = [...rows].sort((a, b) => rdOf(b).localeCompare(rdOf(a)) || String(b.d).localeCompare(String(a.d)));
  for (const t of sorted) {
    const ks = keyOf(t); if (!ks.length) continue;
    const m = rdOf(t).slice(0, 7), i = P.keys.indexOf(m), out = t.a < 0 ? -t.a : 0, inn = t.a > 0 ? t.a : 0;
    if (cur.has(m)) { tot.out += out; tot.in += inn; }
    for (const k of ks) {
      let r = at.get(k);
      if (!r) at.set(k, (r = blank(k)));
      if (!r.last) r.last = t.d;
      if (r.recent.length < RECENT) r.recent.push(t);
      if (m == P.now) { r.thisOut += out; r.thisIn += inn; } else if (m == P.last) { r.lastOut += out; r.lastIn += inn; }
      if (cur.has(m)) { r.out += out; r.in += inn; r.n++; r.outM[i] += out; r.inM[i] += inn; }
      else if (old.has(m)) { r.prevOut += out; r.prevIn += inn; }
    }
  }
  const n = P.keys.length, list = [...at.values()].map((r) => {
    const main = mainOf(r), now = main == "in" ? r.in : r.out, before = main == "in" ? r.prevIn : r.prevOut;
    const thisM = main == "in" ? r.thisIn : r.thisOut, lastM = main == "in" ? r.lastIn : r.lastOut;
    const avg = now / n, high = (v) => main == "out" && v > 0 && v > avg; // spending above the usual month
    return { ...r, main, net: r.in - r.out, avg, avgOut: r.out / n, avgIn: r.in / n, change: now - before, thisM, lastM, thisHigh: high(thisM), lastHigh: high(lastM), ...extra(r.k) };
  });
  return { rows: list, totals: { out: tot.out, in: tot.in, net: tot.in - tot.out } };
}

// Everything the page shows. S: the data; rows: homeModel(S).rows; now: today; months: 3, 6 or 12.
// hasPrev: whether there is any entry in the months before the period (so a change against them means something).
export function catStats(S, rows, now, months = 6) {
  const P = periodOf(now, months), old = new Set(P.prev), cats = S?.cats || {}, budgets = S?.budgets || {};
  rows = rows || [];
  const isInc = (k) => cats[k] === 99;
  // what a row is mostly about: income categories and rows with only money in are read by the money in
  const mainOf = (r) => (isInc(r.k) || (!r.out && !r.prevOut && (r.in || r.prevIn)) ? "in" : "out");
  const crules = (k) => (S?.rules || []).filter((r) => r.c == k).length;
  const trules = (g) => (S?.tagRules || []).filter((r) => ruleTags(r).includes(g)).length;

  const C = build(Object.keys(cats), rows, P, (t) => [t.c || "Uncategorized"], mainOf,
    (k) => ({ inc: isInc(k), budget: budgets[k] || 0, canBudget: !isInc(k) && !NO_BUDGET.includes(k), rules: crules(k) }));
  // no budget for money that comes in (an income category, or one with only money in);
  // a new budget starts at the usual month, rounded like suggested budgets ("" when too small: the form suggests its own)
  for (const r of C.rows) { if (r.main == "in") r.canBudget = false; r.sugBudget = roundBudget(r.avg) || ""; }
  // spending first (largest first), then income, Uncategorized last; names in order when the money is the same
  const rank = (r) => (r.k == "Uncategorized" ? 2 : r.main == "in" ? 1 : 0);
  C.rows.sort((a, b) => rank(a) - rank(b) || (a.main == "in" ? b.in - a.in : b.out - a.out) || CNC.compare(a.k, b.k));

  const T = build(allTags(S || {}).map(([g]) => g), rows, P, (t) => [...new Set(t.tags || [])], mainOf,
    (g) => ({ rules: trules(g) }));
  T.rows.sort((a, b) => b.out - a.out || b.in - a.in || CNC.compare(a.k, b.k));

  return { months: P.keys, from: P.keys[0], to: P.keys[P.keys.length - 1], hasPrev: rows.some((t) => old.has(rdOf(t).slice(0, 7))), cats: C, tags: T };
}

// ---- the columns of the list ----
// Every column the person can show, in the order they appear, and the ones shown at first. Name and ⋯ are always shown.
// thisM / lastM: this calendar month so far and last month (the money out; for income, the money in).
export const CAT_COLS = ["thisM", "lastM", "avg", "out", "in", "net", "change", "n", "last", "budget", "rules"];
export const CAT_COLS_START = "thisM,lastM,avg,out,change,budget";
// The columns shown, from the remembered "thisM,avg,…" (unknown names left out, always in the list's order).
export const shownCols = (v) => { const on = new Set(String(v ?? CAT_COLS_START).split(",")); return CAT_COLS.filter((c) => on.has(c)); };
export const toggleCol = (cols, c) => CAT_COLS.filter((x) => (x == c ? !cols.includes(c) : cols.includes(x))).join(",");
// What a column is sorted by: a number, a date text, or nothing (empty cells go last).
export function colValue(r, c) {
  if (c == "last") return r.last || null;
  if (c == "budget") return r.budget || null;
  return r[c] ?? null;
}

// How a money cell shows: the amount with its sign (money in +, money out −) and its colour.
// Money in is green; money out stays plain, except this month and last month when they are above the usual month (red).
export function moneyCell(r, c) {
  if (c == "out") return { v: -r.out, cls: "" };
  if (c == "in") return { v: r.in, cls: r.in > 0 ? "pos" : "" };
  if (c == "net") return { v: r.net, cls: r.net > 0 ? "pos" : r.net < 0 ? "neg" : "" };
  const x = r[c] || 0;
  if (r.main == "in") return { v: x, cls: x > 0 ? "pos" : "" };
  return { v: -x, cls: (c == "thisM" && r.thisHigh) || (c == "lastM" && r.lastHigh) ? "neg" : "" };
}
// The totals boxes: out, in and in minus out, signed and coloured like the cells.
export const totalCell = (T, c) => moneyCell({ out: T.out, in: T.in, net: T.net }, c);
