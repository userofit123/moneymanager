// Free to use before payday. Right before your usual income comes in, Free to use can be below zero (a card bill already
// due, the salary not in yet). When income still usually comes this month, this works out what Free to use will likely be
// once it arrives, so the pages can show it calmly instead of as a shortage.
// free: Free to use in whole shekels (below zero: short by); incLeft: the likely money in for the rest of the month (whole
// shekels, recapModel's incLeft, the key numbers' "Likely money in"); inc: those incomes ({ k, a, days }, afterToday's inc).
// Gives null when Free to use is not below zero or no income is still expected this month. Otherwise:
// { free, inc, after: free + inc, covered: the income covers it all, missing: what would still be missing after it,
//   from, to: the earliest and latest day of the month the biggest of those incomes came on in the months learned from }.
export function paydayOf(free, incLeft, inc = []) {
  if (!(free <= -1) || !(incLeft >= 1)) return null;
  const after = free + incLeft, main = [...inc].sort((a, b) => b.a - a.a)[0], days = (main && main.days) || [];
  return { free, inc: incLeft, after, covered: after >= 0, missing: after < 0 ? -after : 0, from: days.length ? days[0] : null, to: days.length ? days[days.length - 1] : null };
}
