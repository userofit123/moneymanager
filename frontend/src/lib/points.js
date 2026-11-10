// Points and levels: points for good actions and good money results, which add up to levels.
// Levels never go down and points are never taken away for a bad month.
// Everything here works on the saved data S and gives back numbers; nothing touches the screen.
//
// What is saved: S.points = { [key]: { pts, kind, day, d? } } — one entry per thing that earned points, so the same
// thing never earns twice (the key says what it was: "visit:2026-11-02", "alert:<id>", "month:2026-10:kept" ...).
// day: the day it was earned (YYYY-MM-DD); d: a short detail (a category, an alert id, a month).
// "_old": { [month]: { [kind]: pts } } holds the points of old daily entries folded into one total per month and kind,
// so the saved data stays small and the points by month still add up.
// "_once": [key, ...] the keys of folded once-only entries (a category or tag by hand), so they still never earn twice.
import { withTransfers, addM, rdOf } from "./home.js";
import { countedTx } from "./bills.js";
import { isIn, isOut } from "./moneyIn.js";

// ---- the points for each thing (one table, easy to tune) ----
export const POINTS = {
  visit: 5, // using the app on a day (once a day)
  alert: 10, // clearing an alert (the first time for that alert)
  review: 5, // an item in Needs review looked at (once per item)
  cat: 1, // giving a payment a category by hand
  tag: 1, // adding a tag by hand
  edit: 1, // any other change to your items (a payment, a bill, a budget, a jar ...): each item, at most once a day
  rule: 10, // creating a category rule (once per rule)
  setupBank: 100, // first bank, card or wallet linked
  setupBudget: 50, // first budget
  setupJar: 50, // first jar
  setupCash: 50, // first cash account entered by hand
  setupPension: 50, // first pension amount entered
  allCat: 50, // every payment of a month has a category (once per month)
  keptPerPct: 10, // each 1% of the month's income kept ...
  keptMaxPct: 30, // ... up to 30% (300 points)
  betterPerPct: 5, // each 1 percentage point kept more than the month before ...
  betterMaxPct: 30, // ... up to 30 points better (150 points), so one very bad month does not make the next one huge
  catLessPerPct: 2, // each 1% less spent in a category than the month before ...
  catLessMax: 50, // ... up to 50 points a category
  catLessMin: 200, // only categories with at least ₪200 spent the month before (smaller ones change a lot by chance)
  budgetKept: 20, // each budget that stayed within its amount for the month
};

// Kinds that are earned many times a day; their entries older than this many days fold into "_old".
// "cat", "tag" and "edit" can be earned thousands of times a day, so they fold after a week to keep the saved data small:
// "edit" only guards its own day (the day is in the key); "cat" and "tag" keep their key in "_once" so they never earn twice.
const DAILY = ["visit", "cat", "tag", "edit"], KEEP_DAYS = 90, KEEP_SHORT_DAYS = 7;
const SHORT = new Set(["cat", "tag", "edit"]), ONCE = new Set(["cat", "tag"]);
// "_back": the keys of folded entries already taken off their month's total by Undo (the newest MAX_BACK), so it happens once.
const MAX_BACK = 5000;
// Month results are counted from this day of the next month, so late bank and card rows are in first.
export const COUNT_FROM_DAY = 3;
// How many finished months back are counted when they were not counted yet (the first time points run).
const BACK_MONTHS = 12;
// The mark of the one-time new count of the month results (0.13.2).
const RECOUNT = "recount:1";

// ---- levels ----
// Level 1 at 0 points; level 2 needs 100, level 3 250, level 4 450, level 5 700: each step needs 50 more than the last.
const stepFor = (level) => 100 + 50 * (level - 1); // points from `level` to the next one
export function levelFor(total) {
  total = Math.max(0, Math.round(+total || 0));
  let level = 1, start = 0;
  while (total >= start + stepFor(level)) { start += stepFor(level); level++; }
  const next = start + stepFor(level);
  // start: the points where this level began; next: where the next one begins; into: points into this level; need: points still needed
  return { level, start, next, into: total - start, need: next - total };
}

