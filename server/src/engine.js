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

// 3. Balance gaps: the balance moved by an amount the payments in the app do not explain.
// One rule, the same on every copy of the app whenever it syncs: take a starting point (a balance, and the moment from which payments count),
// and compare the newest balance with that balance plus every payment added since. What is left over is the gap. It does not matter how often
// the app synced in between: the starting point only moves forward when the books add up (or a person reviews the gap).
export function computeGap(prevBalance, actual, importedSince) {
  const gap = +(actual - (prevBalance + importedSince)).toFixed(2);
  return Math.abs(gap) < 0.005 ? 0 : gap;
}

// A difference under this is rounding, not a gap.
const GAP_MIN = 1;
// Payments dated a month or more before the starting point were in the balance long ago: older history imported now explains nothing.
export const OLD_DAYS = 30;

// The database's own clock (not this program's), so a starting point and the time a payment was added are measured by the same clock.
const dbNow = async (c) => (await c.query("SELECT clock_timestamp() AS t")).rows[0].t;
const baseKey = (accountId) => `gapbase:${accountId}`;
async function getBase(c, accountId) { return (await c.query("SELECT value FROM settings WHERE key=$1", [baseKey(accountId)])).rows[0]?.value || null; }
// maxId: the newest payment number at that moment. A payment counts as added after the starting point when its number is higher, or (a payment whose amount was
// filled in later) when it was changed after the moment: numbers do not depend on a clock, so two payments within the same millisecond are still told apart.
async function putBase(c, accountId, balance, upto, from = upto, maxId) {
  if (maxId === undefined) maxId = +(await c.query("SELECT COALESCE(max(id),0)::bigint AS m FROM transactions")).rows[0].m;
  await c.query("INSERT INTO settings (key,value) VALUES ($1,$2::jsonb) ON CONFLICT (key) DO UPDATE SET value=$2::jsonb",
    [baseKey(accountId), JSON.stringify({ balance: +balance, upto: new Date(upto).toISOString(), from: new Date(from).toISOString(), maxId })]);
}
const latestSnapshot = async (c, accountId) => (await c.query("SELECT balance::float AS balance,taken_at FROM balance_snapshots WHERE account_id=$1 ORDER BY taken_at DESC, id DESC LIMIT 1", [accountId])).rows[0];

// Start counting again from the newest balance (after a gap was reviewed or recorded, or when the books add up).
export async function resetGapBase(c, accountId) {
  const last = await latestSnapshot(c, accountId);
  if (last) await putBase(c, accountId, last.balance, await dbNow(c), last.taken_at);
}

// What the newest balance leaves unexplained, counting every payment added after the starting point. A charge the bank still lists as pending is
// already in a card balance, so the answer that fits better (with or without pending ones) is the one that counts.
async function leftOver(c, account, base, lastBalance) {
  const sum = async (pending) => (await c.query(
    `SELECT COALESCE(sum(CASE WHEN orig_amount IS NULL THEN amount ELSE abs(orig_amount) * sign(amount) END - COALESCE(gap_explained,0)),0)::float AS s FROM transactions
     WHERE ($4 OR NOT pending) AND (created_at > $2 OR id > COALESCE($5::bigint, 9223372036854775807)) AND date >= ($2::timestamptz - interval '${OLD_DAYS} days')::date
       AND ((amount<0 AND from_name=$1) OR (amount>0 AND to_name=$1)) AND COALESCE(orig_currency,'ILS')=$3`,
    [account.name, base.upto, account.currency, pending, base.maxId ?? null])).rows[0].s;
  const a = computeGap(base.balance, lastBalance, await sum(false)), b = computeGap(base.balance, lastBalance, await sum(true));
  return Math.abs(a) <= Math.abs(b) ? a : b;
}

