// Server-side rules that keep the books right after every import: categories, transfers, duplicates, balance gaps.
import { audit } from "./db.js";

const OWN_FALLBACK = ["Bank Hapoalim", "Wise"];

// 1. Rules: never overwrite a category that is already set.
export async function applyRules(c) {
  const rules = (await c.query("SELECT keyword,category,tag FROM rules ORDER BY position,id")).rows;
  if (!rules.length) return 0;
  const rows = (await c.query(
    `SELECT t.id,t.description FROM transactions t
     WHERE t.category IS NULL AND NOT EXISTS (SELECT 1 FROM transfer_links l WHERE (l.out_id=t.id OR l.in_id=t.id) AND l.status<>'rej')`)).rows;
  let n = 0;
  for (const t of rows) {
    const r = rules.find((r) => t.description.toLowerCase().includes(r.keyword.toLowerCase()));
    if (!r) continue;
    await c.query("UPDATE transactions SET category=$2 WHERE id=$1", [t.id, r.category]);
    for (const tag of String(r.tag || "").split(",").map((x) => x.trim().replace(/^#+/, "")).filter(Boolean)) { // a rule can carry several tags, separated by commas
      await c.query("INSERT INTO tags (name) VALUES ($1) ON CONFLICT DO NOTHING", [tag]);
      await c.query("INSERT INTO transaction_tags (transaction_id,tag,position) VALUES ($1,$2,99) ON CONFLICT DO NOTHING", [t.id, tag]);
    }
    n++;
  }
  return n;
}

// 2. Transfers: money out of one of my accounts and in to another within 3 days and about 6% in value.
export function pairTransfers(txs, own, known = []) {
  const taken = new Set(known.flatMap((x) => [x.out_id, x.in_id]));
  const pairs = [];
  for (const o of txs) {
    if (!(o.amount < 0 && own.includes(o.from_name)) || taken.has(o.id)) continue;
    for (const i of txs) {
      if (!(i.amount > 0 && own.includes(i.to_name) && i.to_name !== o.from_name) || taken.has(i.id)) continue;
      const dd = Math.abs(new Date(o.date) - new Date(i.date)) / 864e5;
      const r = i.amount / -o.amount;
      if (dd <= 3 && r >= 0.94 && r <= 1.03) { pairs.push({ out_id: o.id, in_id: i.id }); taken.add(o.id); taken.add(i.id); break; }
    }
  }
  return pairs;
}

export async function detectTransfers(c) {
  const own = (await c.query("SELECT DISTINCT name FROM accounts WHERE kind IN ('bank','wallet')")).rows.map((r) => r.name);
  const txs = (await c.query("SELECT id,date,from_name,to_name,amount FROM transactions")).rows;
  const known = (await c.query("SELECT out_id,in_id FROM transfer_links")).rows;
  const pairs = pairTransfers(txs, own.length ? own : OWN_FALLBACK, known);
  for (const p of pairs) {
    await c.query("INSERT INTO transfer_links (out_id,in_id,status) VALUES ($1,$2,'auto') ON CONFLICT DO NOTHING", [p.out_id, p.in_id]);
    const o = txs.find((t) => t.id === p.out_id), i = txs.find((t) => t.id === p.in_id);
    await audit(c, "Transfer detected", `${o.from_name} → ${i.to_name} · ₪${Math.round(-o.amount)} out, ₪${Math.round(i.amount)} in`);
  }
  return pairs.length;
}

// 3. Balance gaps (addendum v1.1): the balance moved without a matching transaction.
// expected = last known balance + transactions imported since then; gap = actual - expected.
export function computeGap(prevBalance, actual, importedSince) {
  const gap = +(actual - (prevBalance + importedSince)).toFixed(2);
  return Math.abs(gap) < 0.005 ? 0 : gap;
}

// Transactions on an account since a moment, in the account's currency, minus what already explained a gap.
async function importedSince(c, account, since) {
  const r = await c.query(
    `SELECT COALESCE(sum(COALESCE(orig_amount, amount) - gap_explained),0)::float AS s FROM transactions
     WHERE NOT pending AND created_at > $2 AND ((amount<0 AND from_name=$1) OR (amount>0 AND to_name=$1))
       AND COALESCE(orig_currency,'ILS')=$3`, [account.name, since, account.currency]);
  return r.rows[0].s;
}

export async function recordSnapshot(c, account, actual, at = new Date()) {
  const prev = (await c.query("SELECT balance,taken_at FROM balance_snapshots WHERE account_id=$1 ORDER BY id DESC LIMIT 1", [account.id])).rows[0];
  await c.query("INSERT INTO balance_snapshots (account_id,balance,taken_at) VALUES ($1,$2,$3)", [account.id, actual, at]);
  if (!prev) return null;
  const gap = computeGap(prev.balance, actual, await importedSince(c, account, prev.taken_at));
  if (!gap) return null;
  const r = await c.query(
    "INSERT INTO balance_gaps (account_id,amount,remaining,window_from,window_to) VALUES ($1,$2,$2,$3,$4) RETURNING id",
    [account.id, gap, prev.taken_at, at]);
  await audit(c, "Balance gap", `${account.name} ${account.currency}: ${gap < 0 ? "money out" : "money in"} ${Math.abs(gap)} with no transaction (between snapshots)`);
  return r.rows[0].id;
}

// A transaction explains (part of) the open gaps of its account with the same sign. Returns what is left of the amount.
export async function explainGaps(c, txId, accountName, currency, signedAmount) {
  let left = signedAmount;
  const gaps = (await c.query(
    `SELECT g.id,g.remaining FROM balance_gaps g JOIN accounts a ON a.id=g.account_id
     WHERE a.name=$1 AND a.currency=$2 AND g.status='open' AND sign(g.remaining)=sign($3::numeric) ORDER BY g.id`, [accountName, currency, signedAmount])).rows;
  for (const g of gaps) {
    if (!left) break;
    const use = Math.abs(left) >= Math.abs(g.remaining) ? g.remaining : left;
    const rest = +(g.remaining - use).toFixed(2);
    await c.query("UPDATE balance_gaps SET remaining=$2, status=$3 WHERE id=$1", [g.id, rest, rest === 0 ? "cleared" : "open"]);
    left = +(left - use).toFixed(2);
  }
  const used = +(signedAmount - left).toFixed(2);
  if (used) {
    await c.query("UPDATE transactions SET gap_explained=$2 WHERE id=$1", [txId, used]);
    await audit(c, used === signedAmount ? "Gap cleared" : "Gap reduced", `${accountName} ${currency}: ${Math.abs(used)} explained by a transaction`);
  }
  return left;
}

// A drop in one currency with a rise in another inside the same window looks like a conversion.
export function suggestConversion(gaps) {
  const out = gaps.filter((g) => g.amount < 0), inn = gaps.filter((g) => g.amount > 0);
  const found = [];
  for (const o of out) for (const i of inn) {
    if (o.account === i.account && o.currency !== i.currency && o.window_from <= i.window_to && i.window_from <= o.window_to) found.push({ out: o, in: i });
  }
  return found;
}
