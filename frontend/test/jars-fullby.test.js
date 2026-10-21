// The "Full by" dates on the Jars page: the agreed months on fixed data (saved in fixtures/, see golden.js).
import test from "node:test";
import assert from "node:assert/strict";
import { matchesSaved } from "./golden.js";
import { jarsModel } from "../src/lib/jars.js";

process.on("unhandledRejection", () => {});
const NOW = new Date(2026, 9, 17, 12); // 17 Oct 2026
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
const newDates = (S, fc) => jarsModel(structuredClone(S), NOW, {}, fc).jars.filter((j) => j.state.eta)
  .map((j) => [j.id, j.state.eta.k ? new Date(+j.state.eta.when.slice(0, 4), +j.state.eta.when.slice(5, 7) - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "Over 5 years"]);

for (const [name, key, S, fc] of [
  ["typical month", "typical", data(), {}],
  ["more kept untouched", "buffer", data({ jarsBuffer: 9000 }), {}],
  ["little money today", "lowcash", data({ accounts: [{ id: 1, n: "Bank", kind: "bank", v: 3000, cur: "ILS", inNW: true, at: "x" }] }), {}],
  ["forecast on 3 months, average", "avg3", data(), { n: 3, m: "avg" }],
  ["forecast on 12 months, trend", "trend12", data(), { n: 12, m: "trend" }],
]) test("each jar with a goal says the month it will be full: " + name, () => {
  const b = newDates(S, fc);
  assert.ok(b.length >= 3);
  matchesSaved("jars-fullby." + key, b);
});
