// The Home page's numbers, kept apart from the screen so they can be tested. They follow the current app exactly
// (web/js/02-state-data.js, 03-bills-home.js, 04-transactions.js, 08-jars.js): the same totals, bills, budgets, jars and money flow.
// Nothing here changes the data; bills the app finds by itself are only worked out, not saved.
import { kinds } from "./activity.js";

const p2 = (n) => String(n).padStart(2, "0");
export const addM = (m, k) => { const d = new Date(+m.slice(0, 4), +m.slice(5, 7) - 1 + k, 1); return d.getFullYear() + "-" + p2(d.getMonth() + 1); };
const med = (a) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const sum = (a) => a.reduce((t, x) => t + x, 0);
const rmOf = (t) => (t.rm && t.rm !== String(t.d).slice(0, 7) ? t.rm : "");
// The date reports use: a payment moved to another month counts in that month.
export const rdOf = (t) => { const m = rmOf(t); if (!m) return t.d; const last = new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate(); return m + "-" + p2(Math.min(+String(t.d).slice(8, 10) || 1, last)); };
// "payment 8 of 10", from the bank's numbers or from the description.
export const instOf = (t) => {
  if (t.inst && t.inst[1] > 1 && t.inst[0] >= 1 && t.inst[0] <= t.inst[1]) return { n: t.inst[0], total: t.inst[1] };
  const d = String(t.desc || ""), m = d.match(/תשלום\s*(\d{1,2})\s*(?:\/|מתוך)\s*(\d{1,2})/) || d.match(/payment\s*(\d{1,2})\s*(?:\/|of)\s*(\d{1,2})/i) || d.match(/(\d{1,2})\s*מתוך\s*(\d{1,2})/);
  return m && +m[2] >= 2 && +m[2] <= 60 && +m[1] >= 1 && +m[1] <= +m[2] ? { n: +m[1], total: +m[2] } : null;
};
export const heldOf = (j) => Math.max(0, (+j.bal || 0) - (+j.out || 0));
const RSKIP = (S, k) => ["Income", "Uncategorized", "Fees & FX costs"].includes(k) || S.cats?.[k] === 99;

// How often does this store charge you? null when there is no regular rhythm.
export function cadenceOf(L) {
  if (L.length < 2) return null;
  const gaps = L.slice(1).map((t, i) => (new Date(t.d) - new Date(L[i].d)) / 864e5), md = med(gaps), every = md >= 26 && md <= 35 ? 1 : md >= 55 && md <= 68 ? 2 : md >= 355 && md <= 375 ? 12 : 0;
  if (!every || (every < 12 && L.length < 3)) return null;
  const tol = every == 12 ? 15 : 6;
  if (gaps.filter((x) => Math.abs(x - md) <= tol).length < gaps.length * 0.75) return null;
  const am = L.map((t) => -t.a), mean = sum(am) / am.length;
  if (Math.max(...am.map((x) => Math.abs(x - mean))) / mean > 0.25) return null;
  const last = L[L.length - 1];
  return { every, anchor: +last.d.slice(5, 7), dom: +last.d.slice(8, 10), mean };
}

