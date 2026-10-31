// Things the app works out by itself after a sync, so nobody has to mark them one by one:
//  - a card bill paid from the bank (its amount equals what the card charged on that day).
// (A salary is never guessed here: only your money coming in rules or your own choice make money in a salary, in the app.)
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
    // the card is the account a purchase left from (from_name) or a refund came into (to_name); a refund lowers the bill
    `SELECT a.name AS acc, t.source, t.amount::float AS amt, t.details->>'processedDate' AS pd
     FROM transactions t JOIN accounts a ON a.name=(CASE WHEN t.amount<0 THEN t.from_name ELSE t.to_name END) AND a.kind='card'
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
