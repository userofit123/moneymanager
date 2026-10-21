// Budgets: a monthly limit for a category. Shared budget logic: each budget's pace, suggested budgets, the bills in a budget, and the changes.
// Nothing here touches the screen. Suggestions are only worked out; nothing is created until the user accepts.
import { rdOf } from "./activity.js";
import { billState, fm } from "./bills.js";
import { addM } from "./home.js";
import { catJarsOf } from "./jars.js";

const sum = (a) => a.reduce((t, x) => t + x, 0);
const CNC = new Intl.Collator(undefined, { sensitivity: "base" });
const SKIP_ALWAYS = ["Income", "Uncategorized", "Fees & FX costs"];

// Everything the Budgets page shows, for one moment.
export function budgetsModel(S, now = new Date()) {
  S = S || {};
  const st = billState(S, now), { A, NOW, MK } = st, BC = st.all;
  const DAYN = NOW.getDate(), DIM = new Date(NOW.getFullYear(), NOW.getMonth() + 1, 0).getDate();
  const budgets = S.budgets || {}, budgetNo = S.budgetNo || [], cfg = { budgetPct: 80, ...(S.cfg || {}) };
  // this month's spending by category, biggest first
  const sp0 = {}; A.filter((t) => t.a < 0 && rdOf(t).startsWith(MK)).forEach((t) => { const c = t.c || "Uncategorized"; sp0[c] = (sp0[c] || 0) + Math.abs(t.a); });
  const spend = Object.entries(sp0).sort((a, b) => b[1] - a[1]);
  // the last six months, the first one with data, and the biggest categories
  const ms = []; for (let i = 5; i >= 0; i--) ms.push(addM(MK, -i));
  const hist = { keys: ms, first: 0, cat: {} };
  { const first = (S.tx || []).filter((t) => !st.k.isFut(t) && !t.virtual).reduce((m, t) => (t.d < m ? t.d : m), "9999-99-99"); let fi = first == "9999-99-99" ? 5 : ms.indexOf(first.slice(0, 7)); if (fi < 0) fi = first.slice(0, 7) < ms[0] ? 0 : 5; if (first != "9999-99-99" && +first.slice(8) > 10 && fi < 5) fi++; hist.first = Math.max(0, Math.min(5, fi)); }
  const cats = {}; A.filter((t) => !t.pending).forEach((t) => { const i = ms.indexOf(rdOf(t).slice(0, 7)); if (i < 0 || t.a > 0) return; const k = t.c || "Uncategorized"; (cats[k] = cats[k] || ms.map(() => 0))[i] -= t.a; });
  Object.entries(cats).sort((a, b) => sum(b[1]) - sum(a[1])).slice(0, 5).forEach(([k, v]) => { hist.cat[k] = v; });
  const budMonths = [2, 3, 4].filter((i) => i >= (hist.first || 0)).map((i) => ms[i]);
  const M = {}; A.filter((t) => t.a < 0).forEach((t) => { const c = t.c || "Uncategorized", m = rdOf(t).slice(0, 7); (M[c] = M[c] || {})[m] = (M[c][m] || 0) - t.a; });
  // each budget: spent, left, the pace, and how it is going
  const info = Object.entries(budgets).map(([k, lim]) => {
    const s = sp0[k] || 0, pc = lim ? (s / lim) * 100 : 0, B = BC.filter((b) => !b.once && !b.irregular && b.flag != "canceled" && b.cat == k);
    const paid = Math.min(s, sum(B.filter((b) => b.lp && b.lp.startsWith(MK)).map((b) => b.pred))), due = sum(B.filter((b) => !(b.lp && b.lp.startsWith(MK)) && b.nx && b.nx.toISOString().slice(0, 7) == MK).map((b) => b.pred)), pace = paid + due + ((s - paid) / DAYN) * DIM;
    return { k, lim, s, pace, pc, left: lim - s, perDay: Math.max(0, (lim - s) / Math.max(1, DIM - DAYN)), st: s > lim ? "over" : pc >= cfg.budgetPct ? "warn" : pace > lim ? "pace" : "ok" };
  });
  // suggestions: from the last three complete months, never created behind the user's back
  const recMo = (k) => sum(BC.filter((b) => !b.once && !b.irregular && b.flag != "canceled" && b.mo > 0 && b.cat == k).map((b) => b.mo));
  const fresh = [], review = [], skip = (k) => SKIP_ALWAYS.includes(k) || (S.cats || {})[k] === 99, CUR = sp0;
  if (budMonths.length >= 2) Object.keys(M).forEach((k) => {
    if (skip(k)) return;
    const vals = budMonths.map((m) => M[k][m] || 0), avg = sum(vals) / vals.length, prop = Math.max(50, Math.ceil((avg * 1.05) / 50) * 50);
    if (!(k in budgets)) { if (avg >= 100 && recMo(k) < avg * 0.6 && !budgetNo.includes("new|" + k)) fresh.push({ k, avg, vals, prop }); }
    else {
      const lim = budgets[k], over = vals.filter((v) => v > lim).length; if (budgetNo.includes("rev|" + k + "|" + MK)) return;
      if (avg * 1.25 < lim && prop < lim && vals.filter((v) => v > 0).length >= 2 && (CUR[k] || 0) <= prop) review.push({ k, lim, avg, vals, kind: "lower", prop, over });
      else if (over >= 2 && avg > lim * 1.05 && prop > lim) review.push({ k, lim, avg, vals, kind: "raise", prop, over });
    }
  });
  fresh.sort((a, b) => b.avg - a.avg);
  // bills that sit inside a budget's category, and the jar that pays for a category
  const billsIn = (k) => BC.filter((b) => !b.once && b.flag != "canceled" && !b.ended && b.cat == k && (b.nx || b.irregular));
  const catJars = catJarsOf(S);
  const catNames = Object.keys(S.cats || {}).slice().sort(CNC.compare);
  const un = spend.filter(([k]) => !(k in budgets) && k != "Uncategorized");
  const totL = sum(info.map((b) => b.lim)), totS = sum(info.map((b) => b.s));
  return { ...st, DAYN, DIM, spend, hist, budMonths, M, info, fresh, review, billsIn, catJars, catNames, un, totL, totS, budgetNo, budgets, bills: BC };
}
// The suggested limit shown when adding a budget: the average of the last three months, to the nearest 50 (only for the biggest categories).
export const formSuggestion = (m, k) => (m.hist.cat[k] ? Math.round(m.hist.cat[k].slice(2, 5).reduce((a, b) => a + b, 0) / 3 / 50) * 50 : "");
// The categories that can still get a budget, with the chosen one always present.
export const formCategories = (m, k) => m.catNames.filter((c) => (!["Income", "Uncategorized"].includes(c) && !(c in m.budgets)) || c == k);