// ---- earning ----
const p2 = (n) => String(n).padStart(2, "0");
const dayKey = (d) => (typeof d === "string" ? d.slice(0, 10) : d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()));
// the saved entries, without "_old" and "_once"
const entries = (S) => Object.entries(S?.points || {}).filter(([k, e]) => k[0] !== "_" && e && typeof e === "object");
// The folded once-only keys as a Set, made once per list.
const onceSets = new WeakMap();
const onceDone = (S, key) => {
  const a = S.points?._once;
  if (!Array.isArray(a)) return false;
  let s = onceSets.get(a);
  if (!s) onceSets.set(a, (s = new Set(a)));
  return s.has(key);
};
// Gives points once for `key` (never twice); there is no cap on how many points a day. Changes S. Returns the points given (0 when none).
export function award(S, key, kind, pts, today, d) {
  if (!S || !key) return 0;
  S.points = S.points || {};
  if (S.points[key] || onceDone(S, key)) return 0;
  const day = dayKey(today);
  pts = Math.round(+pts || 0);
  S.points[key] = { pts, kind, day, ...(d != null && d !== "" ? { d: String(d).slice(0, 120) } : {}) };
  return pts;
}

// History lines of a change made by hand that give a category or add a tag (automatic sorting gives nothing).
const BY_HAND_CAT = new Set(["Edited category", "Changed bill category"]);
const BY_HAND_TAG = new Set(["Added tag"]);
const NEW_RULE = new Set(["Added rule"]);
const NO_CAT = (c) => !c || c === "Uncategorized";
// Changes that earn no points for updating items: sorting done by a file, not by hand.
const NOT_BY_HAND = new Set(["Added categories from an AI file"]);
// Saved data that is not the person's items (history, points, settings), left out when looking for what a change updated.
const NOT_ITEMS = new Set(["audit", "points", "cfg", "ntfy"]);
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// The points a change made by the person earns, worked out from what it changed (before → after) and its history lines.
// Gives them on `after`, so they are saved with the change and Undo of that change takes them back. Returns the points given.
export function earnFromChange(before, after, lines, today) {
  if (!before || !after) return 0;
  const acts = new Set((lines || []).map((l) => l && l[0]));
  if (acts.has("Undid a change")) return 0;
  let got = 0;
  // done: the items ("tx:<id>", "rules:<keyword>" ...) that earned a point of their own in this change, so they get no update point too
  const done = new Set();
  const give = (key, kind, pts, d, item) => { const n = award(after, key, kind, pts, today, d); got += n; if (n && item) done.add(item); };
  const old = new Map((before.tx || []).map((t) => [t.id, t]));
  // a category given by hand: once per payment
  if ([...acts].some((a) => BY_HAND_CAT.has(a)))
    (after.tx || []).forEach((t) => { const o = old.get(t.id); if (o && !NO_CAT(t.c) && o.c !== t.c) give("cat:" + t.id, "cat", POINTS.cat, t.c, "tx:" + t.id); });
  // a tag added by hand: once per payment and tag
  if ([...acts].some((a) => BY_HAND_TAG.has(a)))
    (after.tx || []).forEach((t) => { const o = old.get(t.id); if (o) (t.tags || []).filter((g) => !(o.tags || []).includes(g)).forEach((g) => give("tag:" + t.id + ":" + g, "tag", POINTS.tag, g, "tx:" + t.id)); });
  // a new category rule: once per rule text
  if ([...acts].some((a) => NEW_RULE.has(a))) {
    const had = new Set((before.rules || []).map((r) => String(r.k).toLowerCase()));
    (after.rules || []).forEach((r, i) => { const k = String(r.k).toLowerCase(); if (!had.has(k)) give("rule:" + k, "rule", POINTS.rule, r.k, "rules:" + itemId(r, i)); });
  }
  // an alert cleared: only the first time for that alert
  Object.keys(after.dismissed || {}).forEach((id) => { if (!(before.dismissed || {})[id]) give("alert:" + id, "alert", POINTS.alert, id, "dismissed:" + id); });
  // Needs review: a transfer confirmed or turned down, possible duplicates kept or deleted
  const xf0 = new Map((before.xf || []).map((x) => [x.o, x]));
  (after.xf || []).forEach((x, i) => { const o = xf0.get(x.o); if (o && o.st !== x.st && (x.st === "ok" || x.st === "rej") && o.st !== "ok" && o.st !== "rej") give("review:xf:" + x.o, "review", POINTS.review, undefined, "xf:" + itemId(x, i)); });
  Object.keys(after.dupOk || {}).forEach((id) => { if (!(before.dupOk || {})[id]) give("review:dup:" + id, "review", POINTS.review, undefined, "dupOk:" + id); });
  if (acts.has("Deleted duplicate")) { const now = new Set((after.tx || []).map((t) => t.id)); old.forEach((t, id) => { if (!now.has(id)) give("review:dup:" + id, "review", POINTS.review, undefined, "tx:" + id); }); }
  // Any other update to the person's items (a payment, marking a bill, a budget, a jar, cleaning up ...) earns POINTS.edit
  // for each item it changed, unless that item just earned a point of its own above. Once a day per item (the key is the
  // item, never the wording of the history line, which holds the values), so changing the same thing again that day adds
  // nothing more; no cap on how many items a day.
  const mine = (lines || []).filter((l) => l && l[0] && (l[3] || "You") !== "System" && !NOT_BY_HAND.has(l[0]));
  if (!mine.length) return got;
  const day = dayKey(today), what = mine[0][0];
  const fields = new Set([...Object.keys(before), ...Object.keys(after)].filter((k) => !NOT_ITEMS.has(k)));
  fields.forEach((f) => changedItems(before[f], after[f]).forEach((id) => {
    const item = f + ":" + id;
    if (!done.has(item)) give("edit:" + item.slice(0, 120) + ":" + day, "edit", POINTS.edit, what);
  }));
  return got;
}

