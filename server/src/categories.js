// Suggested categories and starter rules (English and Hebrew merchant names). Adding is idempotent: nothing that
// already exists is changed, so your own categories and rules are never overwritten.
import { q } from "./db.js";

// [name, colour index]; 99 = income (green)
export const SUGGESTED_CATEGORIES = [];

const R = (category, words) => words.map((k) => [k, category]);
export const SUGGESTED_RULES = [];

export async function addSuggested(c = null) {
  const run = (t, p) => (c || { query: q }).query(t, p);
  let cats = 0, rules = 0;
  for (const [name, color] of SUGGESTED_CATEGORIES) cats += (await run("INSERT INTO categories (name,color) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING", [name, color])).rowCount;
  const have = new Set((await run("SELECT lower(keyword) AS k FROM rules")).rows.map((r) => r.k));
  const pos = (await run("SELECT COALESCE(max(position),0)+1 AS p FROM rules")).rows[0].p;
  let i = 0;
  for (const [k, cat] of SUGGESTED_RULES) {
    if (have.has(k.toLowerCase())) continue;
    have.add(k.toLowerCase());
    await run("INSERT INTO rules (keyword,category,tag,position) VALUES ($1,$2,'',$3)", [k, cat, pos + i++]);
    rules++;
  }
  return { categories: cats, rules };
}
