// Years ahead (Forecast): what your money could add up to over the years, and what it takes to reach an amount by an age.
// Plain numbers in, plain numbers out; nothing here changes the data.
// The rules:
// - It goes month by month: each month the money first grows by that month's share of the yearly growth, then the month's
//   amount set aside is added.
// - A month's share of the yearly growth is (1 + growth)^(1/12) − 1, so twelve months together grow by exactly the yearly growth.
// - It looks at most 40 years ahead (MAX_YEARS), and never past age 100 (MAX_AGE) when an age is known.
// - Amounts are rounded once here, the way they are shown ("about"): under ₪10,000 to the nearest ₪100, above it to the nearest
//   ₪1,000. A monthly amount needed is rounded up to the next ₪10, so it is always enough. Ages and years are worked out once
//   here too, and the sentences, the chart and "sooner / later" all use those same numbers.

export const MAX_YEARS = 40;
export const MAX_AGE = 100;
const rateOf = (g) => Math.pow(1 + Math.max(-0.99, +g || 0), 1 / 12) - 1;

// What you really kept each month: the average of money in − money out over the last n full months (this month is left out
// because it is not over, and so are months before the data starts). FH: lib/jars.js forecastHistory (the same counted rows as
// Activity and Home: no transfers between your own accounts, card bill payments, upcoming rows, balance notes or rows left out;
// money back is neither). Returns { avg (whole shekels, null with no full month yet), months: their keys, oldest first }.
export function keptEachMonth(FH, n = 3) {
  if (!FH || !FH.keys) return { avg: null, months: [] };
  const last = FH.last ?? FH.keys.length - 1, idx = [];
  for (let j = Math.max(FH.first || 0, last - Math.max(1, n | 0)); j < last; j++) idx.push(j);
  if (!idx.length) return { avg: null, months: [] };
  const tot = idx.reduce((s, j) => s + (FH.inc[j] || 0) - (FH.exp[j] || 0), 0);
  return { avg: Math.round(tot / idx.length), months: idx.map((j) => FH.keys[j]) };
}

// The money after `months` months: start grows, and `monthly` is added at the end of each month.
export function amountAfter(start, monthly, g, months) {
  const r = rateOf(g), n = Math.max(0, Math.round(months || 0)), s = +start || 0, m = +monthly || 0;
  if (!n) return s;
  if (Math.abs(r) < 1e-12) return s + m * n;
  const f = Math.pow(1 + r, n);
  return s * f + (m * (f - 1)) / r;
}

// How many months until the money reaches `goal`: 0 when it is there already, null when not within `max` months.
export function monthsToReach(start, monthly, g, goal, max = MAX_YEARS * 12) {
  let b = +start || 0; const r = rateOf(g), m = +monthly || 0, T = +goal || 0;
  if (b >= T) return 0;
  for (let k = 1; k <= max; k++) { b = b * (1 + r) + m; if (b >= T - 0.005) return k; }
  return null;
}

// The amount to set aside each month to reach `goal` in `months` months (0 when the start alone gets there; null with no time left).
export function monthlyFor(start, g, goal, months) {
  const n = Math.round(months || 0), s = +start || 0, T = +goal || 0;
  if (!(n > 0)) return null;
  if (s >= T) return 0;
  const r = rateOf(g);
  if (Math.abs(r) < 1e-12) return Math.max(0, (T - s) / n);
  const f = Math.pow(1 + r, n);
  return Math.max(0, ((T - s * f) * r) / (f - 1));
}

// The money at the start of each year: [now, after 1 year, …, after `years` years].
export const pathOf = (start, monthly, g, years) => Array.from({ length: Math.max(0, years) + 1 }, (_, y) => amountAfter(start, monthly, g, y * 12));

// "About" an amount, as shown: rounded once.
export const about = (v) => { const a = Math.abs(+v || 0), u = a < 10000 ? 100 : 1000; return Math.sign(+v || 0) * Math.round(a / u) * u || 0; };
// A monthly amount needed, rounded up to the next ₪10.
export const aboutUp = (v) => (v == null ? null : Math.ceil(Math.max(0, v) / 10) * 10);
// A round number at or above v: 1, 2, 2.5 or 5 times a power of ten.
export const niceUp = (v) => { if (!(v > 0)) return 0; const p = Math.pow(10, Math.floor(Math.log10(v))); return [1, 2, 2.5, 5, 10].map((f) => f * p).find((x) => x >= v - 1e-9); };

// The "Set aside each month" slider: from ₪0 to a round amount above 3 times your average, at least ₪5,000. It depends only on
// your average (never on the amount chosen, the goal or the age), so it stays the same while any choice changes. A larger
// amount typed in the box is kept; the slider then sits at its end.
export function sliderOf(kept) {
  const max = niceUp(Math.max(5000, 3 * Math.max(0, +kept || 0)));
  return { max, step: max <= 10000 ? 50 : max <= 50000 ? 100 : max <= 250000 ? 500 : 1000 };
}

