// Taxes and reports: dates, money, amounts, missing papers and "only when" of each report item (lib/taxReports.js),
// with the Israel and US examples of the plan (docs/plans/freelance-reports.md). Names and amounts are made up.
import test from "node:test";
import assert from "node:assert/strict";
import { setNow, now, dayOf } from "../src/core/clock.js";
import { countedTx } from "../src/lib/bills.js";
import { periods, periodOf, coversOf, nextPeriod, latePeriods, typeOn, typeIn, periodRows, periodTotals, periodAmount, amountValue, vatOf, countPct, missingPapers, yearIn, limitCheck, applies, periodReport, EXAMPLES, EXAMPLE_TYPES } from "../src/lib/taxReports.js";

const FREELANCE = "Freelance & business income", BUSINESS = "Business expenses";
const ex = (id, more = {}) => ({ ...structuredClone(EXAMPLES.find((x) => x.ex == id)), id: 1, ...more });
const keys = (L) => L.map((p) => p.key);

// A made-up freelancer: two clients in Nov–Dec 2026, office and car costs, money back, groceries, a salary,
// a move to savings and a left-out row.
const tx = [
  { id: 1, d: "2026-11-03", a: 5900, desc: "Client Alpha", from: "Client Alpha", to: "Bank", c: FREELANCE, tags: [], docs: [] },
  { id: 2, d: "2026-12-10", a: 5900, desc: "Client Beta", from: "Client Beta", to: "Bank", c: FREELANCE, tags: [], docs: ["beta-invoice.pdf"] },
  { id: 3, d: "2026-11-12", a: -1180, desc: "Paper Corner", from: "Bank", to: "Paper Corner", c: BUSINESS, tags: [], docs: [] },
  { id: 4, d: "2026-12-02", a: -1180, desc: "Fuel Point", from: "Bank", to: "Fuel Point", c: BUSINESS, tags: ["car"], docs: [], docIds: [7] },
  { id: 5, d: "2026-12-20", a: 118, desc: "Paper Corner refund", from: "Paper Corner", to: "Bank", c: BUSINESS, mk: "back", tags: [], docs: [] },
  { id: 6, d: "2026-11-20", a: -300, desc: "Green Grocer", from: "Bank", to: "Green Grocer", c: "Groceries", tags: [], docs: [] },
  { id: 7, d: "2026-11-25", a: 8000, desc: "Acme Ltd", from: "Acme Ltd", to: "Bank", c: "Salary", mk: "salary", tags: [], docs: [] },
  { id: 8, d: "2026-11-15", a: -2000, desc: "To savings", from: "Bank", to: "Savings", c: BUSINESS, tags: [], docs: [] },
  { id: 9, d: "2026-11-15", a: 2000, desc: "From bank", from: "Bank", to: "Savings", c: FREELANCE, tags: [], docs: [] },
  { id: 10, d: "2026-12-05", a: -590, desc: "Print Hub", from: "Bank", to: "Print Hub", c: BUSINESS, tags: [], docs: [] },
  { id: 11, d: "2026-10-30", a: 1000, desc: "Client Gamma", from: "Client Gamma", to: "Bank", c: FREELANCE, tags: [], docs: [] },
];
const S0 = () => ({
  accounts: [{ n: "Bank", kind: "bank" }, { n: "Savings", kind: "bank" }],
  tx: structuredClone(tx), xf: [{ o: 8, i: 9 }], txIgnore: { 10: true },
  bizTypes: [{ id: "patur", n: "Patur", from: "2026-01-01" }, { id: "murshe", n: "Murshe", from: "2026-07-01" }],
});
setNow("2027-01-05T12:00:00");
const today = () => dayOf(now.value);
const A = () => countedTx(S0(), today()).A;
const NOVDEC = { start: "2026-11-01", end: "2026-12-31" };

// ---- 1. dates ----

test("every 2 months on the 15th, covering the 2 months before (Israel VAT report)", () => {
  const L = periods(ex("vat"), "2027-01-01", "2027-12-31");
  assert.deepEqual(keys(L), ["2027-01-15", "2027-03-15", "2027-05-15", "2027-07-15", "2027-09-15", "2027-11-15"]);
  assert.deepEqual([L[0].start, L[0].end], ["2026-11-01", "2026-12-31"]);
  assert.deepEqual([L[1].start, L[1].end], ["2027-01-01", "2027-02-28"]);
});

