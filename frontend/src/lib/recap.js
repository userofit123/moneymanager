// The Recap page's numbers: how the month is going, worked out from the Home numbers (views/home.js homeModel) exactly like
// the current app's Recap (web/recap.js model()), and which parts show in which order. Nothing here changes the data.
import { addM, rdOf, nameOf } from "../views/home.js";

const p2 = (n) => String(n).padStart(2, "0");
const sum = (a) => a.reduce((s, x) => s + x, 0);

// M: homeModel(S, now, fx). now: today's date.
export function recapModel(M, now) {
  const S = M.S, MK = M.MK, TODAY = M.today, day = M.DAYN, dim = M.DIM, pm = addM(MK, -1), nmk = addM(MK, 1), F = M.flow, R = F.R, cash = F.cash, A = M.rows, k = M.k;
  const BI = M.billsAll.filter((b) => b.flag != "canceled" && !b.ended), dn = (t) => nameOf(S, t);
  const inc = M.kpi.inc, ex = M.kpi.ex;
  const cardsU = sum(M.cards.map((c) => c.now)), cardsPrev = sum(M.cards.map((c) => c.last));
  const cardPaid = (S.tx || []).filter((t) => !t.virtual && k.isCp(t) && String(t.d).startsWith(MK) && String(t.d) <= TODAY).reduce((s, t) => s - t.a, 0);
  const cardLeft = Math.max(0, cardsPrev - cardPaid);
  const same = A.filter((t) => t.a < 0 && rdOf(t).startsWith(pm) && +rdOf(t).slice(8) <= day).reduce((s, t) => s - t.a, 0);
  const incs = A.filter((t) => t.a > 0 && !t.pending && rdOf(t).startsWith(MK)).sort((a, b) => b.a - a.a);
  const sal = incs.find((t) => /salary|משכורת|שכר/i.test((t.c || "") + " " + t.desc)) || incs[0] || null;
  const spendNow = Object.fromEntries(M.spend);
  const bills = []; R.rows.forEach((r) => (r.bills || []).forEach((b) => { const bi = BI.find((x) => x.n == b.n); bills.push({ n: b.n, amt: b.amt, nx: bi && bi.nx ? bi.nx : null, overdue: !!b.overdue }); }));
  const billsTot = sum(bills.map((b) => b.amt)), limitsLeft = sum(R.rows.filter((r) => r.kind != "bill").map((r) => r.amt));
  // what jars pay of the money still to go out (reserveCalc's jarCov; rows a jar covers in full are only in R.jarCov)
  const jarCov = R.jarCov ? sum(R.jarCov.map((x) => x.cov)) : sum(R.rows.map((r) => r.jarCov || 0));
  const end = cash - (R.total + jarCov) - cardLeft;
  const start = cash - inc + (ex - cardsU) + cardPaid;
  // the budgets in the order they were made (Home sorts its copy)
  const order = Object.keys(S.budgets || {}), bud = [...M.budgets].sort((a, b) => order.indexOf(a.k) - order.indexOf(b.k));
  const over = bud.filter((b) => b.st == "over"), risk = bud.filter((b) => b.st == "pace" || b.st == "warn"), okB = bud.filter((b) => b.st == "ok");
  const Mc = {}; A.filter((t) => t.a < 0).forEach((t) => { const c = t.c || "Uncategorized", m = rdOf(t).slice(0, 7); (Mc[c] = Mc[c] || {})[m] = (Mc[c][m] || 0) - t.a; });
  const idx = [2, 3, 4].filter((i) => i >= (M.hist.first || 0)).map((i) => M.hist.keys[i]), usual = (c) => (idx.length ? sum(idx.map((m) => (Mc[c] || {})[m] || 0)) / idx.length : 0);
  const skip = (c) => ["Income", "Uncategorized", "Fees & FX costs"].includes(c) || S.cats?.[c] === 99;
  const billMo = (c) => sum(M.billsAll.filter((b) => !b.once && !b.irregular && b.flag != "canceled" && b.mo > 0 && b.cat == c).map((b) => b.mo));
  const above = Object.keys(spendNow).filter((c) => !skip(c)).map((c) => ({ k: c, s: spendNow[c], u: usual(c) })).filter((x) => x.u >= 150 && x.s > x.u * 1.05).sort((a, b) => b.s - b.u - (a.s - a.u));
  const below = Object.keys(Mc).filter((c) => !skip(c)).map((c) => ({ k: c, s: spendNow[c] || 0, u: usual(c), by: (usual(c) * day) / dim })).filter((x) => x.u >= 250 && day >= 7 && x.s < x.by * 0.5 && !(billMo(x.k) > 0)).sort((a, b) => b.by - b.s - (a.by - a.s));
  const ago = (t) => Math.floor((new Date(TODAY + "T12:00:00") - new Date(rdOf(t) + "T12:00:00")) / 864e5);
  const exp = A.filter((t) => t.a < 0);
  const w1 = exp.filter((t) => { const d = ago(t); return d >= 0 && d < 7; }).reduce((s, t) => s - t.a, 0), w0 = exp.filter((t) => { const d = ago(t); return d >= 7 && d < 14; }).reduce((s, t) => s - t.a, 0);
  // what happened on each day of the month (and what is planned for the days to come). The tooltip lists payees by name
  // (the current app meant to, but showed how many days ago instead).
  const days = Array.from({ length: dim }, (_, i) => ({ d: MK + "-" + p2(i + 1), spent: 0, inc: 0, ex: [], inn: [], up: [] }));
  A.forEach((t) => { const r = rdOf(t); if (!r.startsWith(MK)) return; const i = +r.slice(8) - 1; if (i < 0 || i >= dim) return; const D = days[i]; if (t.a < 0) { D.spent -= t.a; D.ex.push([dn(t), -t.a]); } else if (!t.pending) { D.inc += t.a; D.inn.push([dn(t), t.a]); } });
  const rec = BI.filter((b) => !b.once && !b.irregular && b.flag != "canceled" && b.nx);
  rec.filter((b) => b.nx.toISOString().slice(0, 7) == MK && b.nx.toISOString().slice(0, 10) >= TODAY).forEach((b) => { const i = b.nx.getDate() - 1; if (days[i]) days[i].up.push([b.n, b.pred, b.idx]); });
  const nextBills = sum(rec.filter((b) => b.nx.toISOString().slice(0, 7) == nmk).map((b) => b.pred));
  const phase = day <= 5 ? "start" : dim - day <= 6 ? "end" : "mid";
  return { MK, today: TODAY, jarCov, day, dim, pm, nmk, cash, inc, ex, cardsU, cardsPrev, cardPaid, cardLeft, same, incs, sal, bills, billsTot, limitsLeft, end, start, over, risk, okB, above, below, w1, w0, days, nextBills, phase, inJars: F.inJars, buffer: F.buffer, over0: F.over };
}

