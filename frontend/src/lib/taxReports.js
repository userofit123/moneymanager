// Taxes and reports: the dates, money, amount and missing papers of each thing a person who works for themselves must
// report or pay (VAT, income tax, National Insurance, a yearly statement …). Nothing here touches the screen or the data;
// the app only reads and reminds, it never sends a report or pays anything. Dates are "YYYY-MM-DD" strings; today comes
// from the page (core/clock.js), never from new Date() here.
//
// A report item (saved in S.taxItems, built by the person in the form; a ready-made example is a copy of one in EXAMPLES):
// {
//   id,
//   n: "VAT report",                         the name the person typed (wins over nk)
//   nk: "taxes.ex.vat",                      a ready-made example's name, as a text key (until the person renames it)
//   noteKey: "taxes.ex.vatNote",             a ready-made example's note, as a text key; note: the person's own note
//   ex: "vat",                               which ready-made example it started from (none for one built from scratch)
//   repeat: { every: 1 | 2 | 3 | 12, month: 1-12, day: 1-31 }   every N months, on `day` (31 = the month's last day),
//                                            in `month` and every N months from it (month 1, every 2: Jan, Mar, May …)
//         | { dates: ["04-15", "06-15", "09-15", "01-15"] }   set dates, every year
//         | null                             no dates: a check only (for example "money in this year is near the limit")
//   covers: 2 | "year" | "since"             the period before the date: that many whole months before its month,
//                                            last year, or from the month of the date before it. Not set: `every` months
//                                            (12: last year), or "since" for set dates.
//   want: 10,                                the day of the month I want to do it (a reminder, can be passed); none: no reminder
//   moved: { "2027-01-15": "2027-01-22" },   one date moved (an extension), by its date in the repeat; the repeat stays
//   money: {
//     in: { cats: ["Freelance & business income"], salary: false } | null,   money in that goes in (salary: salaries too)
//     out: { cats: ["Business expenses"] } | null,                          money out that goes in (money back in these
//                                                                           categories makes them smaller)
//     tags: [],                              only transactions with one of these tags (none: every transaction)
//     add: [ids], skip: [ids],               single transactions added or left out by hand
//     tagPct: { car: 66.67 },                money out with this tag counts only this % (a car used for work and home)
//   },
//   papers: { in: { need: "none" | "receipt" | "invoice", over: 0, note: "" }, out: { … } }   over: only above this amount
//   amount: null | { kind: "in" | "out" | "net" | "vat" | "fixed", pct, vatRate, inclVat, value }
//           in / out / net: money in, money out, money in minus money out; pct: the % of it (not set: all of it)
//           vat: VAT of money in minus VAT of money out at vatRate %; inclVat: the amounts already hold VAT
//           fixed: value, an amount I enter
//   when: { type: "murshe", over: 122833, nearPct: 90 } | null   only while that business type is set, and/or once money
//           in this year is over `over` (near from nearPct %, 90 when not set)
//   done: { "2027-01-15": { sent: true, paid: 1620, at: "2027-01-14" } }   each period marked sent and/or paid, by its key
// }
// Business types (S.bizTypes): [{ id: "patur", n: "Patur", from: "2026-01-01" }]. Each one is set from its date until the
// next one starts, so the type can change in the middle of a year.
// nextPeriod, latePeriods and applies need the business types and the counted rows (A); without them, items with a business
// type or a money-in limit get no periods.
// A period: { key, last, want, start, end, moved, done }. key: its date in the repeat (stays when the date is moved);
// last: the last day (the moved one when moved); start/end: the days it covers.
import { countedTx } from "./bills.js";
import { addM } from "./home.js";