// Bring the open gaps of an account in line with the payments now in the app. Returns the id of a gap that was just opened, or null.
// prev: the balance reading just before the newest one (when a new reading has just come in).
export async function settleGaps(c, accountName, currency, prev = null) {
  const account = (await c.query("SELECT id,name,currency FROM accounts WHERE name=$1 AND currency=$2", [accountName, currency])).rows[0];
  if (!account) return null;
  const last = await latestSnapshot(c, account.id);
  if (!last) return null;
  const open = (await c.query("SELECT id,window_from FROM balance_gaps WHERE account_id=$1 AND status='open' ORDER BY id", [account.id])).rows;
  let base = await getBase(c, account.id);
  if (!base && open.length) { // gaps from before this rule: start where the oldest one began
    const s = (await c.query("SELECT balance::float AS balance,taken_at FROM balance_snapshots WHERE account_id=$1 AND taken_at<=$2 ORDER BY taken_at DESC, id DESC LIMIT 1", [account.id, open[0].window_from])).rows[0];
    if (s) base = { balance: s.balance, upto: s.taken_at, from: s.taken_at };
  }
  if (!base && prev) base = { balance: +prev.balance, upto: prev.taken_at, from: prev.taken_at };
  if (!base) { await putBase(c, account.id, last.balance, await dbNow(c), last.taken_at); return null; }
  const U = await leftOver(c, account, base, last.balance);
  if (Math.abs(U) < GAP_MIN) { // the books add up: everything open is explained, and counting starts again from here
    if (open.length) {
      await c.query("UPDATE balance_gaps SET remaining=0, status='cleared' WHERE account_id=$1 AND status='open'", [account.id]);
      await audit(c, "Gaps cleared", `${accountName} ${currency}: the balance adds up over the whole period, ${open.length} open gap${open.length > 1 ? "s" : ""} closed`);
    }
    await putBase(c, account.id, last.balance, await dbNow(c), last.taken_at);
    return null;
  }
  await putBase(c, account.id, base.balance, base.upto, base.from || base.upto, base.maxId ?? null);
  let opened = null;
  if (open.length) { // one gap per account: it grows or shrinks as the payments and balances come in
    await c.query("UPDATE balance_gaps SET amount=$2, remaining=$2, window_to=$3 WHERE id=$1", [open[0].id, U, last.taken_at]);
    await c.query("UPDATE balance_gaps SET remaining=0, status='cleared' WHERE account_id=$1 AND status='open' AND id<>$2", [account.id, open[0].id]);
  } else {
    opened = (await c.query("INSERT INTO balance_gaps (account_id,amount,remaining,window_from,window_to) VALUES ($1,$2,$2,$3,$4) RETURNING id",
      [account.id, U, base.from || base.upto, last.taken_at])).rows[0].id;
    await audit(c, "Balance gap", `${accountName} ${currency}: ${U < 0 ? "money out" : "money in"} ${Math.abs(U)} with no transaction (between snapshots)`);
  }
  if (await healCardPayments(c)) { // the card bill paid from the bank explains it
    const still = (await c.query("SELECT 1 FROM balance_gaps WHERE account_id=$1 AND status='open'", [account.id])).rowCount;
    if (!still) await putBase(c, account.id, last.balance, await dbNow(c), last.taken_at);
  }
  return opened;
}

export async function recordSnapshot(c, account, actual, at = new Date()) {
  const prev = (await c.query("SELECT balance::float AS balance,taken_at FROM balance_snapshots WHERE account_id=$1 ORDER BY taken_at DESC, id DESC LIMIT 1", [account.id])).rows[0];
  await c.query("INSERT INTO balance_snapshots (account_id,balance,taken_at) VALUES ($1,$2,$3)", [account.id, actual, at]);
  return settleGaps(c, account.name, account.currency, prev);
}

// After payments came in or were added by hand: the open gaps of the account are checked again against what is now in the app.
export async function healGaps(c, accountName, currency) {
  const before = (await c.query("SELECT count(*)::int AS n FROM balance_gaps g JOIN accounts a ON a.id=g.account_id WHERE a.name=$1 AND a.currency=$2 AND g.status='open'", [accountName, currency])).rows[0].n;
  if (!before) return 0;
  await settleGaps(c, accountName, currency);
  const after = (await c.query("SELECT count(*)::int AS n FROM balance_gaps g JOIN accounts a ON a.id=g.account_id WHERE a.name=$1 AND a.currency=$2 AND g.status='open'", [accountName, currency])).rows[0].n;
  return before - after;
}

// A card's debt that went down is usually the card bill, paid from the bank: the bank lists the payment, the card does not.
// A bank payment of the same amount near the gap (a card payment, not one counted as spending) explains it, and only that one gap.
export async function healCardPayments(c) {
  const gaps = (await c.query(
    `SELECT g.id,g.account_id,g.remaining::float AS rem,g.window_from,g.window_to,a.name FROM balance_gaps g JOIN accounts a ON a.id=g.account_id
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
    await resetGapBase(c, g.account_id); // the next check counts from the newest balance
    n++;
  }
  return n;
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
