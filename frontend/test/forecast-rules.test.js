// The forecast's agreed rules (written at the top of lib/jars.js), one test each, on small made-up data, and Recap's
// "A look at …" landing on the Forecast page's first month.
import test from "node:test";
import assert from "node:assert/strict";
import { homeModel } from "../src/lib/home.js";
import { recapModel, plainOf } from "../src/lib/recap.js";
import { est, forecastLine, incKey, jarProject } from "../src/lib/jars.js";
import { alertsModel } from "../src/lib/alerts.js";
import { budgetsModel } from "../src/lib/budgets.js";
import { barsOf } from "../src/lib/forecast.js";
import { kinds, totals, rdOf, groupRows } from "../src/lib/activity.js";
import { forecastModel, direction, forecastTable, endPoint } from "../src/lib/forecast.js";

const NOW = new Date(2026, 9, 20, 12); // 20 October 2026: July, August and September are the complete months
let id = 1;
const tx = (d, desc, from, a, c, o = {}) => ({ id: id++, d, desc, from, to: "", a, c, tags: [], docs: [], note: "", src: "test", ...o });
function state(o = {}) {
  const T = [];
  for (const m of ["2026-07", "2026-08", "2026-09"]) {
    T.push(tx(m + "-01", "Salary", "Sunflower Ltd", 10000, "Income", { to: "Bank" }));
    T.push(tx(m + "-05", "Rent", "Bank", -4000, "Rent & housing"));
    T.push(tx(m + "-12", "Green Grocer", "Card", -3000, "Groceries"));
  }
  T.push(tx("2026-08-15", "Bonus", "Pinecone Co", 16800, "Income", { to: "Bank" }));
  // this month: an income that has come counts it; spending counts from the 10th, stretched to a whole month
  T.push(tx("2026-10-01", "Salary", "Sunflower Ltd", 10000, "Income", { to: "Bank" }));
  T.push(tx("2026-10-03", "Bonus", "Pinecone Co", 50000, "Income", { to: "Bank" }));
  T.push(tx("2026-10-05", "Rent", "Bank", -4000, "Rent & housing"));
  T.push(tx("2026-10-10", "Green Grocer", "Card", -2000, "Groceries"));
  return { v: 4, rev: 1, cats: { Income: 99, "Rent & housing": 0, Groceries: 1 }, rules: [], tagRules: [], tx: T, budgets: {}, bills: [], ignoredBills: [], jars: [], audit: [], xf: [], dismissed: {}, dupOk: {}, adj: {},
    jarsBuffer: 0, ccOverride: {}, txIgnore: {}, budgetNo: [], hiddenMerchants: [], cardRules: [], salaryRules: [], cfg: {}, currencies: ["ILS"],
    accounts: [{ id: 1, n: "Bank", cur: "ILS", kind: "bank", inNW: true, v: 20000, at: NOW.toISOString() }, { id: 2, n: "Card", cur: "ILS", kind: "card", inNW: false, v: 0, at: NOW.toISOString() }],
    nwSnaps: [], gaps: [], balUpdates: [], connected: {}, locked: {}, connStatus: {}, ...o };
}
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.01, `${msg}: ${a} != ${b}`);

const keys = (L) => L.W.map((j) => L.FH.keys[j]);
const rowV = (L, k, inc = false) => (inc ? L.inc : L.ex).find((r) => (inc ? new RegExp(k).test(r.k) : r.k == k)).v.map((x) => Math.round(x));

