// Exchange rates. Frankfurter (ECB reference rates) for display; cached in the database, with a stale marker.
import { q } from "./db.js";

const BASES = ["USD", "EUR"];
const API = process.env.FX_API || "https://api.frankfurter.dev/v1";

export async function refreshRates(days = 400) {
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  let n = 0;
  for (const base of BASES) {
    const r = await fetch(`${API}/${start}..${end}?base=${base}&symbols=ILS`);
    if (!r.ok) throw new Error(`rates ${base}: HTTP ${r.status}`);
    const j = await r.json();
    for (const [d, o] of Object.entries(j.rates)) {
      await q("INSERT INTO exchange_rates (date,base,quote,rate,source) VALUES ($1,$2,'ILS',$3,'frankfurter') ON CONFLICT (date,base,quote) DO UPDATE SET rate=$3", [d, base, o.ILS]);
      n++;
    }
  }
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
  for (const base of BASES) {
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
