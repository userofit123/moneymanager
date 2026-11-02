// Points and levels: points for good actions and good money results, which add up to levels.
// Levels never go down and points are never taken away for a bad month.
// Everything here works on the saved data S and gives back numbers; nothing touches the screen.
//
// What is saved: S.points = { [key]: { pts, kind, day, d? } } — one entry per thing that earned points, so the same
// thing never earns twice (the key says what it was: "visit:2026-11-02", "alert:<id>", "month:2026-10:kept" ...).
// day: the day it was earned (YYYY-MM-DD); d: a short detail (a category, an alert id, a month).
// "_old": { [kind]: pts } holds the points of old daily entries folded into one total per kind, so the saved data stays small.
import { withTransfers, addM, rdOf } from "./home.js";
import { countedTx } from "./bills.js";
import { isIn, isOut } from "./moneyIn.js";

// ---- the points for each thing (one table, easy to tune) ----
export const POINTS = {
  visit: 5, // using the app on a day (once a day)
  alert: 10, // clearing an alert (the first time for that alert)
  review: 5, // an item in Needs review looked at (once per item)
  cat: 1, // giving a payment a category by hand
  catDay: 50, // ... at most this many points a day
  tag: 1, // adding a tag by hand
  tagDay: 20, // ... at most this many points a day
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
const DAILY = ["visit", "cat", "tag"], KEEP_DAYS = 90;
// Month results are counted from this day of the next month, so late bank and card rows are in first.
export const COUNT_FROM_DAY = 3;

// ---- levels ----
// Level 1 at 0 points; level 2 needs 100, level 3 250, level 4 450, level 5 700: each step needs 50 more than the last.
export const stepFor = (level) => 100 + 50 * (level - 1); // points from `level` to the next one
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
export const dayKey = (d) => (typeof d === "string" ? d.slice(0, 10) : d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()));
const entries = (S) => Object.entries(S?.points || {}).filter(([k, e]) => k !== "_old" && e && typeof e === "object");
// points of one kind earned on one day
export const earnedOn = (S, kind, day) => entries(S).reduce((s, [, e]) => s + (e.kind === kind && e.day === day ? +e.pts || 0 : 0), 0);
const CAPS = { cat: "catDay", tag: "tagDay" };

// Gives points once for `key` (never twice), within the day's cap of its kind. Changes S. Returns the points given (0 when none).
export function award(S, key, kind, pts, today, d) {
  if (!S || !key) return 0;
  S.points = S.points || {};
  if (S.points[key]) return 0;
  const day = dayKey(today);
  pts = Math.round(+pts || 0);
  const cap = CAPS[kind] && POINTS[CAPS[kind]];
  if (cap != null) pts = Math.min(pts, Math.max(0, cap - earnedOn(S, kind, day)));
  if (pts <= 0 && cap != null) return 0; // over the day's cap: not kept, so it can still earn on another day
  S.points[key] = { pts, kind, day, ...(d != null && d !== "" ? { d: String(d).slice(0, 120) } : {}) };
  return pts;
}

// History lines of a change made by hand that give a category or add a tag (automatic sorting gives nothing).
const BY_HAND_CAT = new Set(["Edited category", "Changed bill category"]);
const BY_HAND_TAG = new Set(["Added tag"]);
const NEW_RULE = new Set(["Added rule"]);
const NO_CAT = (c) => !c || c === "Uncategorized";