// Months are "YYYY-MM" strings; addM (lib/home.js) moves one by k months.
const ymOf = (s) => String(s).slice(0, 7);
const yOf = (s) => +String(s).slice(0, 4), mOf = (s) => +String(s).slice(5, 7);
const monthLen = (ym) => new Date(yOf(ym), mOf(ym), 0).getDate();
// Day d of the month ym (a day past the month's end is its last day).
const p2 = (n) => String(n).padStart(2, "0");
const dayIn = (ym, d) => ym + "-" + p2(Math.min(d, monthLen(ym)));
const firstOf = (ym) => ym + "-01";
const lastOf = (ym) => dayIn(ym, 31);
// A number the person typed, or null when it is empty or not a number (not set).
const num = (v) => (v == null || v === "" || !Number.isFinite(+v) ? null : +v);
const minD = (a, b) => (a < b ? a : b);
// Amounts are rounded once, to whole shekels; every other number is worked out from the rounded ones, so the page,
// the tooltip and the export show the same amounts.
const whole = (n) => Math.round(n) || 0;

export const REPEAT_EVERY = [1, 2, 3, 12];
export const AMOUNT_KINDS = ["in", "out", "net", "vat", "fixed"];
export const PAPER_NEEDS = ["none", "receipt", "invoice"];
export const NEAR_PCT = 90;

// ---- dates ----

// The dates in the repeat (before any is moved) from `from` to `to`.
function repeatDates(item, from, to) {
  const r = item?.repeat, out = [];
  if (!r) return out;
  if (Array.isArray(r.dates)) {
    const md = [...r.dates].sort();
    for (let y = yOf(from); y <= yOf(to); y++) for (const x of md) out.push(dayIn(y + "-" + x.slice(0, 2), +x.slice(3, 5)));
  } else if (r.every > 0) {
    const day = r.day || 31, first = r.month || 1;
    for (let ym = ymOf(from); ym <= ymOf(to); ym = addM(ym, 1)) if ((((mOf(ym) - first) % r.every) + r.every) % r.every == 0) out.push(dayIn(ym, day));
  }
  return out.filter((d) => d >= from && d <= to);
}

// The days a period covers, for its date in the repeat (key).
export function coversOf(item, key) {
  const r = item?.repeat || {}, ym = ymOf(key), y = yOf(key);
  const c = item?.covers ?? (Array.isArray(r.dates) ? "since" : r.every == 12 ? "year" : r.every || 1);
  const end = lastOf(addM(ym, -1));
  if (c == "year") return { start: y - 1 + "-01-01", end: y - 1 + "-12-31" };
  if (c == "since" && Array.isArray(r.dates)) {
    // from the month of the date before this one (last year's last date for the first one)
    const prev = repeatDates(item, y - 1 + "-01-01", key).filter((d) => d < key).pop();
    if (prev) return { start: firstOf(ymOf(prev)), end };
  }
  const n = c == "since" ? r.every || 1 : +c || 1;
  return { start: firstOf(addM(ym, -n)), end };
}

// One period of the item, for its date in the repeat.
export function periodOf(item, key) {
  const moved = item?.moved?.[key] || "", last = moved || key;
  const want = item?.want > 0 ? minD(dayIn(ymOf(last), item.want), last) : "";
  return { key, last, want, ...coversOf(item, key), moved: !!moved, done: doneOf(item, key) };
}

// The periods whose last day (moved or not) is from `from` to `to`, by last day. A date moved earlier, from after `to`
// into the range, is there too.
export function periods(item, from, to) {
  const keys = new Set(repeatDates(item, firstOf(addM(ymOf(from), -12)), to));
  for (const [k, d] of Object.entries(item?.moved || {})) if (k > to && d >= from && d <= to && repeatDates(item, k, k).length) keys.add(k);
  return [...keys].map((k) => periodOf(item, k)).filter((p) => p.last >= from && p.last <= to).sort((a, b) => a.last.localeCompare(b.last) || a.key.localeCompare(b.key));
}

// What was marked for a period: { sent, paid, at } or null.
export const doneOf = (item, key) => item?.done?.[key] || null;
export const isDone = (p) => !!(p?.done && (p.done.sent || p.done.paid != null));

// The next period that applies (see applies: business types, counted rows A) and is not marked done, whose last day
// is today or later, or null.
export function nextPeriod(item, today, types, A) {
  return periods(item, today, lastOf(addM(ymOf(today), 24))).find((p) => !isDone(p) && applies(item, p, types, A)) || null;
}
// Periods that apply, whose last day has passed (in the last year) and are not marked done, oldest first.
export function latePeriods(item, today, types, A) {
  return periods(item, firstOf(addM(ymOf(today), -12)), today).filter((p) => p.last < today && !isDone(p) && applies(item, p, types, A));
}