test("rule 1: exactly N months, this month and the N - 1 before it, for every row and on any day", () => {
  for (const day of [1, 5, 20, 31]) {
    const at = new Date(2026, 9, day, 12), S = state(), L = forecastLine(S, homeModel(S, at), at, { n: 3 });
    assert.deepEqual(keys(L), ["2026-08", "2026-09", "2026-10"], "day " + day);
    for (const r of [...L.inc, ...L.ex]) assert.equal(r.v.length, 3, r.k);
  }
  // 6 and 12 months: never a month before the history starts (July here)
  const S = state(), H = homeModel(S, NOW);
  assert.deepEqual(keys(forecastLine(S, H, NOW, { n: 6 })), ["2026-07", "2026-08", "2026-09", "2026-10"]);
  const S2 = state({ tx: [...state().tx, tx("2025-06-01", "Old", "Bank", -10, "Groceries")] }), L12 = forecastLine(S2, homeModel(S2, NOW), NOW, { n: 12 });
  assert.equal(L12.W.length, 12); assert.equal(keys(L12)[11], "2026-10");
});

test("rule 2: this month is what happened so far plus what usually happens after today, never counted twice", () => {
  const extra = ["2026-08", "2026-09"].map((m) => tx(m + "-25", "Fuel", "Card", -600, "Car"));
  const subs = ["2026-08-28", "2026-09-28", "2026-10-12"].map((d) => tx(d, "Streaming", "Card", -149, "Fun"));
  const S = state({ tx: [...state().tx, ...extra, tx("2026-10-04", "Fuel", "Card", -100, "Car"), ...subs], cats: { Income: 99, "Rent & housing": 0, Groceries: 1, Car: 2, Fun: 3 } });
  const L = forecastLine(S, homeModel(S, NOW), NOW, { n: 3 });
  assert.deepEqual(rowV(L, "Rent & housing"), [4000, 4000, 4000], "rent paid on the 5th: nothing more after the 20th");
  assert.deepEqual(rowV(L, "Groceries"), [3000, 3000, 2000], "groceries are usually bought by the 12th: so far is the month");
  assert.deepEqual(rowV(L, "Car"), [600, 600, 600], "₪100 so far plus the usual ₪600 on the 25th, less what was already paid");
  assert.deepEqual(rowV(L, "Fun"), [149, 149, 149], "usually paid on the 28th, already paid on the 12th: not again");
  // a salary that usually comes on the 25th and has not come yet counts as coming, and is in the end of this month
  const sal = ["2026-08-25", "2026-09-25"].map((d) => tx(d, "Pay", "Maple Works", 8000, "Income", { to: "Bank" }));
  const S2 = state({ tx: [...state().tx, ...sal] }), H2 = homeModel(S2, NOW), L2 = forecastLine(S2, H2, NOW, { n: 3 }), R2 = recapModel(H2, NOW);
  assert.deepEqual(rowV(L2, "Maple", true), [8000, 8000, 8000]);
  near(R2.incLeft, 8000, "still to come this month"); near(R2.end, R2.cash - R2.sure - R2.likelyBank + 8000, "and in the end of this month");
});

test("rule 3: what comes after today is learned from the 2 full months before this month only, whatever N is", () => {
  // paid on the 25th in July only: July is not one of the 2 months, so nothing is expected after today
  const S = state({ tx: [...state().tx, tx("2026-07-25", "Fuel", "Card", -600, "Car")], cats: { Income: 99, "Rent & housing": 0, Groceries: 1, Car: 2 } });
  for (const n of [3, 6, 12]) {
    const L = forecastLine(S, homeModel(S, NOW), NOW, { n }); assert.equal(L.R.rest.find((x) => x.k == "Car"), undefined, n + " months");
  }
  // payee by payee, with the numbers banks add left out of the name
  const T = [tx("2026-08-26", "Gym 0825", "Card", -200, "Fun"), tx("2026-09-26", "Gym 0926", "Card", -200, "Fun")];
  const S2 = state({ tx: [...state().tx, ...T], cats: { Income: 99, "Rent & housing": 0, Groceries: 1, Fun: 3 } }), R2 = recapModel(homeModel(S2, NOW), NOW);
  const f = R2.rest.find((x) => x.k == "Fun"); near(f.a, 200, "the usual ₪200 after the 20th"); near(f.card, 200, "on the card");
});

