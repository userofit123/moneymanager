// The Jars page's numbers, kept apart from the screen so they can be tested. They follow the current app
// (web/js/02-state-data.js jarFree/jarCalc, 04-transactions.js jarState/renderJars, 06-trend-forecast-sync.js jarProject).
// Nothing here changes the data.
import { homeModel, addM, rdOf } from "./home.js";

const sum = (a) => a.reduce((t, x) => t + x, 0);

// The name an income is grouped under (web/js/07-periods-rules.js incKey).
const incKey = (t) => { const f = String(t.from || "").trim(); if (f && !/^(bank transfer|other)$/i.test(f)) return f; const d = String(t.desc || "").replace(/[0-9\/\\.,:;*#()\-_]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 40); return d || "Other income"; };
const medOf = (v) => { const x = [...v].sort((a, b) => a - b), h = x.length >> 1; return x.length % 2 ? x[h] : (x[h - 1] + x[h]) / 2; };
// "Smart" estimate: one unusually large or small month is pulled back toward the typical month, and a trend counts only a little (est in the current app).
function est(v, m, sl) {
  const nn = v.length, avg = v.reduce((x, y) => x + y, 0) / nn;
  if (m != "smart" || nn < 3) return { mean: avg, at: (k) => (m == "avg" || m == "smart" ? avg : Math.min(avg * 1.5, Math.max(avg * 0.5, avg + sl * ((nn - 1) / 2 + k)))) };
  const med = medOf(v), lo = med > 0 ? med * 0.6 : med * 1.6, hi = med > 0 ? med * 1.6 : med * 0.6, mean = v.map((y) => Math.min(hi, Math.max(lo, y))).reduce((x, y) => x + y, 0) / nn;
  return { mean, at: (k) => Math.min(mean * 1.3, Math.max(mean * 0.7, mean + sl * 0.5 * Math.min(k, 3))) };
}
const slope = (v) => { const nn = v.length, mean = v.reduce((x, y) => x + y, 0) / nn; let sl = 0; if (nn > 1) { const xm = (nn - 1) / 2; let num = 0, den = 0; v.forEach((y, i) => { num += (i - xm) * (y - mean); den += (i - xm) ** 2; }); sl = num / den; } return sl; };
// One income source or spending category, carried forward (proj in the current app). v: the months it is based on, sl: its change per month.
export function proj(FH, a, n, m, inc) {
  if (inc) {
    const occ = []; for (let j = Math.max(FH.first || 0, FH.last - n); j <= FH.last; j++) if (a[j] > 0) occ.push(j);
    if (occ.length >= 2) { const v = occ.map((j) => a[j]), sl = slope(v); return { v, nn: v.length, sl, recurring: true, ...est(v, m, sl), oneoff: false }; }
    return { v: [0], mean: 0, sl: 0, nn: 1, oneoff: true, at: () => 0 };
  }
  let v = a.slice(Math.max(FH.last - n, FH.first || 0), FH.last); if (!v.length) v = [0];
  const sl = slope(v); return { v, nn: v.length, sl, ...est(v, m, sl) };
}
// The last 13 months (12 complete ones and this one) split into income sources and spending categories (FH in the current app).
export function forecastHistory(S, H) {
  const MK = H.MK, N = 13, ks = [];
  for (let i = N - 1; i >= 0; i--) ks.push(addM(MK, -i));
  const inc = ks.map(() => 0), exp = ks.map(() => 0), cats2 = {}, incS2 = {}, sumA = (a) => a.reduce((x, y) => x + y, 0);
  (H.rows || []).filter((t) => !t.pending).forEach((t) => { const i = ks.indexOf(rdOf(t).slice(0, 7)); if (i < 0) return; if (t.a > 0) { inc[i] += t.a; const k = incKey(t); (incS2[k] = incS2[k] || ks.map(() => 0))[i] += t.a; } else { exp[i] -= t.a; const k = t.c || "Uncategorized"; (cats2[k] = cats2[k] || ks.map(() => 0))[i] -= t.a; } });
  const f0 = (S.tx || []).filter((t) => !H.k.isFut(t) && !t.virtual).reduce((mm, t) => (t.d < mm ? t.d : mm), "9999-99-99");
  let fi = f0 == "9999-99-99" ? N - 1 : ks.indexOf(f0.slice(0, 7)); if (fi < 0) fi = f0.slice(0, 7) < ks[0] ? 0 : N - 1; if (f0 != "9999-99-99" && +f0.slice(8) > 10 && fi < N - 1) fi++; fi = Math.max(0, Math.min(N - 1, fi));
  const cat = {}, incSrc = {}, ct = Object.entries(cats2).sort((a, b) => sumA(b[1]) - sumA(a[1])), it = Object.entries(incS2).sort((a, b) => sumA(b[1]) - sumA(a[1]));
  ct.slice(0, 8).forEach(([k, v]) => (cat[k] = v)); it.slice(0, 6).forEach(([k, v]) => (incSrc[k] = v)); if (it.length > 6) incSrc["Other income"] = ks.map((_, i) => it.slice(6).reduce((s, [, v]) => s + v[i], 0));
  return { keys: ks, last: N - 1, first: fi, inc, exp, cat, incSrc };
}
// The money expected to be left in month k from now: expected income minus expected spending (fcCalc in the current app).
export function forecastSurplus(S, H, now, fcOpt = {}) {
  const n = [3, 6, 12].includes(+fcOpt.n) ? +fcOpt.n : 6, m = fcOpt.m || "smart", FH = forecastHistory(S, H);
  const E = {}; Object.entries(FH.cat).forEach(([k, a]) => (E[k] = a.slice(0, FH.last))); E["Other / uncategorized"] = FH.exp.slice(0, FH.last).map((t, i) => t - Object.values(FH.cat).reduce((s, a) => s + a[i], 0));
  const I = Object.values(FH.incSrc).map((a) => proj(FH, a, n, m, true)).filter((r) => !r.oneoff), X = Object.values(E).map((a) => proj(FH, a, n, m)).filter((r) => Math.abs(r.mean) >= 0.5);
  const at = (k) => I.reduce((s, r) => s + r.at(k), 0) - X.reduce((s, r) => s + r.at(k), 0);
  return (k) => at(Math.min(k, 12));
}

// now: today's date; fx: { USD: 3.7, ... }.
// fcOpt: the Forecast page's choices { n: months to base it on, m: "smart" | "avg" | "trend" }, saved by the current app as "moneyFc".
export function jarsModel(S, now = new Date(), fx = {}, fcOpt = {}) {
  S = S || {};
  const H = homeModel(S, now, fx), F = H.flow, MK = H.MK;
  const monthsTo = (d) => Math.max(1, Math.ceil((new Date(d) - now) / (864e5 * 30.44)));
  // A jar with "auto" and a deadline works out its own monthly amount. off: months from now (for the forecast).
  const capOf = (j, got, off = 0) => (j.cap == null ? null : j.auto && j.due && j.need > 0 ? Math.max(0, Math.ceil((j.need - (j.bal - (got || 0))) / Math.max(1, monthsTo(j.due) - off))) : j.cap);
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
  // The money left each month is the Forecast page's guess (web/js/06-trend-forecast-sync.js fcCalc), so both pages agree.
  const sur = forecastSurplus(S, H, now, fcOpt);
  const eta = {};
  { let pool = F.free; const J = out.map((j) => ({ ...j, b: j.bal }));
    for (let k = 1; k <= 60; k++) { pool = Math.max(0, pool + sur(k)); J.forEach((j) => { const full = j.cap == null && !j.open && j.bill; if (full || (!j.open && j.b >= j.need)) return; const c = capOf({ ...j, bal: j.b }, 0, k - 1), want = c == null ? (j.open ? 0 : j.need - j.b) : Math.min(c, j.open ? 1e12 : j.need - j.b), g = Math.max(0, Math.min(pool, want)); pool -= g; j.b += g; if (!j.open && j.b >= j.need - 0.5 && eta[j.id] == null) eta[j.id] = k; }); } }

  const jars = out.map((j, ix) => {
    const type = j.bill ? "bill" : j.open ? "month" : "goal", pc = j.open ? 0 : Math.round((j.bal / j.need) * 100);
    return { ...j, ix, type, pc, state: jarState(j, eta[j.id], MK, monthsTo), billName: j.bill ? H.billNames[j.bill] || "" : "" };
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
  return { F: { cash: F.cash, inJars: F.inJars, buffer: F.buffer, reserve: F.R.total, free: F.free, over: F.over }, month, jars, goals, done, has: { any: active.length > 0 },
    avail, bills: bl, MK, today: H.today, monthsTo };
}

// What a jar is doing this month (the pill in its header), and when it will be full.
export function jarState(j, k, MK, monthsTo) {
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

// ---- Changes to the jars. Each one changes S (a copy) the same way the current app does (web/js/08-jars.js)
// and gives back the history lines to log as [action, detail]. fm formats money for those lines.
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
// One change to a field, logged like jset in the current app.
const FLD = { n: "name", desc: "description", months: "months covered", auto: "monthly amount mode", cap: "monthly amount", need: "target", bal: "saved amount", due: "deadline", bill: "linked bill" };
function jset(j, fld, v, ctx) {
  if (j[fld] === v || (fld == "auto" && !!j[fld] === !!v)) return null;
  const old = j[fld], { fm, BC } = ctx;
  const show = (x) => (fld == "n" || fld == "desc" ? x || "none" : fld == "months" ? String(x || "none") : fld == "bill" ? (isAll(x) ? ALLN[x].toLowerCase() : x ? (BC.find((b) => b.match == x) || {}).n || x : "none") : fld == "due" ? (x ? ctx.dstr(x) : "none") : fld == "auto" ? (x ? "calculated from the deadline" : "fixed") : fld == "cap" && x == null ? "refill to target" : fm(x));
  j[fld] = v;
  if (fld == "bal") { j.balEdit = true; if (v < old) jarOut(j, r2(old - v), "Edited by you"); jarClamp(j); }
  return ["Changed jar " + FLD[fld], j.n + ": " + show(old) + " → " + show(v)];
}

// "Take back from the jars": the extra comes out of the lowest-priority jars first.
export function releaseJars(S, over, ctx) {
  const logs = []; let need = over;
  [...jarsOpen(S)].reverse().forEach((j) => { if (need <= 0 || !(heldOf(j) > 0)) return; const t = Math.min(heldOf(j), Math.ceil(need)); j.balNote = "Released back to free money"; const l = jset(j, "bal", r2(j.bal - t), ctx); if (l) logs.push(l); need -= t; });
  return logs;
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
    ...(S.tx || []).filter((t) => t.jar && t.jar.id == j.id).map((t) => ({ k: t.d, d: t.d, pay: true, payoff: pay, name: name(t), amt: pay ? +t.jar.amt : -t.jar.amt })),
  ].sort((x, y) => y.k.localeCompare(x.k));
}

// The categories each open jar pays for (catJars).
export function catJarsOf(S) { const o = {}; jarsOpen(S).forEach((j) => (j.cats || []).forEach((x) => { if (!o[x.c]) o[x.c] = { j, since: x.since }; })); return o; }

// The form for a new jar or for editing one. f: what was typed. Gives back an error key, or the history lines.
// kind: "goal" (savings), "bill" or "payoff".
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
  const kind = f.kind == "payoff" ? "payoff" : "", tick = !!f.O, logs = [], sig = (a) => JSON.stringify([...a].sort());
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
