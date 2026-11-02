// The Home page's numbers, kept apart from the screen so they can be tested:
// the totals, bills, budgets, jars and money flow.
// Nothing here changes the data; bills the app finds by itself are only worked out, not saved.
import { cardsDue, stillToPay, reallyYours, roundParts } from "./recap.js";
import { acctOf } from "./activity.js";
import { fieldText, textMatch } from "./ruleFields.js";
import { isIn, isOut, splitIn } from "./moneyIn.js";

const p2 = (n) => String(n).padStart(2, "0");
export const addM = (m, k) => { const d = new Date(+m.slice(0, 4), +m.slice(5, 7) - 1 + k, 1); return d.getFullYear() + "-" + p2(d.getMonth() + 1); };
const sum = (a) => a.reduce((t, x) => t + x, 0);
const rmOf = (t) => (t.rm && t.rm !== String(t.d).slice(0, 7) ? t.rm : "");
// The date reports use: a payment moved to another month counts in that month.
export const rdOf = (t) => { const m = rmOf(t); if (!m) return t.d; const last = new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate(); return m + "-" + p2(Math.min(+String(t.d).slice(8, 10) || 1, last)); };
// "payment 8 of 10" (instOf): the shared one in activity.js.
export { instOf } from "./activity.js";
export const heldOf = (j) => Math.max(0, (+j.bal || 0) - (+j.out || 0));
const RSKIP = (S, k) => ["Income", "Uncategorized", "Fees & FX costs"].includes(k) || S.cats?.[k] === 99;

// How often does this store charge you (cadenceOf): the shared one in lib/bills.js.
export { cadenceOf } from "./bills.js";
import { cadenceOf } from "./bills.js";

