// The upkeep the current app does on the data after every load and every change (web/js/07-periods-rules.js renderAll),
// so its results are saved like any other change:
//   1. find transfers between your own accounts (detect)          4. give uncategorized payments the category of a matching rule (applyRules)
//   2. find new repeating bills (detectBills)                       5. pay from jars that are linked to a category, or give the money back (jarAuto)
//   3. keep the target of "all bills" jars up to date               6. keep the amount held back for this month (jarsReserve)
// settle(S) changes S in place and returns the change-history lines it wrote (all by "System", so no toast).
import { withTransfers, homeModel } from "../lib/home.js";
import { kinds, ruleHit } from "../lib/activity.js";
import { countedTx, detectNew, fm } from "../lib/bills.js";
import { billLists, isAll, catJarsOf } from "../lib/jars.js";

const p2 = (n) => String(n).padStart(2, "0");
export const dayOf = (d) => d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
const cad = { 1: "monthly", 2: "every 2 months", 12: "yearly" };

export function settle(S, now = new Date(), fx = {}) {
  if (!S || !Array.isArray(S.tx)) return [];
  const lines = [], sys = (action, detail) => lines.push([action, detail, null, "System"]), today = dayOf(now);
  S.xf = S.xf || []; S.bills = S.bills || []; S.ignoredBills = S.ignoredBills || []; S.jars = S.jars || []; S.rules = S.rules || [];

  // 1. transfers
  const n0 = S.xf.length, T = withTransfers(S);
  if (T !== S) {
    const byId = new Map(S.tx.map((t) => [t.id, t]));
    T.xf.slice(n0).forEach((x) => { const o = byId.get(x.o), i = byId.get(x.i); sys("Transfer detected", o.from + " → " + i.to + " · " + fm(-o.a) + " out, " + fm(i.a) + " in"); });
    S.xf = T.xf;
  }

  // 2. bills
  const { A } = countedTx(S, today);
  detectNew(S, A).forEach(({ b, c, last }) => { S.bills.push(b); sys("Bill detected", last.to + " · " + cad[c.every] + " · about " + fm(c.mean)); });

  // 3. a jar for all bills saves their monthly total times the months it covers
  let H = homeModel(S, now, fx);
  const BL = billLists(H);
  S.jars.forEach((j) => { if (isAll(j.bill) && !j.done) { const n = Math.round(BL.allMo(j.bill) * (j.months || 12)); if (n > 0 && j.need != n) j.need = n; } });

  // 4. category rules never override a category set by hand
  const k = kinds(S, today);
  S.tx.forEach((t) => { if (!t.c && !k.isXf(t)) { const r = S.rules.find((r) => ruleHit(t, r.k)); if (r) t.c = r.c; } });

  // 5. jars that pay for a category
  jarAuto(S, k, sys, now);

  // 6. the money held back this month, kept for the server (it fills the jars from what is left)
  H = homeModel(S, now, fx);
  S.jarsReserve = Math.round(H.flow.R.total);
  return lines;
}

// ---- jars paying for categories (web/js/02-state-data.js jarAuto, 08-jars.js jarPay/jarUnpay/jarOut) ----
const heldOf = (j) => Math.max(0, (+j.bal || 0) - (+j.out || 0));
const jarClamp = (j) => { j.out = Math.min(+j.out || 0, Math.max(0, +j.bal || 0)); };
function jarOut(j, amt, note, paid, now) {
  if (!(amt > 0)) return;
  j.balNote = j.balNote || note;
  if (paid) { j.balPaid = true; j.paid = +((+j.paid || 0) + amt).toFixed(2); } else j.got = Math.max(0, +((+j.got || 0) - amt).toFixed(2));
  j.moves = [{ amt: -amt, note, at: now.toISOString() }, ...(j.moves || [])];
  if (j.ledger != null) j.ledger = +(j.ledger - amt).toFixed(2);
}
export function jarPay(j, t, amt, now = new Date()) {
  if (j.kind == "payoff") { const a = +Math.min(heldOf(j), amt).toFixed(2); if (!(a > 0)) return 0; j.out = +((+j.out || 0) + a).toFixed(2); j.balEdit = true; return a; } // the set-aside money left your accounts; the jar keeps counting up
  const a = +Math.min(Math.max(0, j.bal), amt).toFixed(2);
  if (!(a > 0)) return 0;
  jarOut(j, a, "Paid: " + t.desc, true, now);
  j.bal = +(j.bal - a).toFixed(2); jarClamp(j); j.balEdit = true;
  return a;
}
export function jarUnpay(j, amt, note, now = new Date()) {
  if (!j || !(amt > 0)) return;
  if (j.kind == "payoff") { j.out = Math.max(0, +((+j.out || 0) - amt).toFixed(2)); j.balEdit = true; return; }
  note = note || "Payment taken back";
  j.bal = +(j.bal + amt).toFixed(2); j.balEdit = true; j.balUndo = true; j.balPaid = true; j.balNote = j.balNote || note;
  j.paid = Math.max(0, +((+j.paid || 0) - amt).toFixed(2));
  j.moves = [{ amt, note, at: now.toISOString() }, ...(j.moves || [])];
  if (j.ledger != null) j.ledger = +(j.ledger + amt).toFixed(2);
}
// Spending in a category a jar pays for comes out of that jar by itself. Only real expenses dated on or after the link count; one detached by hand,
// or that found the jar empty, is left alone for that category. Moving a payment to another category sends the money back.
function jarAuto(S, k, sys, now) {
  const CJ = catJarsOf(S);
  let n = 0, tot = 0, back = 0;
  S.tx.forEach((t) => {
    if (t.virtual) return;
    if (t.jar && t.jar.auto) {
      const j = S.jars.find((x) => x.id == t.jar.id), c = CJ[t.c];
      if (!j || j.done || !c || c.j.id != j.id) { if (j && !j.done) jarUnpay(j, +t.jar.amt || 0, "Category no longer linked", now); delete t.jar; back++; }
      return;
    }
    if (t.jar || !(t.a < 0) || t.pending || !t.c || k.isXf(t) || k.isIgn(t) || k.isCp(t) || k.isFut(t)) return;
    const c = CJ[t.c];
    if (!c || t.d < c.since || t.jarNo === t.c) return;
    const a = jarPay(c.j, t, Math.abs(t.a), now);
    if (a > 0) { t.jar = { id: c.j.id, amt: a, auto: true }; n++; tot += a; } else t.jarNo = t.c;
  });
  if (n) sys("Paid from jars automatically", n + " payment" + (n > 1 ? "s" : "") + " · " + fm(tot));
  if (back) sys("Payments returned to jars", back + " payment" + (back > 1 ? "s" : "") + " no longer match a linked category");
}
