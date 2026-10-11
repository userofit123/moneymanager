// Scheduled sync of every connected source, one at a time. A failing source is recorded and never breaks the others or the app.
// Two failures in a row lock a source (no more automatic attempts) so an account is never locked by a retry loop.
import cron from "node-cron";
import { q, tx, audit, bumpRev } from "./db.js";
import { refreshRates } from "./fx.js";
import { ingest } from "./sources/ingest.js";
import { fetchWise } from "./sources/wise.js";
import { scrape } from "./sources/scraper.js";
import { recordSnapshot, detectTransfers } from "./engine.js";
import { getCreds, isLocked, recordResult, markTested, LABELS } from "./connections.js";
import { scrub } from "./secrets.js";
import { sendNtfy, notifyOnce, clearNotified, remindOldGaps } from "./notify.js";
import { fillJars } from "./jars.js";

const HISTORY_DAYS = +process.env.HISTORY_DAYS || 365; // default for the first import of a source, changeable in Settings
const getSet = async (k, d) => { const r = await q("SELECT value FROM settings WHERE key=$1", [k]); return r.rowCount ? r.rows[0].value : d; };
const putSet = (k, v) => q("INSERT INTO settings (key,value) VALUES ($1,$2::jsonb) ON CONFLICT (key) DO UPDATE SET value=$2::jsonb", [k, JSON.stringify(v)]);
// Settings → Connections: how often the server syncs by itself (hours, 0 = never), how much the first import reads, and the routine window.
export async function getSyncSettings() {
  return { hours: await getSet("sync_hours", 8), firstDays: await getSet("sync_first_days", HISTORY_DAYS), routineDays: await getSet("sync_routine_days", 30), lastAuto: await getSet("sync_last_auto", null) };
}
export async function putSyncSettings(b) {
  const pick = (v, ok) => (ok.includes(+v) ? +v : undefined);
  const h = pick(b.hours, [0, 4, 8, 12, 24]), f = pick(b.firstDays, [90, 180, 365, 730, 1825]), r = pick(b.routineDays, [14, 30, 60, 90]);
  if (h !== undefined) await putSet("sync_hours", h);
  if (f !== undefined) await putSet("sync_first_days", f);
  if (r !== undefined) await putSet("sync_routine_days", r);
  return getSyncSettings();
}

async function account(c, name, currency, patch = {}) {
  const r = await c.query("SELECT * FROM accounts WHERE name=$1 AND currency=$2", [name, currency]);
  if (r.rowCount) return r.rows[0];
  const kind = patch.kind || "bank";
  const n = await c.query(
    "INSERT INTO accounts (name,currency,kind,source,subtitle,in_net_worth,sort) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
    [name, currency, kind, patch.source || "manual", patch.subtitle || "", kind !== "card", { bank: 0, card: 1, wallet: 3, pension: 4 }[kind] ?? 50]);
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
  currency: t.chargedCurrency || "ILS",
  // A bank reference number repeats for recurring items (a monthly salary, a standing order), so it is only part of the id:
  // account + reference + date + amount. legacyId is the id older versions used, so earlier imports are recognised.
  externalId: t.identifier ? `${acc.accountNumber}:${t.identifier}:${String(t.date).slice(0, 10)}:${t.chargedAmount ?? t.originalAmount}` : undefined,
  legacyId: t.identifier ? `${acc.accountNumber}:${t.identifier}` : undefined,
  pending: t.status === "pending", bankCategory: t.category,
})).filter((r) => typeof r.amount === "number");

// What a sync really read, not just what was asked for. Banks only keep about a year of history online: when the oldest row they returned
// is much newer than the start date requested, say so, instead of implying the whole range was read.
export function readNote(days, seen, oldest, added, today = new Date()) {
  if (!seen || !oldest) return `asked for the last ${days} days, the bank returned no transactions`;
  const asked = new Date(today.getTime() - days * 864e5), gotFrom = new Date(oldest);
  const short = (gotFrom - asked) / 864e5 > 45;
  return `read ${seen} transactions back to ${oldest}, ${added} new` + (short ? `. You asked for ${days} days, but the bank only returned history back to ${oldest}. Banks usually keep about 12 months online. For older history, import their statement export (Settings → App and data)` : "");
}