// ---- business type ----

// The business type set on a day (the one that started last, on that day or before), or null.
export function typeOn(types, day) {
  return [...(types || [])].filter((x) => !x.from || x.from <= day).sort((a, b) => String(a.from || "").localeCompare(String(b.from || ""))).pop() || null;
}
// Is the type (by id) set on any day from start to end?
export function typeIn(types, id, start, end) {
  const L = [...(types || [])].sort((a, b) => String(a.from || "").localeCompare(String(b.from || "")));
  return L.some((x, i) => x.id == id && (x.from || "") <= end && (i == L.length - 1 || L[i + 1].from > start));
}

// ---- the money in a period ----

const hasTag = (t, tags) => (t.tags || []).some((x) => tags.includes(String(x).toLowerCase()));
const lower = (L) => (L || []).map((x) => String(x).toLowerCase());
// Which side a transaction goes in: "in" money in, "out" money out, or "back" money back (lowers money out).
const sideOf = (t) => (t.a < 0 ? "out" : t.back ? "back" : "in");
// Does a counted row go in, by the item's categories? A salary goes in only when the salary switch is on, whatever
// its category.
function picked(money, t) {
  const s = sideOf(t);
  if (s == "in") return !!money.in && (t.sal ? !!money.in.salary : (money.in.cats || []).includes(t.c));
  return !!money.out && (money.out.cats || []).includes(t.c);
}

// The transactions of a period, from the counted rows A (lib/bills.js countedTx: transfers between your own accounts,
// card bill payments, rows you left out and upcoming ones are never there). Money back in a money-out category goes with
// money out and makes it smaller. Returns { in: [], out: [] } by date; out holds the money back rows too.
export function periodRows(item, P, A) {
  const money = item?.money || {}, tags = lower(money.tags), skip = new Set(money.skip || []), add = new Set(money.add || []);
  const inP = (t) => String(t.d) >= P.start && String(t.d) <= P.end && !skip.has(t.id);
  const L = (A || []).filter((t) => inP(t) && (add.has(t.id) || (picked(money, t) && (!tags.length || hasTag(t, tags)))));
  L.sort((a, b) => String(a.d).localeCompare(String(b.d)));
  return { in: L.filter((t) => sideOf(t) == "in"), out: L.filter((t) => sideOf(t) != "in") };
}

// The % of a money-out row that counts: the % of its first tag that has one (100 when none). An empty % is not set
// yet and leaves the row whole.
export function countPct(item, t) {
  const P = Object.fromEntries(Object.entries(item?.money?.tagPct || {}).map(([k, v]) => [k.toLowerCase(), num(v)]));
  const tag = (t.tags || []).map((x) => String(x).toLowerCase()).find((x) => P[x] != null && P[x] >= 0);
  return tag == null ? 100 : P[tag];
}

// Totals of a period's rows (periodRows), in whole shekels: in, out (money back taken off), net (in − out), byCat
// { in: { cat: n }, out: { cat: n } } and byTag (a row with two tags counts under both). in and out are the sums of
// their rounded categories, so a list by category adds up to them.
export function periodTotals(item, R) {
  const cats = { in: {}, out: {} }, tags = { in: {}, out: {} };
  const put = (o, k, v) => { o[k] = (o[k] || 0) + v; };
  for (const t of R?.in || []) { put(cats.in, t.c || "", t.a); for (const g of t.tags || []) put(tags.in, g, t.a); }
  for (const t of R?.out || []) { const v = (-t.a * countPct(item, t)) / 100; put(cats.out, t.c || "", v); for (const g of t.tags || []) put(tags.out, g, v); }
  const round = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, whole(v)]));
  const byCat = { in: round(cats.in), out: round(cats.out) }, byTag = { in: round(tags.in), out: round(tags.out) };
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const tin = sum(byCat.in), tout = sum(byCat.out);
  return { in: tin, out: tout, net: tin - tout, byCat, byTag, count: (R?.in?.length || 0) + (R?.out?.length || 0) };
}

