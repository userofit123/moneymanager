// One door for every source: dedupe, convert, merge hand-entered rows, then let the engine tidy up.
import crypto from "node:crypto";
import { tx, audit, bumpRev } from "../db.js";
import { rateOn } from "../fx.js";
import { applyRules, detectTransfers, explainGaps } from "../engine.js";

const hash = (...p) => crypto.createHash("sha1").update(p.join("|")).digest("hex").slice(0, 20);

/**
 * rows: [{ date:'YYYY-MM-DD', description, amount (signed, original currency), currency, externalId?, counterparty?, pending?, bankCategory? }]
 * account: { name, currency, source }
 */
export async function ingest(account, rows, { mergeManual = false } = {}) {
  return tx(async (c) => {
    let added = 0, merged = 0, migrated = 0;
    const seen = {};
    await c.query("DELETE FROM transactions WHERE pending AND source=$1 AND (from_name=$2 OR to_name=$2)", [account.source, account.name]);
    for (const r of rows) {
      const cur = r.currency || account.currency;
      let ext = r.externalId;
      if (!ext) { // no id from the bank: fingerprint, with a counter so two identical same-day purchases both stay
        const k = hash(account.name, r.date, r.description, r.amount);
        seen[k] = (seen[k] || 0) + 1;
        ext = `${k}:${seen[k]}`;
      } else { // the same id, date and amount twice in one batch (two identical purchases) also both stay
        seen[ext] = (seen[ext] || 0) + 1;
        if (seen[ext] > 1) ext = `${ext}#${seen[ext]}`;
      }
      const dup = await c.query("SELECT id FROM transactions WHERE source=$1 AND external_id=$2", [account.source, ext]);
      if (dup.rowCount) continue;
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
      const out = r.amount < 0;
      const from = out ? account.name : r.counterparty || "Bank transfer";
      const to = out ? r.counterparty || r.description : account.name;
      const foreign = cur !== "ILS";

      if (mergeManual) { // a hand-entered row for the same money: same account, same amount, within 1 day
        const m = await c.query(
          `SELECT id FROM transactions WHERE source='manual' AND external_id IS NULL AND (from_name=$1 OR to_name=$1)
           AND ((orig_currency IS NOT NULL AND orig_currency=$4 AND orig_amount=$2) OR (orig_currency IS NULL AND amount=$3))
           AND abs(date - $5::date) <= 1 ORDER BY id LIMIT 1`, [account.name, r.amount, ils, cur, r.date]);
        if (m.rowCount) { // the import wins for amount, date and description; category, tags, note and documents stay
          await c.query(
            "UPDATE transactions SET date=$2,description=$3,amount=$4,orig_currency=$5,orig_amount=$6,rate=$7,source=$8,external_id=$9 WHERE id=$1",
            [m.rows[0].id, r.date, r.description, ils, foreign ? cur : null, foreign ? r.amount : null, rate, account.source, ext]);
          await audit(c, "Merged with import", `${r.description}: matched your hand-entered transaction`);
          merged++;
          continue;
        }
      }
      const ins = await c.query(
        `INSERT INTO transactions (date,description,from_name,to_name,amount,orig_currency,orig_amount,rate,source,external_id,pending,bank_category)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
        [r.date, r.description, from, to, ils, foreign ? cur : null, foreign ? r.amount : null, rate, account.source, ext, !!r.pending, r.bankCategory || null]);
      added++;
      if (r.amount && !r.pending) await explainGaps(c, ins.rows[0].id, account.name, cur, r.amount);
    }
    await applyRules(c);
    const pairs = await detectTransfers(c);
    if (added || merged || pairs) await bumpRev(c);
    return { added, merged, migrated, transfers: pairs };
  });
}
