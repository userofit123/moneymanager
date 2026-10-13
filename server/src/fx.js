// Exchange rates. Frankfurter (ECB reference rates) for display; cached in the database, with a stale marker.
import { q } from "./db.js";

// The currencies you chose (Settings), plus any currency an account or transaction already uses, so a balance is never
// valued at 1:1 by mistake. ILS is the display currency and never needs a rate.
export async function configuredCurrencies() {
  const r = await q("SELECT value FROM settings WHERE key='currencies'");
  return ["ILS", ...(Array.isArray(r.rows[0]?.value) ? r.rows[0].value : ["USD"])];
}
export async function activeCurrencies() {
  const set = new Set((await configuredCurrencies()).filter((c) => c !== "ILS"));
  for (const r of (await q("SELECT DISTINCT currency AS c FROM accounts UNION SELECT DISTINCT orig_currency FROM transactions WHERE orig_currency IS NOT NULL")).rows)
    if (r.c && r.c !== "ILS" && /^[A-Z]{3}$/.test(r.c)) set.add(r.c);
  return [...set];
}

// Banks and cards report the shekel as "₪", "NIS", "ש\"ח" and so on. Everything inside the app uses ISO codes.
const SYMS = { "₪": "ILS", "NIS": "ILS", "ש\"ח": "ILS", "שח": "ILS", "ש״ח": "ILS", "$": "USD", "US$": "USD", "€": "EUR", "£": "GBP", "¥": "JPY" };
export function normCur(c) {
  if (!c) return c;
  const t = String(c).trim();
  return SYMS[t] || SYMS[t.toUpperCase()] || t.toUpperCase();
}

const API = process.env.FX_API || "https://api.frankfurter.dev/v1";

export async function refreshRates(days = 400) {
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  let n = 0; const failed = [];
  for (const base of await activeCurrencies()) {
    try {
      const r = await fetch(`${API}/${start}..${end}?base=${base}&symbols=ILS`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      for (const [d, o] of Object.entries(j.rates)) {
        await q("INSERT INTO exchange_rates (date,base,quote,rate,source) VALUES ($1,$2,'ILS',$3,'frankfurter') ON CONFLICT (date,base,quote) DO UPDATE SET rate=$3", [d, base, o.ILS]);
        n++;
      }
    } catch (e) { failed.push(`${base}: ${e.message}`); } // one unsupported currency must not stop the others
  }
  if (failed.length && !n) throw new Error("rates: " + failed.join("; "));
  return n;
}

// Rate on a date (the latest on or before it). ILS is 1.
export async function rateOn(cur, date) {
  if (!cur || cur === "ILS") return 1;
  const r = await q("SELECT rate FROM exchange_rates WHERE base=$1 AND quote='ILS' AND date<=$2 ORDER BY date DESC LIMIT 1", [cur, date]);
  if (r.rowCount) return r.rows[0].rate;
  const f = await q("SELECT rate FROM exchange_rates WHERE base=$1 AND quote='ILS' ORDER BY date LIMIT 1", [cur]);
  return f.rowCount ? f.rows[0].rate : null;
}

export async function ratesSummary(daysBack = 30) {
  const out = { fx: { ILS: 1 }, series: {}, stale: true, asOf: null, source: "none" };
  for (const base of await activeCurrencies()) {
    const r = await q("SELECT date,rate FROM exchange_rates WHERE base=$1 AND quote='ILS' AND date >= (current_date - $2::int) ORDER BY date", [base, daysBack]);
    if (!r.rowCount) continue;
    out.series[base] = r.rows.map((x) => [x.date, x.rate]);
    out.fx[base] = r.rows[r.rowCount - 1].rate;
    const last = r.rows[r.rowCount - 1].date;
    if (!out.asOf || last > out.asOf) out.asOf = last;
    out.source = "frankfurter";
  }
  if (out.asOf) out.stale = Date.now() - new Date(out.asOf).getTime() > 4 * 864e5;
  return out;
}
