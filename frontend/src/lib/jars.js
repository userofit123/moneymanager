// The Jars page's numbers, kept apart from the screen so they can be tested: the free money, each jar's state
// and what each jar will hold in the months ahead.
// Nothing here changes the data.
import { homeModel, addM, rdOf } from "./home.js";
import { dstr } from "../dates.js";
import { recapModel, incKey } from "./recap.js";
import { isIn } from "./moneyIn.js";
import { acctOf } from "./activity.js";

const sum = (a) => a.reduce((t, x) => t + x, 0);

export { incKey } from "./recap.js";

// THE FORECAST'S RULES (the same words are in the page's help and in docs/how-it-works.md; test/forecast-rules.test.js
// checks each one):
// 1. Months: it learns from exactly N months (N = your choice: 3, the default, 6 or 12): this month and the N - 1 months
//    before it, for every row (income and spending alike), on any day of the month. No other months are used.
// 2. This month = what really happened up to today + what usually happens after today's date. If something usually paid
//    later in the month was already paid earlier this month, it is not added again. An income that usually comes later in
//    the month and has not come yet counts as coming.
// 3. "What usually happens after today's date" is learned from the 2 full months before this month (always those 2), from
//    the real payment dates, payee by payee (names compared without the numbers banks add), and from the known bills
//    still due this month (recap.js afterToday).
// 4. Average per month = the plain average of the N months (a month with nothing counts as ₪0). Income: every month ahead
//    is exactly that average (no softening, no direction; its Trend is shown for information only). Spending: a very
//    unusual month is first softened toward normal (est).
// 5. Spending counts in the month you buy, card purchases too. The forecast starts from what is really yours at the end of
//    this month: the bank balance expected then, less this month's card purchases not paid yet (made so far and expected
//    until the end of the month). Each month after that = the month before + its income - its spending.
// 6. Direction (spending only): a trend fades within a few months and stays within 20% of the average (est).
// 7. A row (income or spending) with money in only one of the N months: every month ahead is its average, no direction.
// 8. The Jars and the forecast alert use the same line, from the same chosen months (fcChoices, saved as "moneyFc").

