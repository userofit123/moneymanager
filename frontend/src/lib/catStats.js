// The Categories and tags page's numbers: for each category and each tag, the money out and in over the last
// few full months, the change against the months before, the month-by-month amounts and the latest entries.
// It counts exactly what Reports counts: the rows of the Home numbers (lib/home.js homeModel → rows), which leave out
// money moved between your own accounts, card bill payments, upcoming entries and rows you left out.
// A payment moved to another month counts in that month (rdOf), like on Reports.
import { addM, rdOf } from "./home.js";
import { allTags, ruleTags } from "./activity.js";

const p2 = (n) => String(n).padStart(2, "0");
const CNC = new Intl.Collator(undefined, { sensitivity: "base" });
const RECENT = 5;

// The months of the period (the last n full months, oldest first) and of the n months before it.
export function periodOf(now, n) {
  const MK = now.getFullYear() + "-" + p2(now.getMonth() + 1), keys = [], prev = [];
  for (let i = n; i >= 1; i--) keys.push(addM(MK, -i));
  for (let i = 2 * n; i > n; i--) prev.push(addM(MK, -i));
  return { keys, prev };
}

// One list of rows (categories or tags). keyOf(t) gives the names an entry belongs to; mainOf(row) "out" or "in".
function build(names, rows, P, keyOf, mainOf, extra) {
  const blank = (k) => ({ k, out: 0, in: 0, prevOut: 0, prevIn: 0, n: 0, last: "", outM: P.keys.map(() => 0), inM: P.keys.map(() => 0), recent: [] });
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
      if (cur.has(m)) { r.out += out; r.in += inn; r.n++; r.outM[i] += out; r.inM[i] += inn; }
      else if (old.has(m)) { r.prevOut += out; r.prevIn += inn; }
    }
  }
  const n = P.keys.length, list = [...at.values()].map((r) => {
    const main = mainOf(r), now = main == "in" ? r.in : r.out, before = main == "in" ? r.prevIn : r.prevOut;
    return { ...r, main, net: r.in - r.out, avg: now / n, avgOut: r.out / n, avgIn: r.in / n, change: now - before, ...extra(r.k) };
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
    (k) => ({ inc: isInc(k), budget: budgets[k] || 0, rules: crules(k) }));
  // spending first (largest first), then income, Uncategorized last; names in order when the money is the same
  const rank = (r) => (r.k == "Uncategorized" ? 2 : r.main == "in" ? 1 : 0);
  C.rows.sort((a, b) => rank(a) - rank(b) || (a.main == "in" ? b.in - a.in : b.out - a.out) || CNC.compare(a.k, b.k));

  const T = build(allTags(S || {}).map(([g]) => g), rows, P, (t) => [...new Set(t.tags || [])], mainOf,
    (g) => ({ rules: trules(g) }));
  T.rows.sort((a, b) => b.out - a.out || b.in - a.in || CNC.compare(a.k, b.k));

  return { months: P.keys, from: P.keys[0], to: P.keys[P.keys.length - 1], hasPrev: rows.some((t) => old.has(rdOf(t).slice(0, 7))), cats: C, tags: T };
}