// The VAT held in an amount at rate %: inclVat, the amount already holds it (₪1,180 at 18% holds ₪180); otherwise it is
// added on top (₪1,000 at 18% → ₪180).
export const vatOf = (n, rate, inclVat) => whole(inclVat ? (n * rate) / (100 + rate) : (n * rate) / 100);

// The amount to report or pay for a period's totals (periodTotals), in whole shekels, or null when the item has no amount
// or a needed number is not set yet. vat: { in, out } is filled for the VAT kind. A % of money that is below zero is 0
// (nothing to pay); VAT can be below zero (money to get back).
export function periodAmount(item, T) {
  const a = item?.amount;
  if (!a || !AMOUNT_KINDS.includes(a.kind)) return null;
  if (a.kind == "fixed") return num(a.value) == null ? null : whole(num(a.value));
  if (a.kind == "vat") {
    if (!(a.vatRate > 0)) return null;
    const vin = vatOf(T.in, a.vatRate, !!a.inclVat), vout = vatOf(T.out, a.vatRate, !!a.inclVat);
    return { value: vin - vout, vat: { in: vin, out: vout } };
  }
  const base = T[a.kind];
  if (!("pct" in a)) return base; // all of it
  if (a.pct == null || a.pct === "") return null; // a % not set yet
  return Math.max(0, whole((base * +a.pct) / 100));
}
// periodAmount as one number (VAT gives { value, vat }).
export const amountValue = (x) => (x && typeof x == "object" ? x.value : x);

// ---- papers ----

const hasPaper = (t) => (t.docs || []).length > 0 || (t.docIds || []).length > 0;
// The rows that need a paper (receipt or invoice) and have no file attached: [{ t, side: "in" | "out", need, note }].
// Only rows over the paper's amount (when it has one) need it; money back needs none.
export function missingPapers(item, R) {
  const out = [];
  for (const side of ["in", "out"]) {
    const p = item?.papers?.[side];
    if (!p || !PAPER_NEEDS.includes(p.need) || p.need == "none") continue;
    for (const t of R?.[side] || []) if (sideOf(t) == side && Math.abs(t.a) > (+p.over || 0) && !hasPaper(t)) out.push({ t, side, need: p.need, note: p.note || "" });
  }
  return out;
}

// ---- only when ----

// Money in from 1 January of day's year to day, as the item counts it (its money in; with none: every money in but
// salaries), in whole shekels.
export function yearIn(item, day, A) {
  const mi = item?.money?.in, y = String(day).slice(0, 4);
  const ok = (t) => t.a > 0 && !t.back && String(t.d) >= y + "-01-01" && String(t.d) <= day && (mi ? picked({ in: mi }, t) : !t.sal);
  return whole((A || []).filter(ok).reduce((s, t) => s + t.a, 0));
}
// The money in limit of an item on a day: { total, limit, pct, near, over }, or null when it has none. pct is a whole
// %, rounded once here so every place shows the same number. near: at nearPct % of the limit or more but not over it.
export function limitCheck(item, day, A) {
  const limit = +item?.when?.over;
  if (!(limit > 0)) return null;
  const total = yearIn(item, day, A), pct = Math.round((total / limit) * 100), over = total > limit;
  return { total, limit, pct, over, near: !over && pct >= (+item.when.nearPct || NEAR_PCT) };
}
// Does the item apply to a period (or, with no period, on the day)? Its business type is set on some day the period
// covers, and its money in for the year (to the period's end) is over its limit.
export function applies(item, P, types, A, day) {
  const w = item?.when || {}, start = P ? P.start : day, end = P ? P.end : day;
  if (w.type && !typeIn(types, w.type, start, end)) return false;
  const L = limitCheck(item, end, A);
  return !L || L.over;
}

// ---- one period, all together ----

// Everything about one period of an item: its rows, totals, amount, missing papers and whether it applies.
// A period with nothing in it is still there (empty: a zero report). today: the day (core/clock.js) that decides which
// rows have happened.
export function periodReport(S, item, P, today) {
  const { A } = countedTx(S, today), R = periodRows(item, P, A), T = periodTotals(item, R), amt = periodAmount(item, T);
  return { period: P, rows: R, totals: T, amount: amountValue(amt), vat: amt?.vat || null, missing: missingPapers(item, R), applies: applies(item, P, S.bizTypes, A), empty: T.count == 0 };
}