const medOf = (v) => { const x = [...v].sort((a, b) => a - b), h = x.length >> 1; return x.length % 2 ? x[h] : (x[h - 1] + x[h]) / 2; };
const avgOf = (v) => (v.length ? v.reduce((x, y) => x + y, 0) / v.length : 0);
const slope = (v) => { const nn = v.length, mean = avgOf(v); let sl = 0; if (nn > 1) { const xm = (nn - 1) / 2; let num = 0, den = 0; v.forEach((y, i) => { num += (i - xm) * (y - mean); den += (i - xm) ** 2; }); sl = num / den; } return sl; };
// A line whose change per month is less than this share of its average is "Steady" (forecast.js direction).
export const STEADY = 0.02;
// The estimate of a line, from its months v (oldest first).
// Rule 4: a month far from the typical month (the middle one of the months that had money) is first pulled to within 0.6x
// to 1.6x of it, so one unusual month counts less; a month with nothing stays ₪0. mean: the plain average after that.
// Rule 6: sl is its change per month, the same one the direction shows. The direction carries on but fades: the next month
// moves a full step from the last month, the one after half a step, then a quarter, and so on, and it never goes more than
// 20% above or below the average. A line that moves less than 2% a month (STEADY) stays at its average. With fewer than 3 months there is no direction: every month is the average.
// cv: each month as counted (after the pull).
export function est(v, cap = true) {
  const nn = v.length, nz = v.filter((y) => y > 0), med = nz.length ? medOf(nz) : 0;
  const c = cap && med > 0 ? v.map((y) => (y > 0 ? Math.min(med * 1.6, Math.max(med * 0.6, y)) : y)) : v, mean = avgOf(c);
  if (nn < 3) return { mean, sl: 0, cv: c, at: () => mean };
  const sl = slope(c);
  // a line that moves less than STEADY a month is shown as "Steady": every month ahead is exactly its average
  if (!mean || Math.abs(sl / mean) < STEADY) return { mean, sl, cv: c, at: () => mean };
  const lo = Math.min(mean * 0.8, mean * 1.2), hi = Math.max(mean * 0.8, mean * 1.2);
  // the last month sits (nn - 1) / 2 steps after the middle of the months; month k adds 1 + 1/2 + … (k steps, each half the one before)
  return { mean, sl, cv: c, at: (k) => Math.min(hi, Math.max(lo, mean + sl * ((nn - 1) / 2 + 2 * (1 - 0.5 ** k)))) };
}
// Rule 1: the months a forecast learns from, as indexes into forecastHistory's months: this month and the n - 1 before it,
// never a month before the history starts.
const learnIdx = (FH, n) => { const o = []; for (let j = Math.max(FH.first || 0, FH.last - n + 1); j <= FH.last; j++) o.push(j); return o; };
// One income source or spending category over the months W (a: its months, this month made whole).
// came / of: in how many of the months it had money. Spending: the part that usually goes on credit cards (share, from the
// same months; cardA: the card part of each month).
// Rule 4: income is its plain average every month (no softening, no direction); its direction is still worked out, for
// the Trend column only. Rule 7: a row with money in only one of the months is its average every month.
function proj(W, a, inc, cardA = null, share0 = 0) {
  const v = W.map((j) => a[j] || 0), came = v.filter((x) => x > 0).length, of = v.length, e = est(v.length ? v : [0], !inc);
  if (inc || came <= 1) e.at = () => e.mean;
  if (inc) return { v, W, nn: of, came, of, avg: came ? v.filter((x) => x > 0).reduce((s, x) => s + x, 0) / came : 0, ...e };
  const tot = v.reduce((x, y) => x + y, 0), cardT = cardA ? W.reduce((s, j) => s + (cardA[j] || 0), 0) : 0;
  const share = tot > 0 && cardA ? Math.min(1, Math.max(0, cardT / tot)) : share0;
  return { v: v.length ? v : [0], W, nn: Math.max(1, of), came, of, share, ...e };
}
// The last 13 months (12 complete ones and this one) split into income sources and spending categories, with the part of
// each month's spending that went on credit cards (catCard, expCard), which leaves the bank a month later with the card bill.
// first: the first month with transactions (the month after, when they start after the 10th).
export function forecastHistory(S, H) {
  const MK = H.MK, N = 13, ks = [], CC = new Set((S.accounts || []).filter((a) => a.kind == "card").map((a) => a.n));
  for (let i = N - 1; i >= 0; i--) ks.push(addM(MK, -i));
  const inc = ks.map(() => 0), exp = ks.map(() => 0), expCard = ks.map(() => 0), cats2 = {}, card2 = {}, incS2 = {}, sumA = (a) => a.reduce((x, y) => x + y, 0);
  const add = (o, k, i, v) => ((o[k] = o[k] || ks.map(() => 0))[i] += v);
  // pending rows count, the same way the Activity page counts them
  (H.rows || []).forEach((t) => {
    const i = ks.indexOf(rdOf(t).slice(0, 7)); if (i < 0) return;
    // money in only (lib/moneyIn.js): money back is neither money in nor spending, so it is never expected again
    if (t.back) return;
    if (isIn(t)) { inc[i] += t.a; add(incS2, incKey(S, t), i, t.a); return; }
    const k = t.c || "Uncategorized"; exp[i] -= t.a; add(cats2, k, i, -t.a);
    if (CC.has(acctOf(t))) { expCard[i] -= t.a; add(card2, k, i, -t.a); }
  });
  const f0 = (S.tx || []).filter((t) => !H.k.isFut(t) && !t.virtual).reduce((mm, t) => (t.d < mm ? t.d : mm), "9999-99-99");
  let fi = f0 == "9999-99-99" ? N - 1 : ks.indexOf(f0.slice(0, 7)); if (fi < 0) fi = f0.slice(0, 7) < ks[0] ? 0 : N - 1; if (f0 != "9999-99-99" && +f0.slice(8) > 10 && fi < N - 1) fi++; fi = Math.max(0, Math.min(N - 1, fi));
  const cat = {}, catCard = {}, incSrc = {}, ct = Object.entries(cats2).sort((a, b) => sumA(b[1]) - sumA(a[1])), it = Object.entries(incS2).sort((a, b) => sumA(b[1]) - sumA(a[1]));
  ct.slice(0, 8).forEach(([k, v]) => { cat[k] = v; catCard[k] = card2[k] || ks.map(() => 0); }); it.slice(0, 6).forEach(([k, v]) => (incSrc[k] = v)); if (it.length > 6) incSrc["Other income"] = ks.map((_, i) => it.slice(6).reduce((s, [, v]) => s + v[i], 0));
  return { keys: ks, last: N - 1, first: fi, inc, exp, expCard, cat, catCard, incSrc };
}
// The forecast line, shared by the Forecast, Recap ("A look at …"), Jars and alerts, so they all show the same numbers
// (the rules are at the top of this file). It counts money the day it leaves or reaches the bank:
// - It starts from what is really yours at the end of this month (really, below). Today's amounts are kept for the
//   pages (start: Recap's reallyNow, today's bank and wallet money less the card purchases already made and not paid yet and
//   the payments already due; cash: the bank and wallet money itself). The end of this month as Recap works it out (endThis: today's
//   money, less the card charges and bills still due this month and the usual spending after today not on cards, plus the
//   income still to come). Really yours then (really): endThis less this month's card purchases not paid yet (Recap's
//   nextBill), so every month after counts spending in the month you buy.
// - Each month after that: the month before + its expected income - its expected spending (card purchases included).
// - Every row's months (W): this month made whole (rules 2 and 3) and the n - 1 before it. ER / IR: the real months (this
//   month so far), E / IA: the months as counted.
// - The likely range (lo, hi) widens with the spread of the same months' money in less money out.
export function forecastLine(S, H, now, fcOpt = {}) {
  const n = [3, 6, 12].includes(+fcOpt.n) ? +fcOpt.n : 3, FH = forecastHistory(S, H), L = FH.last, W = learnIdx(FH, n), R = recapModel(H, now);
  const cats = Object.keys(FH.cat), O = "Other / uncategorized", lineOf = (k) => (cats.includes(k) ? k : O), srcOf = (k) => (k in FH.incSrc ? k : "Other income");
  // what usually happens after today (rule 3): the usual spending after today, by row, and the known bills still due
  // UP: the known payments still due this month by row (expected bills and future-dated charges), which Activity lists as upcoming
  const addOut = {}, addCard = {}, addIn = {}, UP = {}, put = (o, k, v) => (o[k] = (o[k] || 0) + v);
  R.rest.forEach((x) => { put(addOut, lineOf(x.k), x.a); put(addCard, lineOf(x.k), x.card); });
  R.bills.forEach((b) => { put(addOut, lineOf(b.cat), b.amt); put(UP, lineOf(b.cat), b.amt); });
  // the bills paid by credit card: spent this month too, on the card (the bank pays them with the card bill)
  R.cardUp.forEach((b) => { put(addOut, lineOf(b.cat), b.amt); put(UP, lineOf(b.cat), b.amt); put(addCard, lineOf(b.cat), b.amt); });
  R.incRest.forEach((x) => put(addIn, srcOf(x.k), x.a));
  const whole = (a, v) => a.map((x, i) => (i == L ? x + (v || 0) : x));
  const IR = {}, IA = {}; Object.keys(FH.incSrc).forEach((k) => { IR[k] = FH.incSrc[k]; IA[k] = whole(FH.incSrc[k], addIn[k]); });
  // spending: the biggest categories, and the rest together
  const E = {}, EC = {}, ER = {}, rest = (tot, part) => tot.map((t, i) => t - cats.reduce((s, k) => s + part[k][i], 0));
  cats.forEach((k) => { ER[k] = FH.cat[k]; E[k] = whole(ER[k], addOut[k]); EC[k] = whole(FH.catCard[k], addCard[k]); });
  ER[O] = rest(FH.exp, FH.cat); E[O] = whole(ER[O], addOut[O]); EC[O] = whole(rest(FH.expCard, FH.catCard), addCard[O]);
  const sumOf = (o, j) => Object.values(o).reduce((s, a) => s + (a[j] || 0), 0), sumW = (o) => W.reduce((s, j) => s + sumOf(o, j), 0);
  const share0 = sumW(E) > 0 ? sumW(EC) / sumW(E) : 0;
  const inc = Object.entries(IA).map(([k, a]) => ({ k, ...proj(W, a, true) })).filter((r) => Math.abs(r.mean) >= 0.5);
  const ex = Object.entries(E).map(([k, a]) => ({ k, ...proj(W, a, false, EC[k], share0) })).filter((r) => Math.abs(r.mean) >= 0.5);
  // each month's money in and out in whole shekels, rounded once here: the balance, the table and the tiles all add these up
  const incAt = (k) => Math.round(inc.reduce((s, r) => s + r.at(k), 0)), outAt = (k) => Math.round(ex.reduce((s, r) => s + r.at(k), 0));
  const cash = H.flow.cash, start = R.reallyNow, endThis = R.end, really = endThis - R.nextBill;
  // the spread of the same months, worked out the same way as the line (money in less money out)
  const nets = W.map((j) => sumOf(IA, j) - sumOf(E, j));
  const nm = nets.length ? nets.reduce((a, b) => a + b, 0) / nets.length : 0, sd = Math.sqrt(nets.reduce((s, x) => s + (x - nm) ** 2, 0) / Math.max(1, nets.length - 1));
  // net[k]: the money month k saves (its income less its spending), from what is really yours at the end of this month
  // bal[0] / lo[0] / hi[0]: the end of this month (the chart's first point), then the end of each month after it
  const bal = [really], lo = [really], hi = [really], net = [0]; let b = really;
  for (let k = 1; k <= 12; k++) { const c = incAt(k) - outAt(k); b += c; net.push(c); bal.push(b); const w = sd * Math.sqrt(k); lo.push(b - w); hi.push(b + w); }
  // next month, step by step (for Recap's "A look at …"): really yours at the end of this month, each income, each spending row.
  const month1 = {
    endThis, really, cardBill: R.nextBill, cardsMade: R.cardsNext, cardsMore: R.likelyCard,
    inc: inc.map((r) => ({ k: r.k, a: r.at(1), came: r.came, of: r.of, avg: r.avg })).filter((x) => x.a >= 0.5).sort((a, c) => c.a - a.a),
    out: ex.map((r) => ({ k: r.k, a: r.at(1) })).filter((x) => x.a >= 0.5).sort((a, c) => c.a - a.a),
    incT: incAt(1), outT: outAt(1), end: bal[1],
  };
  return { n, FH, W, WS: W, nEff: W.length, inc, ex, E, EC, ER, UP, IA, IR, start, cash, endThis, really, cardBill: R.nextBill, share0, bal, lo, hi, net, nm, sd, month1, R, incAt, outAt };
}
// The money the forecast line adds or takes away in month k from now (month 1 from today's bank money, so it includes the
// rest of this month and this month's card purchases): today's bank money plus these adds up to the line.
function forecastSurplus(S, H, now, fcOpt = {}, line = null) {
  const L = line || forecastLine(S, H, now, fcOpt);
  return (k) => { const j = Math.min(k, 12); return L.bal[j] - (j == 1 ? L.cash : L.bal[j - 1]); };
}