test("rule 4: the average is the plain average of the N months (a month with nothing is ₪0), an odd month softened", () => {
  const T = [tx("2026-09-03", "Payment", "Pinecone Co", 16800, "Income"), tx("2026-10-08", "Payment", "Pinecone Co", 16800, "Income")];
  const S = state({ tx: [...state().tx.filter((t) => t.desc != "Bonus"), ...T] }), L = forecastLine(S, homeModel(S, NOW), NOW, { n: 3 });
  const p = L.inc.find((r) => /Pinecone/.test(r.k)); assert.deepEqual(p.v, [0, 16800, 16800]); near(p.mean, 11200, "₪33,600 over 3 months");
  assert.equal(p.came, 2); assert.equal(p.of, 3);
  near(est([100, 100, 1000]).mean, 120, "a one-off month is pulled toward the typical month");
  near(est([0, 0, 900]).mean, 300, "empty months count as ₪0");
});
test("an income named only with a bank word is shown by the name you gave it, else its payer, else its category", () => {
  const a = tx("2026-09-03", "זיכוי", "זיכוי", 16800, "Freelance & business income"), b = tx("2026-10-08", "זיכוי", "זיכוי", 16800, "Freelance & business income");
  assert.equal(incKey({}, a), "Freelance & business income", "only bank words: its category");
  assert.equal(incKey({}, { ...a, memo: "Pinecone Co 1234" }), "Pinecone Co", "the payer from the memo");
  assert.equal(incKey({}, { ...a, from: "Bank transfer", desc: "Credit" }), "Freelance & business income");
  const S = { cfg: { renames: { [a.id]: "Pinecone design work", [b.id]: "Pinecone design work" } } };
  assert.equal(incKey(S, a), "Pinecone design work"); assert.equal(incKey(S, b), incKey(S, a), "the same income is one row");
});
test("bank and payment-app names never become an income's name, real payee names stay whole", () => {
  const a = tx("2026-09-03", "זיכוי", "זיכוי", 500, "Freelance & business income");
  for (const w of ["זיכוי מלאומי", "הפק מזומן בנקט", "bit העברת כסף", "Paybox", "העברה מבנק הפועלים", "Deposit Leumi", "זיכוי מדיסקונט 12/10"])
    assert.equal(incKey({}, { ...a, desc: w }), "Freelance & business income", w);
  assert.equal(incKey({}, { ...a, desc: "bit העברת כסף", memo: "Dana Levi" }), "Dana Levi", "the payer from the memo");
  for (const w of ["Leumi Card Refunds Ltd", "כסף קטן בע\"מ", "Discount Books", "מזרחי משה"]) assert.equal(incKey({}, { ...a, desc: w }), plainOf(w), w);
});

test("a row with money in only one of the months shown has no direction", () => {
  assert.equal(direction({ came: 1, of: 3, mean: 318, sl: -477 }, "in").word, "none", "₪955 once in 3 months: no direction");
  assert.equal(direction({ came: 1, of: 3, mean: 318, sl: 0 }, "out").sym.trim(), "—");
  const S = state({ tx: [...state().tx, tx("2026-08-09", "Gift", "Birch Family", 955, "Income", { to: "Bank" })] }), M = forecastModel(S, NOW, {}, { n: 3 });
  const g = M.d.inc.find((r) => /Birch/.test(r.k)); assert.equal(g.came, 1); assert.equal(direction(g, "in").word, "none");
});