// The age to aim for when none was chosen: 50, or a round age at least 5 years away (within the ages that can be chosen).
export const goalAgeOf = (age) => Math.min(Math.max(age + 1, Math.min(MAX_AGE, age + MAX_YEARS)), Math.max(50, Math.ceil((age + 5) / 5) * 5));

// Everything Years ahead shows, from:
// start: the money in your accounts today (Home's "In your accounts"); pace: what you really kept in an average full month
// (keptEachMonth; below ₪0 when more went out than came in); age: your age now (0 when not given); pick: the choices made on
// the page { m: each month, goal, at: the age, yrs: the years from now (used when no age is given), g: growth a year as a
// fraction } (missing = default).
// Every sentence describes the choices as they are now (m); "kept" is your average (never below ₪0), which m starts at and
// which "Back to my average" goes back to.
export function yearsAheadModel({ start = 0, pace = 0, age = 0, pick = {} } = {}) {
  start = Math.round(+start || 0); pace = Math.round(+pace || 0);
  const hasAge = age > 0, p = pick || {}, kept = Math.max(0, pace);
  const num = (v, d) => (v === "" || v == null || !isFinite(+v) ? d : +v);
  const m = Math.max(0, Math.round(num(p.m, kept)));
  const goal = Math.max(1, Math.round(num(p.goal, 1000000)));
  const g = Math.min(0.15, Math.max(0, num(p.g, 0)));
  const lo = hasAge ? age + 1 : 1, hi = hasAge ? Math.max(age + 1, Math.min(MAX_AGE, age + MAX_YEARS)) : MAX_YEARS;
  const at = Math.min(hi, Math.max(lo, Math.round(hasAge ? num(p.at, goalAgeOf(age)) : num(p.yrs, 15))));
  const years = hasAge ? at - age : at;
  const lim = 12 * (hasAge ? Math.max(1, Math.min(MAX_YEARS, MAX_AGE - age)) : MAX_YEARS); // the most months looked ahead
  // when the goal is reached after k months: the years from now, rounded (at least 1), and the age then (your age now + those
  // years: the birthday is not known, so on average you are half a year past your age now); `soon` when within the first year
  const when = (k) => { if (k == null) return null; const y = Math.max(1, Math.round(k / 12)); return { k, soon: k > 0 && k < 12, age: hasAge ? age + y : null, years: y }; };
  const shownAt = (r) => (r == null ? null : hasAge ? r.age : r.years);

  const total = about(amountAfter(start, m, g, years * 12)); // by the age (or in the years) chosen
  const reach = when(monthsToReach(start, m, g, goal, lim));
  const need = aboutUp(monthlyFor(start, g, goal, years * 12)); // each month, for the goal by the age chosen
  const changed = m !== kept;
  // the same at your average, only to say how much sooner or later the amount chosen gets there: the difference between the
  // two ages (or years) as they would be shown, so it always matches them; "months" when both are shown the same
  const base = when(monthsToReach(start, kept, g, goal, lim));
  let sooner = null;
  if (changed && reach && reach.k > 0) {
    if (!base) sooner = { never: true };
    else if (base.k !== reach.k) { const d = shownAt(base) - shownAt(reach); sooner = d != 0 ? { n: d } : { months: base.k > reach.k ? 1 : -1 }; }
  }

  // the chart: one point a year, from now to the age chosen, or to when the goal is reached if that is later (at least 5 years);
  // the line at your average only when the amount chosen is different
  const span = Math.min(lim / 12, Math.max(Math.min(5, lim / 12), years, reach ? Math.ceil(reach.k / 12) : 0));
  const chart = { years: span, mine: pathOf(start, m, g, span), pace: changed ? pathOf(start, kept, g, span) : null, goal, at: years, hit: reach ? reach.k / 12 : null, age: hasAge ? age : null };

  return { start, pace, kept, age: hasAge ? age : 0, hasAge, m, goal, g, at, lo, hi, years, total, reach, need, needDiff: need == null ? null : need - m, sooner, changed, chart, slider: sliderOf(kept) };
}