// Whole months from now until a date (at least 1).
export const monthsToOf = (now) => (d) => Math.max(1, Math.ceil((new Date(d) - now) / (864e5 * 30.44)));
// A jar's monthly amount: a jar with "auto" and a deadline works out its own. off: months from now (for the forecast).
export const capOfAt = (now) => { const monthsTo = monthsToOf(now); return (j, got, off = 0) => (j.cap == null ? null : j.auto && j.due && j.need > 0 ? Math.max(0, Math.ceil((j.need - (j.bal - (got || 0))) / Math.max(1, monthsTo(j.due) - off))) : j.cap); };
// What each open jar will hold month by month (shared by the Jars and Forecast pages): the free money today
// plus the money expected to be left each month, shared out in priority order. series: what it will hold, planned: what its monthly amount
// alone would give, eta: the month (from now) it is full. ahead12: what the jars before it took in the first 12 months
// (so a jar that gets less than planned can say whether those jars or a lack of money is the reason).
export function jarProject(S, H, now, fcOpt = {}, M = 60, line = null) {
  // the free money today already has the rest of this month's planned spending (H.flow.R.total) and the card purchases not
  // paid yet (H.flow.cards) taken off, and the line's first month takes both off too (its end of this month), so they are
  // given back once to not take them off twice
  const capOf = capOfAt(now), sur = forecastSurplus(S, H, now, fcOpt, line); let pool = (H.flow.cash || 0) - (H.flow.inJars || 0) - (H.flow.buffer || 0); // the money not in jars or the cushion
  const J = (S.jars || []).filter((j) => !j.done).sort((a, c) => a.p - c.p).map((j) => ({ ...j, b: +j.bal || 0, eta: null, ahead12: 0, series: [+j.bal || 0], plan: +j.bal || 0, planned: [+j.bal || 0] }));
  for (let k = 1; k <= M; k++) {
    pool = Math.max(0, pool + sur(k)); let took = 0;
    J.forEach((j) => {
      if (k <= 12) j.ahead12 += took;
      // a bill jar with no monthly amount is refilled to its target (what its bills need), the same as the Jars page:
      // it takes what it lacks, then stays full (its bills are already in the spending)
      const open = !(j.need > 0);
      if (open || j.b < j.need) { const c = capOf({ ...j, bal: j.b }, 0, k - 1), want = c == null ? (open ? 0 : j.need - j.b) : Math.min(c, open ? 1e12 : j.need - j.b), g = Math.max(0, Math.min(pool, want)); pool -= g; j.b += g; took += g; if (!open && j.b >= j.need - 0.5 && j.eta == null) j.eta = k; }
      j.series.push(j.b); const cp = j.cap == null ? 0 : capOf({ ...j, bal: j.plan }, 0, k - 1); j.plan = open ? j.plan + (cp || 0) : Math.min(j.need, j.plan + (cp || 0)); j.planned.push(j.plan);
    });
  }
  return { J, M, pool0: H.flow.free, sur: Array.from({ length: 12 }, (_, i) => sur(i + 1)) };
}

