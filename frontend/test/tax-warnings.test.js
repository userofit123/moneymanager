// Taxes and reports warnings (lib/taxReports.js taxWarnings) and their alerts (lib/alerts.js): a late date, money in over
// or near an item's limit, and a last day coming up with papers still missing. Names and amounts are made up.
import test from "node:test";
import assert from "node:assert/strict";
import { setNow } from "../src/core/clock.js";
import { taxWarnings, EXAMPLES } from "../src/lib/taxReports.js";
import { alertsModel } from "../src/lib/alerts.js";

const FREELANCE = "Freelance & business income", BUSINESS = "Business expenses";
const ex = (id, more = {}) => ({ ...structuredClone(EXAMPLES.find((x) => x.ex == id)), id: 1, ...more });
const tx = [
  { id: 1, d: "2026-11-03", a: 5900, desc: "Client Alpha", from: "Client Alpha", to: "Bank", c: FREELANCE, tags: [], docs: [] },
  { id: 2, d: "2026-12-10", a: 5900, desc: "Client Beta", from: "Client Beta", to: "Bank", c: FREELANCE, tags: [], docs: [] },
  { id: 3, d: "2026-11-12", a: -1180, desc: "Paper Corner", from: "Bank", to: "Paper Corner", c: BUSINESS, tags: [], docs: [] },
  { id: 4, d: "2026-12-02", a: -1180, desc: "Fuel Point", from: "Bank", to: "Fuel Point", c: BUSINESS, tags: [], docs: [], docIds: [7] },
  { id: 5, d: "2026-10-30", a: 1000, desc: "Client Gamma", from: "Client Gamma", to: "Bank", c: FREELANCE, tags: [], docs: [] },
];
// VAT every 2 months from July (when the business type changes); the two earlier dates are marked done
const vat = () => ex("vat", { done: { "2026-09-15": { sent: true }, "2026-11-15": { sent: true } } });
const S0 = (items) => ({ accounts: [{ n: "Bank", kind: "bank" }], tx: structuredClone(tx), xf: [], taxItems: items,
  bizTypes: [{ id: "patur", n: "Patur", from: "2026-01-01" }, { id: "murshe", n: "Murshe", from: "2026-07-01" }] });
setNow("2027-01-05T12:00:00");
const kinds = (W) => W.map((L) => L.map((w) => w.kind));

test("a last day coming up with papers missing: only within the days before", () => {
  const [[w]] = taxWarnings(S0([vat()]), "2027-01-05", 10);
  assert.deepEqual([w.kind, w.period.key, w.days, w.missing], ["soon", "2027-01-15", 10, 1], "Paper Corner has no invoice");
  assert.deepEqual(taxWarnings(S0([vat()]), "2027-01-05", 7), [], "10 days away: not yet");
  const paid = S0([vat()]); paid.tx[2].docs = ["paper-invoice.pdf"];
  assert.deepEqual(taxWarnings(paid, "2027-01-05", 10), [], "no papers missing: no warning");
});

test("a late date comes first, with how many are late", () => {
  const [[w]] = taxWarnings(S0([ex("vat")]), "2027-01-05", 10);
  assert.deepEqual([w.kind, w.period.key, w.count], ["late", "2026-09-15", 2]);
  assert.deepEqual(kinds(taxWarnings(S0([ex("vat")]), "2027-01-05", 10)), [["late", "soon"]]);
});

test("money in over the limit before near; the rounded numbers of limitCheck", () => {
  const near = { ...ex("paturLimit"), when: { over: 14000 } }, over = { ...ex("paturLimit"), when: { over: 12000 } };
  const [[n]] = taxWarnings(S0([near]), "2026-12-31");
  assert.deepEqual([n.kind, n.check], ["near", { total: 12800, limit: 14000, pct: 91, over: false, near: true }]);
  assert.deepEqual(kinds(taxWarnings(S0([over]), "2026-12-31")), [["over"]]);
  assert.deepEqual(taxWarnings(S0([{ ...near, when: { over: 30000 } }]), "2026-12-31"), [], "far from the limit");
});

