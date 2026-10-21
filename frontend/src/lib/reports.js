// The Reports page's numbers, kept apart from the screen so they can be tested. They follow the current app exactly
// (web/js/06-trend-forecast-sync.js reps/renderNW/trSeries/seriesN, 03-bills-home.js renderCmp, 07-periods-rules.js ranges):
// the same periods, comparisons, monthly series, merchants and tags. Nothing here changes the data.
import { rangeOf as rangeOfA, rdOf } from "./activity.js";
import { addM } from "./home.js";

const p2 = (n) => String(n).padStart(2, "0");
const sum = (a) => a.reduce((x, y) => x + y, 0);
const iso = (d) => d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());

// Time frames: { p: "month" | "custom" | ..., from, to }.
export const periodRange = (r, now, ws = "sun") => rangeOfA(r.p || "all", now, ws, r.from || "", r.to || "");
export const inRange = (d, r, now, ws) => { const [a, b] = periodRange(r, now, ws); return d >= a && d <= b; };
export const shiftDays = (d, k) => { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + k); return iso(x); };
export const dayDiff = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5) + 1;
const rangeObj = (m) => ({ p: "custom", from: m + "-01", to: m + "-31" });
// The period to compare with: the one just before it (calendar-aware for months and years), or the same dates a year earlier.
export function cmpRange(r, mode, now, ws) {
  const [a, b] = periodRange(r, now, ws); if (a == "0000-01-01" || b == "9999-12-31") return null;
  const MK = now.getFullYear() + "-" + p2(now.getMonth() + 1), Y = now.getFullYear();
  if (mode == "yoy") { const sh = (d) => (+d.slice(0, 4) - 1) + d.slice(4); return { p: "custom", from: sh(a), to: sh(b) }; }
  if (r.p == "month") return rangeObj(addM(MK, -1)); if (r.p == "lastmonth") return rangeObj(addM(MK, -2));
  if (r.p == "year") return { p: "custom", from: (Y - 1) + "-01-01", to: (Y - 1) + "-12-31" }; if (r.p == "lastyear") return { p: "custom", from: (Y - 2) + "-01-01", to: (Y - 2) + "-12-31" };
  if (r.p == "custom" && /-01$/.test(a) && a.slice(0, 7) == b.slice(0, 7) && +b.slice(8) >= 28) return rangeObj(addM(a.slice(0, 7), -1));
  const len = dayDiff(a, b); return { p: "custom", from: shiftDays(a, -len), to: shiftDays(a, -1) };
}
// The last day shown for a compared period (a month ends on its real last day).
export const cmpEnd = (c) => (c.to.endsWith("-31") ? shiftDays(addM(c.to.slice(0, 7), 1) + "-01", -1) : c.to);