// now: today's date; fx: { USD: 3.7, ... }.
// fcOpt: the Forecast page's choices { n: months to base it on, m: "smart" | "avg" | "trend" }, saved in this browser as "moneyFc".
export function jarsModel(S, now = new Date(), fx = {}, fcOpt = {}) {
  S = S || {};
  const H = homeModel(S, now, fx), F = H.flow, MK = H.MK;
  const monthsTo = monthsToOf(now), capOf = capOfAt(now);
  const active = (S.jars || []).filter((j) => !j.done).sort((a, b) => a.p - b.p);

  // Jars fill in priority order from the free money: each takes what it still needs this month.
  let rem = F.free, gotT = 0, stillT = 0;
  const out = active.map((j) => {
    const bal = +j.bal || 0, got = Math.min(+j.got || 0, Math.max(0, bal) + (+j.paid || 0)), open = !(j.need > 0), capE = capOf(j, got);
    const need = open ? 0 : Math.max(0, j.need - bal), want = capE == null ? need : Math.max(0, Math.min(capE - got, open ? 1e12 : need)), give = Math.max(0, Math.min(rem, want));
    rem -= give; gotT += got; stillT += want;
    return { ...j, bal, need: +j.need || 0, got, want, give, capE, open };
  });

  // When each jar will be full: what is free today plus the money expected to be left each month, shared out in priority order.
  // The expected monthly surplus is the average of the complete months so far (income minus spending).
  // The money left each month is the Forecast page's guess (forecastSurplus), so both pages agree.
  const eta = {}; jarProject(S, H, now, fcOpt).J.forEach((j) => { if (j.eta != null) eta[j.id] = j.eta; });

  const jars = out.map((j, ix) => {
    const type = j.bill ? "bill" : j.open ? "month" : "goal", pc = j.open ? 0 : Math.round((j.bal / j.need) * 100);
    // for the "Pays for" tooltip (jarCatTip): what was paid from this jar by itself this month
    const autoPaid = sum((S.tx || []).filter((t) => t.jar && t.jar.id == j.id && t.jar.auto && String(t.d).startsWith(MK)).map((t) => +t.jar.amt || 0));
    return { ...j, ix, type, pc, autoPaid, state: jarState(j, eta[j.id], MK, monthsTo), billName: j.bill ? H.billNames[j.bill] || "" : "" };
  });

  // Goals: jars with an amount to reach that are not bill jars.
  const goals = jars.filter((j) => j.need > 0 && !j.bill).map((j) => {
    const left = Math.max(0, j.need - j.bal), c = capOf(j, j.got) || 0, pc = Math.min(100, (j.bal / j.need) * 100), k = c > 0 && left > 0 ? eta[j.id] || 0 : 0;
    const g = { id: j.id, n: j.n, p: j.p, bal: j.bal, need: j.need, pc, c, k, when: k ? addM(MK, k) : "" };
    if (left <= 0) return { ...g, st: "reached" };
    if (j.due) { const m = monthsTo(j.due), req = left / m, enough = c >= req - 0.5, inTime = !!(eta[j.id] && eta[j.id] <= m); return { ...g, st: enough && inTime ? "ontrack" : "behind", due: j.due.slice(0, 7), m, req, short: enough && !inTime, fix: enough ? 0 : Math.ceil(req / 10) * 10 }; }
    return { ...g, st: c > 0 ? "saving" : "none" };
  });

  const tx = S.tx || [];
  const done = (S.jars || []).filter((j) => j.done).sort((a, b) => String(b.done).localeCompare(String(a.done))).map((j) => {
    const L = tx.filter((t) => t.jar && t.jar.id == j.id);
    return { id: j.id, n: j.n, desc: j.desc || "", done: j.done, need: +j.need || 0, count: L.length, paid: sum(L.map((t) => +t.jar.amt || 0)) };
  });

  const planned = gotT + stillT;
  const month = { got: gotT, still: Math.max(0, stillT), planned, pct: planned > 0 ? Math.round((gotT / planned) * 100) : 100, done: stillT <= 0, waiting: stillT > 0 && F.free <= 0 };
  // For "How is this worked out?": bills still to pay, planned spending not spent yet, and bills that jars pay (openAvail, jarCovered).
  const R = F.R, bl = billLists(H), rb = R.rows.filter((r) => r.kind == "bill"), ro = R.rows.filter((r) => r.kind != "bill");
  const avail = { bills: sum(rb.map((r) => r.amt)), limits: sum(ro.map((r) => r.amt)), billRows: rb, otherRows: ro.map((r) => ({ ...r, bl: sum((r.bills || []).map((x) => x.amt)) })),
    covered: active.filter((j) => j.bill).map((j) => ({ jar: j.n, bills: isAll(j.bill) ? bl.all(j.bill) : bl.rec.filter((b) => b.match == j.bill) })).filter((x) => x.bills.length) };
  return { F: { cash: F.cash, cards: F.cards || 0, inJars: F.inJars, buffer: F.buffer, reserve: F.R.total, free: F.free, over: F.over, really: F.really, up: F.really != null ? Math.round(F.cash) - Math.round(Math.max(0, F.cards || 0)) - F.really : 0, aside: F.aside, toCome: F.toCome }, month, jars, goals, done, has: { any: active.length > 0 },
    avail, bills: bl, MK, today: H.today, monthsTo, spend: Object.fromEntries(H.spend) };
}