test("the day I want to do it is in the same month, never after the last day", () => {
  assert.equal(periodOf(ex("vat", { want: 10 }), "2027-03-15").want, "2027-03-10");
  assert.equal(periodOf(ex("vat", { want: 20 }), "2027-03-15").want, "2027-03-15");
  assert.equal(periodOf(ex("vat"), "2027-03-15").want, "", "no reminder day");
});

test("day 31 is the month's last day; yearly items cover last year", () => {
  assert.deepEqual(keys(periods({ repeat: { every: 1, month: 1, day: 31 } }, "2027-02-01", "2027-04-30")), ["2027-02-28", "2027-03-31", "2027-04-30"]);
  const P = periodOf(ex("paturYear"), "2027-01-31");
  assert.deepEqual([P.start, P.end], ["2026-01-01", "2026-12-31"]);
  assert.deepEqual(keys(periods(ex("microYear"), "2027-01-01", "2027-12-31")), ["2027-03-31"]);
  assert.deepEqual(coversOf(ex("microYear"), "2027-03-31"), { start: "2026-01-01", end: "2026-12-31" });
  assert.deepEqual(coversOf({ repeat: { every: 3, month: 1, day: 15 } }, "2027-04-15"), { start: "2027-01-01", end: "2027-03-31" }, "the quarter before");
});

test("set dates cover the time since the date before (US estimated tax)", () => {
  const L = periods(ex("usEstimated"), "2027-01-01", "2027-12-31");
  assert.deepEqual(keys(L), ["2027-01-15", "2027-04-15", "2027-06-15", "2027-09-15"]);
  assert.deepEqual(L.map((p) => [p.start, p.end]), [["2026-09-01", "2026-12-31"], ["2027-01-01", "2027-03-31"], ["2027-04-01", "2027-05-31"], ["2027-06-01", "2027-08-31"]]);
});

test("moving one date (an extension) keeps the repeat and the period it covers", () => {
  const it = ex("vat", { moved: { "2027-03-15": "2027-03-29" } });
  const L = periods(it, "2027-01-01", "2027-05-31");
  assert.deepEqual(L.map((p) => [p.key, p.last, p.moved]), [["2027-01-15", "2027-01-15", false], ["2027-03-15", "2027-03-29", true], ["2027-05-15", "2027-05-15", false]]);
  assert.deepEqual([L[1].start, L[1].end], ["2027-01-01", "2027-02-28"]);
  // moved past the end of the range it leaves it; moved into it, it comes in
  assert.deepEqual(keys(periods(it, "2027-03-16", "2027-03-31")), ["2027-03-15"]);
});

test("a date moved earlier, from after the range into it, is in the range", () => {
  const it = ex("vat", { moved: { "2027-05-15": "2027-04-20" } });
  assert.deepEqual(periods(it, "2027-04-01", "2027-04-30").map((p) => [p.key, p.last]), [["2027-05-15", "2027-04-20"]]);
  assert.deepEqual(keys(periods(it, "2027-05-01", "2027-05-31")), [], "it left its own month");
});

test("next period skips the ones marked done; late ones are past, not done and apply", () => {
  const T = S0().bizTypes;
  const it = ex("vat", { done: { "2026-11-15": { sent: true, paid: 900 }, "2027-01-15": { sent: true } } });
  assert.equal(nextPeriod(it, today(), T, A()).key, "2027-03-15");
  assert.equal(nextPeriod(ex("vat"), today(), T, A()).key, "2027-01-15");
  assert.deepEqual(keys(latePeriods(it, today(), T, A())), ["2026-09-15"], "before July the business was patur: no VAT report");
  assert.equal(periodOf(it, "2026-11-15").done.paid, 900);
  assert.equal(nextPeriod(ex("paturLimit"), today(), T, A()), null, "a check with no dates has no periods");
});

