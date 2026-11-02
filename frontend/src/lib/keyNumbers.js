// The app's key numbers in one list: each amount worked out and rounded once (by homeModel, recapModel and forecastModel),
// with its name, short name and tooltip (texts in the "num" section of locales/en.json and he.json). Pages read the amounts
// and the names from here, so the same number has the same name everywhere.
// H: homeModel; FC: forecastModel for the same moment (its R is the recapModel the forecast starts from).
// Each entry: { id, a: whole shekels, name, short?, tip?, mk? } (mk: the month the name speaks of, for {month}).

import { addM } from "./home.js";

// The groups and their entries, in the order they are shown. name / short / tip are text keys.
// Known now and Your plans add up row by row, and so do this month so far and next month: an entry's first character
// says how it counts ("−" taken off, "+" added, "=" the result); "^" repeats the result of the group before as the start.
// "·" is a part of the row above it, shown under it and not counted again (only when the row has two parts that are both there).
// Predictions are only in the two "Likely" groups, and only their names say "likely".
export const NUM_GROUPS = [
  ["known", ["inAccounts", "-cardsUnpaid", "·cardBills", "·cardsLater", "-upcoming", "=afterKnown"]],
  ["plans", ["^afterKnown", "-leftBudgets", "-putAside", "=free"]],
  ["soFar", ["moneyIn", "-moneyOut", "=saved"]],
  ["likelyThis", ["^afterKnown", "+incLeft", "-likely", "=endMonth"]],
  ["likelyNext", ["^endMonth", "+nextIn", "-nextOut", "=endNext"]],
];
const OPS = { "-": "−", "+": "+", "=": "=", "^": "", "·": "" };
const split = (e) => (OPS[e[0]] != null ? [e[0], e.slice(1)] : ["", e]);
// the text keys of each entry: its name, and its short name when it has one (endNext uses the same words as endMonth)
const NAMES = { cardsUnpaid: 1, cardBills: 1, cardsLater: 1, upcoming: 1, incLeft: 1, afterKnown: 1, moneyIn: 1, moneyOut: 1, saved: 1, likely: 1, endMonth: 1, endNext: 1 };
const nameKey = (id) => (id == "endNext" ? "endMonth" : id);
export const numText = (id) => { const k = nameKey(id); return { name: "num." + k, short: NAMES[id] ? "num." + k + "S" : null, tip: "num." + id + "Tip" }; };

export function keyNumbers(H, FC) {
  const F = H.flow, K = H.kpi, d = FC.d, next = d.shown.next, MK = H.MK, r = Math.round;
  const a = {
    inAccounts: r(F.cash), // d.eom.bank
    cardsUnpaid: r(Math.max(0, F.cards || 0)), // d.eom.cards
    // its two parts: the card bills still to leave the bank this month, and the purchases on card bills after this month
    // (whole shekels that add up to it: the later part is rounded, the bills this month are the rest, as on Recap)
    cardBills: r(Math.max(0, F.cards || 0)) - r(Math.max(0, F.cardsLater || 0)),
    cardsLater: r(Math.max(0, F.cardsLater || 0)),
    upcoming: r((F.up || []).reduce((s, b) => s + b.amt, 0)), // d.eom.due
    afterKnown: F.really, // inAccounts − cardsUnpaid − upcoming
    leftBudgets: F.toCome, // what the budgets still allow this month (Home's Planned "Left in your budgets")
    putAside: F.aside, // jars (less what they pay of the upcoming payments) + the safety cushion
    free: F.freeRaw, // afterKnown − leftBudgets − putAside (below zero: short by)
    moneyIn: r(K.inc),
    moneyOut: r(K.ex),
    saved: K.net, // moneyIn − moneyOut
    incLeft: d.eom.inc, // the income that usually still comes this month after today (recapModel's incLeft)
    likely: d.eom.usual, // what usually still goes out this month after today (recapModel's likely)
    endMonth: d.endMonth, // afterKnown + incLeft − likely
    nextIn: next.incT,
    nextOut: next.outT,
    endNext: next.end, // endMonth + nextIn − nextOut
  };
  const mk = { incLeft: MK, likely: MK, endMonth: MK, nextIn: addM(MK, 1), nextOut: addM(MK, 1), endNext: addM(MK, 1) };
  const item = (x) => ({ id: x, a: a[x], ...numText(x), ...(mk[x] ? { mk: mk[x] } : {}) });
  // op: "−", "+" or "=" before the row; from: the row repeats the group before's result, as this group's start
  // part: a part of the row above, shown only when that row has two parts that are both there
  const all = NUM_GROUPS.map(([id, es]) => ({ id, name: "num.g." + id, items: es.map((e) => { const [o, x] = split(e); return { ...item(x), ...(o == "^" ? { from: 1 } : o == "·" ? { part: 1 } : o ? { op: OPS[o] } : {}) }; }) }));
  const twoParts = a.cardBills >= 1 && a.cardsLater >= 1;
  const groups = all.map((g) => ({ ...g, items: g.items.filter((x) => !x.part || twoParts) }));
  // Free to use below zero while income still usually comes this month (lib/payday.js, worked out once in recapModel):
  // a line under it with what it will likely be after payday (not counted in the sum)
  const payday = d.R0.payday || null;
  if (payday) groups.find((g) => g.id == "plans").items.push({ id: "afterPay", a: payday.after, name: "num.afterPay", short: null, tip: "num.afterPayTip", part: 1, pay: 1 });
  return { groups, byId: Object.fromEntries(all.flatMap((g) => g.items).filter((x) => !x.from).map((x) => [x.id, x])), a, payday };
}
