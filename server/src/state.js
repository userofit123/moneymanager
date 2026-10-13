// Assembles the whole app state from the tables (the shape the UI works with) and writes UI edits back.
import { q, tx, bumpRev } from "./db.js";
import { explainGaps } from "./engine.js";
import { listConnections, PROVIDERS } from "./connections.js";
import { addSuggested } from "./categories.js";
import { readJars, fillJarsTx, thisMonth } from "./jars.js";
import { activeCurrencies, configuredCurrencies } from "./fx.js";

export const DEFAULT_CFG = {
  jars: 1, bills: 1, price: 1, budget: 1, card: 1, large: 1, xfer: 1, recon: 1, sync: 1, uncat: 1, forecast: 1, docs: 1,
  cardPct: 10, largeAmt: 5000, billDays: 3, budgetPct: 80, gapDays: 3,
};
export const DEFAULT_CATS = ["Groceries", "Rent & housing", "Eating out", "Subscriptions", "Transport", "Fees & FX costs", "Income", "Uncategorized"];
const CAT_COLOR = { Groceries: 0, "Rent & housing": 1, "Eating out": 2, Subscriptions: 3, Transport: 4, "Fees & FX costs": 5, Income: 99, Uncategorized: 6 };

const setting = async (key, dflt) => {
  const r = await q("SELECT value FROM settings WHERE key=$1", [key]);
  return r.rowCount ? r.rows[0].value : dflt;
};

