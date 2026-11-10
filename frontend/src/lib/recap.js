// The Recap page's numbers: how the month is going, worked out from the Home numbers (lib/home.js homeModel),
// and which parts show in which order. Nothing here changes the data.
import { addM, rdOf, nameOf, flowSteps } from "./home.js";
import { cardInfo, cardOf, acctOf } from "./activity.js";
import { isIn, isOut } from "./moneyIn.js";
import { paydayOf } from "./payday.js";

const p2 = (n) => String(n).padStart(2, "0");
const sum = (a) => a.reduce((s, x) => s + x, 0);

// Bank words that say how money came in, not who sent it ("זיכוי", "העברה", "credit", "deposit", "bank transfer", a bank's
// or payment app's name like "לאומי" or "bit"…): a text made only of these whole words (a word may start with מ, ב, ל or ו,
// like "מלאומי") never becomes an income's name, so a real payee's name is never cut.
const BANKW = new Set(["זיכוי", "זיכויים", "זכות", "העברה", "העברות", "העברת", "הפקדה", "הפקדת", "בנקאית", "בנק", "מזומן", "שונות", "אחר", "הכנסה", "credit", "deposit", "bank", "transfer", "incoming", "other", "payment", "income", "wire", "from", "cash",
  // bank and payment-app names and the short words banks use ("הפק" for a cash withdrawal, "בנקט" for a cash machine)
  "לאומי", "הפועלים", "פועלים", "דיסקונט", "מזרחי", "טפחות", "בינלאומי", "מרכנתיל", "יהב", "הדואר", "הפק", "הפקה", "בנקט", "כספומט", "כסף", "ביט", "פייבוקס", "פיי", "העב", "זיכ",
  "leumi", "hapoalim", "poalim", "discount", "mizrahi", "tefahot", "bit", "paybox", "pay", "atm", "withdrawal", "money", "refund", "received", "to", "account"]);