// The current app looks for transfers between your own accounts every time the data loads (detect() in web/js/02-state-data.js), and the totals leave them out.
// Same here, in memory only: a possible transfer waits for review ("auto") and is not counted as spending or income.
export function withTransfers(S) {
  const tx = S.tx || [], xf = [...(S.xf || [])];
  const own = [...new Set(["Bank Hapoalim", "Wise", ...(S.accounts || []).filter((a) => a.kind == "bank" || a.kind == "wallet" || a.kind == "custom").map((a) => a.n)])];
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
const nameField = (t, f) => (f == "desc" ? t.desc : f == "memo" ? t.memo : f == "from" ? t.from : f == "to" ? t.to : f == "note" ? t.note : [t.desc, t.memo, t.bd, t.from, t.to, t.note].filter(Boolean).join(" "));
const rnm = (s) => String(s == null ? "" : s).toLowerCase().replace(/[0-9*#_\/\\\-.,:;()'"\u05f3\u05f4]+/g, " ").replace(/\s+/g, " ").trim();
// The name shown for a payment: the one you typed, a naming rule, or the bank's text (dn in the current app).
export const nameOf = (S, t) => { const c = S?.cfg || {}, o = c.renames && c.renames[t.id]; if (o) return o; if (c.nameRules) { const r = c.nameRules.find((x) => { const q = rnm(x.k); if (!q) return false; const v = rnm(nameField(t, x.f || "any")); return x.m == "eq" ? v == q : v.includes(q); }); if (r) return r.n; } return nohtml(t.desc); };

// Everything Home needs, worked out once per data load. now: today's date; fx: { USD: 3.7, ... }.
export function homeModel(S, now = new Date(), fx = {}) {
  S = withTransfers(S || {});
  const NOW = now, MK = NOW.getFullYear() + "-" + p2(NOW.getMonth() + 1), TODAY = MK + "-" + p2(NOW.getDate()), DAYN = NOW.getDate(), DIM = new Date(NOW.getFullYear(), NOW.getMonth() + 1, 0).getDate();
  const k = kinds(S, TODAY), tx = S.tx || [], jarsAll = S.jars || [], cfg = { budgetPct: 80, ...(S.cfg || {}) }, budgets = S.budgets || {};
  const rate = (c) => (c === "ILS" ? 1 : fx[c] || 1);
  const accts = (S.accounts || []).filter((a) => a.kind != "card" && !a.hide);
  const accILS = (a) => a.v * rate(a.cur);
  const accCur = (a) => a.n + (a.cur != "ILS" || accts.some((x) => x !== a && (x.n == a.n || (x.src && x.src == a.src))) ? " (" + a.cur + ")" : "");
  const cashAccts = accts.filter((a) => a.inNW && (a.kind == "bank" || a.kind == "wallet"));
  const cashNow = sum(cashAccts.map(accILS)), custNW = sum(accts.filter((a) => a.kind == "custom" && a.inNW).map(accILS));
  const NR = new Set((S.accounts || []).filter((a) => a.inR === false).map((a) => a.n));
  const noRep = (t) => NR.size > 0 && (NR.has(t.from) || NR.has(t.to));
  const byId = new Map(tx.map((t) => [t.id, t]));
  // Fees lost when moving money between your own accounts count as spending.
  const costRows = (S.xf || []).filter((x) => x.st != "rej").map((x) => {
    const o = byId.get(x.o), i = byId.get(x.i); if (!o || !i) return null; const c = -o.a - i.a;
    return c > 0.5 ? { id: "v" + x.o, virtual: true, d: o.d, desc: "Transfer cost · " + o.from + " → " + i.to, from: o.from, to: "Transfer fees / FX spread", a: -c, c: "Fees & FX costs" } : null;
  }).filter(Boolean);
  const A = tx.filter((t) => !k.isXf(t) && !k.isIgn(t) && !k.isFut(t) && !k.isCp(t) && !noRep(t)).concat(costRows);
  const ALL = tx.concat(costRows);
  const monthSum = (m, sg) => sum(A.filter((t) => (sg > 0 ? t.a > 0 : t.a < 0) && rdOf(t).startsWith(m)).map((t) => Math.abs(t.a)));
  const spendM = {}; A.filter((t) => t.a < 0 && rdOf(t).startsWith(MK)).forEach((t) => { const c = t.c || "Uncategorized"; spendM[c] = (spendM[c] || 0) + Math.abs(t.a); });
  const spend = Object.entries(spendM).sort((a, b) => b[1] - a[1]);

  // Six months of history (this one last). Months before the first data are "no history".
  const ms = []; for (let i = 5; i >= 0; i--) ms.push(addM(MK, -i));
  const hist = { keys: ms, inc: ms.map(() => 0), exp: ms.map(() => 0), first: 0 };
  { const first = tx.filter((t) => !k.isFut(t) && !t.virtual).reduce((m, t) => (t.d < m ? t.d : m), "9999-99-99"); let fi = first == "9999-99-99" ? 5 : ms.indexOf(first.slice(0, 7)); if (fi < 0) fi = first.slice(0, 7) < ms[0] ? 0 : 5; if (first != "9999-99-99" && +first.slice(8) > 10 && fi < 5) fi++; hist.first = Math.max(0, Math.min(5, fi)); }
  A.filter((t) => !t.pending).forEach((t) => { const i = ms.indexOf(rdOf(t).slice(0, 7)); if (i < 0) return; if (t.a > 0) hist.inc[i] += t.a; else hist.exp[i] -= t.a; });
  const budMonths = [2, 3, 4].filter((i) => i >= hist.first).map((i) => ms[i]);
  const monthlyByCat = {}; A.filter((t) => t.a < 0).forEach((t) => { const c = t.c || "Uncategorized", m = rdOf(t).slice(0, 7); (monthlyByCat[c] = monthlyByCat[c] || {})[m] = (monthlyByCat[c][m] || 0) - t.a; });

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
  const BC = bills.map((b, idx) => billInfo(b, idx, billTx(b), NOW)).map((b) => { const L = billTx(bills[b.idx]).filter((t) => t.c && t.c != "Uncategorized"), lc = L.length ? L[L.length - 1].c : null; return { ...b, cat: lc || (b.manual ? b.cat : "") || "" }; });
  const activeBills = BC.filter((b) => b.flag != "canceled" && !b.ended);

  const budgetInfo = Object.entries(budgets).map(([kk, lim]) => {
    const s = spendM[kk] || 0, pc = lim ? (s / lim) * 100 : 0, B = BC.filter((b) => !b.once && !b.irregular && b.flag != "canceled" && b.cat == kk);
    const paid = Math.min(s, sum(B.filter((b) => b.lp && b.lp.startsWith(MK)).map((b) => b.pred))), due = sum(B.filter((b) => !(b.lp && b.lp.startsWith(MK)) && b.nx && b.nx.toISOString().slice(0, 7) == MK).map((b) => b.pred)), pace = paid + due + ((s - paid) / DAYN) * DIM;
    return { k: kk, lim, s, pc, pace, left: lim - s, st: s > lim ? "over" : pc >= cfg.budgetPct ? "warn" : pace > lim ? "pace" : "ok" };
  });

  // Jars and the money already spoken for this month (the same rules as the current app).
  const jarsS = jarsAll.filter((j) => !j.done).sort((a, b) => a.p - b.p);
  const catJars = {}; jarsS.forEach((j) => (j.cats || []).forEach((x) => { if (!catJars[x.c]) catJars[x.c] = { j, since: x.since }; }));
  const recBills = BC.filter((b) => !b.once && !b.irregular && b.flag != "canceled" && b.mo > 0);
  const R = (() => {
    const linked = new Set(jarsS.map((j) => j.bill).filter(Boolean)), allB = linked.has("*") || linked.has("*a"), useAvg = cfg.reserveAvg !== false, bl0 = {}, cov = {};
    activeBills.forEach((b) => { if (b.once || b.irregular || !b.nx) return; const unpaid = (b.status == "overdue" || b.status == "pending") && (NOW - b.pd) / 864e5 <= 45, comes = b.nx.toISOString().slice(0, 7) == MK; if (!unpaid && !comes) return; const kk = b.cat || "Other bills"; if (allB || linked.has(b.match)) { cov[kk] = (cov[kk] || 0) + b.pred; return; } (bl0[kk] = bl0[kk] || []).push({ n: b.n, amt: b.pred }); });
    const keys = new Set([...Object.keys(budgets), ...Object.keys(bl0)]); if (useAvg && budMonths.length >= 2) Object.keys(monthlyByCat).forEach((kk) => { if (!RSKIP(S, kk)) keys.add(kk); });
    const cand = [], done = [];
    keys.forEach((kk) => { const bl = sum((bl0[kk] || []).map((x) => x.amt)), spent = spendM[kk] || 0; let base = 0, kind = "";
      if (kk in budgets) { base = budgets[kk]; kind = "budget"; } else if (useAvg && budMonths.length >= 2 && !RSKIP(S, kk)) { base = sum(budMonths.map((m) => (monthlyByCat[kk] || {})[m] || 0)) / budMonths.length; kind = "typical"; }
      const left = Math.max(0, base - spent - (cov[kk] || 0)), amt = Math.max(bl, left);
      if (amt < 1) { if (spent >= 1 && base > 0) done.push({ k: kk, base, spent, kind, over: spent > base + 0.5 }); return; }
      cand.push({ k: kk, amt, kind: bl >= left && bl > 0 ? "bill" : kind, bills: bl0[kk] || [], base, spent, bcov: cov[kk] || 0 }); });
    const rows = [], pool = {}; Object.values(catJars).forEach((x) => { pool[x.j.id] = x.j.kind == "payoff" ? heldOf(x.j) : Math.max(0, +x.j.bal || 0); });
    cand.sort((a, b) => b.amt - a.amt).forEach((r) => { const c = catJars[r.k]; let amt = r.amt; if (c) { const take = Math.min(pool[c.j.id], amt); pool[c.j.id] -= take; amt -= take; } if (amt < 1) return; rows.push({ ...r, amt, jar: c ? c.j.n : "", jarCov: c ? r.amt - amt : 0 }); });
    rows.sort((a, b) => b.amt - a.amt);
    return { total: sum(rows.map((r) => r.amt)), rows, done };
  })();
  const inJars = sum(jarsS.map(heldOf)), buffer = Math.max(0, +S.jarsBuffer || 0), raw = cashNow - inJars - buffer - R.total;
  const free = Math.max(0, raw), over = -raw >= 1 ? Math.round(-raw) : 0;
  const monthsTo = (d) => Math.max(1, Math.ceil((new Date(d) - NOW) / (864e5 * 30.44)));
  const capOf = (j, got) => (j.cap == null ? null : j.auto && j.due && j.need > 0 ? Math.max(0, Math.ceil((j.need - (j.bal - (got || 0))) / Math.max(1, monthsTo(j.due)))) : j.cap);
  const jars = (() => { let rem = free; return jarsS.map((j) => { const got = Math.min(+j.got || 0, Math.max(0, +j.bal || 0) + (+j.paid || 0)), open = !(j.need > 0), capE = capOf(j, got), need = open ? 0 : Math.max(0, j.need - j.bal), want = capE == null ? need : Math.max(0, Math.min(capE - got, open ? 1e12 : need)); rem -= Math.max(0, Math.min(rem, want)); return { id: j.id, n: j.n, p: j.p, bal: +j.bal || 0, need: +j.need || 0, got, want, open, pc: open ? 0 : Math.round(((+j.bal || 0) / j.need) * 100) }; }); })();

  // Cards: this month's charges against last month's.
  const pm = addM(MK, -1);
  const cards = (S.accounts || []).filter((a) => a.kind == "card").map((a) => { const mine = tx.filter((t) => t.a < 0 && t.from == a.n && !k.isXf(t)); return { n: a.n, acc: a, now: sum(mine.filter((t) => t.d.startsWith(MK)).map((t) => -t.a)), last: sum(mine.filter((t) => t.d.startsWith(pm)).map((t) => -t.a)) }; });
  { const w = tx.filter((t) => t.wc && t.a < 0 && !k.isXf(t)); if (w.length) cards.push({ n: "Wise card", wise: true, now: sum(w.filter((t) => t.d.startsWith(MK)).map((t) => -t.a)), last: sum(w.filter((t) => t.d.startsWith(pm)).map((t) => -t.a)) }); }

  // Accounts grouped by name (one bank with several currencies is one card).
  const groups = []; accts.filter((a) => !(a.kind == "pension" && !(+a.v > 0))).forEach((a) => { let g = groups.find((x) => x.n == a.n); if (!g) groups.push((g = { n: a.n, L: [] })); g.L.push(a); });
  groups.forEach((g) => { g.total = sum(g.L.map(accILS)); g.manual = g.L.every((x) => x.manual); g.wallet = g.L[0].kind == "wallet"; g.multi = g.L.length > 1 || g.wallet || g.L.some((x) => x.cur != "ILS"); });

  const inc = monthSum(MK, 1), ex = monthSum(MK, -1), pen = sum(accts.filter((a) => a.kind == "pension").map(accILS));
  const rd = new Set(cashAccts.filter((a) => a.at || a.v).map((a) => a.src).filter(Boolean));
  const missing = cashAccts.filter((a) => !a.at && !a.v && !a.manual && !(a.src && rd.has(a.src))).map((a) => a.n);
  const recent = ALL.filter((t) => !k.isXf(t) && t.d >= MK && !k.isFut(t)).sort((a, b) => b.d.localeCompare(a.d)).slice(0, 5);
  const upcoming = activeBills.filter((b) => b.nx).sort((a, b) => (a.status == "overdue" ? -1e3 : 0) + a.days - ((b.status == "overdue" ? -1e3 : 0) + b.days)).slice(0, 4);
  const budgetsSorted = budgetInfo.sort((a, b) => b.pc - a.pc);
  const cash = cashNow + custNW;

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
    kpi: { cash, pen, withPension: cash + pen, inc, ex, net: inc - ex, incLast: hist.inc[4], exLast: hist.exp[4], missing, cashAccts: cashAccts.map((a) => ({ n: a.n, cur: a.cur, ils: accILS(a), lbl: accCur(a) })), notCounted: accts.filter((a) => (a.kind == "bank" || a.kind == "wallet") && !a.inNW).map((a) => a.n), nwSpark: nwSpark.filter((v) => v > 0).length > 1 ? nwSpark : null, incSpark: hist.inc.some((v) => v > 0) ? hist.inc : null, exSpark: hist.exp.some((v) => v > 0) ? hist.exp : null },
    groups, cards, recent, upcoming, budgets: budgetsSorted, jars, spend, rate,
    flow: { cash: cashNow, inJars, buffer, saved: inJars + buffer, free, over, R, jarsHeld: jarsS.filter((j) => heldOf(j) > 0).sort((a, b) => heldOf(b) - heldOf(a)).map((j) => ({ n: j.n, v: heldOf(j) })), spend, cashAccts: cashAccts.map((a) => ({ n: a.n, cur: a.cur, ils: accILS(a), lbl: accCur(a) })) },
    has, any,
    // For the Jars page: bill names by their match text, and six months of income and spending (this one last).
    billNames: Object.fromEntries(BC.map((b) => [b.match, b.n])), hist,
    // For the Jars page's pop-ups and "Full by" dates: every bill, and the counted payments.
    billsAll: BC, rows: A, S, nameOf: (t) => nameOf(S, t),
  };
}

// One bill's state: when it is next due, if it was paid, what it usually costs. Like billsInfo0 in the current app.
export function billInfo(b, idx, mt, NOW) {
  const last = mt[mt.length - 1], prev = mt[mt.length - 2];
  let cad = null, ended = false;
  if (b.mode != "once") {
    if (b.every) { cad = { every: b.every, anchor: b.anchor, dom: b.dom }; if (!b.manual && mt.length >= 2) { const R = mt.slice(-3).map((t) => +String(t.d).slice(8, 10)).sort((x, y) => x - y); cad.dom = R[R.length >> 1]; cad.anchor = +String(mt[mt.length - 1].d).slice(5, 7); } }
    else if (b.rec != "irregular") cad = cadenceOf(mt);
  }
  if (cad && !b.manual && last) {
    const li = instOf(last), oc0 = [];
    for (let y = NOW.getFullYear() - 2; y <= NOW.getFullYear() + 1; y++) for (let m = 1; m <= 12; m++) if ((((m - cad.anchor) % cad.every) + cad.every) % cad.every == 0) { const d = new Date(y, m - 1, Math.min(cad.dom, 28), 9); if (d <= NOW) oc0.push(d); }
    const pd0 = oc0[oc0.length - 1], pd1 = oc0[oc0.length - 2], ld = new Date(last.d);
    const missed = (pd1 && ld < new Date(pd1 - 4 * 864e5)) || (pd0 && ld < new Date(pd0 - 4 * 864e5) && NOW - pd0 > 10 * 864e5);
    if (missed || (li && li.n >= li.total)) { cad = null; ended = true; }
  }
  if (!cad) {
    const once = b.mode == "once", yr = mt.filter((t) => (NOW - new Date(t.d)) / 864e5 <= 365), am = mt.slice(-6).map((t) => -t.a), typ = am.length ? med(am) : b.amt || 0;
    return { ...b, idx, ended, irregular: !once, once, status: once ? "once" : "irregular", pd: null, nx: null, days: 99999, lp: last ? last.d : null, amt: last ? -last.a : (b.amt || 0), was: prev ? -prev.a : (last ? -last.a : 0), pred: typ, vari: true, fresh: false, mo: once ? 0 : sum(yr.map((t) => -t.a)) / 12, every: 0 };
  }
  const B = { ...b, ...cad }, oc = [];
  for (let y = NOW.getFullYear() - 1; y <= NOW.getFullYear() + 2; y++) for (let m = 1; m <= 12; m++) if ((((m - B.anchor) % B.every) + B.every) % B.every == 0) oc.push(new Date(y, m - 1, Math.min(B.dom, 28), 9));
  let pd = null, nx = null; oc.forEach((d) => { if (d <= NOW) pd = d; else if (!nx) nx = d; });
  const amt = last ? -last.a : B.amt || 0, was = prev ? -prev.a : amt, rc = mt.slice(-3).map((t) => -t.a), mean = rc.length ? sum(rc) / rc.length : amt;
  const r4 = mt.slice(-4).map((t) => -t.a), nch = r4.slice(1).filter((x, i) => Math.abs(x - r4[i]) / r4[i] > 0.03).length, vari = r4.length >= 3 && nch >= 2, pred = vari ? mean : amt;
  const lp = last ? last.d : B.lastPaid, paid = lp && new Date(lp) >= new Date(pd - 4 * 864e5), status = paid ? "paid" : NOW - pd <= 3 * 864e5 ? "pending" : "overdue";
  return { ...B, idx, pd, nx, days: Math.ceil((nx - NOW) / 864e5), lp, status, amt, was, pred, vari, fresh: last ? (NOW - new Date(last.d)) / 864e5 <= 45 : false, mo: pred / B.every };
}

// The money flow (waterfall): from what you had before spending, step by step down to what is free.
// mode "left" (Planned): each item takes off its full budget or usual month. "actual": what you really spent.
export function flowSteps(F, mode = "left") {
  const ACT = mode == "actual", src = [...F.R.rows.map((r) => ({ ...r, left: r.amt })), ...(F.R.done || []).map((d) => ({ ...d, left: 0, bills: [] }))];
  const extra = Math.round((sum(F.spend.map((e) => e[1])) - sum(src.map((r) => r.spent || 0))) * 100) / 100;
  if (extra >= 1) src.push({ k: "Unplanned spending", unplanned: true, kind: "other", cats: F.spend.filter((e) => !src.some((r) => r.k == e[0]) && e[1] >= 1), left: 0, spent: extra, base: 0, bills: [] });
  let items = [];
  if (F.inJars >= 1) items.push({ k: "jars", set: 1, a: F.inJars, n: F.jarsHeld.length });
  if (F.buffer >= 1) items.push({ k: "cushion", set: 1, a: F.buffer });
  src.forEach((r) => items.push({ ...r, a: ACT ? r.spent : r.spent + r.left, plan: 1, over: !!r.over }));
  items = items.filter((x) => x.a >= 1).sort((a, b) => b.a - a.a);
  if (items.length > 8) { const top = items.slice(0, 7), rest = items.slice(7), pl = rest.filter((x) => x.plan); top.push({ k: "other", rest, a: sum(rest.map((x) => x.a)), base: sum(pl.map((x) => x.base || 0)), spent: sum(pl.map((x) => x.spent)), plan: pl.length == rest.length ? 1 : 0 }); items = top; }
  const spentAll = sum(src.map((r) => r.spent || 0)), leftTot = sum(F.R.rows.map((r) => r.amt)), start = F.cash + spentAll, scale = Math.max(start, 1);
  const endAv = F.cash - F.saved, eOver = ACT ? Math.max(0, -endAv) : F.over, eFree = ACT ? Math.max(0, endAv) : F.free;
  const pc = (v) => +((Math.max(0, v) / scale) * 100).toFixed(2);
  let lvl = start;
  const cols = [{ kind: "start", a: start, hi: start, lo: start, b: pc(start), h: 0, s: pc(start) }];
  items.forEach((x) => { const hi = lvl, lo = Math.max(0, lvl - x.a); lvl -= x.a; cols.push({ ...x, kind: x.set ? "set" : "item", hi, lo, b: pc(lo), h: pc(hi - lo), s: pc(lo) }); });
  cols.push({ kind: "end", tone: eOver > 0 ? "neg" : eFree > 0 ? "pos" : "none", a: 0, lo: Math.max(0, lvl), b: pc(Math.max(0, lvl)), h: 0, s: pc(Math.max(0, lvl)) });
  return { cols, src, spentAll, leftTot, start, eOver, eFree, ACT };
}