// ---- the page ----

// The money of one period from the counted rows A: its rows, totals, amount, missing papers and whether it is empty.
function reportOf(item, P, A) {
  const R = periodRows(item, P, A), T = periodTotals(item, R), amt = periodAmount(item, T);
  return { period: P, rows: R, totals: T, amount: amountValue(amt), vat: amt?.vat || null, missing: missingPapers(item, R), empty: T.count == 0 };
}

// The Taxes and reports list. For each item: the period that needs the person first (the oldest late one, else the next),
// its money (report), the late periods, and for an item with no dates its money-in check (limitCheck). `now` holds the
// items that apply today, late ones first, then by last day; `quiet` the rest (a business type not set, a limit not
// reached). Worked out with the counted rows once, so every row shows the same amounts as the period it opens.
export function taxesModel(S, today) {
  const { A } = countedTx(S, today), types = S?.bizTypes || [];
  const L = (S?.taxItems || []).map((item) => {
    if (!item.repeat) {
      const check = limitCheck(item, today, A);
      return { item, check, late: [], period: null, report: null, on: !!(applies(item, null, types, A, today) && (!check || check.over)) || !!check?.near };
    }
    const late = latePeriods(item, today, types, A), next = nextPeriod(item, today, types, A), P = late[0] || next;
    return { item, check: null, late, next, period: P, report: P ? reportOf(item, P, A) : null, on: !!P };
  });
  const by = (a, b) => (b.late.length > 0) - (a.late.length > 0) || String(a.period?.last || "9").localeCompare(String(b.period?.last || "9"));
  return { now: L.filter((x) => x.on).sort(by), quiet: L.filter((x) => !x.on) };
}

// The periods of an item to choose from on the page: the ones that apply from a year ago to the next one (late, done and
// the next), newest first.
export function itemPeriods(S, item, today) {
  const { A } = countedTx(S, today), types = S?.bizTypes || [], next = nextPeriod(item, today, types, A);
  const L = periods(item, firstOf(addM(ymOf(today), -12)), next ? next.last : today).filter((p) => applies(item, p, types, A));
  return L.reverse();
}

// ---- ready-made examples ----

// Business types the examples use (Israel); added with the first example that needs one, then the person's own.
export const EXAMPLE_TYPES = [
  { id: "patur", nk: "taxes.type.patur" },
  { id: "murshe", nk: "taxes.type.murshe" },
  { id: "micro", nk: "taxes.type.micro" },
];
const FREELANCE = "Freelance & business income", BUSINESS = "Business expenses";
const inOnly = (salary = false) => ({ in: { cats: [FREELANCE], salary }, out: null, tags: [], add: [], skip: [], tagPct: {} });
const inOut = (salary = false) => ({ ...inOnly(salary), out: { cats: [BUSINESS] } });
const noPapers = () => ({ in: { need: "none" }, out: { need: "none" } });
// Ready-made items (Israel and the US, 2026), added with one tap and then changed like any other item. A % or an amount
// that is personal is left empty (null) for the person to fill in.
export const EXAMPLES = [
  { ex: "paturYear", country: "il", nk: "taxes.ex.paturYear", repeat: { every: 12, month: 1, day: 31 }, covers: "year", money: inOnly(), papers: noPapers(), amount: { kind: "in" }, when: { type: "patur" } },
  { ex: "paturLimit", country: "il", nk: "taxes.ex.paturLimit", repeat: null, money: inOnly(), papers: noPapers(), amount: null, when: { over: 122833, nearPct: NEAR_PCT } },
  { ex: "vat", country: "il", nk: "taxes.ex.vat", noteKey: "taxes.ex.vatNote", repeat: { every: 2, month: 1, day: 15 }, covers: 2, money: inOut(), papers: { in: { need: "none" }, out: { need: "invoice" } }, amount: { kind: "vat", vatRate: 18, inclVat: true }, when: { type: "murshe" } },
  { ex: "taxAdvance", country: "il", nk: "taxes.ex.taxAdvance", repeat: { every: 1, month: 1, day: 15 }, covers: 1, money: inOnly(), papers: noPapers(), amount: { kind: "in", pct: null }, when: null },
  { ex: "niAdvance", country: "il", nk: "taxes.ex.niAdvance", repeat: { every: 1, month: 1, day: 15 }, covers: 1, money: inOnly(), papers: noPapers(), amount: { kind: "fixed", value: null }, when: null },
  { ex: "microYear", country: "il", nk: "taxes.ex.microYear", repeat: { every: 12, month: 3, day: 31 }, covers: "year", money: inOnly(), papers: noPapers(), amount: { kind: "in" }, when: { type: "micro" } },
  { ex: "yearly1301", country: "il", nk: "taxes.ex.yearly1301", repeat: { every: 12, month: 5, day: 31 }, covers: "year", money: inOut(true), papers: { in: { need: "none" }, out: { need: "receipt" } }, amount: null, when: null },
  { ex: "usEstimated", country: "us", nk: "taxes.ex.usEstimated", repeat: { dates: ["04-15", "06-15", "09-15", "01-15"] }, covers: "since", money: inOut(), papers: noPapers(), amount: { kind: "net", pct: null }, when: null },
];