// What a jar is doing this month (the pill in its header), and when it will be full.
function jarState(j, k, MK, monthsTo) {
  const full = !j.open && j.bal >= j.need, bill = j.cap == null, share = bill ? Math.max(0, j.need - j.bal + j.got) : j.capE, got = j.got || 0;
  let st;
  if (!bill && !(j.capE > 0)) st = { cls: "fl", key: "noAuto" };
  else if (full && !got) st = { cls: "dn", key: j.kind == "payoff" ? "paidOff" : "full", bill };
  else if (got > 0 && j.want <= 0.5) st = { cls: "dn", key: "funded", got, share, bill };
  else if (got > 0) st = { cls: "am2", key: "partly", got, share, want: j.want };
  else st = { cls: "am2", key: "needs", share, want: j.want, soon: j.give > 0 };
  const left = Math.max(0, j.need - j.bal);
  if (!j.open && !bill && left > 0 && j.capE > 0) {
    st.eta = { k: k || 0, when: k ? addM(MK, k) : "", left, cap: j.capE, due: j.due ? j.due.slice(0, 7) : "" };
    if (j.due && k && addM(MK, k) > j.due.slice(0, 7)) st.late = { kind: "after", when: addM(MK, k), due: j.due.slice(0, 7), need: Math.ceil(left / monthsTo(j.due)) };
    else if (j.due && !k) st.late = { kind: "never", due: j.due.slice(0, 7) };
  }
  return st;
}