// The chart's shapes for one width: lines through the points, the goal line, where the goal is reached and the labels on the
// left (amounts) and along the bottom (ages or years).
export function yearsChartOf(c, W = 760, Ht = 240) {
  const Pl = 50, Pr = 14, Pt = 18, Pb = 28, n = c.years || 1, pace = c.pace || null;
  // the amounts on the left are round steps (1, 2, 2.5 or 5 times a power of ten), about three or four of them
  const all = [...c.mine, ...(pace || []), c.goal, 0], top = Math.max(...all) * 1.04 || 1, mn0 = Math.min(0, ...all);
  const raw = (top - mn0) / 3.5, mag = Math.pow(10, Math.floor(Math.log10(raw))), step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((x) => x >= raw);
  const mn = Math.floor(mn0 / step) * step, mx = Math.ceil(top / step) * step;
  const X = (y) => Pl + (y / n) * (W - Pl - Pr), Y = (v) => Pt + (1 - (v - mn) / (mx - mn || 1)) * (Ht - Pt - Pb);
  const line = (a) => a.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const short = (v) => { const a = Math.abs(v); return (v < 0 ? "−" : "") + (a >= 1e6 ? +(a / 1e6).toFixed(a >= 1e7 ? 0 : 2) + "M" : a >= 1000 ? Math.round(a / 1000) + "k" : Math.round(a)); };
  const ticks = Array.from({ length: Math.round((mx - mn) / step) + 1 }, (_, k) => mn + k * step).map((v) => ({ y: Y(v), label: "₪" + short(v) }));
  const every = Math.max(1, Math.ceil((n * 46) / (W - Pl - Pr)));
  const xs = Array.from({ length: n + 1 }, (_, i) => i).filter((i) => i % every == 0 || i == n).filter((i, j, a) => i == n || a[j + 1] == null || a[j + 1] - i >= every * 0.6);
  // where the drawn line (straight between the yearly points) crosses the goal, so the dot sits on the line
  let hit = null;
  if (c.hit != null && c.hit <= n) {
    const v = c.mine, i = v.findIndex((x) => x >= c.goal);
    const at = i <= 0 ? 0 : i - 1 + (c.goal - v[i - 1]) / (v[i] - v[i - 1] || 1);
    hit = { x: X(at), y: Y(c.goal) };
  }
  return { W, Ht, Pl, Pr, Pt, Pb, X, Y, mine: line(c.mine), pace: pace ? line(pace) : null, area: `${X(0)},${Y(Math.max(0, mn))} ${line(c.mine)} ${X(n)},${Y(Math.max(0, mn))}`, goalY: Y(c.goal), atX: c.at <= n ? X(c.at) : null, ticks, xs: xs.map((i) => ({ i, x: X(i) })), hit, pts: c.mine.map((v, i) => ({ i, x: X(i), y: Y(v), v, p: pace ? pace[i] : null })) };
}

// A saved goal (Years ahead → Save this goal, kept in the data as cfg.goal):
// { goal: the amount, age: the age to have it by (null when no age was known), yrs: the years from the day it was saved,
//   m: the amount set aside each month, g: growth a year, d: the day it was saved ("YYYY-MM-DD") }.
const isoDay = (t) => t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
export const goalOf = (Y, today) => ({ goal: Y.goal, age: Y.hasAge ? Y.at : null, yrs: Y.years, m: Y.m, g: Y.g, d: isoDay(today) });
// whole months from the day it was saved to today
const monthsSince = (d, t) => { const [y, m, dd] = String(d || "").split("-").map(Number); if (!y) return 0; return Math.max(0, (t.getFullYear() - y) * 12 + t.getMonth() - (m - 1) - (t.getDate() < dd ? 1 : 0)); };
// The choices a saved goal stands for today (the `pick` of yearsAheadModel): its age when both it and your age are known;
// otherwise the years still left from the day it was saved (at least 1), as an age when your age is known now.
export function goalPick(G, age, today) {
  if (!G) return null;
  const p = { goal: G.goal, m: G.m, g: G.g };
  if (age > 0 && G.age) p.at = G.age;
  else { const left = Math.max(1, Math.round(((+G.yrs || 0) * 12 - monthsSince(G.d, today)) / 12)); if (age > 0) p.at = age + left; else p.yrs = left; }
  return p;
}
// Whether the choices on the page (Y, a yearsAheadModel) are the saved goal's (S, the model of goalPick): the same goal, amount
// each month, age (or years) and growth.
export const sameGoal = (Y, S) => !!S && Y.goal === S.goal && Y.m === S.m && Y.at === S.at && Y.g === S.g;
// Home's goal card: the saved goal, how much of it you have today, and whether setting aside your average gets there in time.
// start: the money in your accounts today (Home's "In your accounts"); pace: your average (keptEachMonth); age: your age now.
// Returns { goal, at, years, hasAge, start, kept, pc (0–100), have (you have it already), on (on track), reach (when your
// average gets there, as in yearsAheadModel, or null), need (each month to have it in time, rounded up to ₪10), g }.
export function goalStatus({ start = 0, pace = 0, age = 0, G, today }) {
  if (!G) return null;
  const Z = yearsAheadModel({ start, pace, age, pick: { ...goalPick(G, age, today), m: undefined } });
  const have = Z.start >= Z.goal, on = have || (!!Z.reach && Z.reach.k <= Z.years * 12);
  return { goal: Z.goal, at: Z.at, years: Z.years, hasAge: Z.hasAge, age: Z.age, start: Z.start, kept: Z.kept, pc: Math.max(0, Math.min(100, Math.floor((Z.start / Z.goal) * 100))), have, on, reach: Z.reach, need: Z.need, g: Z.g };
}
// A saved goal in the change history, in English: "₪1,000,000 by age 50" or "₪1,000,000 in 15 years".
export const goalLine = (G) => "₪" + Math.round(+G.goal || 0).toLocaleString("en-US") + (G.age ? " by age " + G.age : " in " + G.yrs + (G.yrs == 1 ? " year" : " years"));
