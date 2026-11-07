// The Forecast page's numbers, kept apart from the screen so they can be tested.
// Nothing here changes the data.
import { homeModel } from "./home.js";
import { forecastLine, jarProject, capOfAt, monthsToOf, STEADY } from "./jars.js";
import { cardInfo, isCardPay } from "./activity.js";
import { roundParts } from "./recap.js";

// The Forecast page's choices, as saved in this browser ("moneyFc"), with the defaults filled in.
// The forecast always looks a year ahead, with the smart estimate; only the months it learns from can be chosen (3 by default).
export function fcChoices(z) { const o = { n: 3, ...(z || {}), h: 12, m: "smart" }; if (![3, 6, 12].includes(o.n)) o.n = 3; return o; }
// fcOpt: the page's choices { h: how far ahead (always 12), n: months to learn from }, saved in this browser as "moneyFc".
// H: the Home numbers for the same moment, when they are already worked out (core/derived.js home).
// The line itself is jars.js forecastLine (shared with Recap, Jars and the alerts); see there for how it is worked out.
export function forecastModel(S, now = new Date(), fx = {}, fcOpt = {}, H = null) {
  S = S || {}; H = H || homeModel(S, now, fx);
  const fc = fcChoices(fcOpt), L = forecastLine(S, H, now, fc), FH = L.FH, MK = H.MK;
  const d = { inc: L.inc, ex: L.ex, start: L.start, cash: L.cash, endThis: L.endThis, really: L.really, cardBill: L.cardBill, bal: L.bal, lo: L.lo, hi: L.hi, net: L.net, nm: L.nm, sd: L.sd, nEff: L.nEff, W: L.W, month1: L.month1, IR: L.IR, last: FH.last, incAt: L.incAt, outAt: L.outAt,
    R0: { cash: L.R.cash, cardsThis: L.R.cardsThis, billsTot: L.R.billsTot, likely: L.R.likely, cardsNext: L.R.cardsNext, sure: L.R.sure, likelyBank: L.R.likelyBank, incLeft: L.R.incLeft, daysLeft: L.R.daysLeft, payday: L.R.payday } };

  // The end of this month, part by part: today's money in the accounts (Home's "In your accounts"), less the card purchases
  // not paid yet and the bills due (Home's amounts), less the usual spending still to come, plus income still to come
  // (Recap's). Each part is whole shekels, rounded once, and they add up exactly to the end of this month (d.really).
  const F = H.flow, due = (F.up || []).reduce((s, b) => s + b.amt, 0);
  // d.really here means the end of this month (endMonth), not Home's "Your money after known payments" (today)
  d.endMonth = L.really;
  d.eom = { bank: Math.round(F.cash), cards: Math.round(Math.max(0, F.cards || 0)), due: Math.round(due), usual: L.R.likely, inc: L.R.incLeft, end: L.really };

  // How many bank payments of a card's bill, in the months it learns from, are left out of the numbers (the purchases are
  // already counted on the card).
  const used = new Set(L.W.map((j) => FH.keys[j]));
  const HS = H.S || S, ci = cardInfo(HS), cardPays = (HS.tx || []).filter((t) => used.has(String(t.d).slice(0, 7)) && isCardPay(HS, t, ci)).length;
  // the wallet accounts counted in the balance, for the words "in your bank and …": their names as you see them in the app
  // (from your accounts, never a fixed name), true for a wallet with no name, "" for none
  const wallets = (S.accounts || []).filter((a) => a.kind == "wallet" && a.inNW && !a.hide), wn = [...new Set(wallets.map((a) => String(a.n || "").trim()).filter(Boolean))];
  const wallet = wn.length ? wn.join(", ") : wallets.length > 0;

  // The amounts shown, in whole shekels, worked out once here: the Forecast's table, strip and cards and Recap's "A look at …"
  // all read these, so the same amount is the same number everywhere and the lines add up exactly to their totals.
  d.shown = shownOf(d, L.IR, L.ER, L.UP, FH.last, fc.h);

  // What the jars will hold in the coming months: only really free money goes in, shared by priority (the same projection as the Jars page).
  const jars = { ...jarProject(S, H, now, fc, 60, L), net: d.nm };
  return { fc, FH, MK, d, R: L.R, E: L.E, EC: L.EC, ER: L.ER, UP: L.UP, cardPays, wallet, jars, capOf: capOfAt(now), monthsTo: monthsToOf(now) };
}

