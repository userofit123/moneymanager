// The "Full by" dates on the Jars page: the new app gives the same months as the current app's own code (web/js jarProject, jarWhen) on the same data.
import test from "node:test";
import assert from "node:assert/strict";
import { oldApp } from "./old-app.js";
import { jarsModel } from "../src/views/jars.js";

process.on("unhandledRejection", () => {});
const old = oldApp(new Date(2026, 9, 17, 12)); // 17 Oct 2026
const ds = (y, m, d) => new Date(y, m, d).toISOString().slice(0, 10);
const data = (o = {}) => {
  const tx = []; let id = 1;
  for (let m = 0; m < 10; m++) {
    tx.push({ id: id++, d: ds(2026, 9 - m, 3), desc: "Salary", from: "Work", to: "Bank", a: 9000 + m * 50, c: "Income" });
    tx.push({ id: id++, d: ds(2026, 9 - m, 8), desc: "Shufersal", from: "Bank", to: "Shufersal", a: -(3000 + (m % 3) * 400), c: "Food" });
    tx.push({ id: id++, d: ds(2026, 9 - m, 12), desc: "Rent", from: "Bank", to: "Landlord", a: -3500, c: "Home" });
  }
  return { cats: { Food: 1, Home: 2, Income: 99 }, cfg: {}, budgets: {}, jarsBuffer: 1000, xf: [], txIgnore: {}, ccOverride: {}, bills: [],
    accounts: [{ id: 1, n: "Bank", kind: "bank", v: 12000, cur: "ILS", inNW: true, at: "x" }],
    jars: [{ id: 1, n: "Trip", p: 1, bal: 2000, need: 9000, cap: 800, got: 0 }, { id: 2, n: "Car", p: 2, bal: 0, need: 20000, cap: 0, auto: true, due: "2028-01-01", got: 0 },
      { id: 3, n: "Rainy", p: 3, bal: 500, need: 0, cap: 300 }, { id: 4, n: "Laptop", p: 4, bal: 0, need: 6000, cap: 1500 }, { id: 5, n: "House", p: 5, bal: 0, need: 900000, cap: 2000 }],
    tx, ...o };
};
const oldDates = (S, fc) => old.run(`localStorage.setItem("moneyFc",JSON.stringify(__fc));fc={h:12,n:6,m:"smart",...__fc};S={...emptyState(),...structuredClone(__S)};detect();derive();detectBills();BC=billsInfo(true);JPC=null;
  jarProject().J.filter(j=>!(j.need>0)?false:j.cap!=null&&capOf(j,j.got)>0&&j.bal<j.need).map(j=>[j.id,j.eta?jarWhen(j.eta):"Over 5 years"])`, { __S: S, __fc: fc });
const newDates = (S, fc) => jarsModel(structuredClone(S), new old.Date(), {}, fc).jars.filter((j) => j.state.eta)
  .map((j) => [j.id, j.state.eta.k ? new Date(+j.state.eta.when.slice(0, 4), +j.state.eta.when.slice(5, 7) - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "Over 5 years"]);

for (const [name, S, fc] of [
  ["typical month", data(), {}],
  ["more kept untouched", data({ jarsBuffer: 9000 }), {}],
  ["little money today", data({ accounts: [{ id: 1, n: "Bank", kind: "bank", v: 3000, cur: "ILS", inNW: true, at: "x" }] }), {}],
  ["forecast on 3 months, average", data(), { n: 3, m: "avg" }],
  ["forecast on 12 months, trend", data(), { n: 12, m: "trend" }],
]) test("Full by dates match the current app: " + name, () => {
  const a = JSON.parse(JSON.stringify(oldDates(S, fc))), b = newDates(S, fc);
  assert.ok(a.length >= 3);
  assert.deepEqual(b, a);
});