// ---- saving ----
// Each change below edits S (the copy inside data.change()) and gives back its history lines [[action, detail]], or false
// when nothing changed. Undo comes from data.change() (core/undoPatch.js keeps what each item had before).
// ctx: how the history line names things. name(x): an item's or a business type's name in English (the page passes the
// name the person typed, or the English text of a ready-made name); fm: an amount; dstr: a date.
// The English names of the ready-made examples, for a history line when the page passes no name (never a text key).
const EX_NAME = { paturYear: "Yearly income report", paturLimit: "Yearly income limit", vat: "VAT report", taxAdvance: "Income tax advance",
  niAdvance: "National Insurance advance", microYear: "Yearly report", yearly1301: "Yearly tax return", usEstimated: "US estimated tax" };
const CTX = { name: (x) => x?.n || EX_NAME[x?.ex] || (typeof x?.id == "string" ? x.id : "report"), fm: (n) => "₪" + Math.round(+n || 0).toLocaleString("en-US"), dstr: (d) => d };
const ctxOf = (ctx) => ({ ...CTX, ...ctx });
const itemOf = (S, id) => (S.taxItems || []).find((x) => x.id == id);
const isDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
// The same data, whatever the order of the keys (the server keeps settings in a form that can reorder them).
const stable = (v) => JSON.stringify(v, (_k, x) => (x && typeof x == "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x));
const same = (a, b) => stable(a) === stable(b);

let lastId = 0; // the last id handed out in this session
// A new item, from the form (f: the item's fields) or a copy of a ready-made example (exampleItem).
export function addTaxItem(S, f, ctx) {
  const c = ctxOf(ctx), L = (S.taxItems = S.taxItems || []);
  const { id: _i, done: _d, moved: _m, ...fields } = structuredClone(f || {}); // a new item has nothing moved or done yet
  // A whole number never used before, so an older Undo can't touch a newer item: the time in ms, or one more than the
  // highest id when that is already higher. `lastId` also keeps ids apart when an item is deleted and another added in
  // the same millisecond (the highest id would then drop back and the old id would be handed out again).
  lastId = Math.max(lastId + 1, Date.now(), Math.max(0, ...L.map((i) => +i.id || 0)) + 1);
  const x = { id: lastId, ...fields, moved: {}, done: {} };
  L.push(x);
  return [["Added report", c.name(x)]];
}
// A ready-made example as a new item: a copy that is then an ordinary item (EXAMPLES, by its `ex`).
export function exampleItem(ex) {
  const e = EXAMPLES.find((x) => x.ex == ex);
  if (!e) return null;
  const { country, ...x } = structuredClone(e);
  return x;
}
export const addExample = (S, ex, ctx) => { const x = exampleItem(ex); return x ? addTaxItem(S, x, ctx) : false; };

// An item changed in the form: its fields are replaced; its moved dates and done periods stay (they have their own changes).
export function editTaxItem(S, id, f, ctx) {
  const c = ctxOf(ctx), L = S.taxItems || [], i = L.findIndex((x) => x.id == id);
  if (i < 0) return false;
  const { id: _i, done: _d, moved: _m, ...fields } = structuredClone(f || {}), old = L[i];
  const x = { id: old.id, ...fields, moved: old.moved || {}, done: old.done || {} };
  if (same(x, old)) return false;
  L[i] = x;
  return [["Changed report", c.name(x)]];
}

export function deleteTaxItem(S, id, ctx) {
  const c = ctxOf(ctx), x = itemOf(S, id);
  if (!x) return false;
  S.taxItems = S.taxItems.filter((i) => i !== x);
  return [["Deleted report", c.name(x)]];
}

// One date moved (an extension): key is the date in the repeat, to the new last day. to empty, or the key itself, puts it
// back on its usual date.
export function moveTaxDate(S, id, key, to, ctx) {
  const c = ctxOf(ctx), x = itemOf(S, id);
  if (!x || !isDay(key) || (to && !isDay(to))) return false;
  const was = x.moved?.[key] || key, now = to || key;
  if (was == now) return false;
  x.moved = { ...(x.moved || {}) };
  if (now == key) delete x.moved[key]; else x.moved[key] = now;
  return [["Moved a report date", c.name(x) + " · was " + c.dstr(was) + ", now " + c.dstr(now)]];
}

// A period marked done: sent (the report was sent) and/or paid (the amount paid; null: not paid). today: the day it was
// marked (core/clock.js). Neither sent nor paid marks it not done again (unmarkTaxDone).
export function markTaxDone(S, id, key, { sent = false, paid = null } = {}, today, ctx) {
  const c = ctxOf(ctx), x = itemOf(S, id);
  if (!x || !isDay(key)) return false;
  const amt = paid == null || paid === "" || !Number.isFinite(+paid) ? null : Math.round(+paid);
  if (!sent && amt == null) return unmarkTaxDone(S, id, key, ctx);
  const d = { sent: !!sent, paid: amt, at: today };
  const old = x.done?.[key];
  if (old && old.sent == d.sent && old.paid == d.paid) return false;
  x.done = { ...(x.done || {}), [key]: d };
  const last = x.moved?.[key] || key;
  return [["Marked report as done", c.name(x) + ", due " + c.dstr(last) + (d.sent ? " · sent" : "") + (d.paid != null ? " · paid " + c.fm(d.paid) : "")]];
}
export function unmarkTaxDone(S, id, key, ctx) {
  const c = ctxOf(ctx), x = itemOf(S, id);
  if (!x || !x.done?.[key]) return false;
  x.done = { ...x.done };
  delete x.done[key];
  return [["Marked report as not done", c.name(x) + ", due " + c.dstr(x.moved?.[key] || key)]];
}

// The business types and the day each one starts (S.bizTypes), sorted by that day. types: [{ id, n?, nk?, from }].
export function setBizTypes(S, types, ctx) {
  const c = ctxOf(ctx);
  const L = (types || []).filter((x) => x && x.id && isDay(x.from)).map(({ id, n, nk, from }) => ({ id: String(id), ...(n ? { n: String(n) } : {}), ...(nk ? { nk } : {}), from }))
    .sort((a, b) => a.from.localeCompare(b.from));
  if (same(L, S.bizTypes || [])) return false;
  S.bizTypes = L;
  return [["Changed business type", L.length ? L.map((x) => c.name(x) + " since " + c.dstr(x.from)).join(" · ") : "none"]];
}

// ---- the form ----

// The categories the form offers for money in (side "in") or money out ("out"): the ones used on that side first (most
// used first), then the rest by name. Hidden categories (99) and "Uncategorized" are left out.
export function formCats(S, side) {
  const n = {};
  for (const t of S?.tx || []) if (t.c && (side == "in" ? +t.a > 0 : +t.a < 0)) n[t.c] = (n[t.c] || 0) + 1;
  return Object.keys(S?.cats || {}).filter((k) => S.cats[k] !== 99 && k != "Uncategorized")
    .sort((a, b) => (n[b] || 0) - (n[a] || 0) || a.localeCompare(b, undefined, { sensitivity: "base" }));
}