// Which item of a list it is: its id (or the field that names it), else its place in the list.
const itemId = (x, i) => (x && typeof x === "object" ? String(x.id ?? x.o ?? x.match ?? x.n ?? x.k ?? "#" + i) : typeof x === "string" || typeof x === "number" ? String(x) : "#" + i);
const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
// The items that differ between two values of one saved field: a list by each item, a map by each key, anything else as one ("").
function changedItems(a, b) {
  if (sameJson(a, b)) return [];
  const asMap = (v) => (Array.isArray(v) ? new Map(v.map((x, i) => [itemId(x, i), x])) : isMap(v) ? new Map(Object.entries(v)) : null);
  const A = asMap(a), B = asMap(b);
  if (!A && !B) return [""];
  const x = A || new Map(), y = B || new Map();
  return [...new Set([...x.keys(), ...y.keys()])].filter((k) => !sameJson(x.get(k), y.get(k)));
}

// What Undo needs to take back the points a change gave: { key: [kind, pts, day] } (taken from S.points after the change).
export function earnedOf(before, after) {
  const was = before?.points || {}, out = {};
  Object.entries(after?.points || {}).forEach(([k, e]) => { if (k[0] !== "_" && !was[k] && e && typeof e === "object") out[k] = [e.kind, +e.pts || 0, e.day]; });
  return out;
}
// Undo of a change: takes back the points it gave. pts: earnedOf(...), or a list of keys (older saves).
// An entry still saved is simply removed. One already folded into "_old" is taken off that month's total, but only once
// and only when it really was folded: a category or tag only while its key is in "_once" (then taken out of it); any other
// kind only when its day is old enough to have been folded by `today` and its key is not in "_back" yet (then added), so
// the same Undo run again (after a reload) or an entry the server never kept takes nothing from the total.
export function takeBack(S, pts, today) {
  if (!S?.points || !pts) return;
  const P = S.points;
  if (Array.isArray(pts)) { pts.forEach((k) => delete P[k]); return; }
  const back = new Set(Array.isArray(P._back) ? P._back : []), addBack = [];
  Object.entries(pts).forEach(([k, [kind, n, day] = []]) => {
    if (P[k]) {
      delete P[k];
      // Not a category or tag: remember the key, so this Undo run again later can't take it off the month total
      if (!ONCE.has(kind) && !back.has(k)) { back.add(k); addBack.push(k); }
      return;
    }
    if (!DAILY.includes(kind) || !day) return;
    if (ONCE.has(kind)) {
      if (!Array.isArray(P._once) || !P._once.includes(k)) return;
      P._once = P._once.filter((x) => x !== k);
    } else {
      if (back.has(k) || !today) return;
      const cut = dayKey(new Date(new Date(dayKey(today) + "T12:00:00").getTime() - (SHORT.has(kind) ? KEEP_SHORT_DAYS : KEEP_DAYS) * 864e5));
      if (day >= cut) return; // too new to have been folded: the entry is just gone, nothing was added to the total
      back.add(k); addBack.push(k);
    }
    const m = P._old?.[String(day).slice(0, 7)];
    if (m && m[kind]) m[kind] = Math.max(0, m[kind] - (+n || 0));
  });
  if (addBack.length) P._back = [...(Array.isArray(P._back) ? P._back : []), ...addBack].slice(-MAX_BACK);
}