test("payments the bank already lists for later this month count in this month's spending, once", () => {
  // paid on the 28th every month, and this month already listed by the bank for the 28th: counted once, not again as usual
  const ins = (d) => [tx(d, "Oak Insurance", "Bank", -319, "Insurance", { to: "Oak Insurance" }), tx(d, "Elm Insurance", "Bank", -178, "Insurance", { to: "Elm Insurance" })];
  const S = state({ tx: [...state().tx, ...["2026-07-28", "2026-08-28", "2026-09-28", "2026-10-28"].flatMap(ins)],
    cats: { Income: 99, "Rent & housing": 0, Groceries: 1, Insurance: 2 } });
  const H = homeModel(S, NOW), R = recapModel(H, NOW), L = forecastLine(S, H, NOW, { n: 3 }), M = forecastModel(S, NOW, {}, { n: 3 }, H);
  near(R.billsTot, 497, "Recap: still to pay"); assert.deepEqual(rowV(L, "Insurance"), [497, 497, 497], "in this month's spending, once");
  near(R.end, R.cash - R.sure - R.likelyBank + R.incLeft, "Recap's end of this month takes them off");
  near(L.really, R.end - R.nextBill, "the forecast's end of this month = Recap's"); near(endPoint(M.d).v, M.d.month1.really, "the chart's point = the strip's tile");
});

test("rule 6 (words): every row says going up, going down or steady", () => {
  assert.equal(direction({ came: 2, of: 3, mean: 11200, sl: 0 }, "in").word, "steady");
  assert.equal(direction({ mean: 10000, sl: 500 }, "in").word, "up"); assert.equal(direction({ mean: 10000, sl: -500 }, "out").word, "down");
});

test("rule 5: it starts from what is really yours at the end of this month; every month = the month before + saved", () => {
  const S = state(), H = homeModel(S, NOW), L = forecastLine(S, H, NOW, { n: 3 }), R = recapModel(H, NOW);
  const g = L.ex.find((r) => r.k == "Groceries"), rent = L.ex.find((r) => r.k == "Rent & housing");
  assert.equal(g.share, 1); assert.equal(rent.share, 0);
  near(L.cash, 20000, "today's bank money"); near(L.start, R.reallyNow, "now is really yours today, as Recap shows it"); near(L.bal[0], L.really, "the line starts at the end of this month");
  near(R.reallyNow, Math.round(R.cash) - Math.round(R.cardsNext) - Math.round(R.sure), "really yours today = bank - card purchases not paid yet - payments already due");
  near(L.really, R.reallyNow - R.likely + R.incLeft, "from today to the end of the month: the rest of the month's spending and income"); near(L.endThis, R.end, "the end of this month is Recap's");
  // each month's money in and out, rounded once to whole shekels (the balance adds up these)
  const inc = (k) => Math.round(L.inc.reduce((s, r) => s + r.at(k), 0)), out = (k) => Math.round(L.ex.reduce((s, r) => s + r.at(k), 0));
  near(L.really, R.end - R.nextBill, "really yours = the end of this month less this month's card purchases not paid yet");
  near(L.bal[1], L.really + inc(1) - out(1), "month 1");
  for (let k = 2; k <= 12; k++) near(L.bal[k] - L.bal[k - 1], inc(k) - out(k), "month " + k);
  near(L.bal[12] - L.really, Array.from({ length: 12 }, (_, i) => inc(i + 1) - out(i + 1)).reduce((a, b) => a + b, 0), "the whole year");
});

test("rule 6: a direction fades month by month and never goes more than 20% from the usual month", () => {
  const e = est([100, 103, 106]);
  near(e.mean, 103, "usual month"); near(e.sl, 3, "change per month");
  near(e.at(1), 109, "next month: a full step after the last month"); near(e.at(2), 110.5, "then half a step"); near(e.at(3), 111.25, "then a quarter");
  assert.ok(e.at(12) < 112);
  // "Steady" (under 2% a month, the direction's own threshold): every month ahead is exactly the average
  const st = est([150, 152, 154]); near(st.mean, 152, "usual month");
  for (let k = 1; k <= 12; k++) assert.equal(st.at(k), st.mean, "steady: month " + k + " is the average");
  assert.ok(direction({ ...st }, "out").flat, "and it is shown as Steady");
  const up = est([100, 200, 300]); for (let k = 1; k <= 12; k++) assert.ok(up.at(k) <= up.mean * 1.2 + 1e-9 && up.at(k) >= up.mean * 0.8 - 1e-9);
  const one = est([100, 100, 1000]); near(one.mean, 120, "a one-off month is pulled toward the typical month");
  assert.equal(est([50, 60]).sl, 0, "with under 3 months there is no direction");
});

