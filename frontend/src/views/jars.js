// The Jars page's numbers, kept apart from the screen so they can be tested. They follow the current app
// (web/js/02-state-data.js jarFree/jarCalc, 04-transactions.js jarState/renderJars, 06-trend-forecast-sync.js jarProject).
// Nothing here changes the data.
import { homeModel, addM } from "./home.js";

const sum = (a) => a.reduce((t, x) => t + x, 0);

// now: today's date; fx: { USD: 3.7, ... }.
export function jarsModel(S, now = new Date(), fx = {}) {
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
  const hs = H.hist, idx = [0, 1, 2, 3, 4].filter((i) => i >= hs.first), surplus = idx.length ? sum(idx.map((i) => hs.inc[i] - hs.exp[i])) / idx.length : 0;
  const eta = {};
  { let pool = F.free; const J = out.map((j) => ({ ...j, b: j.bal }));
    for (let k = 1; k <= 60; k++) { pool = Math.max(0, pool + surplus); J.forEach((j) => { const full = j.cap == null && !j.open && j.bill; if (full || (!j.open && j.b >= j.need)) return; const c = capOf({ ...j, bal: j.b }, 0, k - 1), want = c == null ? (j.open ? 0 : j.need - j.b) : Math.min(c, j.open ? 1e12 : j.need - j.b), g = Math.max(0, Math.min(pool, want)); pool -= g; j.b += g; if (!j.open && j.b >= j.need - 0.5 && eta[j.id] == null) eta[j.id] = k; }); } }

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
  return { F: { cash: F.cash, inJars: F.inJars, buffer: F.buffer, reserve: F.R.total, free: F.free, over: F.over }, month, jars, goals, done, has: { any: active.length > 0 } };
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