// The points a change made by the person earns, worked out from what it changed (before → after) and its history lines.
// Gives them on `after`, so they are saved with the change and Undo of that change takes them back. Returns the points given.
export function earnFromChange(before, after, lines, today) {
  if (!before || !after) return 0;
  const acts = new Set((lines || []).map((l) => l && l[0]));
  if (acts.has("Undid a change")) return 0;
  let got = 0;
  const give = (key, kind, pts, d) => { got += award(after, key, kind, pts, today, d); };
  const old = new Map((before.tx || []).map((t) => [t.id, t]));
  // a category given by hand: once per payment
  if ([...acts].some((a) => BY_HAND_CAT.has(a)))
    (after.tx || []).forEach((t) => { const o = old.get(t.id); if (o && !NO_CAT(t.c) && o.c !== t.c) give("cat:" + t.id, "cat", POINTS.cat, t.c); });
  // a tag added by hand: once per payment and tag
  if ([...acts].some((a) => BY_HAND_TAG.has(a)))
    (after.tx || []).forEach((t) => { const o = old.get(t.id); if (o) (t.tags || []).filter((g) => !(o.tags || []).includes(g)).forEach((g) => give("tag:" + t.id + ":" + g, "tag", POINTS.tag, g)); });
  // a new category rule: once per rule text
  if ([...acts].some((a) => NEW_RULE.has(a))) {
    const had = new Set((before.rules || []).map((r) => String(r.k).toLowerCase()));
    (after.rules || []).forEach((r) => { const k = String(r.k).toLowerCase(); if (!had.has(k)) give("rule:" + k, "rule", POINTS.rule, r.k); });
  }
  // an alert cleared: only the first time for that alert
  Object.keys(after.dismissed || {}).forEach((id) => { if (!(before.dismissed || {})[id]) give("alert:" + id, "alert", POINTS.alert, id); });
  // Needs review: a transfer confirmed or turned down, possible duplicates kept or deleted
  const xf0 = new Map((before.xf || []).map((x) => [x.o, x]));
  (after.xf || []).forEach((x) => { const o = xf0.get(x.o); if (o && o.st !== x.st && (x.st === "ok" || x.st === "rej") && o.st !== "ok" && o.st !== "rej") give("review:xf:" + x.o, "review", POINTS.review); });
  Object.keys(after.dupOk || {}).forEach((id) => { if (!(before.dupOk || {})[id]) give("review:dup:" + id, "review", POINTS.review); });
  if (acts.has("Deleted duplicate")) { const now = new Set((after.tx || []).map((t) => t.id)); old.forEach((t, id) => { if (!now.has(id)) give("review:dup:" + id, "review", POINTS.review); }); }
  return got;
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
export const countedRows = (S, today) => countedTx(withTransfers(S), dayKey(today)).A;

// Money in and money out of one month, and what was spent in each category.
export function monthMoney(rows, m) {
  let inc = 0, out = 0, n = 0, uncat = 0;
  const cat = {};
  rows.forEach((t) => {
    if (!rdOf(t).startsWith(m)) return;
    n++;
    if (isIn(t)) inc += t.a;
    else if (isOut(t)) { out -= t.a; const k = t.c || "Uncategorized"; cat[k] = (cat[k] || 0) - t.a; if (NO_CAT(t.c)) uncat++; }
  });
  return { inc, out, cat, n, uncat };
}
// The share of the month's income kept, in whole percent (rounded once; null with no income).
export const keptPct = (mm) => (mm.inc > 0 ? Math.round(((mm.inc - mm.out) / mm.inc) * 100) : null);

// A month's results: [{ key, kind, pts, d }]. rows: countedRows; budgets: S.budgets.
export function monthParts(rows, budgets, m) {
  const cur = monthMoney(rows, m), prev = monthMoney(rows, addM(m, -1)), parts = [];
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
  setupDone(S).forEach((x) => { got += award(S, x.key, x.kind, x.pts, day, x.d); });
  const pm = addM(day.slice(0, 7), -1), done = "month:" + pm;
  if (+day.slice(8, 10) >= COUNT_FROM_DAY && !S.points[done]) {
    const R = rows || countedRows(S, day);
    monthParts(R, S.budgets, pm).forEach((x) => { got += award(S, x.key, x.kind, x.pts, day, x.d); });
    S.points[done] = { pts: 0, kind: "monthDone", day, d: pm }; // counted once, even when it earned nothing
  }
  const old = dayKey(new Date(new Date(day + "T12:00:00").getTime() - KEEP_DAYS * 864e5));
  entries(S).forEach(([k, e]) => {
    if (DAILY.includes(e.kind) && e.day < old) { S.points._old = S.points._old || {}; S.points._old[e.kind] = (S.points._old[e.kind] || 0) + (+e.pts || 0); delete S.points[k]; }
  });
  return got;
}

// ---- what the screens show ----
// { total, level: levelFor(total), byKind: { kind: pts }, recent: [{ key, kind, pts, day, d }] (newest first, up to 10),
//   monthPreview: { month, total, parts: [{ kind, pts, detail }] } (this month so far: "on the way", not counted yet),
//   waiting: the same for last month while it is not counted yet (before day COUNT_FROM_DAY), or null }
// rows: countedRows, when the caller has them already.
export function pointsSummary(S, today, rows) {
  const day = dayKey(today), E = entries(S), byKind = { ...(S?.points?._old || {}) };
  E.forEach(([, e]) => { byKind[e.kind] = (byKind[e.kind] || 0) + (+e.pts || 0); });
  delete byKind.monthDone;
  const total = Object.values(byKind).reduce((s, v) => s + v, 0);
  const recent = E.filter(([, e]) => e.pts > 0).map(([key, e]) => ({ key, kind: e.kind, pts: e.pts, day: e.day, d: e.d ?? null })).reverse()
    .sort((a, b) => b.day.localeCompare(a.day)).slice(0, 10);
  const R = S && Array.isArray(S.tx) ? rows || countedRows(S, day) : [];
  const preview = (m) => { const parts = monthParts(R, S?.budgets, m).map((x) => ({ kind: x.kind, pts: x.pts, detail: x.d })); return { month: m, total: parts.reduce((s, x) => s + x.pts, 0), parts }; };
  const pm = addM(day.slice(0, 7), -1);
  return { total, level: levelFor(total), byKind, recent, monthPreview: preview(day.slice(0, 7)), waiting: S?.points?.["month:" + pm] ? null : preview(pm) };
}
