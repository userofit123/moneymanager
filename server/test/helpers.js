process.env.DATABASE_URL ||= "postgres://money:money@localhost:5432/money_test";
process.env.SCHEDULER = "0";
const { pool, q, migrate } = await import("../src/db.js");
const { ensureDefaults } = await import("../src/state.js");

export async function reset() {
  await migrate();
  await q(`TRUNCATE transactions, transaction_tags, tags, documents, rules, jars, bills, ignored_bills, budgets, settings, dismissed_alerts,
           transfer_links, reconciliation_adjustments, balance_snapshots, balance_gaps, exchange_rates, net_worth_snapshots, audit_log,
           sync_runs, accounts, categories RESTART IDENTITY CASCADE`);
  await ensureDefaults();
  await q("INSERT INTO exchange_rates (date,base,quote,rate) VALUES ('2026-10-01','USD','ILS',3.055),('2026-10-01','EUR','ILS',3.4291)");
}
export { pool, q };
