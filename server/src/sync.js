// Scheduled sync of every source, one at a time. A failing source is recorded and never breaks the others or the app.
import fs from "node:fs";
import cron from "node-cron";
import { q, tx, audit, bumpRev } from "./db.js";
import { refreshRates } from "./fx.js";
import { ingest } from "./sources/ingest.js";
import { fetchWise } from "./sources/wise.js";
import { scrape } from "./sources/scraper.js";
import { recordSnapshot } from "./engine.js";

// Secrets come from env or a file (permissions 600) and are never logged.
const secret = (name) => {
  if (process.env[name]) return process.env[name];
  const f = process.env[name + "_FILE"];
  return f && fs.existsSync(f) ? fs.readFileSync(f, "utf8").trim() : "";
};

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

const SOURCES = {
  async wise() {
    const token = secret("WISE_TOKEN");
    if (!token) throw new Error("WISE_TOKEN is not set");
    const w = await fetchWise(token);
    let added = 0;
    for (const b of w.balances) {
      const a = await tx((c) => account(c, "Wise", b.currency, { kind: "wallet", source: "wise", subtitle: `${b.currency} balance` }));
      const rows = w.transactions.filter((t) => t.currency === b.currency);
      if (rows.length) added += (await ingest({ name: "Wise", currency: b.currency, source: "wise" }, rows, { mergeManual: true })).added;
      await setBalance(a, b.value);
    }
    return { added, message: w.note };
  },
  ...Object.fromEntries([["hapoalim", "Bank Hapoalim", "bank"], ["max", "Max", "card"], ["isracard", "Isracard", "card"]].map(([key, name, kind]) => [key, async () => {
    const res = await scrape(key);
    let added = 0, balance = null;
    for (const acc of res.accounts || []) {
      const rows = (acc.txns || []).map((t) => ({
        date: String(t.date).slice(0, 10), description: t.description, amount: t.chargedAmount ?? t.originalAmount,
        currency: t.chargedCurrency || "ILS", externalId: t.identifier ? `${acc.accountNumber}:${t.identifier}` : undefined,
        pending: t.status === "pending", bankCategory: t.category,
      })).filter((r) => typeof r.amount === "number");
      added += (await ingest({ name, currency: "ILS", source: key }, rows)).added;
      if (typeof acc.balance === "number") balance = (balance || 0) + acc.balance;
    }
    if (balance != null) {
      const a = await tx((c) => account(c, name, "ILS", { kind, source: key }));
      await setBalance(a, balance);
    }
    return { added, message: "" };
  }])),
};

export const SOURCE_NAMES = Object.keys(SOURCES);
const running = new Set();

export async function syncSource(name) {
  if (!SOURCES[name]) throw new Error("unknown source " + name);
  if (running.has(name)) return { skipped: true };
  running.add(name);
  const run = await q("INSERT INTO sync_runs (source) VALUES ($1) RETURNING id", [name]);
  try {
    const res = await SOURCES[name]();
    await q("UPDATE sync_runs SET finished_at=now(), ok=true, added=$2, message=$3 WHERE id=$1", [run.rows[0].id, res.added, res.message || ""]);
    if (res.added) await audit(null, "Sync", `${name} synced · ${res.added} new transactions`);
    await q("UPDATE app_meta SET value=(value::int+1)::text WHERE key='rev'");
    return { ok: true, ...res };
  } catch (e) {
    const msg = String(e.message || e).slice(0, 300); // never include credentials
    await q("UPDATE sync_runs SET finished_at=now(), ok=false, message=$2 WHERE id=$1", [run.rows[0].id, msg]);
    return { ok: false, error: msg };
  } finally {
    running.delete(name);
  }
}

export async function syncAll() {
  await refreshRates(7).catch((e) => console.error("rates:", e.message));
  const out = {};
  for (const s of SOURCE_NAMES) {
    if (s !== "wise" && !secret("SCRAPER_ENABLED") && !process.env.SCRAPER_URL) { out[s] = { skipped: true }; continue; }
    out[s] = await syncSource(s);
  }
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
  console.log("scheduler on:", every);
}
