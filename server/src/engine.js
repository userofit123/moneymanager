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

// Tag rules: every rule whose text is in the description adds its tags. Only the given (new) transactions are tagged,
// so a tag you remove by hand is not put back on the next sync.
export async function applyTagRules(c, ids) {
  if (!ids || !ids.length) return 0;
  const rules = (await c.query("SELECT keyword,tag FROM tag_rules ORDER BY position,id")).rows;
  if (!rules.length) return 0;
  const rows = (await c.query("SELECT id,description FROM transactions WHERE id = ANY($1)", [ids])).rows;
  let n = 0;
  for (const t of rows) {
    const d = t.description.toLowerCase(), tags = new Set();
    for (const r of rules) if (r.keyword && d.includes(r.keyword.toLowerCase())) String(r.tag).split(",").map((x) => x.trim().replace(/^#+/, "")).filter(Boolean).forEach((g) => tags.add(g));
    for (const tag of tags) {
      await c.query("INSERT INTO tags (name) VALUES ($1) ON CONFLICT DO NOTHING", [tag]);
      await c.query("INSERT INTO transaction_tags (transaction_id,tag,position) VALUES ($1,$2,99) ON CONFLICT DO NOTHING", [t.id, tag]);
    }
    if (tags.size) n++;
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
// Older history imported now (dated a month or more before) was in the balance long ago, so it does not count.
export const OLD_DAYS = 30;
async function importedSince(c, account, since) {
  const r = await c.query(
    `SELECT COALESCE(sum(COALESCE(orig_amount, amount) - gap_explained),0)::float AS s FROM transactions
     WHERE NOT pending AND created_at > $2 AND date >= ($2::timestamptz - interval '${OLD_DAYS} days')::date
       AND ((amount<0 AND from_name=$1) OR (amount>0 AND to_name=$1))
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
  // the transactions may already be in the app (a charge still pending is already in a card balance): then the gap is explained now,
  // not at the next sync
  await healGaps(c, account.name, account.currency);
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

// A gap that a transaction in its window now explains closes by itself. This is the usual case: a charge the bank listed with no amount,
// whose real amount arrived at a later sync, after the balance had already dropped.
export async function healGaps(c, accountName, currency) {
  const gaps = (await c.query(
    `SELECT g.id,g.remaining,g.window_from,g.window_to FROM balance_gaps g JOIN accounts a ON a.id=g.account_id
     WHERE a.name=$1 AND a.currency=$2 AND g.status='open' ORDER BY g.id`, [accountName, currency])).rows;
  let n = 0;
  for (const g of gaps) { // a charge the bank still lists as pending counts too: a card balance already includes it
    const rows = (await c.query(
      `SELECT id, COALESCE(orig_amount, amount)::float AS amt FROM transactions
       WHERE (from_name=$1 OR to_name=$1) AND COALESCE(gap_explained,0)=0 AND COALESCE(orig_currency,'ILS')=$2
         AND sign(COALESCE(orig_amount, amount))=sign($3::numeric)
         AND date >= ($4::timestamptz - interval '7 days')::date AND date <= ($5::timestamptz + interval '7 days')::date
       ORDER BY date DESC, id DESC LIMIT 40`, [accountName, currency, g.remaining, g.window_from, g.window_to])).rows;
    const pick = chargesFor(rows, g.remaining);
    if (!pick.length) continue;
    for (const t of pick) await explainGaps(c, t.id, accountName, currency, t.amt);
    // a rounding difference of up to a shekel must not leave the gap open
    await c.query("UPDATE balance_gaps SET remaining=0, status='cleared' WHERE id=$1 AND status='open' AND abs(remaining) <= 1", [g.id]);
    n++;
  }
  return n + await healCardPayments(c) + await reconcileGaps(c, accountName, currency);
}

// Two readings a day apart can show a drop and a later rise that cancel out (a hold on a card, a charge that went away and came back).
// Taken one by one they are two open gaps; over the whole span the balance adds up. So the open gaps of an account close together when,
// from the reading where the oldest one began to the newest reading, the balance equals the earlier balance plus every transaction in between.
// This does not depend on when each copy of the app happened to sync. A charge the bank still lists as pending counts too (a card balance includes it).
export async function reconcileGaps(c, accountName, currency) {
  const acc = (await c.query("SELECT id FROM accounts WHERE name=$1 AND currency=$2", [accountName, currency])).rows[0];
  if (!acc) return 0;
  const open = (await c.query("SELECT id,window_from FROM balance_gaps WHERE account_id=$1 AND status='open' ORDER BY window_from", [acc.id])).rows;
  if (!open.length) return 0;
  const from = open[0].window_from;
  const prev = (await c.query("SELECT balance,taken_at FROM balance_snapshots WHERE account_id=$1 AND taken_at<=$2 ORDER BY taken_at DESC, id DESC LIMIT 1", [acc.id, from])).rows[0];
  const last = (await c.query("SELECT balance,taken_at FROM balance_snapshots WHERE account_id=$1 ORDER BY taken_at DESC, id DESC LIMIT 1", [acc.id])).rows[0];
  if (!prev || !last || last.taken_at <= prev.taken_at) return 0;
  const sum = async (pending) => (await c.query(
    `SELECT COALESCE(sum(COALESCE(orig_amount, amount)),0)::float AS s FROM transactions
     WHERE ($4 OR NOT pending) AND created_at > $2 AND date >= ($2::timestamptz - interval '${OLD_DAYS} days')::date
       AND ((amount<0 AND from_name=$1) OR (amount>0 AND to_name=$1)) AND COALESCE(orig_currency,'ILS')=$3`, [accountName, prev.taken_at, currency, pending])).rows[0].s;
  const fits = async (pending) => Math.abs(computeGap(prev.balance, last.balance, await sum(pending))) <= 1;
  if (!(await fits(false)) && !(await fits(true))) return 0;
  await c.query("UPDATE balance_gaps SET remaining=0, status='cleared' WHERE account_id=$1 AND status='open'", [acc.id]);
  await audit(c, "Gaps cleared", `${accountName} ${currency}: the balance adds up over the whole period, ${open.length} open gap${open.length > 1 ? "s" : ""} closed`);
  return open.length;
}

// A card's debt that went down is usually the card bill, paid from the bank: the bank lists the payment, the card does not.
// A bank payment of the same amount near the gap (a card payment, not one counted as spending) explains it, and only that one gap.
export async function healCardPayments(c) {
  const gaps = (await c.query(
    `SELECT g.id,g.remaining::float AS rem,g.window_from,g.window_to,a.name FROM balance_gaps g JOIN accounts a ON a.id=g.account_id
     WHERE a.kind='card' AND a.currency='ILS' AND g.status='open' AND g.remaining>0 ORDER BY g.id`)).rows;
  if (!gaps.length) return 0;
  const ov = (await c.query("SELECT value FROM settings WHERE key='cc_override'")).rows[0]?.value || {};
  let n = 0;
  for (const g of gaps) {
    const pays = (await c.query(
      `SELECT t.id,t.from_name,t.category FROM transactions t JOIN accounts a ON a.name=t.from_name AND a.kind='bank'
       WHERE t.amount<0 AND NOT t.pending AND abs(-t.amount - $1) <= 1
         AND t.date >= ($2::timestamptz - interval '7 days')::date AND t.date <= ($3::timestamptz + interval '7 days')::date
         AND NOT EXISTS (SELECT 1 FROM balance_gaps x WHERE x.paid_by=t.id)
       ORDER BY abs(-t.amount - $1), t.id`, [g.rem, g.window_from, g.window_to])).rows;
    const p = pays.find((t) => ov[t.id] != 1 && (ov[t.id] == 2 || t.category === "Loans & credit payments"));
    if (!p) continue;
    await c.query("UPDATE balance_gaps SET remaining=0, status='cleared', paid_by=$2 WHERE id=$1", [g.id, p.id]);
    await audit(c, "Gap cleared", `${g.name} ILS: ${g.rem} explained by a card payment from ${p.from_name}`);
    n++;
  }
  return n;
}

// Which charges add up to the gap, give or take a shekel. One purchase is the usual case, but a card balance that dropped between two
// readings can hold any number of them, still pending. So: one charge, else every candidate charge together, else the smallest group
// that fits (a search with a work limit, so a long list can never make a sync slow).
export function chargesFor(rows, gap) {
  const near = (v) => Math.abs(v - gap) <= 1;
  const one = [...rows].sort((x, y) => Math.abs(x.amt - gap) - Math.abs(y.amt - gap)).find((r) => near(r.amt));
  if (one) return [one];
  if (rows.length > 1 && near(rows.reduce((t, r) => t + r.amt, 0))) return rows;
  let budget = 200000;
  const best = (k, from, left, picked) => {
    if (budget-- <= 0) return null;
    if (k === 0) return Math.abs(left) <= 1 ? picked : null;
    for (let i = from; i <= rows.length - k; i++) {
      const r = best(k - 1, i + 1, +(left - rows[i].amt).toFixed(2), [...picked, rows[i]]);
      if (r) return r;
    }
    return null;
  };
  for (let k = 2; k < rows.length; k++) { const r = best(k, 0, gap, []); if (r) return r; }
  return [];
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
