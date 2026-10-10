// Scheduled sync of every connected source, one at a time. A failing source is recorded and never breaks the others or the app.
// Two failures in a row lock a source (no more automatic attempts) so an account is never locked by a retry loop.
import cron from "node-cron";
import { q, tx, audit, bumpRev } from "./db.js";
import { refreshRates } from "./fx.js";
import { ingest } from "./sources/ingest.js";
import { fetchWise } from "./sources/wise.js";
import { scrape } from "./sources/scraper.js";
import { recordSnapshot, detectTransfers } from "./engine.js";
import { getCreds, isLocked, recordResult, LABELS } from "./connections.js";
import { scrub } from "./secrets.js";
import { sendNtfy, notifyOnce, clearNotified, remindOldGaps } from "./notify.js";

const HISTORY_DAYS = +process.env.HISTORY_DAYS || 365; // used for the first import of a source only

async function account(c, name, currency, patch = {}) {
  const r = await c.query("SELECT * FROM accounts WHERE name=$1 AND currency=$2", [name, currency]);
  if (r.rowCount) return r.rows[0];
  const kind = patch.kind || "bank";
  const n = await c.query(
    "INSERT INTO accounts (name,currency,kind,source,subtitle,in_net_worth,sort) VALUES ($1,$2,$3,$4,$5,$6,50) RETURNING *",
    [name, currency, kind, patch.source || "manual", patch.subtitle || "", kind !== "card"]);
  return n.rows[0];
}

async function setBalance(a, value) {
  await tx(async (c) => {
    await c.query("UPDATE accounts SET balance=$2, balance_at=now() WHERE id=$1", [a.id, value]);
    await recordSnapshot(c, a, value);
    await bumpRev(c);
  });
}

const firstTime = async (source) => (await q("SELECT 1 FROM transactions WHERE source=$1 LIMIT 1", [source])).rowCount === 0;

// Map one scraped account to the rows the importer takes
const toRows = (acc) => (acc.txns || []).map((t) => ({
  date: String(t.date).slice(0, 10), description: t.description, amount: t.chargedAmount ?? t.originalAmount,
  currency: t.chargedCurrency || "ILS", externalId: t.identifier ? `${acc.accountNumber}:${t.identifier}` : undefined,
  pending: t.status === "pending", bankCategory: t.category,
})).filter((r) => typeof r.amount === "number");

const BANKS = { hapoalim: ["Bank Hapoalim", "bank"], max: ["Max", "card"], isracard: ["Isracard", "card"] };

const RUN = {
  async wise(creds) {
    const w = await fetchWise(creds.token);
    let added = 0;
    for (const b of w.balances) {
      const a = await tx((c) => account(c, "Wise", b.currency, { kind: "wallet", source: "wise", subtitle: `${b.currency} balance` }));
      const rows = w.transactions.filter((t) => t.currency === b.currency);
      if (rows.length) added += (await ingest({ name: "Wise", currency: b.currency, source: "wise" }, rows, { mergeManual: true })).added;
      await setBalance(a, b.value);
    }
    return { added, message: w.note };
  },
  ...Object.fromEntries(Object.entries(BANKS).map(([key, [name, kind]]) => [key, async (creds) => {
    const res = await scrape(key, creds, (await firstTime(key)) ? HISTORY_DAYS : 30);
    let added = 0, balance = null;
    for (const acc of res.accounts || []) {
      added += (await ingest({ name, currency: "ILS", source: key }, toRows(acc))).added;
      if (typeof acc.balance === "number") balance = (balance || 0) + acc.balance;
    }
    if (balance != null) await setBalance(await tx((c) => account(c, name, "ILS", { kind, source: key })), balance);
    return { added, message: "" };
  }])),
};

export const SOURCE_NAMES = Object.keys(RUN);
const running = new Set();