// Transfers between your own accounts are looked for every time the data loads, and the totals leave them out.
// This is done in memory only: a possible transfer waits for review ("auto") and is not counted as spending or income.
export function withTransfers(S) {
  const tx = S.tx || [], xf = [...(S.xf || [])];
  // your own accounts, from your accounts only (never a fixed bank name)
  const own = [...new Set((S.accounts || []).filter((a) => a.kind == "bank" || a.kind == "wallet" || a.kind == "custom").map((a) => a.n))];
  tx.forEach((o) => {
    if (!(o.a < 0 && own.includes(o.from))) return;
    tx.forEach((i) => {
      if (!(i.a > 0 && own.includes(i.to) && i.to !== o.from)) return;
      if (xf.some((x) => x.o == o.id || x.i == i.id)) return;
      const dd = Math.abs((new Date(o.d) - new Date(i.d)) / 864e5), r = i.a / -o.a;
      if (dd <= 3 && r >= 0.94 && r <= 1.03) xf.push({ o: o.id, i: i.id, st: "auto" });
    });
  });
  return xf.length === (S.xf || []).length ? S : { ...S, xf };
}
const nohtml = (s) => String(s == null ? "" : s).replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").trim();
const nameField = (t, f) => fieldText(t, f || "any");
const rnm = (s) => String(s == null ? "" : s).toLowerCase().replace(/[0-9*#_/\\\-.,:;()'"\u05f3\u05f4]+/g, " ").replace(/\s+/g, " ").trim();
// The name shown for a payment: the one you typed, a naming rule, or the bank's text.
export const nameOf = (S, t) => { const c = S?.cfg || {}, o = c.renames && c.renames[t.id]; if (o) return o; if (c.nameRules) { const r = c.nameRules.find((x) => { const q = rnm(x.k); if (!q) return false; const v = rnm(nameField(t, x.f || "any")); return textMatch(v, q, x.m); }); if (r) return r.n; } return nohtml(t.desc); };

// What was bought with a card in each month: the counted rows paid from it, less the refunds that came back to it
// (the same on Home and Accounts). isCard: is the row on this card (acctOf: refunds sit in "to"). Never below 0.
export const cardBuys = (A, isCard, m) => Math.max(0, sum(A.filter((t) => isCard(t) && t.d.startsWith(m)).map((t) => -t.a)));

// The exchange rate of a currency in fx (the last saved one when offline, core: data.js). With none at all it is 0:
// money in it is left out and its account shown as not counted yet, never counted as 1 to 1 (Home and Accounts).
export const fxRate = (fx, c) => (c === "ILS" ? 1 : +(fx || {})[c] > 0 ? +fx[c] : 0);
// An account's balance in shekels, or null when its currency has never had a rate (then shown in its own currency, not counted).
export const inILS = (a, fx) => { const r = fxRate(fx, a.cur); return r > 0 ? a.v * r : null; };

// Everything Home needs, worked out once per data load. now: today's date; fx: { USD: 3.7, ... }.
export function homeModel(S, now = new Date(), fx = {}) {
  S = withTransfers(S || {});
  const NOW = now, MK = NOW.getFullYear() + "-" + p2(NOW.getMonth() + 1), TODAY = MK + "-" + p2(NOW.getDate()), DAYN = NOW.getDate(), DIM = new Date(NOW.getFullYear(), NOW.getMonth() + 1, 0).getDate();
  const { A, k, costRows } = countedTx(S, TODAY), tx = S.tx || [], jarsAll = S.jars || [], cfg = { budgetPct: 80, ...(S.cfg || {}) }, budgets = S.budgets || {};
  // the exchange rate of a currency (fxRate); with none at all, its account is listed as not counted (noRate)
  const rate = (c) => fxRate(fx, c), hasRate = (a) => rate(a.cur) > 0;
  const accts = (S.accounts || []).filter((a) => a.kind != "card" && !a.hide);
  const accILS = (a) => a.v * rate(a.cur);
  const accCur = (a) => a.n + (a.cur != "ILS" || accts.some((x) => x !== a && (x.n == a.n || (x.src && x.src == a.src))) ? " (" + a.cur + ")" : "");
  // "In your accounts": bank and wallet accounts plus the hand-added ones marked to count (never pension). One number,
  // shared by Home's tile, Recap, the Forecast start, Free to use and the Key numbers panel.
  const cashAll = accts.filter((a) => a.inNW && (a.kind == "bank" || a.kind == "wallet" || a.kind == "custom")), cashAccts = cashAll.filter(hasRate), noRate = cashAll.filter((a) => !hasRate(a)).map((a) => a.n);
  const cashNow = sum(cashAccts.map(accILS));
  // what those same accounts held when the month began: the balances the server saved (state.js monthStarts), in shekels at
  // that day's rate. null when any of them has none from then: Recap then works the start out backwards (lib/recap.js).
  const ms0 = S.monthStart?.[MK]?.acc, startSaved = ms0 && cashAccts.length && cashAccts.every((a) => Number.isFinite(ms0[a.id])) ? sum(cashAccts.map((a) => ms0[a.id])) : null;
  const ALL = tx.concat(costRows);
  // money in, or spending (money back is neither: lib/moneyIn.js)
  const monthSum = (m, sg) => sum(A.filter((t) => (sg > 0 ? isIn(t) : isOut(t)) && rdOf(t).startsWith(m)).map((t) => (sg > 0 ? t.a : -t.a)));
  const spendM = {}; A.filter((t) => isOut(t) && rdOf(t).startsWith(MK)).forEach((t) => { const c = t.c || "Uncategorized"; spendM[c] = (spendM[c] || 0) - t.a; });
  const spend = Object.entries(spendM).sort((a, b) => b[1] - a[1]);

  // Six months of history (this one last). Months before the first data are "no history".
  const ms = []; for (let i = 5; i >= 0; i--) ms.push(addM(MK, -i));
  const hist = { keys: ms, inc: ms.map(() => 0), exp: ms.map(() => 0), first: 0 };
  { const first = tx.filter((t) => !k.isFut(t) && !t.virtual).reduce((m, t) => (t.d < m ? t.d : m), "9999-99-99"); let fi = first == "9999-99-99" ? 5 : ms.indexOf(first.slice(0, 7)); if (fi < 0) fi = first.slice(0, 7) < ms[0] ? 0 : 5; if (first != "9999-99-99" && +first.slice(8) > 10 && fi < 5) fi++; hist.first = Math.max(0, Math.min(5, fi)); }
  A.forEach((t) => { const i = ms.indexOf(rdOf(t).slice(0, 7)); if (i < 0) return; if (isIn(t)) hist.inc[i] += t.a; else if (isOut(t)) hist.exp[i] -= t.a; });
  const budMonths = [2, 3, 4].filter((i) => i >= hist.first).map((i) => ms[i]);
  const monthlyByCat = {}; A.filter(isOut).forEach((t) => { const c = t.c || "Uncategorized", m = rdOf(t).slice(0, 7); (monthlyByCat[c] = monthlyByCat[c] || {})[m] = (monthlyByCat[c][m] || 0) - t.a; });

  // Net worth over the last six months for the small line: saved snapshots, or rebuilt from the transactions.
  const nwSpark = (() => {
    const N = 60, nm = []; for (let i = N - 1; i >= 0; i--) nm.push(addM(MK, -i));
    const snap = Object.fromEntries((S.nwSnaps || []).map((x) => [x.month, x])), sumK = (kind) => sum((S.accounts || []).filter((a) => a.kind == kind).map((a) => a.v * rate(a.cur)));
    const kindOf = Object.fromEntries((S.accounts || []).map((a) => [a.n, a.kind])), d = { bank: {}, wallet: {} }; let firstM = "9999-99";
    tx.forEach((t) => { if (t.pending || t.virtual || k.isFut(t)) return; const kk = kindOf[t.a < 0 ? t.from : t.to]; if (!d[kk]) return; const m = t.d.slice(0, 7); if (m < firstM) firstM = m; d[kk][m] = (d[kk][m] || 0) + t.a; });
    const rec = {}; { let b = sumK("bank"), w = sumK("wallet"); for (let i = N - 1; i >= 0; i--) { rec[nm[i]] = { bank: b, wise: w }; b -= d.bank[nm[i]] || 0; w -= d.wallet[nm[i]] || 0; } }
    const sumC = sum((S.accounts || []).filter((a) => a.kind == "custom" && a.inNW).map((a) => a.v * rate(a.cur)));
    let last = { bank: 0, wise: 0, other: 0 }; const out = [];
    nm.forEach((m, i) => { const x = i == N - 1 ? { bank: sumK("bank"), wise: sumK("wallet"), other: sumC } : snap[m] || (firstM != "9999-99" ? { bank: rec[m].bank, wise: rec[m].wise, other: sumC } : last); if (x) last = x; out.push(Math.round(last.bank) + Math.round(last.wise) + Math.round(last.other || 0)); });
    return out.slice(-6);
  })();

  // Bills: the saved ones plus the ones the app finds in the payments (not saved here).
  const bills = [...(S.bills || [])];
  { const g = {}; A.filter((t) => t.a < 0 && !t.virtual).forEach((t) => { const kk = String(t.to || t.desc).toLowerCase().trim(); (g[kk] = g[kk] || []).push(t); });
    Object.entries(g).forEach(([kk, L]) => { if (L.length < 2 || (S.ignoredBills || []).includes(kk) || bills.some((b) => b.mode != "once" && b.match == kk)) return; L.sort((a, b) => a.d.localeCompare(b.d)); const c = cadenceOf(L); if (!c) return; const last = L[L.length - 1]; bills.push({ n: last.to, every: c.every, anchor: c.anchor, dom: c.dom, src: last.from, match: kk, cat: last.c || "Subscriptions", manual: false, mode: "rule", rec: "recurring" }); }); }
  const billTx = (b) => (b.mode == "once" ? tx.filter((t) => (b.ids || []).includes(t.id)) : A.filter((t) => t.a < 0 && (t.desc + " " + t.to).toLowerCase().includes(b.match))).sort((a, b) => a.d.localeCompare(b.d));
  // acct: the account its last payment came from (a credit card: the money leaves the bank later, with the card bill)
  const F = futTx(S, k), BC = bills.map((b, idx) => billInfo(b, idx, billTx(b), NOW, billFut(b, F))).map((b) => { const L0 = billTx(bills[b.idx]), L = L0.filter((t) => t.c && t.c != "Uncategorized"), lc = L.length ? L[L.length - 1].c : null; return { ...b, cat: lc || (b.manual ? b.cat : "") || "", acct: L0.length ? acctOf(L0[L0.length - 1]) : bills[b.idx].src || "" }; });
  const activeBills = BC.filter((b) => b.flag != "canceled" && !b.ended);

  const budgetInfo = Object.entries(budgets).map(([kk, lim]) => {
    const s = spendM[kk] || 0, pc = lim ? (s / lim) * 100 : 0, B = BC.filter((b) => !b.once && !b.irregular && b.flag != "canceled" && b.cat == kk);
    const paid = Math.min(s, sum(B.filter((b) => b.lp && b.lp.startsWith(MK)).map((b) => b.pred))), due = sum(B.filter((b) => !(b.lp && b.lp.startsWith(MK)) && b.nx && b.nx.toISOString().slice(0, 7) == MK).map((b) => b.pred)), pace = paid + due + ((s - paid) / DAYN) * DIM;
    return { k: kk, lim, s, pc, pace, left: lim - s, st: s > lim ? "over" : pc >= cfg.budgetPct ? "warn" : pace > lim ? "pace" : "ok" };
  });

  // Jars and the money already spoken for this month.
  const jarsS = jarsAll.filter((j) => !j.done).sort((a, b) => a.p - b.p);
  const catJars = {}; jarsS.forEach((j) => (j.cats || []).forEach((x) => { if (!catJars[x.c]) catJars[x.c] = { j, since: x.since }; }));
  const R = (() => {
    const linked = new Set(jarsS.map((j) => j.bill).filter(Boolean)), allB = linked.has("*") || linked.has("*a"), useAvg = cfg.reserveAvg !== false, bl0 = {}, cov = {};
    // due: every bill not paid yet this month, also the ones a jar pays (real money still leaves the bank for them)
    const due = [];
    activeBills.forEach((b) => { if (b.once || b.irregular || !b.nx) return; const unpaid = (b.status == "overdue" || b.status == "pending") && (NOW - b.pd) / 864e5 <= 45, comes = b.nx.toISOString().slice(0, 7) == MK && !b.ahead; if (!unpaid && !comes) return; const kk = b.cat || "Other bills", x = { n: b.n, amt: b.schedAmt ?? b.pred, overdue: b.status == "overdue" }; const byJar = allB || linked.has(b.match); due.push({ ...x, cat: kk, byJar }); if (byJar) { cov[kk] = (cov[kk] || 0) + x.amt; return; } (bl0[kk] = bl0[kk] || []).push(x); });
    const keys = new Set([...Object.keys(budgets), ...Object.keys(bl0)]); if (useAvg && budMonths.length >= 2) Object.keys(monthlyByCat).forEach((kk) => { if (!RSKIP(S, kk)) keys.add(kk); });
    const cand = [], done = [];
    keys.forEach((kk) => { const bl = sum((bl0[kk] || []).map((x) => x.amt)), spent = spendM[kk] || 0; let base = 0, kind = "";
      if (kk in budgets) { base = budgets[kk]; kind = "budget"; } else if (useAvg && budMonths.length >= 2 && !RSKIP(S, kk)) { base = sum(budMonths.map((m) => (monthlyByCat[kk] || {})[m] || 0)) / budMonths.length; kind = "typical"; }
      const left = Math.max(0, base - spent - (cov[kk] || 0)), amt = Math.max(bl, left);
      if (amt < 1) { if (spent >= 1 && base > 0) done.push({ k: kk, base, spent, kind, over: spent > base + 0.5 }); return; }
      cand.push({ k: kk, amt, kind: bl >= left && bl > 0 ? "bill" : kind, bills: bl0[kk] || [], base, spent, bcov: cov[kk] || 0 }); });
    // a jar that pays for a category covers what is left in it, up to what the jar holds (jarCov: what each jar covers)
    const rows = [], pool = {}, jarCov = []; Object.values(catJars).forEach((x) => { pool[x.j.id] = x.j.kind == "payoff" ? heldOf(x.j) : Math.max(0, +x.j.bal || 0); });
    cand.sort((a, b) => b.amt - a.amt).forEach((r) => { const c = catJars[r.k]; let amt = r.amt; if (c) { const take = Math.min(pool[c.j.id], amt); pool[c.j.id] -= take; amt -= take; if (take >= 1) jarCov.push({ k: r.k, jar: c.j.n, cov: take, of: r.amt }); } if (amt < 1) return; rows.push({ ...r, amt, jar: c ? c.j.n : "", jarCov: c ? r.amt - amt : 0 }); });
    rows.sort((a, b) => b.amt - a.amt);
    const total = sum(rows.map((r) => r.amt)), billsT = sum(rows.filter((r) => r.kind == "bill").map((r) => r.amt));
    return { total, rows, bills: billsT, limits: total - billsT, jarCov, done, due };
  })();
  // card purchases already made and not paid yet: the bank still holds that money, but the card bill will take it
  // (the same amount Recap and the Forecast take off)
  const CC = new Set((S.accounts || []).filter((a) => a.kind == "card").map((a) => a.n));
  // the payments still to leave this month (the same list as Recap's "You still have to pay"); a bill paid by credit card
  // (cardUp) is not among them: it goes on that card's next bill, like any card purchase, and leaves the bank on its charge day
  const upAll = stillToPay({ S, A, k, CC, BI: activeBills, R, TODAY, MK }), up = upAll.filter((b) => !b.card), cardUp = upAll.filter((b) => b.card);
  const owed = cardsDue({ S, A, k, CC, TODAY, MK, extra: cardUp }), cardsOwed = Math.max(0, owed.thisMonth + owed.later);
  // really yours today (accounts − card purchases not paid yet − payments still due): Home, Recap and the Forecast share it
  const really = reallyYours(cashNow, cardsOwed, sum(up.map((b) => b.amt)));
  const inJars = sum(jarsS.map(heldOf)), buffer = Math.max(0, +S.jarsBuffer || 0);
  const jarsHeld = jarsS.filter((j) => heldOf(j) > 0).sort((a, b) => heldOf(b) - heldOf(a)).map((j) => ({ n: j.n, v: heldOf(j) }));
  // Free to use: worked out once, here, as the end of the Planned money flow (flowSteps): your money after known payments, less what is
  // put aside (jars and the safety cushion) and what is still to come this month. Home, Recap and the Jars page all read it.
  // cardsLater: the part of cards on card bills after this month (the rest leaves the bank this month)
  const flow0 = { cash: cashNow, cards: cardsOwed, cardsLater: Math.min(cardsOwed, Math.max(0, owed.later)), up, cardUp, really, inJars, buffer, R, jarsHeld, spend };
  const W0 = flowSteps(flow0, "left"), aside = Math.round(W0.jarsA + buffer), toCome = Math.round(W0.leftTot), raw = really - aside - toCome;
  const free = Math.max(0, raw), over = -raw >= 1 ? Math.round(-raw) : 0;
  const monthsTo = (d) => Math.max(1, Math.ceil((new Date(d) - NOW) / (864e5 * 30.44)));
  const capOf = (j, got) => (j.cap == null ? null : j.auto && j.due && j.need > 0 ? Math.max(0, Math.ceil((j.need - (j.bal - (got || 0))) / Math.max(1, monthsTo(j.due)))) : j.cap);
  const jars = (() => { let rem = free; return jarsS.map((j) => { const got = Math.min(+j.got || 0, Math.max(0, +j.bal || 0) + (+j.paid || 0)), open = !(j.need > 0), capE = capOf(j, got), need = open ? 0 : Math.max(0, j.need - j.bal), want = capE == null ? need : Math.max(0, Math.min(capE - got, open ? 1e12 : need)); rem -= Math.max(0, Math.min(rem, want)); return { id: j.id, n: j.n, p: j.p, bal: +j.bal || 0, need: +j.need || 0, got, want, open, pc: open ? 0 : Math.round(((+j.bal || 0) / j.need) * 100) }; }); })();

  // Cards: this month's charges against last month's (the counted rows, the same as the card chart on Accounts).
  const pm = addM(MK, -1);
  const cards = (S.accounts || []).filter((a) => a.kind == "card").map((a) => { const on = (t) => acctOf(t) == a.n; return { n: a.n, acc: a, now: cardBuys(A, on, MK), last: cardBuys(A, on, pm) }; });
  { const on = (t) => t.wc; if (A.some((t) => t.wc && t.a < 0)) cards.push({ n: "Wise card", wise: true, now: cardBuys(A, on, MK), last: cardBuys(A, on, pm) }); }

  // Accounts grouped by name (one bank with several currencies is one card).
  const groups = []; accts.filter((a) => !(a.kind == "pension" && !(+a.v > 0))).forEach((a) => { let g = groups.find((x) => x.n == a.n); if (!g) groups.push((g = { n: a.n, L: [] })); g.L.push(a); });
  groups.forEach((g) => { g.total = sum(g.L.map(accILS)); g.manual = g.L.every((x) => x.manual); g.wallet = g.L[0].kind == "wallet"; g.multi = g.L.length > 1 || g.wallet || g.L.some((x) => x.cur != "ILS"); });

  const inc = monthSum(MK, 1), ex = monthSum(MK, -1), split = splitIn(A, (t) => rdOf(t).startsWith(MK)), pen = sum(accts.filter((a) => a.kind == "pension").map(accILS));
  const rd = new Set(cashAccts.filter((a) => a.at || a.v).map((a) => a.src).filter(Boolean));
  const missing = cashAccts.filter((a) => a.kind != "custom" && !a.at && !a.v && !a.manual && !(a.src && rd.has(a.src))).map((a) => a.n);
  const recent = ALL.filter((t) => !k.isXf(t) && t.d >= MK && !k.isFut(t)).sort((a, b) => b.d.localeCompare(a.d)).slice(0, 5);
  const upcoming = activeBills.filter((b) => b.nx).sort((a, b) => (a.status == "overdue" ? -1e3 : 0) + a.days - ((b.status == "overdue" ? -1e3 : 0) + b.days)).slice(0, 4);
  const budgetsSorted = budgetInfo.sort((a, b) => b.pc - a.pc);
  const cash = cashNow;

  const has = {
    flow: accts.some((a) => a.v != 0) && cashNow > 0,
    accts: accts.length > 0 && accts.some((a) => a.v != 0 || (a.manual && a.v)),
    cards: cards.some((c) => c.now || c.last),
    bills: activeBills.length > 0, budg: Object.keys(budgets).length > 0, jars: jarsAll.length > 0,
    donut: spend.length > 0, recent: ALL.some((t) => !k.isXf(t)),
  };
  const any = Object.values(has).some(Boolean) || accts.some((a) => a.v);

  return {
    MK, pm, DAYN, DIM, today: TODAY, k,
    kpi: { cash, pen, withPension: cash + pen, inc, ex, back: split.back, sal: split.salary, net: Math.round(inc) - Math.round(ex), incLast: hist.inc[4], exLast: hist.exp[4], missing, cashAccts: cashAccts.map((a) => ({ n: a.n, cur: a.cur, ils: accILS(a), lbl: accCur(a) })), notCounted: accts.filter((a) => (a.kind == "bank" || a.kind == "wallet") && !a.inNW).map((a) => a.n), noRate, nwSpark: nwSpark.filter((v) => v > 0).length > 1 ? nwSpark : null, incSpark: hist.inc.some((v) => v > 0) ? hist.inc : null, exSpark: hist.exp.some((v) => v > 0) ? hist.exp : null },
    groups, cards, recent, upcoming, budgets: budgetsSorted, jars, spend, rate,
    flow: { ...flow0, saved: inJars + buffer, aside, toCome, free, over, freeRaw: raw, cashAccts: cashAccts.map((a) => ({ n: a.n, cur: a.cur, ils: accILS(a), lbl: accCur(a) })) },
    has, any,
    // For the Jars page: bill names by their match text, and six months of income and spending (this one last).
    billNames: Object.fromEntries(BC.map((b) => [b.match, b.n])), hist,
    // For the Jars page's pop-ups and "Full by" dates: every bill, and the counted payments.
    billsAll: BC, rows: A, S, nameOf: (t) => nameOf(S, t),
    startSaved,
  };
}

// One bill's state (billsInfo0): the shared one in lib/bills.js.
export { billInfo } from "./bills.js";
import { billInfo, futTx, billFut, countedTx } from "./bills.js";

// The money flow (waterfall): from what is in your accounts, step by step down to what is free. Every step is a real amount:
// card purchases not paid yet (the card bill will take that money), the payments still to leave this month (F.up, Recap's
// "You still have to pay"), what is put aside (jars, safety cushion) and, in mode "left" (Planned), what is still to come
// this month (what is left in each budget or usual month, less its payments already in the upcoming step).
// mode "actual": cards and upcoming payments only, so it ends at "Your money after known payments" (Recap's too).
// What was spent so far this month is not a step (spentAll), it is shown on its own.
export function flowSteps(F, mode = "left") {
  const ACT = mode == "actual", up = F.up || [], upTot = sum(up.map((b) => b.amt));
  // Nothing is taken off twice. A row's bills are in the upcoming step, so the row keeps only the rest (upIn: the part already
  // there); when a jar paid part of the row, that jar money pays those bills. Another upcoming payment in a row's category
  // (one listed for a later day) is part of what is left in that row too. What no row holds is paid by a jar when one pays
  // for its category (cov). Jar money that pays upcoming payments is not taken off again in the jars step (upJar).
  // A bill a jar pays (byJar) already came off its row (bcov), so the row keeps its amount and the jar pays the whole bill.
  let upJar = 0;
  const byJar = new Map((F.R.due || []).filter((b) => b.byJar).map((b) => [b.n, b.amt]));
  const src = F.R.rows.map((r) => { const bl = sum((r.bills || []).map((b) => b.amt)), upIn = Math.min(r.amt, bl); upJar += bl - upIn; return { ...r, upIn }; });
  // a bill paid by card is in the cards step, so its budget row keeps only the rest too
  [...up, ...(F.cardUp || [])].filter((b) => !b.inR).forEach((b) => { if (byJar.has(b.n)) { upJar += byJar.get(b.n); return; } const r = src.find((x) => x.k == b.cat), x = r ? Math.min(r.amt - r.upIn, b.amt) : 0; if (r) r.upIn += x; upJar += Math.min(b.cov || 0, b.amt - x); });
  src.forEach((r) => { r.left = Math.max(0, r.amt - r.upIn); });
  const jarsA = Math.max(0, F.inJars - upJar);
  const spentAll = sum(F.spend.map((e) => e[1])), leftTot = sum(src.map((r) => r.left)), start = F.cash, scale = Math.max(start, 1);
  const fixed = [];
  if (F.cards >= 1) fixed.push({ k: "cards", set: 1, a: F.cards });
  if (upTot >= 1) fixed.push({ k: "up", set: 1, a: upTot, list: up });
  // Real money (actual) takes off only the card purchases not paid yet and the payments still due; jars, the cushion and
  // what is still to come are plans
  if (!ACT && jarsA >= 1) fixed.push({ k: "jars", set: 1, a: jarsA, n: F.jarsHeld.length });
  if (!ACT && F.buffer >= 1) fixed.push({ k: "cushion", set: 1, a: F.buffer });
  let items = ACT ? [] : src.map((r) => ({ ...r, a: r.left, plan: 1 })).filter((x) => x.a >= 1).sort((a, b) => b.a - a.a);
  const room = 8 - fixed.length; // at most 8 steps between the first and the last bar
  if (items.length > room) { const top = items.slice(0, room - 1), rest = items.slice(room - 1); top.push({ k: "other", rest, a: sum(rest.map((x) => x.a)), plan: 1 }); items = top; }
  // Current ends at what is really yours (reallyYours, the same number as Recap and the Forecast)
  // Planned ends at Free to use: the same whole-shekel parts (your money after known payments, left in your budgets, put aside), so it adds up
  const endAv = F.really != null ? (ACT ? F.really : F.really - Math.round(jarsA + F.buffer) - Math.round(leftTot)) : F.cash - (F.cards || 0) - upTot - (ACT ? 0 : jarsA + F.buffer + leftTot), eOver = endAv <= -1 ? Math.round(-endAv) : 0, eFree = Math.max(0, endAv);
  const pc = (v) => +((Math.max(0, v) / scale) * 100).toFixed(2);
  // the bars in whole shekels (the same parts as Your money after known payments and Free to use), so each "What's left" is exact and
  // the last one is the end amount
  const RND = F.really != null;
  if (RND) {
    const R0 = Math.round, put = R0(jarsA + F.buffer), cush = Math.min(put, R0(F.buffer)), its = roundParts(items.map((x) => x.a), R0(leftTot));
    fixed.forEach((x) => { x.a = x.k == "jars" ? put - cush : x.k == "cushion" ? cush : R0(x.a); });
    items.forEach((x, i) => { x.a = its[i]; });
  }
  let lvl = RND ? Math.round(start) : start;
  const cols = [{ kind: "start", a: start, hi: start, lo: start, b: pc(start), h: 0, s: pc(start) }];
  // in order: what is known (cards, upcoming payments), then the plans: what is left in the budgets, then what is put aside
  const known = fixed.filter((x) => x.k == "cards" || x.k == "up"), aside = fixed.filter((x) => x.k == "jars" || x.k == "cushion");
  [...known, ...items, ...aside].forEach((x) => { const hi = lvl, lo = Math.max(0, lvl - x.a); lvl -= x.a; cols.push({ ...x, rk: x.kind, kind: x.set ? "set" : "item", hi, lo, b: pc(lo), h: pc(hi - lo), s: pc(lo) }); });
  cols.push({ kind: "end", tone: eOver > 0 ? "neg" : eFree > 0 ? "pos" : "none", a: 0, lo: Math.max(0, lvl), b: pc(Math.max(0, lvl)), h: 0, s: pc(Math.max(0, lvl)) });
  // remain: the column after which "Your money after known payments" is left (the last of cards and upcoming payments)
  return { cols, src, spentAll, leftTot, start, eOver, eFree, ACT, upTot, upJar, jarsA, remain: upTot >= 1 ? "up" : "cards" };
}