// The parts of the page in the order of this time of the month (renderRecap); parts with nothing to say are left out.
const ORDER = { start: ["hero", "start", "in", "now", "ahead", "out", "budgets", "end"], mid: ["hero", "start", "in", "out", "now", "ahead", "budgets", "end"], end: ["hero", "start", "in", "out", "budgets", "ahead", "now", "end"] };
export const hasStart = (m) => isFinite(m.start) && Math.abs(m.start) >= 1;
export function recapParts(m) {
  const on = { hero: true, start: hasStart(m), in: true, out: true, now: true, ahead: m.cash - m.end >= 1, budgets: m.over.length + m.risk.length > 0 || m.okB.length > 0, end: true };
  return ORDER[m.phase].filter((p) => on[p]);
}

// The bars of "Since then, you have spent": one per day; a single huge day is capped so the others still show (dayBars).
export function dayBarHeights(m, Hh = 96) {
  const v0 = m.days.slice(0, m.day).map((d) => d.spent), sd = [...v0].sort((a, b) => b - a), mx = Math.max(1, sd[0] > sd[1] * 2.2 ? sd[1] * 1.3 : sd[0] || 1);
  return m.days.map((_, i) => (i < m.day ? Math.min(Hh, Math.max(v0[i] > 0 ? 5 : 2, ((v0[i] || 0) / mx) * (Hh - 6))) : null));
}