export async function syncSource(name) {
  if (!RUN[name]) throw new Error("unknown source " + name);
  const creds = await getCreds(name);
  if (!creds) return { ok: false, skipped: true, error: "not connected" };
  if (await isLocked(name)) return { ok: false, locked: true, error: `${LABELS[name]} is locked after failed attempts. Check the credentials, then unlock it in Settings.` };
  if (running.has(name)) return { skipped: true };
  running.add(name);
  const run = await q("INSERT INTO sync_runs (source) VALUES ($1) RETURNING id", [name]);
  try {
    const res = await RUN[name](creds);
    await q("UPDATE sync_runs SET finished_at=now(), ok=true, added=$2, message=$3 WHERE id=$1", [run.rows[0].id, res.added, res.message || ""]);
    await recordResult(name, true);
    await clearNotified(`fail:${name}`);
    if (res.added) await audit(null, "Sync", `${LABELS[name]} synced · ${res.added} new transactions`);
    await q("UPDATE app_meta SET value=(value::int+1)::text WHERE key='rev'");
    return { ok: true, ...res };
  } catch (e) {
    const msg = scrub(e.message || e, Object.values(creds)); // never include credentials
    await q("UPDATE sync_runs SET finished_at=now(), ok=false, message=$2 WHERE id=$1", [run.rows[0].id, msg]);
    const locked = await recordResult(name, false, msg, creds);
    await notifyOnce(`fail:${name}`, `Money · ${LABELS[name]} sync failed`, locked ? `${msg}\nAutomatic attempts are paused. Check the login, then unlock it in Settings.` : msg, "high");
    return { ok: false, error: msg, locked };
  } finally {
    running.delete(name);
  }
}

// Dry run for the "Test connection" button (spec section 9): last 30 days, summary only, nothing saved.
export async function testSource(name) {
  if (!RUN[name]) throw new Error("unknown source " + name);
  const creds = await getCreds(name);
  if (!creds) return { ok: false, error: "not connected" };
  if (await isLocked(name)) return { ok: false, locked: true, error: "Locked after failed attempts. Unlock it first." };
  try {
    let out;
    if (name === "wise") {
      const w = await fetchWise(creds.token);
      out = { balances: w.balances.map((b) => ({ currency: b.currency, value: b.value })), transactions: w.transactions.length, note: w.note || "Statements are available" };
    } else {
      const res = await scrape(name, creds, 30);
      out = { accounts: (res.accounts || []).map((a) => ({ balance: a.balance ?? null, transactions: (a.txns || []).length, first: toRows(a).slice(0, 3).map((r) => ({ date: r.date, description: r.description, amount: r.amount })) })) };
    }
    await recordResult(name, true);
    return { ok: true, ...out };
  } catch (e) {
    const msg = scrub(e.message || e, Object.values(creds));
    const locked = await recordResult(name, false, msg, creds);
    return { ok: false, error: msg, locked };
  }
}

export async function syncAll() {
  await refreshRates(7).catch((e) => console.error("rates:", e.message));
  const out = {};
  for (const s of SOURCE_NAMES) out[s] = await syncSource(s);
  const open = (await q("SELECT count(*)::int AS n FROM balance_gaps WHERE status='open'")).rows[0].n;
  if (open) await notifyOnce(`gaps:${open}`, "Money · missing money", `${open} balance gap${open > 1 ? "s" : ""} to explain in Activity → Needs review`);
  return out;
}

// Month-end net worth snapshot, so history does not move with exchange rates.
export async function snapshotNetWorth() {
  const month = new Date().toISOString().slice(0, 7);
  const rates = Object.fromEntries((await q("SELECT DISTINCT ON (base) base,rate FROM exchange_rates WHERE quote='ILS' ORDER BY base,date DESC")).rows.map((r) => [r.base, r.rate]));
  rates.ILS = 1;
  const acc = (await q("SELECT currency,kind,balance FROM accounts")).rows;
  const sum = (f) => acc.filter(f).reduce((s, a) => s + a.balance * (rates[a.currency] || 1), 0);
  await q(
    `INSERT INTO net_worth_snapshots (month,bank,wise,pension) VALUES ($1,$2,$3,$4)
     ON CONFLICT (month) DO UPDATE SET bank=$2,wise=$3,pension=$4,taken_at=now()`,
    [month, sum((a) => a.kind === "bank"), sum((a) => a.kind === "wallet"), sum((a) => a.kind === "pension")]);
}

export function startScheduler() {
  const every = process.env.SYNC_CRON || "0 */8 * * *";
  cron.schedule(every, () => syncAll().then(snapshotNetWorth).catch((e) => console.error("sync:", e.message)));
  cron.schedule("30 3 * * *", () => refreshRates(7).catch((e) => console.error("rates:", e.message)));
  cron.schedule("0 9 * * *", () => remindOldGaps().catch((e) => console.error("remind:", e.message)));
  console.log("scheduler on:", every);
}
export { sendNtfy };