test("next and late periods follow only when: business type and money in limit", () => {
  const T = S0().bizTypes;
  assert.equal(nextPeriod(ex("microYear"), today(), T, A()), null, "never a micro business");
  assert.deepEqual(latePeriods(ex("microYear"), today(), T, A()), []);
  const lim = { repeat: { every: 1, month: 1, day: 15 }, money: ex("vat").money, when: { over: 6000 } };
  assert.deepEqual(keys(latePeriods(lim, today(), T, A())), ["2026-12-15"], "money in for 2026 went over 6,000 in November, not before");
  assert.equal(nextPeriod(lim, today(), T, A()).key, "2027-01-15");
  assert.equal(nextPeriod({ ...lim, when: { over: 50000 } }, today(), T, A()), null, "never over the limit");
});

// ---- 2. transactions in a period ----

test("a period holds its categories only: no transfers, left-out rows, other categories or other dates", () => {
  const R = periodRows(ex("vat"), NOVDEC, A());
  assert.deepEqual(R.in.map((t) => t.id), [1, 2]);
  assert.deepEqual(R.out.map((t) => t.id), [3, 4, 5], "by date");
  assert.ok(R.out.find((t) => t.id == 5).back, "money back goes with money out");
});

test("salary, tags, and rows added or left out by hand", () => {
  const ids = (it) => { const R = periodRows(it, NOVDEC, A()); return [R.in.map((t) => t.id), R.out.map((t) => t.id).sort()]; };
  const it = ex("vat");
  it.money.in.salary = true;
  assert.deepEqual(ids(it)[0], [1, 7, 2]);
  assert.deepEqual(ids(ex("vat", { money: { ...ex("vat").money, tags: ["Car"] } })), [[], [4]]);
  assert.deepEqual(ids(ex("vat", { money: { ...ex("vat").money, add: [6], skip: [3] } })), [[1, 2], [4, 5, 6]]);
  assert.deepEqual(ids(ex("vat", { money: { ...ex("vat").money, add: [8, 10] } }))[1], [3, 4, 5], "a transfer or a left-out row is never added");
  const withSalaryCat = ex("vat");
  withSalaryCat.money.in.cats = [FREELANCE, "Salary"];
  assert.deepEqual(ids(withSalaryCat)[0], [1, 2], "a salary follows the salary switch, even in a chosen category");
});

// ---- 3. totals and amounts ----

test("money back makes the money-out category smaller; totals add up by category", () => {
  const T = periodTotals(ex("vat"), periodRows(ex("vat"), NOVDEC, A()));
  assert.equal(T.in, 11800);
  assert.equal(T.out, 2242);
  assert.equal(T.net, 9558);
  assert.deepEqual(T.byCat, { in: { [FREELANCE]: 11800 }, out: { [BUSINESS]: 2242 } });
  assert.deepEqual(T.byTag.out, { car: 1180 });
});

test("VAT: amount includes VAT takes it out of the total (₪1,180 holds ₪180 at 18%)", () => {
  assert.equal(vatOf(1180, 18, true), 180);
  assert.equal(vatOf(1000, 18, false), 180);
  // the plan's example: ₪11,800 in, ₪1,180 out → ₪1,800 − ₪180
  const x = periodAmount(ex("vat"), { in: 11800, out: 1180, net: 10620 });
  assert.deepEqual(x, { value: 1620, vat: { in: 1800, out: 180 } });
  assert.equal(amountValue(x), 1620);
  assert.equal(amountValue(periodAmount(ex("vat"), { in: 0, out: 1180, net: -1180 })), -180, "more VAT out than in: money to get back");
});

test("% per tag: a car used for work counts 2/3", () => {
  const it = ex("vat");
  it.money.tagPct = { car: 200 / 3 };
  assert.equal(countPct(it, { tags: ["Car"] }), 200 / 3);
  assert.equal(countPct(it, { tags: [] }), 100);
  for (const empty of [null, "", "abc"]) assert.equal(countPct(ex("vat", { money: { ...ex("vat").money, tagPct: { car: empty } } }), { tags: ["car"] }), 100, "a % not set leaves the row whole");
  const T = periodTotals(it, periodRows(it, NOVDEC, A()));
  assert.equal(T.out, 1849, "1,180 + 786.67 − 118");
  assert.equal(amountValue(periodAmount(it, T)), 1800 - 282);
});