test("the table's bars: one per month, this month partly so far, a month below zero drawn down", () => {
  const b = barsOf([100, 200, 400], 100);
  assert.deepEqual(b.map((x) => x.h), [25, 50, 100]); assert.equal(b[2].s, 25); assert.equal(b[2].part, true); assert.equal(b[0].part, false);
  const n = barsOf([-100, 200]); assert.equal(n[0].b, 25); assert.equal(n[0].h, 25); assert.equal(n[1].b, 50); assert.equal(n[1].h, 50);
});

test("Recap's look at next month is the Forecast page's first month", () => {
  const S = state(), H = homeModel(S, NOW), M = forecastModel(S, NOW, {}, {}, H), m1 = M.d.month1, R = recapModel(H, NOW);
  near(m1.end, M.d.bal[1], "the same end");
  near(m1.really + m1.incT - m1.outT, M.d.bal[1], "the steps add up"); near(m1.really, m1.endThis - m1.cardBill, "really yours");
  near(m1.endThis, R.end, "starts from Recap's end of this month"); near(m1.cardBill, R.nextBill, "pays Recap's next card bill");
  near(m1.cardsMade + m1.cardsMore, m1.cardBill, "the card bill is what was bought plus what is expected");
  near(M.d.net[1], M.d.bal[1] - M.d.really, "next month's own money in less money out");
});

test("the Forecast table lands on the chart's points: next month and in a year", () => {
  const S = state({ tx: [...state().tx, tx("2026-10-12", "Sofa", "Card", -6000, "Groceries")] }), M = forecastModel(S, NOW, {}, {}), d = M.d, T = forecastTable(d, 12);
  near(T.end1, d.bal[1], "next month"); near(T.endH, d.bal[12], "in a year");
  near(T.saved1, T.i1 - T.e1, "saved = money in - money out"); near(T.savedH, T.iH - T.eH, "saved, in a year");
  near(T.saved1, d.net[1], "next month's step on the chart"); near(d.bal[1], d.really + T.saved1, "starts from really yours");
});

test("the table's month so far is Activity's month, and its expected total shows the payments still to come", () => {
  const ins = (d) => [tx(d, "Oak Insurance", "Bank", -319, "Insurance", { to: "Oak Insurance" }), tx(d, "Elm Insurance", "Bank", -178, "Insurance", { to: "Elm Insurance" })];
  const S = state({ tx: [...state().tx, ...["2026-07-28", "2026-08-28", "2026-09-28", "2026-10-28"].flatMap(ins)], cats: { Income: 99, "Rent & housing": 0, Groceries: 1, Insurance: 2 } });
  const M = forecastModel(S, NOW, {}, { n: 3 }), j = M.d.last, at = (o) => Object.values(o).reduce((s, a) => s + (a[j] || 0), 0);
  const g = groupRows(S.tx.filter((t) => rdOf(t).startsWith("2026-10")), "month", "new", kinds(S, "2026-10-20")).find((x) => x.key.startsWith("2026-10"));
  near(at(M.ER), g.T.out, "money out so far = Activity's month"); near(at(M.d.IR) - at(M.ER), g.T.net, "saved so far = Activity's month");
  const up = Object.values(M.UP).reduce((s, v) => s + v, 0);
  near(up, g.P, "still to come = Activity's upcoming"); near(M.UP.Insurance, 497, "on their own row");
  assert.ok(at(M.E) >= at(M.ER) + up - 0.01, "the month as counted includes them");
  near(M.E.Insurance[j], 497, "Insurance: the month as counted is the payments still to come");
});

