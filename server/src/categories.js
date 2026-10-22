// The few categories the app itself relies on: unsorted entries, income and salary, transfer fees, card bill payments.
// Every other category, rule and tag is the person's own (typed in, or made by an AI from their own transactions on the
// Categories page). Adding is idempotent: nothing that already exists is changed.
import { q } from "./db.js";

// [name, colour index]; 99 = income (green)
export const CORE_CATEGORIES = [
  ["Uncategorized", 6], ["Income", 99], ["Salary", 99], ["Other income", 99], ["Fees & FX costs", 5], ["Loans & credit payments", 6],
];

export async function addCore(c = null) {
  const run = (t, p) => (c || { query: q }).query(t, p);
  let n = 0;
  for (const [name, color] of CORE_CATEGORIES) n += (await run("INSERT INTO categories (name,color) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING", [name, color])).rowCount;
  return n;
}