test("every amount kind: total, %, money in minus out, an amount I enter", () => {
  const T = { in: 5900, out: 1180, net: 4720 };
  assert.equal(periodAmount({ amount: { kind: "in" } }, T), 5900);
  assert.equal(periodAmount({ amount: { kind: "out" } }, T), 1180);
  assert.equal(periodAmount({ amount: { kind: "net" } }, T), 4720);
  assert.equal(periodAmount(ex("taxAdvance", { amount: { kind: "in", pct: 5 } }), T), 295, "income tax advance: 5% of money in");
  assert.equal(periodAmount(ex("taxAdvance"), T), null, "the % is not set yet");
  assert.equal(periodAmount({ amount: { kind: "net", pct: 30 } }, { in: 100, out: 500, net: -400 }), 0, "nothing to pay on a loss");
  assert.equal(periodAmount(ex("niAdvance", { amount: { kind: "fixed", value: 1234 } }), T), 1234, "National Insurance advance");
  assert.equal(periodAmount(ex("niAdvance"), T), null);
  assert.equal(periodAmount(ex("niAdvance", { amount: { kind: "fixed", value: "abc" } }), T), null, "not a number: not set");
  assert.equal(periodAmount(ex("yearly1301"), T), null, "no amount: the page shows the totals");
});

// ---- 4. missing papers ----

test("missing papers: money out without a file, over an amount when set; money back needs none", () => {
  const R = periodRows(ex("vat"), NOVDEC, A());
  assert.deepEqual(missingPapers(ex("vat"), R).map((m) => [m.t.id, m.side, m.need]), [[3, "out", "invoice"]]);
  const over = ex("vat", { papers: { in: { need: "receipt", over: 5000 }, out: { need: "invoice", over: 1180, note: "Check the number" } } });
  assert.deepEqual(missingPapers(over, R).map((m) => [m.t.id, m.side]), [[1, "in"]], "1,180 is not over 1,180");
  assert.deepEqual(missingPapers(ex("microYear"), R), [], "papers: none");
});

// ---- 5. only when ----

test("business type with a from date: set from its date until the next one starts", () => {
  const T = S0().bizTypes;
  assert.equal(typeOn(T, "2026-06-30").id, "patur");
  assert.equal(typeOn(T, "2026-07-01").id, "murshe");
  assert.equal(typeOn(T, "2025-12-31"), null);
  assert.ok(typeIn(T, "patur", "2026-01-01", "2026-12-31"), "patur part of the year");
  assert.ok(!typeIn(T, "patur", "2026-07-01", "2026-08-31"));
  const vat = ex("vat");
  assert.ok(!applies(vat, periodOf(vat, "2026-07-15"), T, []), "May–Jun: still patur");
  assert.ok(applies(vat, periodOf(vat, "2026-09-15"), T, []), "Jul–Aug: murshe");
  const py = ex("paturYear");
  assert.ok(applies(py, periodOf(py, "2027-01-31"), T, []), "2026 was partly patur");
  assert.ok(!applies(py, periodOf(py, "2028-01-31"), T, []));
});

test("money in this year over a limit, and near it (patur limit check)", () => {
  const it = ex("paturLimit"), day = "2026-11-25";
  const rows = [
    { d: "2025-12-20", a: 50000, c: FREELANCE },
    { d: "2026-03-01", a: 60000, c: FREELANCE },
    { d: "2026-08-01", a: 52000, c: FREELANCE },
    { d: "2026-09-01", a: 9000, c: "Salary", sal: true },
    { d: "2026-09-02", a: 400, c: FREELANCE, back: true },
  ];
  assert.equal(yearIn(it, day, rows), 112000);
  assert.deepEqual(limitCheck(it, day, rows), { total: 112000, limit: 122833, pct: 91, over: false, near: true });
  assert.ok(!applies(it, null, [], rows, day));
  const more = rows.concat({ d: "2026-11-01", a: 20000, c: FREELANCE });
  assert.equal(limitCheck(it, day, more).over, true);
  assert.equal(limitCheck(it, day, more).near, false);
  assert.ok(applies(it, null, [], more, day));
  assert.equal(limitCheck(it, "2026-02-01", rows).near, false, "early in the year: far from it");
  assert.equal(yearIn({ when: { over: 1 } }, day, rows), 112000, "no money in chosen: every money in but salaries");
  assert.equal(limitCheck(ex("vat"), day, rows), null, "no limit");
});