// The table's bars for one row: one bar per month used (oldest first), each as a share of the row's biggest month, so its
// shape shows. v: the months as counted (this month made whole); so: this month so far (the solid part of its bar).
// A row with months below zero (more spent than came in) draws from a middle line: up for more than ₪0, down for less.
export function barsOf(v, so = null) {
  const mx = Math.max(1e-9, ...v.map((x) => Math.abs(x))), neg = v.some((x) => x < -0.5), base = neg ? 50 : 0, span = neg ? 50 : 100;
  return v.map((x, i) => {
    const h = (Math.abs(x) / mx) * span, last = i == v.length - 1 && so != null, s = last ? (Math.max(0, Math.min(Math.abs(so), Math.abs(x))) / mx) * span : h;
    return { v: x, b: x < 0 ? base - h : base, h, s: x < 0 ? h : s, part: last && Math.abs(so - x) >= 0.5 };
  });
}

// The table's totals, so it lands on the chart's own points (h months ahead). Every row counts spending in the month you
// buy. saved: money in less money out; end: what is really yours at the end of this month + saved, the chart's balance
// after 1 month (end1) and after h months (endH).
export function forecastTable(d, h = 12) {
  // each month's totals in whole shekels, rounded once (forecastLine's incAt / outAt, the same as the balance adds up)
  const sum = (rows, k) => Math.round(rows.reduce((s, r) => s + r.at(k), 0)), incAt = d.incAt || ((k) => sum(d.inc, k)), outAt = d.outAt || ((k) => sum(d.ex, k));
  const over = (f) => Array.from({ length: h }, (_, i) => f(i + 1)).reduce((a, c) => a + c, 0);
  const i1 = incAt(1), e1 = outAt(1), iH = over(incAt), eH = over(outAt);
  const saved1 = i1 - e1, savedH = iH - eH;
  return { i1, e1, iH, eH, saved1, savedH, end1: d.really + saved1, endH: d.really + savedH };
}

// The table's lines as shown, in whole shekels: in every column they add up exactly to the total shown for the group
// (roundParts: the lines rounded against the total, largest remainder first). The totals are the same numbers Saved, the
// balance and the chart use: each month ahead rounded once (forecastTable's incAt / outAt), the next h months the sum of those.
// rows: d.inc or d.ex; nv: the months used (the last one is this month); so / up: each line's this month so far and its known
// payments still due.
export function shownLines(rows, nv, h, so = [], up = []) {
  const sum = (a) => a.reduce((s, x) => s + x, 0);
  // T: the total shown; when it is more than a shekel or so from the lines added up (the next h months, each month rounded on
  // its own), the rest goes to the biggest lines, one shekel each
  const fit = (raw, T = Math.round(sum(raw))) => {
    const p = roundParts(raw, T), big = raw.map((v, i) => [Math.abs(v), i]).sort((a, b) => b[0] - a[0]);
    for (let left = T - sum(p), k = 0; left && big.length; k++, left -= Math.sign(left)) p[big[k % big.length][1]] += Math.sign(left);
    return { p, T };
  };
  const months = Array.from({ length: nv }, (_, i) => fit(rows.map((r) => r.v[i] || 0))), ahead = (k) => rows.map((r) => r.at(k));
  // a line that stays at its average (Steady) shows the same number under Expected as under Average; the other lines
  // take up the rest of the total
  const A = fit(rows.map((r) => r.mean)), N = fit(ahead(1)), pin = rows.map((r) => r.at(1) === r.mean);
  if (pin.some(Boolean) && !pin.every(Boolean)) {
    const free = rows.map((_, i) => i).filter((i) => !pin[i]), P = fit(free.map((i) => ahead(1)[i]), N.T - sum(rows.map((_, i) => (pin[i] ? A.p[i] : 0))));
    N.p = rows.map((_, i) => (pin[i] ? A.p[i] : P.p[free.indexOf(i)]));
  }
  const Y = fit(rows.map((r) => periodTotal(r, h)), Array.from({ length: h }, (_, k) => Math.round(sum(ahead(k + 1)))).reduce((s, x) => s + x, 0));
  const S = fit(rows.map((r, i) => so[i] || 0)), U = fit(rows.map((r, i) => up[i] || 0));
  // this month: so far + the known payments still due + what usually still comes after today (lk). The month's total stays
  // the one rounded in one go (the same number as everywhere else); so far and still due are rounded once, and what usually
  // still comes is the rest, so its parts add up exactly in every line and in the total
  const L = fit(rows.map((r, i) => (r.v[nv - 1] || 0) - (so[i] || 0) - (up[i] || 0)), nv ? months[nv - 1].T - S.T - U.T : 0);
  if (nv) months[nv - 1].p = rows.map((_, i) => S.p[i] + U.p[i] + L.p[i]);
  return {
    total: { v: months.map((m) => m.T), so: S.T, up: U.T, lk: L.T, mean: A.T, next: N.T, year: Y.T },
    rows: rows.map((_, i) => ({ v: months.map((m) => m.p[i]), so: S.p[i], up: U.p[i], lk: L.p[i], mean: A.p[i], next: N.p[i], year: Y.p[i] })),
  };
}

