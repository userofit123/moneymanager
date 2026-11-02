// How long the money in your accounts would last at your usual spending, if no money came in: Home's "In your accounts"
// line under the amount. Your usual spending in a month: the average money out over the same last full months as Years
// ahead's average (keptEachMonth, the months chosen in "Based on the last" on the Forecast page), from the same counted rows
// as Activity and Home (no transfers between your own accounts, card bill payments, upcoming rows or rows left out).
import { keptEachMonth } from "./yearsAhead.js";

// The average money out in a full month, in whole shekels (null with no full month yet, or when nothing went out).
// FH: lib/jars.js forecastHistory; n: how many of the last full months.
export function spentEachMonth(FH, n = 3) {
  const { months } = keptEachMonth(FH, n);
  if (!months.length) return { avg: null, months };
  const tot = months.reduce((s, k) => s + (FH.exp[FH.keys.indexOf(k)] || 0), 0), avg = Math.round(tot / months.length);
  return { avg: avg >= 1 ? avg : null, months };
}

// How long `cash` lasts at `perMonth` a month, rounded for a short line: { less: true } under one month, { months } up to
// 24 months (rounded to whole months), then { years } (rounded to whole years). null when there is nothing to say:
// no money in the accounts, or no spending to divide by.
export const MAX_MONTHS = 24;
export function moneyLasts(cash, perMonth) {
  cash = Math.round(+cash || 0); perMonth = Math.round(+perMonth || 0);
  if (cash <= 0 || perMonth <= 0) return null;
  const m = cash / perMonth;
  if (m < 1) return { less: true, exact: m };
  const months = Math.round(m);
  return months <= MAX_MONTHS ? { months, exact: m } : { years: Math.round(m / 12), exact: m };
}