// ---- Changes to the jars. Each one changes S (a copy)
// and gives back the history lines to log as [action, detail, undo?]. fm formats money for those lines.
const r2 = (v) => +(+v).toFixed(2);
const jarsOpen = (S) => (S.jars || []).filter((j) => !j.done).sort((a, b) => a.p - b.p);
const heldOf = (j) => Math.max(0, (+j.bal || 0) - (+j.out || 0));
const jarClamp = (j) => { j.out = Math.min(+j.out || 0, Math.max(0, +j.bal || 0)); };
// Money taken out of a jar by hand lowers what it "received this month" too, so its state stays true (jarOut).
function jarOut(j, amt, note) {
  if (!(amt > 0)) return;
  j.balNote = j.balNote || note; j.got = Math.max(0, r2((+j.got || 0) - amt));
  j.moves = [{ amt: -amt, note, at: new Date().toISOString() }, ...(j.moves || [])]; if (j.ledger != null) j.ledger = r2(j.ledger - amt);
}
export const ALLN = { "*": "All regular bills", "*i": "All irregular bills", "*a": "All bills" };
export const isAll = (k) => k in ALLN;
// The bills a jar can cover: regular ones, irregular ones, and the "all bills" choices with their monthly total.
export function billLists(H) {
  const BC = H.billsAll || [], rec = BC.filter((b) => !b.once && !b.irregular && b.flag != "canceled" && b.mo > 0), irr = BC.filter((b) => !b.once && b.irregular && b.flag != "canceled" && b.mo > 0);
  const all = (k) => (k == "*i" ? irr : k == "*a" ? [...rec, ...irr] : rec), allMo = (k) => sum(all(k).map((b) => b.mo));
  return { BC, rec, irr, all, allMo };
}
// One change to a field, with its change-history line.
const FLD = { n: "name", desc: "description", months: "months covered", auto: "monthly amount mode", cap: "monthly amount", need: "target", bal: "saved amount", due: "deadline", bill: "linked bill" };
function jset(j, fld, v, ctx) {
  if (j[fld] === v || (fld == "auto" && !!j[fld] === !!v)) return null;
  const old = j[fld], { fm, BC } = ctx;
  const show = (x) => (fld == "n" || fld == "desc" ? x || "none" : fld == "months" ? String(x || "none") : fld == "bill" ? (isAll(x) ? ALLN[x].toLowerCase() : x ? (BC.find((b) => b.match == x) || {}).n || x : "none") : fld == "due" ? (x ? ctx.dstr(x) : "none") : fld == "auto" ? (x ? "calculated from the deadline" : "fixed") : fld == "cap" && x == null ? "refill to target" : fm(x));
  j[fld] = v;
  if (fld == "bal") { j.balEdit = true; if (v < old) jarOut(j, r2(old - v), "Edited by you"); jarClamp(j); }
  return ["Changed jar " + FLD[fld], j.n + ": " + show(old) + " → " + show(v), { type: "jar", id: j.id, f: fld, old }];
}

// How much "Take back from the jars" offers: the amount short (over), but no more than the jars hold, rounded once so the
// words, the window and what is taken back all show the same number. 0 means nothing to offer (no jars money, or under ₪1).
export const takeBackAmt = (over, inJars) => Math.max(0, Math.round(Math.min(+over || 0, +inJars || 0)));