// ---- setup and month results (the app's upkeep, not something the person did) ----
// The setup steps reached so far, each { key, kind, pts }.
export function setupDone(S) {
  const A = S.accounts || [], out = [];
  const linked = Object.values(S.connected || {}).some(Boolean) || A.some((a) => !a.manual && ["bank", "card", "wallet"].includes(a.kind));
  if (linked) out.push(["setup:bank", POINTS.setupBank]);
  if (Object.keys(S.budgets || {}).length) out.push(["setup:budget", POINTS.setupBudget]);
  if ((S.jars || []).length) out.push(["setup:jar", POINTS.setupJar]);
  if (A.some((a) => a.custom && a.ck === "cash")) out.push(["setup:cash", POINTS.setupCash]);
  if (A.some((a) => a.kind === "pension" && +a.v > 0)) out.push(["setup:pension", POINTS.setupPension]);
  return out.map(([key, pts]) => ({ key, kind: "setup", pts, d: key.slice(6) }));
}

// The counted rows (no transfers between your own accounts, card bill payments, upcoming or left-out rows): the same rows as Home.
const countedRows = (S, today) => countedTx(withTransfers(S), dayKey(today)).A;

// Money in and money out of one month, and what was spent in each category. upTo: only days 1 to upTo of the month.
function monthMoney(rows, m, upTo = 31) {
  let inc = 0, out = 0, n = 0, uncat = 0;
  const cat = {};
  rows.forEach((t) => {
    const d = rdOf(t);
    if (!d.startsWith(m) || +d.slice(8, 10) > upTo) return;
    n++;
    if (isIn(t)) inc += t.a;
    else if (isOut(t)) { out -= t.a; const k = t.c || "Uncategorized"; cat[k] = (cat[k] || 0) - t.a; if (NO_CAT(t.c)) uncat++; }
  });
  return { inc, out, cat, n, uncat };
}
// The share of the month's income kept, in whole percent (rounded once; null with no income).
const keptPct = (mm) => (mm.inc > 0 ? Math.round(((mm.inc - mm.out) / mm.inc) * 100) : null);

// A month's results: [{ key, kind, pts, d }]. rows: countedRows; budgets: S.budgets.
// upTo: the day of the month it has reached while it still runs, so last month is compared up to the same day
// (a few days into a month must not look like "spent less" than a whole month); left out once the month is over.
export function monthParts(rows, budgets, m, upTo = 31) {
  const cur = monthMoney(rows, m), prev = monthMoney(rows, addM(m, -1), upTo), parts = [];
  if (!cur.n) return parts;
  const put = (k, kind, pts, d) => { if (pts > 0) parts.push({ key: "month:" + m + ":" + k, kind, pts, d }); };
  const pc = keptPct(cur), pp = keptPct(prev);
  if (pc != null) put("kept", "kept", Math.min(Math.max(pc, 0), POINTS.keptMaxPct) * POINTS.keptPerPct, pc);
  if (pc != null && pp != null && pc > pp) put("better", "better", Math.min(pc - pp, POINTS.betterMaxPct) * POINTS.betterPerPct, pc - pp);
  Object.entries(prev.cat).forEach(([k, was]) => {
    if (NO_CAT(k) || was < POINTS.catLessMin) return;
    const less = Math.round(((was - (cur.cat[k] || 0)) / was) * 100);
    if (less > 0) put("cat:" + k, "catLess", Math.min(less * POINTS.catLessPerPct, POINTS.catLessMax), k);
  });
  Object.entries(budgets || {}).forEach(([k, lim]) => { if (+lim > 0 && Math.round(cur.cat[k] || 0) <= Math.round(+lim)) put("bud:" + k, "budget", POINTS.budgetKept, k); });
  if (cur.out > 0 && !cur.uncat) put("allcat", "allCat", POINTS.allCat, m);
  return parts;
}

