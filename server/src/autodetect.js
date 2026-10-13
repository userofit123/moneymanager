// Things the app works out by itself after a sync, so nobody has to mark them one by one:
//  - a card bill paid from the bank (its amount equals what the card charged on that day),
//  - a salary (an income that says so, or the same payer paying a similar amount month after month).
import { audit } from "./db.js";

// The banks give timestamps. A date at local midnight arrives as 21:00 or 22:00 of the day before in UTC, so a date is always read in Israel time.
export const ilDate = (v) => {
  if (!v) return "";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d)) return s.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
};
const dayNum = (s) => Math.round(Date.parse(s + "T00:00:00Z") / 864e5);

export async function detectCardPayments(c) {
  const cards = (await c.query(
    `SELECT t.from_name AS acc, t.source, t.amount::float AS amt, t.details->>'processedDate' AS pd
     FROM transactions t JOIN accounts a ON a.name=t.from_name AND a.kind='card'
     WHERE NOT t.pending AND t.details->>'processedDate' IS NOT NULL AND t.date > current_date - interval '420 days'`)).rows;
  if (!cards.length) return 0;
  const groups = new Map(); // "company|IL date" and "account|IL date" -> signed sum of what the card charged that day
  for (const r of cards) {
    const d = ilDate(r.pd);
    for (const k of [`s:${r.source}|${d}`, `a:${r.acc}|${d}`]) groups.set(k, +((groups.get(k) || 0) + r.amt).toFixed(2));
  }
  const prev = (await c.query("SELECT value FROM settings WHERE key='cc_override'")).rows[0]?.value || {};
  const ov = { ...prev };
  const outs = (await c.query(
    `SELECT t.id, t.amount::float AS amt, t.date::text AS d, t.description FROM transactions t JOIN accounts a ON a.name=t.from_name AND a.kind='bank'
     WHERE t.amount<-20 AND NOT t.pending AND t.date > current_date - interval '420 days'`)).rows;
  let n = 0;
  for (const t of outs) {
    if (ov[t.id]) continue;
    const hit = [...groups].find(([k, sum]) => sum < 0 && Math.abs(Math.abs(sum) - Math.abs(t.amt)) < 1 && Math.abs(dayNum(k.split("|")[1]) - dayNum(t.d)) <= 3);
    if (!hit) continue;
    ov[t.id] = 2; n++;
    await audit(c, "Card payment found", `${t.description}: it matches what the card charged on ${hit[0].split("|")[1]}, so it is not counted as spending`);
  }
  if (n) await c.query("INSERT INTO settings (key,value) VALUES ('cc_override',$1) ON CONFLICT (key) DO UPDATE SET value=$1", [JSON.stringify(ov)]);
  return n;
}

export const normText = (s) => String(s || "").toLowerCase().replace(/[.'"״׳_,\-]/g, "").replace(/\s+/g, " ").trim();
const SALARY_WORDS = /(משכורת|שכר עבודה|שכר\b|salary|payroll|wages)/i;
export async function detectSalary(c) {
  const inc = (await c.query(
    `SELECT t.id, t.description, t.from_name, t.amount::float AS amt, t.date::text AS d, t.category FROM transactions t
     WHERE t.amount>0 AND NOT t.pending AND t.source<>'manual' AND (t.category IS NULL OR t.category='Salary')
       AND NOT EXISTS (SELECT 1 FROM transfer_links l WHERE (l.out_id=t.id OR l.in_id=t.id) AND l.status<>'rej')
       AND t.date > current_date - interval '420 days'`)).rows;
  const ids = new Set();
  const mine = ((await c.query("SELECT value FROM settings WHERE key='salary_rules'")).rows[0]?.value || []).map(normText).filter((x) => x.length > 1);
  for (const t of inc) {
    if (t.category) continue;
    const hay = normText(t.description + " " + (t.from_name || ""));
    if (SALARY_WORDS.test(t.description) || mine.some((m) => hay.includes(m))) ids.add(t.id);
  }
  const byPayer = new Map();
  for (const t of inc) { const k = String(t.from_name || t.description).trim().toLowerCase(); if (k) (byPayer.get(k) || byPayer.set(k, []).get(k)).push(t); }
  for (const L of byPayer.values()) {
    const months = new Set(L.map((t) => t.d.slice(0, 7)));
    if (months.size < 3) continue;
    const a = L.map((t) => t.amt).sort((x, y) => x - y), med = a[Math.floor(a.length / 2)];
    if (med < 1500) continue;
    const near = L.filter((t) => Math.abs(t.amt - med) <= med * 0.35);
    if (new Set(near.map((t) => t.d.slice(0, 7))).size < 3 || near.length < L.length * 0.6) continue;
    for (const t of near) ids.add(t.id);
  }
  const todo = inc.filter((t) => !t.category && ids.has(t.id));
  if (!todo.length) return 0;
  await c.query("INSERT INTO categories (name,color) VALUES ('Salary',99) ON CONFLICT (name) DO NOTHING");
  for (const t of todo) await c.query("UPDATE transactions SET category='Salary' WHERE id=$1 AND category IS NULL", [t.id]);
  await audit(c, "Salary found", `${todo.length} income entr${todo.length === 1 ? "y" : "ies"} marked as Salary (it says so, or the same payer pays a similar amount every month)`);
  return todo.length;
}