// ---- 6. examples and whole periods ----

test("the ready-made examples are plain data with text keys for their names", () => {
  assert.deepEqual(EXAMPLES.map((x) => x.ex), ["paturYear", "paturLimit", "vat", "taxAdvance", "niAdvance", "microYear", "yearly1301", "usEstimated"]);
  for (const x of EXAMPLES) {
    assert.match(x.nk, /^taxes\.ex\.\w+$/);
    assert.deepEqual(JSON.parse(JSON.stringify(x)), x, x.ex + " is plain data");
    if (x.when?.type) assert.ok(EXAMPLE_TYPES.some((t) => t.id == x.when.type), x.ex + " uses a known business type");
  }
});

test("Israel VAT report for Nov–Dec 2026, all together", () => {
  const S = S0(), it = ex("vat"), P = periodOf(it, "2027-01-15"), R = periodReport(S, it, P, today());
  assert.equal(R.totals.in, 11800);
  assert.equal(R.totals.out, 2242);
  assert.deepEqual(R.vat, { in: 1800, out: 342 });
  assert.equal(R.amount, 1458);
  assert.deepEqual(R.missing.map((m) => m.t.id), [3]);
  assert.equal(R.applies, true);
  assert.equal(R.empty, false);
});

test("a period with nothing in it still exists: a zero report", () => {
  const S = S0(), it = ex("vat"), R = periodReport(S, it, periodOf(it, "2026-09-15"), today());
  assert.equal(R.empty, true);
  assert.equal(R.amount, 0);
  assert.equal(R.applies, true);
  assert.deepEqual(R.missing, []);
});

test("Israel yearly examples: patur statement, micro short report, yearly report with salary and tags", () => {
  const S = S0(), go = (it) => periodReport(S, it, periodOf(it, nextPeriod(it, today(), S.bizTypes, A()).key), today());
  const py = go(ex("paturYear"));
  assert.equal(py.period.key, "2027-01-31");
  assert.equal(py.amount, 12800, "money in for 2026, the move to savings is not counted");
  assert.equal(py.applies, true);
  const mi = ex("microYear"), miR = periodReport(S, mi, periodOf(mi, "2027-03-31"), today());
  assert.equal(miR.applies, false, "never a micro business");
  const y = go(ex("yearly1301"));
  assert.equal(y.period.key, "2027-05-31");
  assert.equal(y.totals.in, 20800, "with the salary");
  assert.deepEqual(y.totals.byCat.in, { [FREELANCE]: 12800, Salary: 8000 });
  assert.deepEqual(y.totals.byTag.out, { car: 1180 });
  assert.equal(y.amount, null);
});

test("US estimated tax: (money in − money out) × your %", () => {
  setNow("2026-07-01T12:00:00");
  try {
    const S = { accounts: [{ n: "Bank", kind: "bank" }], tx: [
      { id: 1, d: "2026-04-08", a: 10000, desc: "Client Delta", from: "Client Delta", to: "Bank", c: FREELANCE, tags: [], docs: [] },
      { id: 2, d: "2026-05-12", a: -2000, desc: "Laptop Store", from: "Bank", to: "Laptop Store", c: BUSINESS, tags: [], docs: [] },
      { id: 3, d: "2026-06-02", a: 3000, desc: "Client Echo", from: "Client Echo", to: "Bank", c: FREELANCE, tags: [], docs: [] },
    ] };
    const it = ex("usEstimated", { amount: { kind: "net", pct: 25 } }), P = periodOf(it, "2026-06-15");
    const R = periodReport(S, it, P, dayOf(now.value));
    assert.deepEqual([P.start, P.end], ["2026-04-01", "2026-05-31"]);
    assert.equal(R.totals.net, 8000);
    assert.equal(R.amount, 2000);
  } finally { setNow("2027-01-05T12:00:00"); }
});