test("a pending card purchase counts the way the Activity page counts it, and only once", () => {
  const fine = (o) => tx("2026-10-15", "City parking fine", "Card", -650, "Groceries", o);
  const S = state({ tx: [...state().tx, fine({ pending: true })] }), L = forecastLine(S, homeModel(S, NOW), NOW, { n: 3 });
  const S2 = state({ tx: [...state().tx, fine()] }), L2 = forecastLine(S2, homeModel(S2, NOW), NOW, { n: 3 });
  const soFar = (o) => Object.values(o).reduce((s, a) => s + a[L.FH.last], 0);
  const act = totals(S.tx.filter((t) => rdOf(t).startsWith("2026-10")), kinds(S, "2026-10-20"));
  near(soFar(L.IR) - soFar(L.ER), act.net, "this month so far = Activity");
  for (let k = 0; k <= 12; k++) near(L.bal[k], L2.bal[k], "month " + k + ": the same as a card purchase that is no longer pending");
  near(L.cardBill, L2.cardBill, "paid once, with next month's card bill");
});

test("income: every month ahead is its plain average (no softening, no trend); its trend is still shown", () => {
  // a side income of ₪16,800 in 2 of the 3 months, growing: ₪11,200 every month, and "Going up"
  const T = state().tx.filter((t) => t.desc != "Bonus");
  T.push(tx("2026-09-15", "Side job", "Pinecone Co", 16800, "Income", { to: "Bank" }), tx("2026-10-02", "Side job", "Pinecone Co", 16800, "Income", { to: "Bank" }));
  const S = state({ tx: T }), L = forecastLine(S, homeModel(S, NOW), NOW, { n: 3 }), r = L.inc.find((x) => x.k == incKey(S, T.at(-1)));
  near(r.mean, 11200, "plain average");
  for (let k = 1; k <= 12; k++) near(r.at(k), 11200, "month " + k);
  assert.equal(direction(r, "in").word, "up");
  // spending keeps its softening and its trend
  const g = L.ex.find((x) => x.k == "Groceries"); assert.notEqual(g.at(1), g.mean);
});

test("a row with money in only one of the months: its average every month, no trend", () => {
  const S = state({ tx: [...state().tx, tx("2026-04-01", "Salary", "Sunflower Ltd", 10000, "Income", { to: "Bank" }), tx("2026-09-08", "Sofa", "Bank", -10000, "Furniture")] }), L = forecastLine(S, homeModel(S, NOW), NOW, { n: 6 });
  const r = L.ex.find((x) => x.k == "Furniture");
  near(r.mean, 10000 / 6, "average of the 6 months");
  for (let k = 1; k <= 12; k++) near(r.at(k), 10000 / 6, "month " + k);
  assert.equal(direction(r, "out").none, true);
});

test("the jars and the forecast alert follow the chosen months, the same line as the Forecast page", () => {
  const S = state(), H = homeModel(S, NOW);
  for (const n of [3, 6, 12]) {
    const L = forecastLine(S, H, NOW, { n }), P = jarProject(S, H, NOW, { n });
    for (let k = 2; k <= 12; k++) near(P.sur[k - 1], L.bal[k] - L.bal[k - 1], n + " months, month " + k);
  }
  // the alert: the chosen months (3 when none), and the end of this month counts too
  const neg = state({ cfg: { forecast: true }, accounts: state().accounts.map((a) => (a.kind == "bank" ? { ...a, v: -90000 } : a)) }), M = homeModel(neg, NOW);
  const fcA = (fc) => alertsModel(neg, { ...M, budgets: budgetsModel(neg, NOW).info }, NOW, fc).find((x) => x.type == "forecast");
  assert.equal(fcA({}).p.n, 3); assert.equal(fcA({ n: 12 }).p.n, 12);
  assert.equal(fcA({ n: 6 }).p.when, "2026-10");
});