const BANKS = { hapoalim: ["Bank Hapoalim", "bank"], max: ["Max", "card"], isracard: ["Isracard", "card"] };

const RUN = {
  async wise(creds, opts = {}) {
    const days = opts.days || ((await firstTime("wise")) ? await getSet("sync_first_days", HISTORY_DAYS) : await getSet("sync_routine_days", 30));
    const w = await fetchWise(creds.token, { days });
    let added = 0;
    for (const b of w.balances) {
      const a = await tx((c) => account(c, "Wise", b.currency, { kind: "wallet", source: "wise", subtitle: `${b.currency} balance` }));
      const rows = w.transactions.filter((t) => t.currency === b.currency);
      if (rows.length) added += (await ingest({ name: "Wise", currency: b.currency, source: "wise" }, rows, { mergeManual: true })).added;
      await setBalance(a, b.value);
    }
    const dates = w.transactions.map((t) => String(t.date || "").slice(0, 10)).filter(Boolean).sort();
    return { added, message: w.note, days, seen: w.transactions.length, oldest: dates[0] || null };
  },
  ...Object.fromEntries(Object.entries(BANKS).map(([key, [name, kind]]) => [key, async (creds, opts = {}) => {
    const flag = `backfill:${key}`;
    const backfill = (await q("SELECT 1 FROM settings WHERE key=$1", [flag])).rowCount > 0;
    const days = opts.days || ((await firstTime(key)) || backfill ? await getSet("sync_first_days", HISTORY_DAYS) : await getSet("sync_routine_days", 30));
    const res = await scrape(key, creds, days);
    let added = 0, balance = null, seen = 0, oldest = null;
    for (const acc of res.accounts || []) {
      const rows = toRows(acc);
      seen += rows.length;
      for (const r of rows) if (!oldest || r.date < oldest) oldest = r.date;
      added += (await ingest({ name, currency: "ILS", source: key }, rows)).added;
      if (typeof acc.balance === "number") balance = (balance || 0) + acc.balance;
    }
    if (balance != null) await setBalance(await tx((c) => account(c, name, "ILS", { kind, source: key })), balance);
    await q("DELETE FROM settings WHERE key=$1", [flag]); // the one-off history re-read is done
    return { added, message: readNote(days, seen, oldest, added), days, seen, oldest };
  }])),
};

export const SOURCE_NAMES = Object.keys(RUN);

// Only one connection job (test, sync or device verification) runs at a time, so a bank is never hit twice at once,
// the scraper is never overloaded, and the browser profile is never opened twice.
let job = null;
export const activeJob = () => {
  if (job?.expires && Date.now() > job.expires) job = null; // a verification window nobody closed
  return job ? { source: job.source, kind: job.kind, since: job.since } : null;
};
const KIND = { test: "A test", sync: "A sync", assist: "A device verification" };
const busyResult = () => ({ ok: false, busy: true, job: activeJob(), error: `${KIND[job.kind]} is already running (${job.source === "all" ? "all sources" : LABELS[job.source] || job.source}). Wait for it to finish.` });
export function acquireJob(source, kind, ttlMs = 0) {
  if (activeJob()) return busyResult();
  job = { source, kind, since: Date.now(), expires: ttlMs ? Date.now() + ttlMs : null };
  return null;
}
export const extendJob = (ttlMs) => { if (job?.expires) job.expires = Date.now() + ttlMs; };
export const releaseJob = (kind) => { if (job && (!kind || job.kind === kind)) job = null; };
async function withJob(source, kind, fn) {
  const busy = acquireJob(source, kind);
  if (busy) return busy;
  try { return await fn(); } finally { releaseJob(kind); }
}

