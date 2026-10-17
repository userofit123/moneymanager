// Made-up sample data for checking screens on the test site only: open any page with ?sample=1.
// Works only in the Vite dev server (never in the built app) and never reads or writes the database.
export const sampleOn = () => import.meta.env?.DEV && typeof location !== "undefined" && new URLSearchParams(location.search).has("sample");

const day = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
export function sampleState() {
  return {
    rev: "sample",
    accounts: [{ n: "Main bank", kind: "bank" }, { n: "Savings", kind: "bank" }, { n: "Visa card", kind: "card" }],
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