// Every forecast amount the pages show, rounded once (forecastModel's d.shown):
// inc / out: the table's lines and totals (shownLines; so: this month so far, up: the known payments still due, lk: what
// usually still comes this month);
// next: next month step by step (Recap's "A look at …" and the strip): really yours at the end of this month, each income
// and spending line as the table's "Expected" column, their totals and the end of next month (the chart's first month).
function shownOf(d, IR = {}, ER = {}, UP = {}, last = 12, h = 12) {
  const at = (o, k) => (o[k] || [])[last] || 0;
  const inc = shownLines(d.inc, d.W.length, h, d.inc.map((r) => at(IR, r.k)));
  const out = shownLines(d.ex, d.W.length, h, d.ex.map((r) => at(ER, r.k)), d.ex.map((r) => UP[r.k] || 0));
  const byNext = (a, c) => c.a - a.a;
  const next = {
    really: d.really,
    inc: d.inc.map((r, i) => ({ k: r.k, a: inc.rows[i].next, came: r.came, of: r.of, avg: r.avg })).filter((x) => x.a >= 1).sort(byNext),
    out: d.ex.map((r, i) => ({ k: r.k, a: out.rows[i].next })).filter((x) => x.a >= 1).sort(byNext),
    incT: inc.total.next, outT: out.total.next,
  };
  next.end = d.really + next.incT - next.outT;
  return { inc, out, next };
}

// The money a line adds up to over the whole forecast period, and the words for how it is moving.
export const periodTotal = (r, h) => Array.from({ length: h }, (_, i) => r.at(i + 1)).reduce((a, c) => a + c, 0);
// A row that had money in only one of the months shown has no direction (none: shown as "—").
export function direction(r, ty) {
  if (r.came != null && r.came <= 1) return { pc: 0, flat: true, none: true, cls: "", sym: "— ", word: "none" };
  const pc = r.mean ? (r.sl / r.mean) * 100 : 0, flat = Math.abs(pc) < STEADY * 100, good = ty == "in" ? pc > 0 : pc < 0;
  return { pc, flat, cls: flat ? "fl" : good ? "dn" : "up", sym: flat ? "● " : pc > 0 ? "▲ " : "▼ ", word: flat ? "steady" : pc > 0 ? "up" : "down" };
}

// The chart's point for the last day of this month, between now and next month: what is really yours then (the same as the
// "31 Oct" step), its likely range growing with the part of the month still to come.
export function endPoint(d) {
  const f = Math.min(1, Math.max(0, ((d.R0 && d.R0.daysLeft) || 0) / 30.44)), w = (d.sd || 0) * Math.sqrt(f);
  return { v: d.really, lo: d.really - w, hi: d.really + w };
}

// The picture of the projected balance: where each point goes in the 780 x 290 drawing.
// Only month ends, evenly spaced: first the last day of this month (d.eom, endPoint; the same as the "31 Oct" step), then
// the end of each month (d.bal[1..H]). pts: every point in order, k: "e" the last day of this month, 1..H the months.
// fn / fl: the first point below zero (its k), on the line and on the low edge of the range (null when none).
export function chartOf(d, H, W = 780, Ht = 290) {
  const Pl = 14, Pr = 14, Pt = 22, Pb = 30, e = d.eom || { v: d.bal[0], lo: d.lo[0], hi: d.hi[0] }; // bal[0]: the end of this month
  const raw = [{ k: "e", v: e.v, lo: e.lo, hi: e.hi }]; for (let k = 1; k <= H; k++) raw.push({ k, v: d.bal[k], lo: d.lo[k], hi: d.hi[k] });
  const arr = raw.flatMap((p) => [p.v, p.lo, p.hi]);
  let mn = Math.min(...arr), mx = Math.max(...arr); const pad = (mx - mn) * 0.08 || 1000; mn -= pad; mx += pad;
  const u = (W - Pl - Pr) / H, X = (k) => Pl + k * u, Y = (v) => Ht - Pb - ((v - mn) / (mx - mn)) * (Ht - Pb - Pt);
  const ticks = []; for (let i = 0; i <= 4; i++) { const v = mn + ((mx - mn) * i) / 4; ticks.push({ y: Y(v), label: (v < 0 ? "−" : "") + Math.abs(v / 1000).toFixed(0) + "k" }); }
  const pts = raw.map((p, i) => ({ ...p, x: X(i), y: Y(p.v) }));
  const band = pts.map((p) => p.x + "," + Y(p.hi)).join(" ") + " " + [...pts].reverse().map((p) => p.x + "," + Y(p.lo)).join(" ");
  const fn = (pts.find((p) => p.v < 0) || {}).k ?? null, fl = (pts.find((p) => p.lo < 0) || {}).k ?? null;
  return { W, Ht, Pl, Pr, Pt, Pb, mn, mx, u, X, Y, ticks, pts, band, line: pts.map((p) => p.x + "," + p.y).join(" "), zeroY: mn < 0 && mx > 0 ? Y(0) : null, fn, fl };
}