// The upkeep: records the setup steps reached and, once the last month is over (from day COUNT_FROM_DAY), its results,
// each once; folds old daily entries into "_old". Changes S. Returns the points given. rows: countedRows (worked out when needed).
export function pointsUpkeep(S, today, rows) {
  if (!S) return 0;
  S.points = S.points || {};
  const day = dayKey(today);
  let got = 0;
  // Once: the month results counted so far are cleared and counted again below, so every copy (a computer and a server
  // with the same data) counts the past year with the same code. Points for things done are kept.
  if (!S.points[RECOUNT]) {
    Object.keys(S.points).forEach((k) => { if (k.startsWith("month:")) delete S.points[k]; });
    S.points[RECOUNT] = { pts: 0, kind: "recount", day };
  }
  setupDone(S).forEach((x) => { got += award(S, x.key, x.kind, x.pts, day, x.d); });
  // the finished months not counted yet, up to BACK_MONTHS back (so a first run counts the past year's results once),
  // the month just ended only from day COUNT_FROM_DAY, so late bank and card rows are in
  const pm = addM(day.slice(0, 7), -1);
  const todo = [];
  for (let i = BACK_MONTHS; i >= 1; i--) {
    const m = addM(day.slice(0, 7), -i);
    if (!S.points["month:" + m] && (m !== pm || +day.slice(8, 10) >= COUNT_FROM_DAY)) todo.push(m);
  }
  if (todo.length) {
    const R = rows || countedRows(S, day);
    const first = R.reduce((a, r) => (r.d && (!a || r.d < a) ? r.d : a), "").slice(0, 7); // the first month of bank data is usually only part of a month, so counting starts the month after
    todo.forEach((m) => {
      const at = m === pm ? day : addM(m, 1) + "-" + p2(COUNT_FROM_DAY); // an older month is dated the day it would have been counted
      if (first && m > first) monthParts(R, S.budgets, m).forEach((x) => { got += award(S, x.key, x.kind, x.pts, at, x.d); });
      S.points["month:" + m] = { pts: 0, kind: "monthDone", day: at, d: m }; // counted once, even when it earned nothing
    });
  }
  const ago = (n) => dayKey(new Date(new Date(day + "T12:00:00").getTime() - n * 864e5));
  const old = ago(KEEP_DAYS), oldShort = ago(KEEP_SHORT_DAYS), once = [];
  entries(S).forEach(([k, e]) => {
    if (!DAILY.includes(e.kind) || e.day >= (SHORT.has(e.kind) ? oldShort : old)) return;
    const o = (S.points._old = S.points._old || {}), m = (o[e.day.slice(0, 7)] = o[e.day.slice(0, 7)] || {});
    m[e.kind] = (m[e.kind] || 0) + (+e.pts || 0);
    if (ONCE.has(e.kind)) once.push(k);
    delete S.points[k];
  });
  if (once.length) {
    // a new list, so its Set is made again; the keys of payments that no longer exist are dropped, so the list does not grow forever
    const ids = Array.isArray(S.tx) && S.tx.length ? new Set(S.tx.map((t) => String(t.id))) : null;
    const gone = (k) => {
      if (!ids) return false;
      if (k.startsWith("cat:")) return !ids.has(k.slice(4));
      if (!k.startsWith("tag:")) return false;
      for (let i = k.indexOf(":", 4); i > 0; i = k.indexOf(":", i + 1)) if (ids.has(k.slice(4, i))) return false; // the id may itself hold a ":"
      return true;
    };
    S.points._once = [...(Array.isArray(S.points._once) ? S.points._once : []), ...once].filter((k) => !gone(k));
  }
  return got;
}

