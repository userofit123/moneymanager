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
  const fresh = SUGGESTED_RULES.filter(([k]) => { const l = k.toLowerCase(); if (have.has(l)) return false; have.add(l); return true; });
  // New rules go in front of the old ones: the specific names must win over broad words like "ביטוח" that an earlier version added.
  const first = (await run("SELECT COALESCE(min(position),1) AS p FROM rules")).rows[0].p - fresh.length;
  for (const [i, [k, cat]] of fresh.entries()) {
    await run("INSERT INTO rules (keyword,category,tag,position) VALUES ($1,$2,'',$3)", [k, cat, first + i]);
    rules++;
  }
  return { categories: cats, rules };
}