export const syncSource = (name, opts = {}) => {
  if (!RUN[name]) throw new Error("unknown source " + name);
  return withJob(name, "sync", () => syncInner(name, opts));
};
async function syncInner(name, opts = {}) {
  const creds = await getCreds(name);
  if (!creds) return { ok: false, skipped: true, error: "not connected" };
  if (await isLocked(name)) return { ok: false, locked: true, error: `${LABELS[name]} is locked after failed attempts. Check the credentials, then unlock it in Settings.` };
  const run = await q("INSERT INTO sync_runs (source,origin) VALUES ($1,$2) RETURNING id", [name, opts.origin || "manual"]);
  try {
    const res = await RUN[name](creds, opts);
    await q("UPDATE sync_runs SET finished_at=now(), ok=true, added=$2, message=$3, days=$4, seen=$5, oldest=$6 WHERE id=$1", [run.rows[0].id, res.added, res.message || "", res.days ?? null, res.seen ?? null, res.oldest || null]);
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
  }
}

// Dry run for the "Test connection" button (spec section 9): last 30 days, summary only, nothing saved.
export const testSource = (name) => {
  if (!RUN[name]) throw new Error("unknown source " + name);
  return withJob(name, "test", () => testInner(name));
};
async function testInner(name) {
  const creds = await getCreds(name);
  if (!creds) return { ok: false, error: "not connected" };
  if (await isLocked(name)) return { ok: false, locked: true, error: "Locked after failed attempts. Unlock it first." };
  try {
    let out;
    if (name === "wise") {
      const w = await fetchWise(creds.token, { days: 30 });
      out = { balances: w.balances.map((b) => ({ currency: b.currency, value: b.value })), transactions: w.transactions.length, note: w.note || "Statements are available" };
    } else {
      const res = await scrape(name, creds, 30);
      out = { accounts: (res.accounts || []).map((a) => ({ balance: a.balance ?? null, transactions: (a.txns || []).length, first: toRows(a).slice(0, 3).map((r) => ({ date: r.date, description: r.description, amount: r.amount })) })) };
    }
    await recordResult(name, true);
    await markTested(name);
    return { ok: true, ...out };
  } catch (e) {
    const msg = scrub(e.message || e, Object.values(creds));
    const locked = await recordResult(name, false, msg, creds);
    return { ok: false, error: msg, locked };
  }
}

export const syncAll = (origin = "manual") => withJob("all", "sync", () => syncAllInner(origin));
async function syncAllInner(origin) {
  await refreshRates(7).catch((e) => console.error("rates:", e.message));
  const out = {};
  for (const s of SOURCE_NAMES) out[s] = await syncInner(s, { origin });
  await fillJars().catch((e) => console.error("jars:", e.message));
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
  // An hourly tick checks the "sync every N hours" setting, so it can be changed in the app without a restart.
  cron.schedule("5 * * * *", async () => {
    try {
      const { hours, lastAuto } = await getSyncSettings();
      if (!hours || (lastAuto && Date.now() - new Date(lastAuto) < (hours * 3600e3 - 5 * 60e3))) return;
      await putSet("sync_last_auto", new Date().toISOString());
      await syncAll("auto").then(snapshotNetWorth);
    } catch (e) { console.error("sync:", e.message); }
  });
  cron.schedule("30 3 * * *", () => refreshRates(7).catch((e) => console.error("rates:", e.message)));
  cron.schedule("10 */6 * * *", () => fillJars().catch((e) => console.error("jars:", e.message))); // retried through the day: a jar waiting for money takes it when it arrives
  fillJars().catch((e) => console.error("jars:", e.message));
  cron.schedule("0 9 * * *", () => remindOldGaps().catch((e) => console.error("remind:", e.message)));
  console.log("scheduler on");
}
export { sendNtfy };

// Newest first, for the Sync log in Settings.
export async function syncLog(limit = 200) {
  const r = await q("SELECT id,source,started_at,finished_at,ok,added,message,days,seen,oldest,origin FROM sync_runs ORDER BY id DESC LIMIT $1", [limit]);
  return r.rows.map((x) => ({ ...x, label: LABELS[x.source] || x.source, oldest: x.oldest ? new Date(x.oldest).toISOString().slice(0, 10) : null }));
}