// The month a saved entry belongs to: month results ("month:2026-10:kept") to the month they are about, the rest to the day given.
const monthOf = (k, e) => (k.startsWith("month:") ? k.slice(6, 13) : e.day?.slice(0, 7));

// Points by month, newest first: [{ month, actions, results, total, best }]. actions: points for things done (visits, alerts,
// categories ...); results: points for how the month went. best: the month with the most points (the newest one on a tie).
export function pointsByMonth(S) {
  const by = {}, at = (m) => (by[m] = by[m] || { month: m, actions: 0, results: 0 });
  Object.entries(S?.points?._old || {}).forEach(([m, kinds]) => { if (kinds && typeof kinds === "object") Object.values(kinds).forEach((v) => { at(m).actions += +v || 0; }); });
  entries(S).forEach(([k, e]) => { const m = monthOf(k, e); if (m && e.pts > 0) at(m)[k.startsWith("month:") ? "results" : "actions"] += +e.pts; });
  const out = Object.values(by).map((x) => ({ ...x, total: x.actions + x.results, best: false })).sort((a, b) => b.month.localeCompare(a.month));
  const top = out.reduce((b, x) => (x.total > (b?.total || 0) ? x : b), null);
  if (top && out.length > 1) top.best = true;
  return out;
}

// The points by kind and in all: { byKind, total }.
function pointsByKind(S) {
  const byKind = {};
  Object.values(S?.points?._old || {}).forEach((kinds) => { if (kinds && typeof kinds === "object") Object.entries(kinds).forEach(([k, v]) => { byKind[k] = (byKind[k] || 0) + (+v || 0); }); });
  entries(S).forEach(([, e]) => { byKind[e.kind] = (byKind[e.kind] || 0) + (+e.pts || 0); });
  delete byKind.monthDone;
  return { byKind, total: Object.values(byKind).reduce((s, v) => s + v, 0) };
}

// The person's level from the saved points.
export const levelOf = (S) => levelFor(pointsByKind(S).total).level;

// The level to celebrate, or 0: the level now when it is higher than the last level this device saw (seen), whatever moved
// it up (the person, the app's own upkeep, a sync, another device, points earned while the app was closed). With no level
// seen yet (null), nothing: someone who already has a level is not greeted with a party the first time.
export const newLevel = (seen, level) => (seen != null && level > seen ? level : 0);

// ---- what the screens show ----
// { total, level: levelFor(total), byKind: { kind: pts }, recent: [{ key, kind, pts, day, d }] (newest first, up to 10),
//   monthPreview: { month, total, parts: [{ kind, pts, detail }] } (this month so far: "on the way", not counted yet),
//   waiting: the same for last month while it is not counted yet (before day COUNT_FROM_DAY), or null,
//   month: the points given this calendar month (each saved entry keeps the day it was given),
//   months: pointsByMonth(S) }
// rows: countedRows, when the caller has them already.
export function pointsSummary(S, today, rows) {
  const day = dayKey(today), E = entries(S), { byKind, total } = pointsByKind(S);
  const recent = E.filter(([, e]) => e.pts > 0).map(([key, e]) => ({ key, kind: e.kind, pts: e.pts, day: e.day, d: e.d ?? null })).reverse()
    .sort((a, b) => b.day.localeCompare(a.day)).slice(0, 10);
  const R = S && Array.isArray(S.tx) ? rows || countedRows(S, day) : [];
  const preview = (m, upTo) => { const parts = monthParts(R, S?.budgets, m, upTo).map((x) => ({ kind: x.kind, pts: x.pts, detail: x.d })); return { month: m, total: parts.reduce((s, x) => s + x.pts, 0), parts }; };
  const cm = day.slice(0, 7), pm = addM(cm, -1);
  const oldNow = Object.values(S?.points?._old?.[cm] || {}).reduce((s, v) => s + (+v || 0), 0); // this month's points already folded
  const month = oldNow + E.reduce((s, [, e]) => s + (e.day?.startsWith(cm) ? +e.pts || 0 : 0), 0);
  return { total, level: levelFor(total), byKind, recent, monthPreview: preview(cm, +day.slice(8, 10)), waiting: S?.points?.["month:" + pm] ? null : preview(pm), month, months: pointsByMonth(S) };
}