const M0 = (S) => ({ S, billsAll: [], budgets: [], cards: [], rows: [], nameOf: (t) => t.desc });
const taxAlerts = (S, day) => alertsModel(S, M0(S), new Date(day + "T12:00:00"), {}).filter((x) => x.type == "taxes");

test("one alert per item, the first one not dismissed; off when the kind is off", () => {
  const S = { ...S0([ex("vat")]), cfg: { taxes: 1, taxDays: 10 } };
  const [a] = taxAlerts(S, "2027-01-05");
  assert.deepEqual([a.id, a.sev, a.key, a.go, a.taxItem, a.taxKey, a.p.c, a.p.date, a.p.nk], ["tlt-1-2026-11-15", "high", "taxLate", "taxes", 1, "2026-09-15", 2, "2026-09-15", "taxes.ex.vat"]);
  assert.equal(taxAlerts(S, "2027-01-05").length, 1);
  S.dismissed = { [a.id]: 1 };
  assert.deepEqual(taxAlerts(S, "2027-01-05"), [], "a dismiss keeps the item quiet: no alert for its missing papers either");
  const done = structuredClone(S); done.taxItems[0].done = { "2026-09-15": { sent: true }, "2026-11-15": { sent: true } };
  const [b] = taxAlerts(done, "2027-01-05");
  assert.deepEqual([b.key, b.sev, b.p.d, b.p.m, b.taxKey], ["taxSoon", "med", 10, 1, "2027-01-15"], "once the late dates are done, the next one alerts");
  S.cfg.taxes = 0;
  assert.deepEqual(taxAlerts(S, "2027-01-05"), []);
  const L = { ...S0([{ ...ex("paturLimit"), n: "Exempt limit", when: { over: 14000 } }]), cfg: { taxes: 1 } };
  const [c] = taxAlerts(L, "2026-12-31");
  assert.deepEqual([c.id, c.key, c.p.n, c.p.pct, c.p.total, c.p.lim], ["tnr-1-2026", "taxNear", "Exempt limit", 91, "₪12,800", "₪14,000"]);
});

test("a late alert dismissed comes back when another date becomes late; oldest date and count in the text", () => {
  const S = { ...S0([ex("vat")]), cfg: { taxes: 1, taxDays: 0 } };
  const [a] = taxAlerts(S, "2027-01-05");
  assert.equal(a.id, "tlt-1-2026-11-15", "the id holds the newest late date");
  S.dismissed = { [a.id]: 1 };
  assert.deepEqual(taxAlerts(S, "2027-01-05"), []);
  const [b] = taxAlerts(S, "2027-01-20");
  assert.deepEqual([b.id, b.p.c, b.p.date], ["tlt-1-2027-01-15", 3, "2026-09-15"]);
});

test("money in limits: only items with no dates, over only when the item applies, near and over quiet together", () => {
  const over = { ...ex("paturLimit"), when: { over: 12000 } };
  assert.deepEqual(kinds(taxWarnings(S0([{ ...over, repeat: { every: 12, month: 1, day: 31 } }]), "2026-12-31")).flat().filter((k) => k == "over" || k == "near"), [], "an item with dates: no limit warning");
  const S = S0([{ ...over, when: { type: "patur", over: 12000 } }]); S.bizTypes = [{ id: "murshe", n: "Murshe", from: "2026-01-01" }];
  assert.deepEqual(taxWarnings(S, "2026-12-31"), [], "the business type does not apply: no limit warning");
  const L = { ...S0([over]), cfg: { taxes: 1 }, dismissed: { "tnr-1-2026": 1 } };
  assert.deepEqual(taxAlerts(L, "2026-12-31"), [], "near dismissed this year: over is quiet too");
  assert.equal(taxAlerts({ ...L, dismissed: {} }, "2026-12-31")[0].id, "tov-1-2026");
});