// "Take back from the jars": the extra comes out of the lowest-priority jars first.
export function releaseJars(S, over, ctx) {
  const logs = []; let need = over;
  [...jarsOpen(S)].reverse().forEach((j) => { if (need <= 0 || !(heldOf(j) > 0)) return; const t = Math.min(heldOf(j), Math.ceil(need)); j.balNote = "Released back to free money"; const l = jset(j, "bal", r2(j.bal - t), ctx); if (l) logs.push(l); need -= t; });
  return logs;
}
// "Raise to ₪X a month" on a goal that is behind: a fixed monthly amount of what is needed, rounded up to tens (goalFix).
export function goalFix(S, id, ctx) {
  const j = (S.jars || []).find((x) => x.id == id); if (!j || !j.due) return false;
  const req = (j.need - j.bal) / ctx.monthsTo(j.due);
  return [jset(j, "auto", false, ctx), jset(j, "cap", Math.ceil(req / 10) * 10, ctx)].filter(Boolean);
}
// Priority: ▲/▼ swap a jar with its neighbour (jarUp/jarDown); the picker moves it to a place and numbers them again (jarMoveTo).
export function moveJar(S, id, up) {
  const L = jarsOpen(S), i = L.findIndex((j) => j.id == id), k = up ? i - 1 : i + 1; if (i < 0 || k < 0 || k >= L.length) return false;
  const p = L[i].p; L[i].p = L[k].p; L[k].p = p;
  return [["Reordered jars", L[i].n + " moved " + (up ? "up" : "down")]];
}
export function moveJarTo(S, id, pos) {
  const L = jarsOpen(S), i = L.findIndex((j) => j.id == id); if (i < 0 || pos < 1 || pos > L.length || pos - 1 == i) return false;
  const [j] = L.splice(i, 1); L.splice(pos - 1, 0, j); L.forEach((x, k) => { x.p = k + 1; });
  return [["Reordered jars", j.n + " is now priority " + pos]];
}
export function reopenJar(S, id) {
  const j = (S.jars || []).find((x) => x.id == id); if (!j) return false;
  j.done = ""; j.p = Math.max(0, ...S.jars.filter((x) => !x.done).map((x) => x.p)) + 1;
  return [["Reopened jar", j.n]];
}
// Mark as done: what is left goes back to free money, and the jar leaves the priority list.
export function markDone(S, id, today, ctx) {
  const j = (S.jars || []).find((x) => x.id == id); if (!j) return false;
  const left = j.bal; jarOut(j, left, "Marked as done"); j.done = today; j.bal = 0; j.balEdit = true;
  jarsOpen(S).forEach((x, i) => { x.p = i + 1; });
  return [["Completed jar", j.n + (left > 0 ? " · released " + ctx.fm(left) : "")]];
}
export function deleteJar(S, id) {
  const j = (S.jars || []).find((x) => x.id == id); if (!j) return false;
  (S.tx || []).forEach((t) => { if (t.jar && t.jar.id == j.id) delete t.jar; }); S.jars = S.jars.filter((x) => x.id != j.id);
  return [["Deleted jar", j.n]];
}
// A jar's history, newest first: money put in or taken out, and payments made from it.
export function jarHistory(S, id, name) {
  const j = (S.jars || []).find((x) => x.id == id); if (!j) return [];
  const gap = r2((+j.bal || 0) - (+j.ledger || 0)), pay = j.kind == "payoff";
  return [
    ...(Math.abs(gap) > 0.5 && j.ledger != null ? [{ k: "0000-00-00", earlier: true, note: gap > 0 ? "start" : "untracked", amt: gap }] : []),
    ...(j.moves || []).filter((m) => !(m.amt < 0 && /^Paid/.test(m.note || ""))).map((m) => ({ k: String(m.at).slice(0, 10), d: m.at, note: m.note || "", amt: m.amt })),
    ...(S.tx || []).filter((t) => t.jar && t.jar.id == j.id).map((t) => ({ k: t.d, d: t.d, id: t.id, pay: true, payoff: pay, name: name(t), amt: pay ? +t.jar.amt : -t.jar.amt })),
  ].sort((x, y) => y.k.localeCompare(x.k));
}

// The categories each open jar pays for (catJars).
export function catJarsOf(S) { const o = {}; jarsOpen(S).forEach((j) => (j.cats || []).forEach((x) => { if (!o[x.c]) o[x.c] = { j, since: x.since }; })); return o; }

