// Made-up sample data for checking screens on the test site only: open any page with ?sample=1.
// Works only in the Vite dev server (never in the built app) and never reads or writes the database.
export const sampleOn = () => import.meta.env?.DEV && typeof location !== "undefined" && new URLSearchParams(location.search).has("sample");

const day = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
export function sampleState() {
  return {
    rev: "sample",
    accounts: [{ n: "Main bank", kind: "bank", v: 18400, cur: "ILS", inNW: true, at: day(0) }, { n: "Savings", kind: "bank", v: 9000, cur: "ILS", inNW: true, at: day(0) }, { n: "Visa card", kind: "card", v: 0, cur: "ILS" }],
    jarsBuffer: 5000,
    jars: [
      { id: "j1", n: "Trip to Greece", p: 1, bal: 6200, need: 12000, cap: 1000, got: 1000, due: day(-300), desc: "Flights and hotel for the summer." },
      { id: "j2", n: "Car insurance", p: 2, bal: 1400, need: 3600, cap: 300, got: 0 },
      { id: "j3", n: "Rainy day", p: 3, bal: 2500, need: 0, cap: 500, got: 250, cats: [{ c: "Home", since: day(60) }] },
      { id: "j4", n: "New laptop", p: 4, bal: 4000, need: 4000, cap: 0, got: 0 },
      { id: "j5", n: "Old sofa", p: 0, bal: 0, need: 2500, cap: 0, done: day(90) },
    ],
    cats: { Food: 1, Transport: 1, Home: 1, Fun: 1, Income: 1 },
    tagRules: [], xf: [{ o: "s5", i: "s6", st: "ok" }], txIgnore: {}, ccOverride: {},
    tx: [
      { id: "s1", d: day(1), a: -142.5, desc: "Shufersal", from: "Visa card", to: "Shufersal", c: "Food", tags: ["home"] },
      { id: "s2", d: day(2), a: -38, desc: "Rav-Kav top up", from: "Visa card", to: "Rav-Kav", c: "Transport", tags: [] },
      { id: "s3", d: day(3), a: 12500, desc: "Salary", from: "Work", to: "Main bank", c: "Income", tags: [] },
      { id: "s4", d: day(5), a: -3800, desc: "Rent", from: "Main bank", to: "Landlord", c: "Home", tags: ["home"] },
      { id: "s5", d: day(6), a: -1000, desc: "To savings", from: "Main bank", to: "Savings", tags: [] },
      { id: "s6", d: day(6), a: 1000, desc: "From main bank", from: "Main bank", to: "Savings", tags: [] },
      { id: "s7", d: day(9), a: -89.9, desc: "Cinema", from: "Visa card", to: "Yes Planet", c: "Fun", tags: [] },
      { id: "s8", d: day(12), a: -55, desc: "Coffee shop", from: "Visa card", to: "Aroma", tags: [] },
      { id: "s9", d: day(35), a: -2100, desc: "Visa card payment", from: "Main bank", to: "Visa card", tags: [] },
      { id: "s10", d: day(38), a: -412, desc: "Electric bill", from: "Main bank", to: "Electric company", c: "Home", tags: [] },
      { id: "s11", d: day(40), a: 12500, desc: "Salary", from: "Work", to: "Main bank", c: "Income", tags: [] },
      { id: "s12", d: day(44), a: -260, desc: "Supermarket", from: "Visa card", to: "Rami Levy", c: "Food", tags: [] },
    ],
  };
}