// ---- Changes. Each one changes a copy of the state and gives back its history lines: [[action, detail, undo?], ...] ----
const undo = (k, old) => ({ type: "budget", k, old });
export const acceptBudget = (S, k, value) => { const v = Math.round(+value); if (!(v > 0)) return false; S.budgets[k] = v; return [["Accepted a suggested budget", k + ": " + fm(v) + " / month", undo(k, null)]]; };
export function acceptAll(S, pairs) {
  let n = 0; pairs.forEach(([k, val]) => { const v = Math.round(+val); if (v > 0 && !(k in S.budgets)) { S.budgets[k] = v; n++; } });
  return n ? [["Accepted suggested budgets", n + " budget" + (n == 1 ? "" : "s")]] : false;
}
export const dismissSuggestion = (S, k) => { S.budgetNo = [...(S.budgetNo || []), "new|" + k]; return []; };
export const laterReview = (S, k, MK) => { S.budgetNo = [...(S.budgetNo || []), "rev|" + k + "|" + MK]; return []; };
export const resetDismissed = (S) => { S.budgetNo = []; return []; };
export const applyBudget = (S, k, v) => { const old = S.budgets[k]; S.budgets[k] = +v; return [["Updated a budget (suggested)", k + ": " + fm(old) + " → " + fm(+v), undo(k, old)]]; };
export const setBudget = (S, k, value) => { const v = +value; if (!k || !v) return false; S.budgets[k] = v; return [["Set budget", k + ": " + fm(v) + " / month", undo(k, null)]]; };
export const removeBudget = (S, k) => { const old = S.budgets[k]; delete S.budgets[k]; return [["Removed budget", k, undo(k, old)]]; };
export const changeBudget = (S, k, value) => { const old = S.budgets[k]; S.budgets[k] = +value; return [["Changed budget", k + ": " + fm(old) + " → " + fm(+value), undo(k, old)]]; };