// The form for a new jar or for editing one. f: what was typed. Gives back an error key, or the history lines.
// kind: "goal" (savings), "bill" or "payoff".
// What the jar actions need from the jars model to write their history lines (dates as chosen in Settings).
export const jarCtx = (M, fm) => ({ fm, dstr, BC: M.bills.BC, bills: M.bills, today: M.today, MK: M.MK, monthsTo: M.monthsTo });
export function saveJar(S, id, f, ctx) {
  const { today, MK, bills } = ctx, n = String(f.n || "").trim();
  if (!n) return { err: "name", field: "n" };
  const sv = +f.S || 0; let need = 0, cap = 0, auto = false, due = "", bill = "", months = 0;
  if (f.kind == "payoff") { need = +f.T; if (!(need > 0)) return { err: "owe", field: "T" }; cap = Math.max(0, +f.C || 0); if (!(cap > 0)) return { err: "payBack", field: "C" }; }
  else if (f.kind == "goal" && !(+f.T > 0)) { cap = Math.max(0, +f.C || 0); if (!(cap > 0)) return { err: "goalOrMonthly", field: "C" }; }
  else if (f.kind == "goal") { need = +f.T; due = f.D || ""; if (due && due < today && !(id && ((S.jars || []).find((x) => x.id == id) || {}).due == due)) return { err: "past", field: "D" }; const c = f.C == null ? "" : String(f.C); if (c !== "") cap = Math.max(0, +c); else if (due) auto = true; }
  else { const sel = f.B || "", mo = +f.Mo || 12; if (isAll(sel)) { const tot = bills.allMo(sel); if (!(tot > 0)) return { err: sel == "*i" ? "noIrr" : sel == "*" ? "noReg" : "noBills" }; need = Math.round(tot * mo); bill = sel; months = mo; } else { const b = bills.BC.find((x) => x.match == sel); if (!b) return { err: "pickBill", field: "B" }; need = Math.round(b.mo * mo); bill = b.match; } cap = null; }
  const dsc = String(f.desc || "").trim(), cats = f.cats || [];
  const kSince = f.since ? MK + "-01" : today, oldCats = id ? ((S.jars || []).find((x) => x.id == id) || {}).cats || [] : [], newCats = cats.map((k) => oldCats.find((x) => x.c == k) || { c: k, since: kSince });
  (S.jars || []).forEach((o) => { if (o.id != id && o.cats && o.cats.length && cats.length) o.cats = o.cats.filter((x) => !cats.includes(x.c)); });
  const kind = f.kind == "payoff" ? "payoff" : "", tick = f.kind == "goal" && !!f.O, logs = [], sig = (a) => JSON.stringify([...a].sort());
  if (id) {
    const j = S.jars.find((x) => x.id == id); if (!j) return { logs };
    const oldKind = j.kind || ""; j.out = kind == "payoff" ? (oldKind == "payoff" ? Math.max(0, sv - heldOf(j)) : sv) : tick ? ((+j.out || 0) > 0 ? Math.min(+j.out, sv) : sv) : 0; j.kind = kind;
    if (oldKind != kind) logs.push(["Changed jar type", j.n + ": " + (oldKind == "payoff" ? "pay-off" : "savings or bills") + " → " + (kind == "payoff" ? "pay-off" : "savings or bills")]);
    if (sig(oldCats.map((x) => x.c)) !== sig(cats)) { j.cats = newCats; logs.push(["Changed jar categories", j.n + ": " + (cats.length ? cats.join(", ") : "none")]); }
    for (const [k, v] of [["n", n], ["desc", dsc], ["need", need], ["bal", sv], ["auto", auto], ["cap", cap], ["due", due], ["bill", bill], ["months", months]]) { const l = jset(j, k, v, ctx); if (l) logs.push(l); }
    return { logs };
  }
  S.jars = S.jars || [];
  S.jars.push({ id: Math.max(0, ...S.jars.map((j) => j.id)) + 1, n, p: Math.max(0, ...S.jars.map((j) => j.p)) + 1, need, cap, auto, bal: sv, out: kind == "payoff" || tick ? sv : 0, kind, due, bill, desc: dsc, months, cats: newCats });
  logs.push(["Created jar", n + (kind == "payoff" ? " · pay-off" : "") + (need ? (kind == "payoff" ? " · owed " : " · goal ") + ctx.fm(need) : " · no goal") + (cap == null ? " · kept topped up" : auto ? " · monthly amount worked out from the deadline" : cap ? " · " + ctx.fm(cap) + " / month" : " · no auto-fill") + (due ? " · by " + due : "")]);
  return { logs };
}
// What a jar's form starts with when editing (jarEditOpen).
export function jarFormOf(j) {
  const kind = j.kind == "payoff" ? "payoff" : j.bill ? "bill" : "goal";
  return { kind, n: j.n, desc: j.desc || "", cats: (j.cats || []).map((x) => x.c), T: j.need || "", S: j.bal, D: j.due || "", C: kind == "goal" ? (j.auto || j.cap == null || !(j.cap > 0) ? "" : j.cap) : j.cap || "", B: j.bill || "", Mo: j.months || 12, O: (+j.out || 0) > 0 };
}
