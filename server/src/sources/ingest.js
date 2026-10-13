// One door for every source: dedupe, convert, merge hand-entered rows, then let the engine tidy up.
import crypto from "node:crypto";
import { tx, audit, bumpRev } from "../db.js";
import { rateOn, normCur } from "../fx.js";
import { detectCardPayments, detectSalary } from "../autodetect.js";
import { applyRules, applyTagRules, detectTransfers, explainGaps, healGaps } from "../engine.js";

const hash = (...p) => crypto.createHash("sha1").update(p.join("|")).digest("hex").slice(0, 20);

/**
 * rows: [{ date:'YYYY-MM-DD', description, amount (signed, original currency), currency, externalId?, counterparty?, pending?, bankCategory? }]
 * account: { name, currency, source }
 */
export async function ingest(account, rows, { mergeManual = false } = {}) {
  return tx(async (c) => {
    let added = 0, merged = 0, migrated = 0, updated = 0;
    const fresh = [];
    const seen = {};
    await c.query("DELETE FROM transactions WHERE pending AND source=$1 AND (from_name=$2 OR to_name=$2)", [account.source, account.name]);
    for (const r of rows) {
      const cur = normCur(r.currency) || normCur(account.currency);
      let ext = r.externalId;
      if (!ext) { // no id from the bank: fingerprint, with a counter so two identical same-day purchases both stay
        const k = hash(account.name, r.date, r.description, r.amount);
        seen[k] = (seen[k] || 0) + 1;
        ext = `${k}:${seen[k]}`;
      } else { // the same id, date and amount twice in one batch (two identical purchases) also both stay
        seen[ext] = (seen[ext] || 0) + 1;
        if (seen[ext] > 1) ext = `${ext}#${seen[ext]}`;
      }
      const dup = await c.query("SELECT id,inst_total,date::text AS d,(details IS NULL) AS nodet FROM transactions WHERE source=$1 AND external_id=$2 AND (from_name=$3 OR to_name=$3) AND COALESCE(orig_currency,'ILS')=$4", [account.source, ext, account.name, cur]);
      if (dup.rowCount) { // already there: only learn what an earlier import did not have (instalment numbers, the bank's own details)
        if (r.date && dup.rows[0].d !== r.date && Math.abs(Date.parse(dup.rows[0].d) - Date.parse(r.date)) <= 864e5) { // read in the wrong time zone by an earlier version: one day off
          await c.query("UPDATE transactions SET date=$2 WHERE id=$1", [dup.rows[0].id, r.date]); updated++;
        }
        if (r.instTotal && !dup.rows[0].inst_total) await c.query("UPDATE transactions SET inst_n=$2,inst_total=$3 WHERE id=$1", [dup.rows[0].id, r.instN, r.instTotal]);
        if (r.details && dup.rows[0].nodet) await c.query("UPDATE transactions SET details=$2 WHERE id=$1", [dup.rows[0].id, JSON.stringify(r.details)]);
        continue;
      }
      if (r.legacyId && seen[r.externalId] === 1) { // imported by an older version under the bare bank id: recognise it and upgrade its id
        const old = (await c.query("SELECT id,date,amount,orig_amount FROM transactions WHERE source=$1 AND external_id=$2", [account.source, r.legacyId])).rows[0];
        if (old && String(old.date) === r.date && Math.abs((old.orig_amount ?? old.amount) - r.amount) < 0.005) {
          await c.query("UPDATE transactions SET external_id=$2 WHERE id=$1", [old.id, ext]);
          migrated++;
          continue;
        }
      }

      const rate = await rateOn(cur, r.date);
      if (rate == null) throw new Error(`no exchange rate for ${cur} on ${r.date}; run a rates refresh first`);
      const ils = +(r.amount * rate).toFixed(2);
      if (r.stableKey && r.amount !== 0) { // a charge first listed with an amount of 0: when the bank fills in the real amount, update that row instead of adding a second one
        const esc = r.stableKey.replace(/[\\%_]/g, "\\$&");
        const prov = await c.query("SELECT id FROM transactions WHERE source=$1 AND external_id LIKE $2 AND (from_name=$3 OR to_name=$3) AND amount=0 ORDER BY id LIMIT 1", [account.source, esc + ":%", account.name]);
        if (prov.rowCount) {
          await c.query("UPDATE transactions SET amount=$2,orig_currency=$3,orig_amount=$4,rate=$5,external_id=$6,pending=$7,details=$8 WHERE id=$1",
            [prov.rows[0].id, ils, cur !== "ILS" ? cur : null, cur !== "ILS" ? r.amount : null, rate, ext, !!r.pending, r.details ? JSON.stringify(r.details) : null]);
          await audit(c, "Amount filled in", `${r.description}: the bank now reports the real charge`);
          if (!r.pending) await explainGaps(c, prov.rows[0].id, account.name, cur, r.amount);
          updated++;
          continue;
        }
      }
      const out = r.amount < 0;
      const from = out ? account.name : r.counterparty || r.description || "Bank transfer"; // the description names the payer
      const to = out ? r.counterparty || r.description : account.name;
      const foreign = cur !== "ILS";

      if (mergeManual) { // a hand-entered row for the same money: same account, same amount, within 1 day
        const m = await c.query(
          `SELECT id FROM transactions WHERE ((source='manual' AND external_id IS NULL) OR (source=$6 AND external_id LIKE 'act:%')) AND (from_name=$1 OR to_name=$1)
           AND ((orig_currency IS NOT NULL AND orig_currency=$4 AND orig_amount=$2) OR (orig_currency IS NULL AND amount=$3))
           AND abs(date - $5::date) <= 1 ORDER BY id LIMIT 1`, [account.name, r.amount, ils, cur, r.date, account.source]);
        if (m.rowCount) { // the import wins for amount, date and description; category, tags, note and documents stay
          await c.query(
            "UPDATE transactions SET date=$2,description=$3,amount=$4,orig_currency=$5,orig_amount=$6,rate=$7,source=$8,external_id=$9,details=$10 WHERE id=$1",
            [m.rows[0].id, r.date, r.description, ils, foreign ? cur : null, foreign ? r.amount : null, rate, account.source, ext, r.details ? JSON.stringify(r.details) : null]);
          await audit(c, "Merged with import", `${r.description}: matched your hand-entered transaction`);
          merged++;
          continue;
        }
      }
      const ins = await c.query(
        `INSERT INTO transactions (date,description,from_name,to_name,amount,orig_currency,orig_amount,rate,source,external_id,pending,bank_category,inst_n,inst_total,details)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
        [r.date, r.description, from, to, ils, foreign ? cur : null, foreign ? r.amount : null, rate, account.source, ext, !!r.pending, r.bankCategory || null, r.instN || null, r.instTotal || null, r.details ? JSON.stringify(r.details) : null]);
      added++;
      fresh.push(ins.rows[0].id);
      if (r.amount && !r.pending) await explainGaps(c, ins.rows[0].id, account.name, cur, r.amount);
    }
    await applyRules(c);
    await applyTagRules(c, fresh);
    const pairs = await detectTransfers(c);
    const found = (await detectCardPayments(c)) + (await detectSalary(c));
    const healed = await healGaps(c, account.name, normCur(account.currency));
    if (added || merged || updated || pairs || healed || found) await bumpRev(c);
    return { added, merged, migrated, updated, transfers: pairs };
  });
}