export async function ensureDefaults({ demoAccounts = true } = {}) {
  const n = await q("SELECT count(*)::int AS n FROM categories");
  if (n.rows[0].n === 0) await addSuggested(); // fresh install: a full set of categories and starter rules
  const a = await q("SELECT count(*)::int AS n FROM accounts");
  if (a.rows[0].n === 0) {
    // Accounts appear when something is connected, imported or typed in. Only the hand-entered pension exists from the start.
    // (demoAccounts is only for the tests, which expect a bank, two cards and a wallet.)
    const rows = [
      ...(demoAccounts ? [
        ["Bank Hapoalim", "ILS", "bank", "hapoalim", "Current account", false, 0],
        ["Max", "ILS", "card", "max", "Credit card", false, 1],
        ["Isracard", "ILS", "card", "isracard", "Credit card", false, 2],
        ["Wise", "USD", "wallet", "wise", "USD balance", false, 3]] : []),
      ["Pension", "ILS", "pension", "manual", "Manual · not counted in net worth or reports", true, 4],
    ];
    for (const r of rows)
      await q("INSERT INTO accounts (name,currency,kind,source,subtitle,manual,in_net_worth,sort) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [...r.slice(0, 6), r[2] !== "pension" && r[2] !== "card", r[6]]);
  }
}

export async function getState() {
  const [cats, rules, tagRules, txs, tags, docs, xf, budgets, bills, ign, jars, audit, dism, adj, accounts, runs, rev, snaps, gaps] = await Promise.all([
    q("SELECT name,color FROM categories ORDER BY sort"),
    q("SELECT keyword,category,tag FROM rules ORDER BY position,id"),
    q("SELECT keyword,tag FROM tag_rules ORDER BY position,id"),
    q("SELECT id,date,description,from_name,to_name,amount,orig_currency,orig_amount,category,note,dup_ok,pending,source,inst_n,inst_total,jar_id,jar_amount,jar_auto,jar_skip,(details IS NOT NULL) AS has_det FROM transactions ORDER BY date DESC, id DESC"),
    q("SELECT transaction_id,tag FROM transaction_tags ORDER BY position"),
    q("SELECT id,transaction_id,filename,(path IS NOT NULL) AS has FROM documents ORDER BY id"),
    q("SELECT out_id,in_id,status FROM transfer_links"),
    q("SELECT category,monthly_limit FROM budgets"),
    q("SELECT data FROM bills ORDER BY id"),
    q("SELECT match FROM ignored_bills"),
    Promise.resolve(null),
    q("SELECT id,at,who,action,detail,undo FROM audit_log ORDER BY id DESC LIMIT 2000"),
    q("SELECT id FROM dismissed_alerts"),
    q("SELECT account,sum(amount)::float AS amount FROM reconciliation_adjustments GROUP BY account"),
    q("SELECT id,name,currency,kind,source,subtitle,manual,in_net_worth,balance,balance_at,custom,custom_kind,in_reports FROM accounts a WHERE manual OR balance_at IS NOT NULL OR EXISTS (SELECT 1 FROM transactions t WHERE t.from_name=a.name OR t.to_name=a.name) ORDER BY sort,id"),
    q("SELECT DISTINCT ON (source) source,finished_at,ok,added,message FROM sync_runs WHERE finished_at IS NOT NULL ORDER BY source, id DESC"),
    q("SELECT value FROM app_meta WHERE key='rev'"),
    q("SELECT month,bank,wise,pension,other FROM net_worth_snapshots ORDER BY month"),
    q("SELECT g.id,a.name AS account,a.currency,g.amount,g.remaining,g.window_from,g.window_to,g.status,g.review_note FROM balance_gaps g JOIN accounts a ON a.id=g.account_id WHERE g.status='open' ORDER BY g.id"),
  ]);
  const tagMap = {}, docMap = {};
  tags.rows.forEach((r) => (tagMap[r.transaction_id] ||= []).push(r.tag));
  docs.rows.forEach((r) => (docMap[r.transaction_id] ||= []).push(r));
  const cfg = { ...DEFAULT_CFG, ...(await setting("cfg", {})) };
  // only booleans: which sources have credentials saved, and which are locked (never the credentials themselves)
  const [credRows, stRows] = await Promise.all([q("SELECT source FROM credentials"), q("SELECT source,locked FROM source_state")]);
  const connected = Object.fromEntries(credRows.rows.map((r) => [r.source, true]));
  if (process.env.WISE_TOKEN) connected.wise = true;
  const locked = Object.fromEntries(stRows.rows.filter((r) => r.locked).map((r) => [r.source, true]));
  const connStatus = Object.fromEntries((await listConnections()).map((c) => [c.source, { ...c.status, error: c.lastError, label: c.label }]));
  return {
    v: 4,
    rev: parseInt(rev.rows[0].value, 10),
    cats: Object.fromEntries(cats.rows.map((c) => [c.name, c.color])),
    rules: rules.rows.map((r) => ({ k: r.keyword, c: r.category, t: r.tag })),
    tagRules: tagRules.rows.map((r) => ({ k: r.keyword, t: r.tag })),
    tx: txs.rows.map((r) => ({
      id: r.id, d: r.date, desc: r.description, from: r.from_name, to: r.to_name, a: r.amount,
      ...(r.orig_currency ? { orig: { cur: r.orig_currency, amt: r.orig_amount } } : {}),
      c: r.category || "", tags: tagMap[r.id] || [],
      docs: (docMap[r.id] || []).map((d) => d.filename), docIds: (docMap[r.id] || []).map((d) => d.id), docHas: (docMap[r.id] || []).map((d) => d.has),
      note: r.note, ...(r.pending ? { pending: true } : {}), src: r.source,
      ...(r.dup_ok ? { dupOk: true } : {}),
      ...(r.inst_total ? { inst: [r.inst_n, r.inst_total] } : {}),
      ...(r.jar_id ? { jar: { id: r.jar_id, amt: r.jar_amount, ...(r.jar_auto ? { auto: true } : {}) } } : {}),
      ...(r.jar_skip ? { jarNo: r.jar_skip } : {}),
      ...(r.has_det ? { hasDet: true } : {}),
    })),
    budgets: Object.fromEntries(budgets.rows.map((b) => [b.category, b.monthly_limit])),
    bills: bills.rows.map((b) => b.data),
    ignoredBills: ign.rows.map((r) => r.match),
    jars: await readJars({ query: q }),
    audit: audit.rows.map((a) => ({ id: a.id, t: a.at.toISOString(), who: a.who, action: a.action, detail: a.detail, undo: a.undo })),
    xf: xf.rows.map((x) => ({ o: x.out_id, i: x.in_id, st: x.status })),
    dismissed: Object.fromEntries(dism.rows.map((r) => [r.id, 1])),
    dupOk: Object.fromEntries(txs.rows.filter((r) => r.dup_ok).map((r) => [r.id, 1])),
    adj: Object.fromEntries(adj.rows.map((r) => [r.account, r.amount])),
    ntfy: await setting("ntfy", ""),
    jarsTotal: await setting("jars_total", 0), jarsBuffer: await setting("jars_buffer", 0), jarsReserve: await setting("jars_reserve", 0),
    nwPension: await setting("nw_pension", false),
    hiddenMerchants: await setting("hidden_merchants", []), ccOverride: await setting("cc_override", {}), cardRules: await setting("card_rules", []), salaryRules: await setting("salary_rules", []), txIgnore: await setting("tx_ignore", {}), budgetNo: await setting("budget_no", []),
    cfg,
    currencies: await configuredCurrencies(), fxCurrencies: await activeCurrencies(),
    accounts: accounts.rows.map((a) => ({
      id: a.id, n: a.name, cur: a.currency, kind: a.kind, src: a.source, s: a.subtitle, manual: a.manual,
      inNW: a.in_net_worth, v: a.balance, at: a.balance_at,
      hide: a.kind === "pension" && +a.balance === 0, // an empty pension is not shown anywhere until it has a value
      custom: !!a.custom, ck: a.custom_kind || "", inR: a.in_reports !== false,
    })),
    connected, locked, connStatus, companies: Object.values(PROVIDERS).filter((p) => p.kind !== "wallet").map((p) => ({ label: p.label, kind: p.kind })),
    sources: runs.rows.map((r) => ({ n: r.source, ok: r.ok, at: r.finished_at, added: r.added, msg: r.message })),
    nwSnaps: snaps.rows,
    balUpdates: (await q("SELECT u.id,a.name AS acc,u.at,u.old_balance::float AS old,u.new_balance::float AS nu,u.note FROM account_updates u JOIN accounts a ON a.id=u.account_id ORDER BY u.at DESC, u.id DESC LIMIT 300")).rows,
    gaps: gaps.rows.map((g) => ({ ...g, window_from: g.window_from.toISOString(), window_to: g.window_to.toISOString() })),
  };
}

const sig = (o) => JSON.stringify(o);

export class StaleError extends Error {}

// Writes the UI's edits back. `rev` must match, otherwise a sync changed the data in the meantime.
export async function putState(S) {
  return tx(async (c) => {
    const cur = await c.query("SELECT value FROM app_meta WHERE key='rev' FOR UPDATE");
    if (parseInt(cur.rows[0].value, 10) !== S.rev) throw new StaleError("stale");

    // categories (upsert, delete missing)
    const catNames = Object.keys(S.cats || {});
    for (const n of catNames) await c.query("INSERT INTO categories (name,color) VALUES ($1,$2) ON CONFLICT (name) DO UPDATE SET color=$2", [n, S.cats[n]]);
    await c.query("DELETE FROM categories WHERE NOT (name = ANY($1))", [catNames]);

    // rules (wholesale, order kept)
    await c.query("DELETE FROM rules");
    for (const [i, r] of (S.rules || []).entries())
      await c.query("INSERT INTO rules (keyword,category,tag,position) VALUES ($1,$2,$3,$4)", [r.k, r.c, r.t || "", i]);

    // tag rules (wholesale, order kept)
    await c.query("DELETE FROM tag_rules");
    for (const [i, r] of (S.tagRules || []).entries())
      if (r.k && r.t) await c.query("INSERT INTO tag_rules (keyword,tag,position) VALUES ($1,$2,$3)", [r.k, r.t, i]);

    // jars: the balance is only written when the user edited it (or the jar is new); fills are the server's job
    const jids = (S.jars || []).map((j) => j.id);
    for (const j of S.jars || []) {
      const ex = await c.query("SELECT 1 FROM jars WHERE id=$1", [j.id]);
      if (ex.rowCount) {
        await c.query("UPDATE jars SET name=$2,priority=$3,target=$4,cap=$5,due=$6,bill_match=$7,auto_cap=$8,description=$9,bill_months=$10,done_at=$11 WHERE id=$1", [j.id, j.n, j.p, j.need, j.cap ?? null, j.due || null, j.bill || null, !!j.auto, String(j.desc || "").slice(0, 400), j.months || null, j.done || null]);
        if (j.balEdit) {
          // money taken out of a jar by hand (released, paid out, corrected) is recorded, so "received this month" stays true
          const old = +((await c.query("SELECT balance FROM jars WHERE id=$1", [j.id])).rows[0]?.balance ?? j.bal), delta = +(j.bal - old).toFixed(2);
          await c.query("UPDATE jars SET balance=$2 WHERE id=$1", [j.id, j.bal]);
          // balPaid: the change is a payment out of the jar (or taking one back), which is spending, not a return of money
          if (delta > 0.005 && j.balUndo) await c.query("INSERT INTO jar_movements (jar_id,amount,note,month,paid) VALUES ($1,$2,$3,$4,$5)", [j.id, delta, String(j.balNote || "Undone").slice(0, 120), thisMonth(), !!j.balPaid]);
          if (delta < -0.005) await c.query("INSERT INTO jar_movements (jar_id,amount,note,month,paid) VALUES ($1,$2,$3,$4,$5)", [j.id, delta, String(j.balNote || "Taken out").slice(0, 120), thisMonth(), !!j.balPaid]);
        }
      } else await c.query("INSERT INTO jars (id,name,priority,target,cap,balance,due,bill_match,auto_cap,description,bill_months,done_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)", [j.id, j.n, j.p, j.need, j.cap ?? null, j.bal, j.due || null, j.bill || null, !!j.auto, String(j.desc || "").slice(0, 400), j.months || null, j.done || null]);
    }
    // categories a jar pays for: one jar per category, only for categories that exist
    await c.query("DELETE FROM jar_categories");
    const today = new Date().toISOString().slice(0, 10), linked = new Set();
    for (const j of S.jars || []) for (const x of j.cats || []) {
      if (!x || !x.c || linked.has(x.c) || !(x.c in (S.cats || {}))) continue;
      linked.add(x.c);
      await c.query("INSERT INTO jar_categories (category,jar_id,since) VALUES ($1,$2,$3)", [x.c, j.id, /^\d{4}-\d{2}-\d{2}$/.test(x.since || "") ? x.since : today]);
    }

    // transactions
    const have = new Map((await c.query("SELECT id,date,description,from_name,to_name,amount,orig_currency,orig_amount,category,note,dup_ok,jar_id,jar_amount,jar_auto,jar_skip FROM transactions")).rows.map((r) => [r.id, r]));
    const tagRows = await c.query("SELECT transaction_id,tag FROM transaction_tags ORDER BY position");
    const haveTags = {};
    tagRows.rows.forEach((r) => (haveTags[r.transaction_id] ||= []).push(r.tag));
    const keep = new Set();
    for (const t of S.tx || []) {
      keep.add(t.id);
      const row = [t.id, t.d, t.desc, t.from || "", t.to || "", t.a, t.orig?.cur || null, t.orig?.amt ?? null, t.c || null, t.note || "", !!S.dupOk?.[t.id], t.jar?.id || null, t.jar?.id ? +t.jar.amt || 0 : null, !!(t.jar?.id && t.jar.auto), t.jarNo ? String(t.jarNo).slice(0, 120) : null];
      const old = have.get(t.id);
      const same = old && sig([old.id, old.date, old.description, old.from_name, old.to_name, old.amount, old.orig_currency, old.orig_amount, old.category, old.note, old.dup_ok, old.jar_id, old.jar_amount == null ? null : +old.jar_amount, old.jar_auto, old.jar_skip]) === sig(row);
      if (!same) {
        const isNew = !old;
        await c.query(
          `INSERT INTO transactions (id,date,description,from_name,to_name,amount,orig_currency,orig_amount,category,note,dup_ok,jar_id,jar_amount,jar_auto,jar_skip,source)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,(SELECT id FROM jars WHERE id=$12),$13,$14,$15,'manual')
           ON CONFLICT (id) DO UPDATE SET date=$2,description=$3,from_name=$4,to_name=$5,amount=$6,orig_currency=$7,orig_amount=$8,category=$9,note=$10,dup_ok=$11,jar_id=(SELECT id FROM jars WHERE id=$12),jar_amount=$13,jar_auto=$14,jar_skip=$15`, row);
        if (isNew) { // a hand-entered transaction explains open balance gaps on its account
          const acct = t.a < 0 ? t.from : t.to, cur = t.orig?.cur || "ILS", amt = t.orig?.amt != null ? t.orig.amt * Math.sign(t.a) : t.a;
          await explainGaps(c, t.id, acct, cur, amt);
        }
      }
      if (sig(haveTags[t.id] || []) !== sig(t.tags || [])) {
        await c.query("DELETE FROM transaction_tags WHERE transaction_id=$1", [t.id]);
        for (const [i, g] of (t.tags || []).entries()) {
          await c.query("INSERT INTO tags (name) VALUES ($1) ON CONFLICT DO NOTHING", [g]);
          await c.query("INSERT INTO transaction_tags (transaction_id,tag,position) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [t.id, g, i]);
        }
      }
    }
    const gone = [...have.keys()].filter((id) => !keep.has(id));
    if (gone.length) await c.query("DELETE FROM transactions WHERE id = ANY($1)", [gone]);
    await c.query("SELECT setval(pg_get_serial_sequence('transactions','id'), GREATEST((SELECT COALESCE(max(id),1) FROM transactions),1))");

    // transfer links
    await c.query("DELETE FROM transfer_links");
    for (const x of S.xf || [])
      if (keep.has(x.o) && keep.has(x.i)) await c.query("INSERT INTO transfer_links (out_id,in_id,status) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [x.o, x.i, x.st]);

    // budgets, bills, ignored bills
    await c.query("DELETE FROM budgets");
    for (const [k, v] of Object.entries(S.budgets || {})) await c.query("INSERT INTO budgets (category,monthly_limit) VALUES ($1,$2)", [k, v]);
    await c.query("DELETE FROM bills");
    for (const b of S.bills || []) await c.query("INSERT INTO bills (data) VALUES ($1)", [JSON.stringify(b)]);
    await c.query("DELETE FROM ignored_bills");
    for (const m of S.ignoredBills || []) await c.query("INSERT INTO ignored_bills (match) VALUES ($1) ON CONFLICT DO NOTHING", [m]);

    await c.query("DELETE FROM jars WHERE NOT (id = ANY($1))", [jids]);
    await c.query("SELECT setval(pg_get_serial_sequence('jars','id'), GREATEST((SELECT COALESCE(max(id),1) FROM jars),1))");

    // settings and dismissed alerts
    const put = (k, v) => c.query("INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2", [k, JSON.stringify(v)]);
    if (Array.isArray(S.currencies)) await put("currencies", [...new Set(S.currencies.map(String).filter((x) => /^[A-Z]{3}$/.test(x) && x !== "ILS"))].slice(0, 12));
    await put("cfg", S.cfg || {}); await put("ntfy", S.ntfy || ""); await put("jars_total", +S.jarsTotal || 0); await put("jars_buffer", Math.max(0, +S.jarsBuffer || 0)); await put("jars_reserve", Math.max(0, +S.jarsReserve || 0)); await put("nw_pension", !!S.nwPension);
    await put("hidden_merchants", Array.isArray(S.hiddenMerchants) ? S.hiddenMerchants.map(String).slice(0, 500) : []);
    await put("cc_override", S.ccOverride && typeof S.ccOverride === "object" ? S.ccOverride : {});
    await put("card_rules", Array.isArray(S.cardRules) ? S.cardRules.map(String).slice(0, 200) : []);
    await put("salary_rules", Array.isArray(S.salaryRules) ? S.salaryRules.map(String).slice(0, 200) : []);
    await put("tx_ignore", S.txIgnore && typeof S.txIgnore === "object" ? S.txIgnore : {});
    await put("budget_no", Array.isArray(S.budgetNo) ? S.budgetNo.map(String).slice(0, 200) : []);
    await c.query("DELETE FROM dismissed_alerts");
    for (const id of Object.keys(S.dismissed || {})) await c.query("INSERT INTO dismissed_alerts (id) VALUES ($1) ON CONFLICT DO NOTHING", [id]);

    // balance adjustments: the UI keeps a running total per account, store the difference
    const curAdj = Object.fromEntries((await c.query("SELECT account,sum(amount)::float AS s FROM reconciliation_adjustments GROUP BY account")).rows.map((r) => [r.account, r.s]));
    for (const [acct, tot] of Object.entries(S.adj || {})) {
      const d = +(tot - (curAdj[acct] || 0)).toFixed(2);
      if (d) await c.query("INSERT INTO reconciliation_adjustments (account,amount) VALUES ($1,$2)", [acct, d]);
    }

    // accounts the user edits (pension balance)
    for (const a of S.accounts || []) {
      if (!a.manual) continue;
      const cur = (await c.query("SELECT balance FROM accounts WHERE id=$1", [a.id])).rows[0];
      if (cur && +cur.balance !== +a.v) {
        await c.query("UPDATE accounts SET balance=$2, balance_at=now() WHERE id=$1", [a.id, a.v]);
        await c.query("INSERT INTO account_updates (account_id,old_balance,new_balance) VALUES ($1,$2,$3)", [a.id, cur.balance, a.v]); // the history of a hand-entered balance
      }
    }

    // audit log: insert new entries (no id), drop removed ones
    const ids = [];
    const known = (S.audit || []).filter((a) => a.id).map((a) => a.id);
    if (known.length) await c.query("DELETE FROM audit_log WHERE id < $1", [Math.min(...known)]); // only entries older than what the UI holds (trimmed); never rows added by the server meanwhile
    const fresh = (S.audit || []).filter((a) => !a.id).reverse();
    const newIds = [];
    for (const a of fresh) {
      const r = await c.query("INSERT INTO audit_log (at,who,action,detail,undo) VALUES ($1,$2,$3,$4,$5) RETURNING id", [a.t, a.who || "You", a.action, a.detail || "", a.undo ? JSON.stringify(a.undo) : null]);
      newIds.push(r.rows[0].id);
    }
    // known-id deletion above ran before inserts, so fresh rows are safe; map ids back to the client entries
    let k = 0;
    for (const a of (S.audit || []).slice().reverse()) if (!a.id) ids.push(newIds[k++]);
    // money available to jars is checked on every save too: a jar that has not had its money yet takes it now
    const fill = await fillJarsTx(c, thisMonth());
    if (fill.applied) await c.query("INSERT INTO audit_log (who,action,detail) VALUES ('System','Jars filled',$1)", [`${fill.applied} jar${fill.applied > 1 ? "s" : ""} received ₪${Math.round(fill.total)} for ${thisMonth()}`]);
    await bumpRev(c);
    const nr = await c.query("SELECT value FROM app_meta WHERE key='rev'");
    return { rev: parseInt(nr.rows[0].value, 10), auditIds: ids.reverse(), ...(fill.applied ? { jars: await readJars(c), filled: fill.applied } : {}) };
  });
}
