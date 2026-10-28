// The app's key numbers in one list: each amount worked out and rounded once (by homeModel, recapModel and forecastModel),
// with its name, short name and tooltip (texts in the "num" section of locales/en.json and he.json). Pages read the amounts
// and the names from here, so the same number has the same name everywhere.
// H: homeModel; FC: forecastModel for the same moment (its R is the recapModel the forecast starts from).
// Each entry: { id, a: whole shekels, name, short?, tip?, mk? } (mk: the month the name speaks of, for {month}).

import { addM } from "./home.js";

// The groups and their entries, in the order they are shown. name / short / tip are text keys.
// Known now and Your plans add up row by row, and so do this month so far and next month: an entry's first character
// says how it counts ("−" taken off, "+" added, "=" the result); "^" repeats the result of the group before as the start.
// Predictions are only in the two "Likely" groups, and only their names say "likely".
export const NUM_GROUPS = [
  ["known", ["inAccounts", "-cardsUnpaid", "-upcoming", "=afterKnown"]],
  ["plans", ["^afterKnown", "-leftBudgets", "-putAside", "=free"]],
  ["soFar", ["moneyIn", "-moneyOut", "=saved"]],
  ["likelyThis", ["likely", "endMonth"]],
  ["likelyNext", ["^endMonth", "+nextIn", "-nextOut", "=endNext"]],
];
const OPS = { "-": "−", "+": "+", "=": "=", "^": "" };
const split = (e) => (OPS[e[0]] != null ? [e[0], e.slice(1)] : ["", e]);
// the text keys of each entry: its name, and its short name when it has one (endNext uses the same words as endMonth)
const NAMES = { cardsUnpaid: 1, upcoming: 1, afterKnown: 1, moneyIn: 1, moneyOut: 1, saved: 1, likely: 1, endMonth: 1, endNext: 1 };
const nameKey = (id) => (id == "endNext" ? "endMonth" : id);
export const numText = (id) => { const k = nameKey(id); return { name: "num." + k, short: NAMES[id] ? "num." + k + "S" : null, tip: "num." + id + "Tip" }; };

export function keyNumbers(H, FC) {
  const F = H.flow, K = H.kpi, d = FC.d, next = d.shown.next, MK = H.MK, r = Math.round;
  const a = {
    inAccounts: r(F.cash), // d.eom.bank
    cardsUnpaid: r(Math.max(0, F.cards || 0)), // d.eom.cards
    upcoming: r((F.up || []).reduce((s, b) => s + b.amt, 0)), // d.eom.due
    afterKnown: F.really, // inAccounts − cardsUnpaid − upcoming
    leftBudgets: F.toCome, // what the budgets still allow this month (Home's Planned "Left in your budgets")
    putAside: F.aside, // jars (less what they pay of the upcoming payments) + the safety cushion
    free: F.freeRaw, // afterKnown − leftBudgets − putAside (below zero: short by)
    moneyIn: r(K.inc),
    moneyOut: r(K.ex),
    saved: K.net, // moneyIn − moneyOut
    likely: d.eom.usual, // what usually still goes out this month after today (recapModel's likely)
    endMonth: d.endMonth, // inAccounts − cardsUnpaid − upcoming − likely + the income still to come
    nextIn: next.incT,
    nextOut: next.outT,
    endNext: next.end, // endMonth + nextIn − nextOut
  };
  const mk = { likely: MK, endMonth: MK, nextIn: addM(MK, 1), nextOut: addM(MK, 1), endNext: addM(MK, 1) };
  const item = (x) => ({ id: x, a: a[x], ...numText(x), ...(mk[x] ? { mk: mk[x] } : {}) });
  // op: "−", "+" or "=" before the row; from: the row repeats the group before's result, as this group's start
  const groups = NUM_GROUPS.map(([id, es]) => ({ id, name: "num.g." + id, items: es.map((e) => { const [o, x] = split(e); return { ...item(x), ...(o == "^" ? { from: 1 } : o ? { op: OPS[o] } : {}) }; }) }));
  return { groups, byId: Object.fromEntries(groups.flatMap((g) => g.items).filter((x) => !x.from).map((x) => [x.id, x])), a };
}