// The name of an income source (who it came from).
export const incKey = (t) => { const f = String(t.from || "").trim(); if (f && !/^(bank transfer|other)$/i.test(f)) return f; const d = String(t.desc || "").replace(/[0-9\/\\.,:;*#()\-_]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 40); return d || "Other income"; };
const counted = (M) => M.rows.filter((t) => !t.pending);

// Spending by category, merchant or tag for one time frame, and for the one it is compared with.
export function block(M, r, cmpMode, now, ws) {
  const cr = cmpMode && cmpMode != "none" ? cmpRange(r, cmpMode, now, ws) : null, all = M.rows;
  return { r, cr, cur: all.filter((t) => inRange(rdOf(t), r, now, ws) && t.a < 0), prev: cr ? all.filter((t) => inRange(rdOf(t), cr, now, ws) && t.a < 0) : null };
}
export const sumBy = (L, key) => { const m = {}; L.forEach((t) => key(t).forEach((k) => (m[k] = (m[k] || 0) + Math.abs(t.a)))); return m; };
export const totalOf = (m) => Object.values(m).reduce((a, b) => a + b, 0);
export const byAmount = (m) => Object.entries(m).sort((a, b) => b[1] - a[1]);

// Top merchants: the biggest seven, with how many payments, the usual category and whether it is a bill.
export function merchants(M, B, S) {
  const hidden = (S.hiddenMerchants || []), hid = (n) => hidden.includes(String(n).toLowerCase()), f1 = (L) => L.filter((t) => !hid(t.to));
  const cur = sumBy(f1(B.cur), (t) => [t.to]), prev = B.prev ? sumBy(f1(B.prev), (t) => [t.to]) : null, e = byAmount(cur).slice(0, 7), mx = e[0] ? e[0][1] : 1, MI = {};
  f1(B.cur).forEach((t) => { const o = (MI[t.to] = MI[t.to] || { n: 0, cats: {} }); o.n++; if (t.c) o.cats[t.c] = (o.cats[t.c] || 0) + 1; });
  const bills = M.billsAll || [], mbill = (n) => { const l = String(n).toLowerCase(); return bills.find((b) => !b.once && b.flag != "canceled" && b.match && l.includes(b.match)); };
  return { prev, mx, hidden, rows: e.map(([n, v]) => { const o = MI[n] || { n: 0, cats: {} }, top = Object.entries(o.cats).sort((a, b) => b[1] - a[1])[0], bl = mbill(n); return { n, v, before: prev ? prev[n] || 0 : null, count: o.n, cat: top ? top[0] : "", bill: bl ? (bl.irregular ? "irregular" : "bill") : "" }; }) };
}

// Month by month: income, expenses and the five biggest categories (or income sources). n = 0 means all history (up to 60 months).
export function seriesN(M, n, ty, MK) {
  const rows = counted(M);
  if (!n) { const e = M.rows.reduce((m, t) => (t.d < m ? t.d : m), MK + "-31").slice(0, 7); n = 1; while (n < 60 && addM(MK, -n) >= e) n++; }
  const keys = []; for (let i = n - 1; i >= 0; i--) keys.push(addM(MK, -i));
  const inc = keys.map(() => 0), exp = keys.map(() => 0), cats = {};
  rows.forEach((t) => { const i = keys.indexOf(rdOf(t).slice(0, 7)); if (i < 0) return;
    if (t.a > 0) { inc[i] += t.a; if (ty == "inc") { const c = t.c || "Uncategorized"; (cats[c] = cats[c] || keys.map(() => 0))[i] += t.a; } }
    else { exp[i] -= t.a; if (ty != "inc") { const c = t.c || "Uncategorized"; (cats[c] = cats[c] || keys.map(() => 0))[i] -= t.a; } } });
  return { keys, inc, exp, cat: Object.fromEntries(Object.entries(cats).sort((a, b) => sum(b[1]) - sum(a[1])).slice(0, 5)) };
}

// The main chart: what can be shown, and one number per month for it.
export function trOptions(M) {
  const rows = counted(M), cat = {}, src = {}, tag = {};
  rows.forEach((t) => { const v = Math.abs(t.a); if (t.a > 0) { const k = incKey(t); src[k] = (src[k] || 0) + v; } else { const c = t.c || "Uncategorized"; cat[c] = (cat[c] || 0) + v; (t.tags || []).forEach((g) => (tag[g] = (tag[g] || 0) + v)); } });
  const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map((x) => x[0]);
  return { cat: top(cat, 40), src: top(src, 12), tag: top(tag, 20) };
}
export function trSeries(M, S, spec, ms) {
  const rows = counted(M), by = (pred, sg) => { const m = {}; rows.forEach((t) => { if (pred(t)) m[rdOf(t).slice(0, 7)] = (m[rdOf(t).slice(0, 7)] || 0) + (sg ? t.a : Math.abs(t.a)); }); return ms.map((k) => m[k] || 0); };
  const [k, ...r] = spec.split(":"), arg = r.join(":");
  if (k == "inc") return by((t) => t.a > 0); if (k == "exp") return by((t) => t.a < 0); if (k == "net") return by(() => true, 1);
  if (k == "cat") return by((t) => t.a < 0 && (t.c || "Uncategorized") == arg); if (k == "src") return by((t) => t.a > 0 && incKey(t) == arg); if (k == "tag") return by((t) => t.a < 0 && (t.tags || []).includes(arg));
  if (k == "bills") {
    const ids = new Set();
    (M.billsAll || []).filter((b) => b.flag != "canceled").forEach((b) => (b.mode == "once" ? (S.tx || []).filter((t) => (b.ids || []).includes(t.id)) : M.rows.filter((t) => t.a < 0 && (t.desc + " " + t.to).toLowerCase().includes(b.match))).forEach((t) => ids.add(t.id)));
    return by((t) => t.a < 0 && ids.has(t.id));
  }
  return null;
}

// Net worth by month for the main chart: saved snapshots, or rebuilt from the payments (web/js/02-state-data.js).
export function nwSeries(S, M, MK) {
  const N = 60, nm = []; for (let i = N - 1; i >= 0; i--) nm.push(addM(MK, -i));
  const rate = M.rate, snap = Object.fromEntries((S.nwSnaps || []).map((x) => [x.month, x])), sumK = (kind) => sum((S.accounts || []).filter((a) => a.kind == kind).map((a) => a.v * rate(a.cur)));
  const kindOf = Object.fromEntries((S.accounts || []).map((a) => [a.n, a.kind])), d = { bank: {}, wallet: {} }; let firstM = "9999-99";
  (S.tx || []).forEach((t) => { if (t.pending || t.virtual || M.k.isFut(t)) return; const kk = kindOf[t.a < 0 ? t.from : t.to]; if (!d[kk]) return; const m = t.d.slice(0, 7); if (m < firstM) firstM = m; d[kk][m] = (d[kk][m] || 0) + t.a; });
  const rec = {}; { let b = sumK("bank"), w = sumK("wallet"); for (let i = N - 1; i >= 0; i--) { rec[nm[i]] = { bank: b, wise: w }; b -= d.bank[nm[i]] || 0; w -= d.wallet[nm[i]] || 0; } }
  const sumC = () => sum((S.accounts || []).filter((a) => a.kind == "custom" && a.inNW).map((a) => a.v * rate(a.cur)));
  const out = { keys: nm, hap: [], wise: [], pen: [], oth: [], first: Math.max(0, nm.findIndex((m) => m >= firstM) - 1) };
  let last = { bank: 0, wise: 0, pension: 0, other: 0 };
  nm.forEach((m, i) => { const x = i == N - 1 ? { bank: sumK("bank"), wise: sumK("wallet"), pension: sumK("pension"), other: sumC() } : snap[m] || (firstM != "9999-99" ? { bank: rec[m].bank, wise: rec[m].wise, pension: sumK("pension"), other: sumC() } : last); if (x) last = x;
    out.hap.push(Math.round(last.bank)); out.wise.push(Math.round(last.wise)); out.pen.push(Math.round(last.pension)); out.oth.push(Math.round(last.other || 0)); });
  return out;
}

// "This month vs last month": spending so far against the same days of last month, by category.
export function monthCompare(M, MK) {
  const rows = counted(M), pm = addM(MK, -1), DAYN = M.DAYN, ms = []; for (let i = 5; i >= 0; i--) ms.push(addM(MK, -i));
  const catTot = {}, catPm = {}; rows.forEach((t) => { if (t.a >= 0) return; const m = rdOf(t).slice(0, 7), i = ms.indexOf(m); if (i < 0) return; const k = t.c || "Uncategorized"; catTot[k] = (catTot[k] || 0) - t.a; if (m == pm) catPm[k] = (catPm[k] || 0) - t.a; });
  const ks = Object.entries(catTot).sort((a, b) => b[1] - a[1]).slice(0, 5).map((x) => x[0]);
  const cur = Object.fromEntries(M.spend), lastTot = M.kpi.exLast, thisTot = M.kpi.ex;
  const same = M.rows.filter((t) => t.a < 0 && rdOf(t).startsWith(pm) && +rdOf(t).slice(8) <= DAYN).reduce((s, t) => s - t.a, 0), d = thisTot - same, p = same ? Math.round(Math.abs(d) / same * 100) : 0;
  const dir = !same ? 0 : !p ? 0 : d > 0 ? 1 : -1;
  const list = ks.map((k) => ({ k, a: cur[k] || 0, b: catPm[k] || 0 })).filter((r) => r.a > 0 || r.b > 0).sort((x, y) => y.a + y.b - (x.a + x.b)), mx = Math.max(1, ...list.flatMap((r) => [r.a, r.b]));
  return { pm, DAYN, thisTot, lastTot, same, d, p, dir, rows: list, mx };
}
