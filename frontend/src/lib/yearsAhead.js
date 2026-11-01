// Years ahead (Forecast): what your money could add up to over the years, and what it takes to reach an amount by an age.
// Plain numbers in, plain numbers out; nothing here changes the data.
// The rules:
// - It goes month by month: each month the money first grows by that month's share of the yearly growth, then the month's
//   amount set aside is added.
// - A month's share of the yearly growth is (1 + growth)^(1/12) − 1, so twelve months together grow by exactly the yearly growth.
// - It looks at most 40 years ahead (MAX_YEARS).
// - Amounts are rounded once here, the way they are shown ("about"): under ₪10,000 to the nearest ₪100, above it to the nearest
//   ₪1,000. A monthly amount needed is rounded up to the next ₪10, so it is always enough.

export const MAX_YEARS = 40;
const rateOf = (g) => Math.pow(1 + Math.max(-0.99, +g || 0), 1 / 12) - 1;

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

// The age to aim for when none was chosen: 50, or a round age at least 5 years away (never more than 40 years away).
export const goalAgeOf = (age) => Math.min(age + MAX_YEARS, Math.max(50, Math.ceil((age + 5) / 5) * 5));

// Everything Years ahead shows, from:
// start: the money in your accounts today (whole shekels, Home's "In your accounts"); pace: what you set aside in an average month
// now (the Forecast's "Saved each month", Average); age: your age now (0 when not given); pick: the choices made on the page
// { m: each month, goal, at: the age, yrs: the years from now (used when no age is given), g: growth a year as a
// fraction } (missing = default).
export function yearsAheadModel({ start = 0, pace = 0, age = 0, pick = {} } = {}) {
  start = Math.round(+start || 0); pace = Math.round(+pace || 0);
  const hasAge = age > 0, p = pick || {};
  const num = (v, d) => (v === "" || v == null || !isFinite(+v) ? d : +v);
  const m = Math.max(0, Math.round(num(p.m, Math.max(0, pace))));
  const goal = Math.max(1, Math.round(num(p.goal, 1000000)));
  const g = Math.min(0.15, Math.max(0, num(p.g, 0)));
  const lo = hasAge ? age + 1 : 1, hi = hasAge ? age + MAX_YEARS : MAX_YEARS;
  const at = Math.min(hi, Math.max(lo, Math.round(hasAge ? num(p.at, goalAgeOf(age)) : num(p.yrs, 15))));
  const years = hasAge ? at - age : at;
  // when a number of months is reached: the age then (whole years), or the years from now
  const when = (k) => (k == null ? null : { k, age: hasAge ? Math.floor(age + k / 12) : null, years: k / 12 });

  // today's pace (the answer at the top)
  const now = { at: about(amountAfter(start, pace, g, years * 12)), reach: when(monthsToReach(start, pace, g, goal)) };
  // the amounts tried
  const need = aboutUp(monthlyFor(start, g, goal, years * 12));
  const play = { at: about(amountAfter(start, m, g, years * 12)), reach: when(monthsToReach(start, m, g, goal)), need };
  // the change from today's pace: each month (what is needed against what you keep now, never below ₪0) and how many months sooner
  // it is reached
  const kept = Math.max(0, pace), diff = { need: need == null ? null : need - kept, m: m - kept, sooner: now.reach && play.reach ? now.reach.k - play.reach.k : play.reach && !now.reach ? Infinity : now.reach && !play.reach ? -Infinity : null };

  // the chart: one point a year, from now to the chosen age, or to when the goal is reached if that is later (at least 5 years)
  const span = Math.min(MAX_YEARS, Math.max(5, years, play.reach ? Math.ceil(play.reach.k / 12) : 0, now.reach ? Math.min(Math.ceil(now.reach.k / 12), years + 10) : 0));
  const chart = { years: span, mine: pathOf(start, m, g, span), pace: pathOf(start, pace, g, span), goal, at: years, hit: play.reach ? play.reach.k / 12 : null, age: hasAge ? age : null };

  return { start, pace, age: hasAge ? age : 0, hasAge, m, goal, g, at, lo, hi, years, now, play, diff, chart, changed: m !== Math.max(0, pace) };
}

// The chart's shapes for one width: lines through the points, the goal line, where the goal is reached and the labels on the
// left (amounts) and along the bottom (ages or years).
export function yearsChartOf(c, W = 760, Ht = 240) {
  const Pl = 50, Pr = 14, Pt = 18, Pb = 28, n = c.years || 1;
  // the amounts on the left are round steps (1, 2, 2.5 or 5 times a power of ten), about three or four of them
  const all = [...c.mine, ...c.pace, c.goal, 0], top = Math.max(...all) * 1.04 || 1, mn0 = Math.min(0, ...all);
  const raw = (top - mn0) / 3.5, mag = Math.pow(10, Math.floor(Math.log10(raw))), step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((x) => x >= raw);
  const mn = Math.floor(mn0 / step) * step, mx = Math.ceil(top / step) * step;
  const X = (y) => Pl + (y / n) * (W - Pl - Pr), Y = (v) => Pt + (1 - (v - mn) / (mx - mn || 1)) * (Ht - Pt - Pb);
  const line = (a) => a.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const short = (v) => { const a = Math.abs(v); return (v < 0 ? "−" : "") + (a >= 1e6 ? +(a / 1e6).toFixed(a >= 1e7 ? 0 : 2) + "M" : a >= 1000 ? Math.round(a / 1000) + "k" : Math.round(a)); };
  const ticks = Array.from({ length: Math.round((mx - mn) / step) + 1 }, (_, k) => mn + k * step).map((v) => ({ y: Y(v), label: "₪" + short(v) }));
  const every = Math.max(1, Math.ceil((n * 46) / (W - Pl - Pr)));
  const xs = Array.from({ length: n + 1 }, (_, i) => i).filter((i) => i % every == 0 || i == n).filter((i, j, a) => i == n || a[j + 1] == null || a[j + 1] - i >= every * 0.6);
  const hit = c.hit != null && c.hit <= n ? { x: X(c.hit), y: Y(c.goal) } : null;
  return { W, Ht, Pl, Pr, Pt, Pb, X, Y, mine: line(c.mine), pace: line(c.pace), area: `${X(0)},${Y(Math.max(0, mn))} ${line(c.mine)} ${X(n)},${Y(Math.max(0, mn))}`, goalY: Y(c.goal), atX: c.at <= n ? X(c.at) : null, ticks, xs: xs.map((i) => ({ i, x: X(i) })), hit, pts: c.mine.map((v, i) => ({ i, x: X(i), y: Y(v), v, p: c.pace[i] })) };
}