// a payee's name without the numbers banks often add to it (dates, reference numbers), so the same payee matches every month
export const plainOf = (s) => String(s == null ? "" : s).replace(/<[^>]*>/g, " ").replace(/[0-9/\\.,:;*#()\-_'"\u05f3\u05f4]+/g, " ").replace(/\s+/g, " ").trim();
const bankWords = (s) => plainOf(s).toLowerCase().split(" ").filter(Boolean).every((w) => BANKW.has(w) || BANKW.has(w.replace(/^[מבלו]/, "")));
// The name an income is grouped under, the same name the app shows for it: the name you gave it (a rename or a naming rule),
// or else who sent it, its description or its memo, never a bare bank word; with none of these, its category.
export const incKey = (S, t) => {
  const own = nameOf(S, t), desc = String(t.desc || "").replace(/<[^>]*>/g, "").trim();
  if (own && own != desc && !bankWords(own)) return own.trim();
  for (const x of [t.from, t.desc, t.memo]) if (!bankWords(x)) return plainOf(x).slice(0, 40);
  return t.c && t.c != "Uncategorized" ? t.c : "Other income";
};

// What usually still happens after today's date this month (the forecast's rule 3), payee by payee: learned from the 2 full
// months before this month (always those 2), from the real payment dates. For each payee: the average it got after this day of
// the month, but never more than its usual month less what it was already paid this month, so a payment usually made later
// that was already made earlier this month is not counted again (rule 2). A payee that is a known bill still due this month
// (due: Recap's bill list) adds nothing here, as the bill is counted on its own. Incomes the same way: a salary that usually
// comes later in the month and has not come yet counts as coming; one paid in each of those months that has not come yet this
// month counts its usual amount, whatever its usual day.
// Pending rows count, the same way the Activity page counts them.
// Gives the spending by category (out: { k, a, card }) and the incomes by name (inc: { k, a, days }; days: the days of the
// month it came on in those 2 months, for "it usually comes around …").
export function afterToday(S, A, MK, day, CC, due = []) {
  const B = [addM(MK, -2), addM(MK, -1)], dueN = new Set(due.map((b) => plainOf(b.n).toLowerCase())), P = {}, had = [0, 0];
  A.forEach((t) => {
    const r = rdOf(t), m = r.slice(0, 7), i = B.indexOf(m), now = m == MK; if (i < 0 && !now) return;
    if (i >= 0) had[i] = 1;
    if (t.back) return;
    const inc = t.a > 0, k = inc ? incKey(S, t) : t.c || "Uncategorized", nm = plainOf(nameOf(S, t)).toLowerCase(), v = Math.abs(t.a);
    const p = (P[(inc ? "i|" : "o|") + k + "|" + nm] = P[(inc ? "i|" : "o|") + k + "|" + nm] || { inc, k, nm, tot: [0, 0], late: [0, 0], card: [0, 0], now: 0, days: [] });
    if (now) p.now += v; else { p.tot[i] += v; if (+r.slice(8, 10) > day) p.late[i] += v; if (CC.has(t.from)) p.card[i] += v; if (inc) p.days.push(+r.slice(8, 10)); }
  });
  const nb = had[0] + had[1], avg = (x) => (nb ? (x[0] + x[1]) / nb : 0), out = {}, inc = {}, days = {};
  Object.values(P).forEach((p) => {
    if (!p.inc && dueN.has(p.nm)) return;
    // an income paid in each of those months that has not come yet this month counts its usual amount until the month ends,
    // even when it usually comes earlier in the month (it may just be a few days late)
    const late = p.inc && p.now < 0.005 && B.every((_, i) => !had[i] || p.tot[i] > 0);
    const a = late ? avg(p.tot) : Math.min(avg(p.late), Math.max(0, avg(p.tot) - p.now)); if (a < 0.005) return;
    if (p.inc) { inc[p.k] = (inc[p.k] || 0) + a; days[p.k] = (days[p.k] || []).concat(p.days); return; }
    const o = (out[p.k] = out[p.k] || { k: p.k, a: 0, card: 0 }), tt = p.tot[0] + p.tot[1];
    o.a += a; o.card += tt > 0 ? (a * (p.card[0] + p.card[1])) / tt : 0;
  });
  return { out: Object.values(out), inc: Object.entries(inc).map(([k, a]) => ({ k, a, days: days[k].sort((x, y) => x - y) })) };
}

// The payments still to leave this month (Recap's "You still have to pay", Home's "Upcoming payments this month"): the bills
// still due this month and the payments the bank already lists for later this month. A card purchase the card bill already
// counts (cardsDue) is never listed here too. BI: the bills (billInfo), not canceled or ended. R: reserveCalc's rows.
export function stillToPay({ S, A, k, CC, BI, R, TODAY, MK }) {
  const dn = (t) => nameOf(S, t), inA = new Set(A);
  // the day of the payment a bill row stands for: a payment whose day passed and that has not come yet (pending or late) is
  // that day's payment, not the next one (a bill due on the 1st, not seen yet on the 2nd, is the 1st of this month)
  const dueOf = (bi) => (bi ? (bi.status != "paid" && bi.pd ? bi.pd : bi.nx) || null : null);
  const bills = []; R.rows.forEach((r) => (r.bills || []).forEach((b) => { const bi = BI.find((x) => x.n == b.n); bills.push({ n: b.n, amt: b.amt, nx: dueOf(bi), overdue: !!b.overdue, idx: bi ? bi.idx : null, cat: bi ? bi.cat : "", inR: true }); }));
  // the bills a jar pays (or whose budget row a jar covers in full) still leave the bank: listed like any other unpaid bill
  (R.due || []).filter((b) => !bills.some((x) => x.n == b.n)).forEach((b) => { const bi = BI.find((x) => x.n == b.n); bills.push({ n: b.n, amt: b.amt, nx: dueOf(bi), overdue: !!b.overdue, idx: bi ? bi.idx : null, cat: bi ? bi.cat : b.cat, byJar: !!b.byJar }); });
  // bills a budget pays for are not in R's bill rows; the ones still due this month are added, so "still to pay" lists every one
  BI.filter((b) => !b.once && !b.irregular && b.nx && !b.ahead && b.nx.toISOString().slice(0, 7) == MK && b.nx.toISOString().slice(0, 10) >= TODAY && !bills.some((x) => x.n == b.n)).forEach((b) => bills.push({ n: b.n, amt: b.pred, nx: b.nx, overdue: false, idx: b.idx, cat: b.cat }));
  // a bill whose payment the bank or card company already lists for later this month (sched), and other payments listed
  // for later this month, so the list matches the upcoming payments in Activity (a listed payment counts its own amount)
  BI.filter((b) => b.sched && b.sched.slice(0, 7) == MK && b.sched >= TODAY && !bills.some((x) => x.n == b.n)).forEach((b) => bills.push({ n: b.n, amt: b.schedAmt ?? b.pred, nx: new Date(b.sched + "T12:00:00"), overdue: false, idx: b.idx, cat: b.cat }));
  (S.tx || []).filter((t) => !t.virtual && t.a < 0 && String(t.d).slice(0, 7) == MK && String(t.d) > TODAY && !k.isCp(t) && !(CC.has(t.from) && inA.has(t)) && !bills.some((x) => x.n == dn(t)))
    .forEach((t) => bills.push({ n: dn(t), amt: -t.a, nx: new Date(String(t.d).slice(0, 10) + "T12:00:00"), overdue: false, id: t.id, cat: t.c }));
  // a payment whose category a jar pays for comes out of that jar (up to what it holds), so "Free to use" does not take it off
  // twice: once in the jar and once as a payment still due (the bills reserveCalc lists are what its jars did not cover)
  const pool = {}; (S.jars || []).forEach((j) => { pool[j.id] = Math.max(0, +j.bal || 0); });
  bills.forEach((b) => { if (b.inR) return; const j = (S.jars || []).find((j) => (j.cats || []).some((x) => x.c == b.cat)); const take = j ? Math.min(pool[j.id], b.amt) : 0; if (take >= 1) { pool[j.id] -= take; b.jar = j.n; b.cov = take; } });
  // a bill paid by credit card (its last payment was on the card) leaves the bank later, with that card's bill: card is the
  // card, cd the day the bank takes it. One a jar pays stays a payment still due, so the jar money is not counted twice.
  const cd = chargeDays(S, A, k, CC);
  bills.forEach((b) => { const bi = b.idx != null ? BI.find((x) => x.idx == b.idx) : null; if (!bi || !CC.has(bi.acct) || b.cov || b.byJar || !b.nx) return; const d = b.nx.toISOString().slice(0, 10); b.card = bi.acct; b.cd = chargeOf({ d: d > TODAY ? d : TODAY, a: -1, from: bi.acct }, cd); });
  return bills;
}

// M: homeModel(S, now, fx). now: today's date.
export function recapModel(M, now) {
  const S = M.S, MK = M.MK, TODAY = M.today, day = M.DAYN, dim = M.DIM, pm = addM(MK, -1), nmk = addM(MK, 1), F = M.flow, R = F.R, cash = F.cash, A = M.rows, k = M.k;
  const BI = M.billsAll.filter((b) => b.flag != "canceled" && !b.ended), dn = (t) => nameOf(S, t);
  const inc = M.kpi.inc, ex = M.kpi.ex;
  // credit cards only: the bank takes their purchases later, on the card's charge day. A Wise card is paid at once, like the bank.
  // Counted the same way as "spent" (the same rows), so the card part is never more than the whole.
  const CC = new Set((S.accounts || []).filter((a) => a.kind == "card").map((a) => a.n));
  const onCard = (m) => A.filter((t) => isOut(t) && CC.has(acctOf(t)) && rdOf(t).startsWith(m)).reduce((s, t) => s - t.a, 0);
  const cardsU = onCard(MK), cardsPrev = onCard(pm);
  const cardPaid = (S.tx || []).filter((t) => !t.virtual && k.isCp(t) && String(t.d).startsWith(MK) && String(t.d) <= TODAY).reduce((s, t) => s - t.a, 0);
  // card purchases still to leave the bank: the ones charged later this month, and the ones charged next month or after
  // bills paid by credit card go on the card bill of their charge day (Home's model already has them)
  const upAll = F.up ? null : stillToPay({ S, A, k, CC, BI, R, TODAY, MK }), cardUp = F.cardUp || (upAll ? upAll.filter((b) => b.card) : []);
  const due = cardsDue({ S, A, k, CC, TODAY, MK, extra: cardUp }), cardsThis = due.thisMonth, cardsNow = due.now, cardsNext = due.later, nextCards = due.next;
  const same = A.filter((t) => isOut(t) && rdOf(t).startsWith(pm) && +rdOf(t).slice(8) <= day).reduce((s, t) => s - t.a, 0);
  const incs = A.filter((t) => isIn(t) && rdOf(t).startsWith(MK)).sort((a, b) => b.a - a.a);
  const spendNow = Object.fromEntries(M.spend);
  const bills = F.up || upAll.filter((b) => !b.card); // Home's model already has the list
  const billsTot = sum(bills.map((b) => b.amt)), limitsLeft = sum(R.rows.filter((r) => r.kind != "bill").map((r) => r.amt));
  // what jars pay of the money still to go out (reserveCalc's jarCov; rows a jar covers in full are only in R.jarCov)
  const jarCov = R.jarCov ? sum(R.jarCov.map((x) => x.cov)) : sum(R.rows.map((r) => r.jarCov || 0));
  // what is sure to leave the bank this month (card charges due this month and bills still due), and what probably will
  // (the rest of your budgets and usual spending). The usual card share of that leaves the bank next month, with the card bill.
  const sureJar = sum(bills.map((b) => b.cov || 0)), jarsUsed = [...new Set(bills.filter((b) => b.cov).map((b) => b.jar))];
  // sure is in whole shekels, rounded the same way as Home's card and bill steps (all card purchases not paid yet, less the
  // ones charged next month, plus the bills), so the end of this month adds up exactly with Home's amounts on any day
  const cardsOwed = cardsThis + cardsNext, sure = Math.round(Math.max(0, cardsOwed)) - Math.round(cardsNext) + Math.round(billsTot);
  // what you will probably still spend this month, and the income still to come: what usually happens after today's date
  // (afterToday, the same as the Forecast's this month). The known bills still due are counted above. Its usual card part
  // leaves the bank next month, with the card bill.
  const AT = afterToday(S, A, MK, day, CC, bills.concat(cardUp)), daysLeft = Math.max(0, dim - day);
  const rest = AT.out.filter((x) => x.k != "Income" && S.cats?.[x.k] !== 99 && x.a >= 0.5).sort((a, b) => b.a - a.a), incLeft = Math.round(sum(AT.inc.map((x) => x.a)));
  // whole shekels, rounded once here, so every sum shown with them adds up (the Forecast's tiles and tips use the same ones)
  const likely = Math.round(sum(rest.map((x) => x.a))), likelyCard = Math.round(sum(rest.map((x) => x.card))), likelyBank = likely - likelyCard;
  // really yours today: today's balance less the card purchases already made and not paid yet and the payments already due
  // this month (whole shekels, as Recap shows them; the Forecast's "now" uses the same number)
  // (one shared sum, reallyYours, worked out once in homeModel: Home's "Current" money flow ends at the same number)
  const reallyNow = F.really ?? reallyYours(cash, cardsOwed, billsTot);
  const afterSure = Math.round(cash) - sure, end = afterSure - likelyBank + incLeft, toPay = sure, nextBill = Math.round(cardsNext) + likelyCard, afterNext = end - nextBill;
  // end: the bank balance at the end of this month (before next month's card bills). endMonth: what is expected at the end of
  // this month once this month's card purchases are paid too (the Forecast's end of this month): the number the pages show.
  const endMonth = afterNext;
  // Free to use and its parts, the same whole shekels as Home's money flow (homeModel's free; toComeRows: what is still to come
  // in each budget or usual month, the money flow's rows)
  const W = F.aside != null ? flowSteps(F, "left") : null;
  // cards: card purchases not paid yet, in two parts: later (charged after this month) and cardBills (still due this month)
  const cardsW = Math.round(Math.max(0, F.cards || 0)), laterW = Math.round(F.cardsLater ?? Math.max(0, cardsNext));
  const freeParts = { cards: cardsW, later: laterW, cardBills: cardsW - laterW, up: Math.round(billsTot), aside: F.aside ?? 0, toCome: F.toCome ?? 0, free: F.freeRaw ?? 0,
    toComeRows: W ? W.src.filter((r) => r.left >= 0.5).sort((a, b) => b.left - a.left).map((r) => ({ k: r.k, amt: r.left, kind: r.kind })) : [] };
  // what jars still hold at the end, after paying their part of what is still to come
  const heldEnd = Math.max(0, F.inJars - jarCov) + F.buffer;
  // what you began the month with, in whole shekels (rounded once: the hero, the steps and their sums show this one number):
  // what the accounts held when the month began (the server's saved balances, homeModel's startSaved), or, with none saved
  // from then for every account, worked out backwards from today's balance
  const startReal = M.startSaved != null, startOn = startReal ? S.monthStart[MK].on : "";
  // (money back that came into a bank account raised the balance too, though it is not money in)
  const backBank = A.filter((t) => t.back && !CC.has(t.to) && rdOf(t).startsWith(MK) && rdOf(t) <= TODAY).reduce((s, t) => s + t.a, 0);
  const start = Math.round(startReal ? M.startSaved : cash - inc - backBank + (ex - cardsU) + cardPaid);
  // the budgets in the order they were made (Home sorts its copy)
  const order = Object.keys(S.budgets || {}), bud = [...M.budgets].sort((a, b) => order.indexOf(a.k) - order.indexOf(b.k));
  const over = bud.filter((b) => b.st == "over"), risk = bud.filter((b) => b.st == "pace" || b.st == "warn"), okB = bud.filter((b) => b.st == "ok");
  const Mc = {}; A.filter(isOut).forEach((t) => { const c = t.c || "Uncategorized", m = rdOf(t).slice(0, 7); (Mc[c] = Mc[c] || {})[m] = (Mc[c][m] || 0) - t.a; });
  const idx = [2, 3, 4].filter((i) => i >= (M.hist.first || 0)).map((i) => M.hist.keys[i]), usual = (c) => (idx.length ? sum(idx.map((m) => (Mc[c] || {})[m] || 0)) / idx.length : 0);
  const skip = (c) => ["Income", "Uncategorized", "Fees & FX costs"].includes(c) || S.cats?.[c] === 99;
  const billMo = (c) => sum(M.billsAll.filter((b) => !b.once && !b.irregular && b.flag != "canceled" && b.mo > 0 && b.cat == c).map((b) => b.mo));
  const above = Object.keys(spendNow).filter((c) => !skip(c)).map((c) => ({ k: c, s: spendNow[c], u: usual(c) })).filter((x) => x.u >= 150 && x.s > x.u * 1.05).sort((a, b) => b.s - b.u - (a.s - a.u));
  const below = Object.keys(Mc).filter((c) => !skip(c)).map((c) => ({ k: c, s: spendNow[c] || 0, u: usual(c), by: (usual(c) * day) / dim })).filter((x) => x.u >= 250 && day >= 7 && x.s < x.by * 0.5 && !(billMo(x.k) > 0)).sort((a, b) => b.by - b.s - (a.by - a.s));
  const ago = (t) => Math.floor((new Date(TODAY + "T12:00:00") - new Date(rdOf(t) + "T12:00:00")) / 864e5);
  const exp = A.filter(isOut);
  const w1 = exp.filter((t) => { const d = ago(t); return d >= 0 && d < 7; }).reduce((s, t) => s - t.a, 0), w0 = exp.filter((t) => { const d = ago(t); return d >= 7 && d < 14; }).reduce((s, t) => s - t.a, 0);
  // what happened on each day of the month (and what is planned for the days to come). The tooltip lists payees by name.
  const days = Array.from({ length: dim }, (_, i) => ({ d: MK + "-" + p2(i + 1), spent: 0, inc: 0, ex: [], inn: [], up: [] }));
  A.forEach((t) => { const r = rdOf(t); if (!r.startsWith(MK)) return; const i = +r.slice(8) - 1; if (i < 0 || i >= dim) return; const D = days[i]; if (isOut(t)) { D.spent -= t.a; D.ex.push([dn(t), -t.a]); } else if (isIn(t)) { D.inc += t.a; D.inn.push([dn(t), t.a]); } });
  const rec = BI.filter((b) => !b.once && !b.irregular && b.flag != "canceled" && b.nx);
  rec.filter((b) => b.nx.toISOString().slice(0, 7) == MK && b.nx.toISOString().slice(0, 10) >= TODAY).forEach((b) => { const i = b.nx.getDate() - 1; if (days[i]) days[i].up.push([b.n, b.pred, b.idx]); });
  const nextBills = sum(rec.filter((b) => b.nx.toISOString().slice(0, 7) == nmk).map((b) => b.pred));
  const top = M.spend.filter(([c]) => !skip(c)).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const steps = monthSteps({ A, S, k, MK, TODAY, CC, inc, dn, start, end: startReal ? cash : null });
  const phase = day <= 5 ? "start" : dim - day <= 6 ? "end" : "mid";
  return { MK, today: TODAY, jarCov, rest, incRest: AT.inc, incLeft, payday: paydayOf(freeParts.free, incLeft, AT.inc), daysLeft, day, dim, pm, nmk, cash, inc, ex, cardsU, cardsPrev, cardPaid, cardsThis, cardsNow, cardsNext, sureJar, sureOwn: sure - sureJar, jarsUsed, nextCards, bankSpent: ex - cardsU, cardsOwed, sure, likely, likelyBank, likelyCard, nextBill, afterNext, endMonth, freeParts, afterSure, reallyNow, same, incs, bills, cardUp, billsTot, limitsLeft, end, toPay, heldEnd, top, start, startReal, startOn, over, risk, okB, above, below, w1, w0, days, nextBills, phase, steps, inJars: F.inJars, buffer: F.buffer, jarsHeld: F.jarsHeld || [], planned: R.total, plannedRows: R.rows.map((r) => ({ k: r.k, amt: r.amt, kind: r.kind })), over0: F.over, jarsOver: F.jarsOver || 0 };
}

// The day a card purchase leaves the bank: the charge date the card company gave (t.ch), or else the card's usual charge day,
// learned from its earlier purchases (the day of the month, and how many months after the purchase) or from the card bills
// paid from the bank. With nothing to learn from, the 10th of the next month.
function chargeDays(S, A, k, CC) {
  const count = (o, key, v) => { const x = (o[key] = o[key] || {}); x[v] = (x[v] || 0) + 1; };
  const most = (o) => { const e = Object.entries(o || {}).sort((a, b) => b[1] - a[1])[0]; return e ? +e[0] : NaN; };
  const day = {}, lag = {}, paid = {}, ci = cardInfo(S);
  A.forEach((t) => { const n = acctOf(t); if (!t.ch || !CC.has(n)) return; count(day, n, +t.ch.slice(8, 10)); count(lag, n, (+t.ch.slice(0, 4) - +t.d.slice(0, 4)) * 12 + +t.ch.slice(5, 7) - +t.d.slice(5, 7)); });
  // the card bills paid from the bank: the day they went out, for the card they name (or for every card when they name none)
  (S.tx || []).forEach((t) => { if (t.virtual || !k.isCp(t)) return; const c = cardOf(t, ci); count(paid, c || "*", +String(t.d).slice(8, 10)); });
  const out = {};
  CC.forEach((n) => { const d = most(day[n]) || most(paid[n]) || most(paid["*"]), l = most(lag[n]); out[n] = { day: d >= 1 ? d : 10, lag: l >= 0 ? l : 1 }; });
  return out;
}
const p2d = (n) => String(n).padStart(2, "0");
export function chargeOf(t, cd) {
  if (t.ch) return t.ch;
  const c = cd[acctOf(t)] || { day: 10, lag: 1 }, [y, mo] = t.d.split("-").map(Number);
  let x = new Date(y, mo - 1 + c.lag, 1); const last = (v) => new Date(v.getFullYear(), v.getMonth() + 1, 0).getDate();
  let s = `${x.getFullYear()}-${p2d(x.getMonth() + 1)}-${p2d(Math.min(c.day, last(x)))}`;
  if (s < t.d) { x = new Date(x.getFullYear(), x.getMonth() + 1, 1); s = `${x.getFullYear()}-${p2d(x.getMonth() + 1)}-${p2d(Math.min(c.day, last(x)))}`; }
  return s;
}
// A card bill is paid by the bank's payment row, not by its date: the bank may take it a few days late. LATE: how many days
// after its charge day a bill still waits for that row; EARLY: how many days before its charge day a payment can be for it.
const CARD_LATE = 10, CARD_EARLY = 4;
const dayDiff = (a, b) => (Date.parse(a) - Date.parse(b)) / 864e5;
// The card bills: each card's purchases grouped by the day they leave the bank (c), each with the bank's payment row that
// paid it (pay), when that row is there by today. A payment that names the card goes to that card's bill nearest its day;
// one that names no card goes to the bill closest in amount. due(D): the bill still has to leave the bank on day D:
// before its charge day, or after it while no payment row came yet (up to LATE days, for a card whose bills the bank's
// rows have paid before; a card paid from an account that is not connected never shows one, so its date counts).
function cardGroups({ S, A, k, CC, TODAY }) {
  const cd = chargeDays(S, A, k, CC), ci = cardInfo(S), grp = {};
  A.forEach((t) => {
    // the card's purchases and the refunds that came into it (money in sits in "to"): a refund lowers its bill
    const n = acctOf(t); if (!CC.has(n)) return; const c = chargeOf(t, cd), key = n + "|" + c;
    const g = (grp[key] = grp[key] || { n, c, a: 0, last: "", pay: null, tx: [] }); g.a -= t.a; g.tx.push(t); if (t.d > g.last) g.last = t.d;
  });
  const G = Object.values(grp).sort((a, b) => (a.c < b.c ? -1 : a.c > b.c ? 1 : 0));
  const pays = (S.tx || []).filter((t) => !t.virtual && k.isCp(t) && String(t.d) <= TODAY).map((t) => ({ t, n: cardOf(t, ci), d: String(t.d).slice(0, 10), a: -t.a }));
  const fits = (p, g) => { const x = dayDiff(p.d, g.c); return x >= -CARD_EARLY && x <= CARD_LATE; };
  pays.filter((p) => p.n).sort((a, b) => (a.d < b.d ? -1 : 1)).forEach((p) => {
    const g = G.filter((g) => !g.pay && g.n == p.n && fits(p, g)).sort((a, b) => Math.abs(dayDiff(p.d, a.c)) - Math.abs(dayDiff(p.d, b.c)))[0]; if (g) g.pay = p;
  });
  pays.filter((p) => !p.n).sort((a, b) => (a.d < b.d ? -1 : 1)).forEach((p) => {
    const g = G.filter((g) => !g.pay && fits(p, g)).sort((a, b) => Math.abs(a.a - p.a) - Math.abs(b.a - p.a) || Math.abs(dayDiff(p.d, a.c)) - Math.abs(dayDiff(p.d, b.c)))[0]; if (g) g.pay = p;
  });
  const followed = new Set(G.filter((g) => g.pay).map((g) => g.n));
  G.forEach((g) => { g.due = (D) => !(g.pay && g.pay.d <= D) && (g.c > D || (followed.has(g.n) && dayDiff(D, g.c) <= CARD_LATE)); });
  return { G, cd };
}
// Card purchases not paid yet, split into this month and later: the bills still to leave the bank this month (also one
// whose day came and whose payment row has not, so the bank balance still holds that money) and those charged after it
// extra: the bills still to come that are paid by credit card (stillToPay's card bills), on the card bill of their charge day
export function cardsDue({ S, A, k, CC, TODAY, MK, extra = [] }) {
  const endM = MK + "-31", by = {}, now = {}; let thisMonth = 0, later = 0;
  const G = cardGroups({ S, A, k, CC, TODAY }).G.concat(extra.map((b) => ({ n: b.card, c: b.cd, a: b.amt, due: () => true })));
  G.forEach((g) => {
    if (!g.due(TODAY)) return; const n = g.n, c = g.c;
    if (c <= endM) { thisMonth += g.a; const x = (now[n + "|" + c] = now[n + "|" + c] || { n, a: 0, d: c }); x.a += g.a; return; }
    later += g.a; const x = (by[n] = by[n] || { n, a: 0, d: c }); x.a += g.a; if (c < x.d) x.d = c;
  });
  // now: each card's bill still to come this month, by its day; next: each card's purchases charged after this month,
  // with the first day they leave the bank
  return { thisMonth, later, now: Object.values(now).filter((x) => x.a >= 0.5).sort((a, b) => (a.d < b.d ? -1 : 1)), next: Object.values(by).sort((a, b) => b.a - a.a) };
}

// The month as it happened, in date order: the days money came in, the days a credit card bill was taken from the bank,
// and the spending in between. Each step carries the bank balance before and after it, so the steps add up from the start
// of the month to today's balance (start + money in + money back − paid from the accounts − card bills = today).
// Small amounts in and money back are counted inside the spending around them, and each spending step says what came in
// during it (small: money in, back: money back, on the cards too); with very many big days, only the biggest stand on their own.
const BIG_IN = 0.08, MIN_IN = 200, MAX_MARKS = 8;
// end: today's balance, when the start is a saved balance: what the steps do not explain becomes one more step ("other").
export function monthSteps({ A, S, k, MK, TODAY, CC, inc, dn, start, end = null }) {
  const inMonth = (d) => d.startsWith(MK) && d <= TODAY;
  // money in that reached the bank and wallet accounts, and money back: into those accounts (it raises the balance) or on a
  // credit card (it lowers the card's bill instead: chargeDays below)
  const ins = A.filter((t) => t.a > 0 && !t.back && !CC.has(t.to) && inMonth(rdOf(t))), outs = A.filter((t) => t.a < 0 && inMonth(rdOf(t)));
  const backs = A.filter((t) => t.back && inMonth(rdOf(t)));
  const cps = (S.tx || []).filter((t) => !t.virtual && k.isCp(t) && inMonth(String(t.d)));
  // the days that stand on their own: money in (one per day, when it is big enough) and card bills (one per day)
  const byDay = (L, d) => { const o = {}; L.forEach((t) => { const x = d(t); (o[x] = o[x] || []).push(t); }); return Object.entries(o).map(([d, L0]) => ({ d, tx: L0, a: L0.reduce((s, t) => s + Math.abs(t.a), 0) })); };
  let marks = byDay(ins, rdOf).filter((x) => x.a >= Math.max(MIN_IN, inc * BIG_IN)).map((x) => ({ ...x, kind: "in" }))
    .concat(byDay(cps, (t) => String(t.d)).filter((x) => x.a >= 1).map((x) => ({ ...x, kind: "card" })));
  if (marks.length > MAX_MARKS) marks = [...marks].sort((a, b) => b.a - a.a).slice(0, MAX_MARKS);
  // money in comes before a card bill on the same day
  marks.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.kind == "in" ? -1 : 1));
  const big = new Set(marks.flatMap((x) => x.tx));
  const steps = []; let bal = start, from = MK + "-01";
  const prevDay = (d) => { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() - 1); return x.toISOString().slice(0, 10); };
  // the spending from one day to another, with the small amounts in and any card bill not shown on its own
  const spend = (a, b) => {
    const on = (t) => { const d = rdOf(t); return d >= a && d <= b; };
    const out = outs.filter(on), bank = out.filter((t) => !CC.has(t.from)).reduce((s, t) => s - t.a, 0), card = out.filter((t) => CC.has(t.from)).reduce((s, t) => s - t.a, 0);
    const small = ins.filter((t) => on(t) && !big.has(t)).reduce((s, t) => s + t.a, 0);
    const bk = backs.filter(on), backBank = bk.filter((t) => !CC.has(t.to)).reduce((s, t) => s + t.a, 0), back = bk.reduce((s, t) => s + t.a, 0);
    const cpx = cps.filter((t) => !big.has(t) && String(t.d) >= a && String(t.d) <= b).reduce((s, t) => s - t.a, 0);
    if (bank + card + small + back + cpx < 1) return;
    // the biggest categories, of all of it, of what the accounts paid, and of what went on credit cards
    const topOf = (L) => { const c0 = {}; L.forEach((t) => { const c = t.c || "Uncategorized"; c0[c] = (c0[c] || 0) - t.a; }); return Object.entries(c0).sort((x, y) => y[1] - x[1]).slice(0, 3); };
    const top = topOf(out), topBank = topOf(out.filter((t) => !CC.has(t.from))), topCard = topOf(out.filter((t) => CC.has(t.from)));
    const b0 = bal; bal += small + backBank - bank - cpx;
    steps.push({ kind: "spend", from: a, to: b, a: bank + card, bank, card, small, back, backBank, cps: cpx, top, topBank, topCard, b0, b1: bal });
  };
  marks.forEach((x) => {
    if (x.d > from) spend(from, prevDay(x.d));
    const b0 = bal; bal += x.kind == "in" ? x.a : -x.a;
    // sal: the day's money in is all salary (lib/moneyIn.js), so the step can name it
    steps.push({ kind: x.kind, from: x.d, to: x.d, a: x.a, who: x.tx.map((t) => [dn(t), Math.abs(t.a), t.id]).sort((p, q) => q[1] - p[1]), ...(x.kind == "in" && x.tx.every((t) => t.sal) ? { sal: true } : {}), b0, b1: bal });
    if (x.d >= from) from = x.d;
  });
  if (from <= TODAY) spend(from, TODAY);
  // whole amounts that still add up on the page: balances rounded, and each step's change taken from them
  // (the money out of the accounts is what is left over once the other lines are rounded)
  // what is already spent on credit cards at the end of each step but has not left the bank yet: the balance after it is
  // what is really yours once those card bills come. Purchases are grouped by card and by the day they leave the bank; a
  // group whose bill the bank has paid (its payment row, cardGroups) counts the amount actually paid, the rest count their
  // purchases. A bill whose day came stays owed until its payment row does. Refunds lower a group.
  const { G, cd } = cardGroups({ S, A, k, CC, TODAY });
  // what each card bill paid for: the purchases of the groups its payments were matched to
  steps.forEach((x) => {
    if (x.kind != "card") return;
    const L0 = G.filter((g) => g.pay && x.who.some((w) => w[2] == g.pay.t.id)).flatMap((g) => g.tx), ds = L0.map((t) => String(t.d)).sort();
    x.buys = { n: L0.length, a: Math.round(L0.reduce((s, t) => s - t.a, 0)), first: ds[0] || "", last: ds[ds.length - 1] || "", list: L0.filter((t) => t.a < 0).map((t) => [dn(t), -t.a, t.id]).sort((p, q) => q[1] - p[1]) };
  });
  const buys = A.filter((t) => CC.has(acctOf(t))).map((t) => ({ key: acctOf(t) + "|" + chargeOf(t, cd), d: t.d, a: -t.a }));
  steps.forEach((x) => {
    // a day's card purchases belong to the spending step of that day, so money in and card bills look at the day before
    const cut = x.kind == "spend" ? x.to : prevDay(x.from);
    let owed = 0, billed = 0; const due = {}, add = (d, a) => (due[d] = (due[d] || 0) + a);
    G.forEach((g) => {
      if (!g.due(x.to)) return;
      if (g.pay && g.last <= cut) { owed += g.pay.a; billed += g.pay.a; add(g.pay.d, g.pay.a); return; }
      const v = buys.reduce((s, b) => (b.key == g.n + "|" + g.c && b.d <= cut ? s + b.a : s), 0);
      owed += v; add(g.c, v);
    });
    // what is due on each day, in whole shekels that add up to the total
    x.billed = Math.round(billed); x.owed = Math.max(0, x.billed + Math.round(owed - billed));
    const days = Object.keys(due).filter((d) => due[d] >= 0.5).sort(), parts = roundParts(days.map((d) => due[d]), x.owed);
    x.due = days.map((d, i) => ({ d, a: parts[i] })).filter((o) => o.a >= 1);
  });
  // money in and card bills keep their own rounded amount (the same as everywhere else on the page), and the balances
  // follow from it; a spending step takes up the rounding, as its balance after it is rounded on its own
  let b = Math.round(start);
  steps.forEach((x, i) => {
    x.b0 = b;
    if (x.kind != "spend" && i < steps.length - 1) { x.a = Math.round(x.a); x.b1 = b + (x.kind == "in" ? x.a : -x.a); }
    else x.b1 = Math.round(x.b1);
    b = x.b1;
    if (x.kind != "spend") x.a = Math.abs(x.b1 - x.b0);
    else { x.small = Math.round(x.small); x.back = Math.round(x.back); x.backBank = Math.round(x.backBank); x.cps = Math.round(x.cps); x.card = Math.round(x.card); x.bank = x.b0 - x.b1 + x.small + x.backBank - x.cps; x.a = Math.round(x.a); }
  });
  // with a saved start, what the steps above do not show (money between your own accounts, changes in the value of foreign
  // money, corrections by the bank, entries left out) is one more step, so the steps still end at today's balance
  const d = end == null ? 0 : Math.round(end) - b, p = steps[steps.length - 1];
  if (Math.abs(d) >= 1) steps.push({ kind: "other", from: MK + "-01", to: TODAY, a: Math.abs(d), up: d > 0, b0: b, b1: b + d, billed: p ? p.billed : 0, owed: p ? p.owed : 0, due: p ? p.due : [] });
  return steps;
}

// What is really yours today: the money in your accounts, less the card purchases not paid yet and the payments still due
// this month, each rounded once to whole shekels (as shown), so the sum adds up by eye. Home's "Current" money flow, Recap's
// "Your money after known payments" and the Forecast's "Your amount now" all use this one sum.
export const reallyYours = (cash, cards, due) => Math.round(cash) - Math.round(Math.max(0, cards)) - Math.round(due);

// Whole amounts for the parts of a total that add up to the rounded total (each part rounded alone can be off by one):
// round everything down, then give the missing ones to the parts that lost the most.
export function roundParts(vals, total) {
  const fl = vals.map(Math.floor), need = Math.round(total) - fl.reduce((s, x) => s + x, 0);
  vals.map((v, i) => [v - fl[i], i]).sort((a, b) => b[0] - a[0]).slice(0, Math.max(0, need)).forEach(([, i]) => fl[i]++);
  return fl;
}

// The parts of the page, in the order the money moves: began, the steps of the month, left today, still to pay this month,
// the next card bill, how it is split once those are known (jars and free), what needs a look, the end.
// Parts with nothing to say are left out.
// The steps of the month (monthSteps) sit between the start and today, as "step:0", "step:1" ….
const ORDER = ["hero", "start", "steps", "now", "ahead", "nextcard", "split", "attn", "end", "next"];
export const hasStart = (m) => isFinite(m.start) && Math.abs(m.start) >= 1;
export function recapParts(m) {
  const on = { hero: true, start: hasStart(m), now: true, split: m.inJars + m.buffer >= 1, ahead: m.sure >= 1, nextcard: m.cardsNext >= 1, attn: true, end: true, next: m.nextBill + m.nextBills >= 1 };
  return ORDER.flatMap((p) => (p == "steps" ? m.steps.map((_, i) => "step:" + i) : on[p] ? [p] : []));
}

// The bars of "So far this month": one per day; a single huge day is capped so the others still show (dayBars).
export function dayBarHeights(m, Hh = 96) {
  const v0 = m.days.slice(0, m.day).map((d) => d.spent), sd = [...v0].sort((a, b) => b - a), mx = Math.max(1, sd[0] > sd[1] * 2.2 ? sd[1] * 1.3 : sd[0] || 1);
  return m.days.map((_, i) => (i < m.day ? Math.min(Hh, Math.max(v0[i] > 0 ? 5 : 2, ((v0[i] || 0) / mx) * (Hh - 6))) : null));
}
