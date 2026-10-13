// Accounts you make yourself, balance history for hand-entered accounts, and the alert history.
import { q, tx, audit, bumpRev } from "./db.js";

export const CUSTOM_KINDS = { cash: "Cash", savings: "Savings", investment: "Investment", loan: "Loan or debt", other: "Other" };

const clean = (s, n = 60) => String(s || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);

export async function createAccount(b) {
  const name = clean(b.name), kind = Object.hasOwn(CUSTOM_KINDS, b.kind) ? b.kind : "other", cur = /^[A-Z]{3}$/.test(b.currency) ? b.currency : "ILS", bal = +b.balance || 0;
  if (!name) throw new Error("Give the account a name");
  return tx(async (c) => {
    if ((await c.query("SELECT 1 FROM accounts WHERE name=$1 AND currency=$2", [name, cur])).rowCount) throw new Error("An account with that name already exists");
    const r = await c.query(
      `INSERT INTO accounts (name,currency,kind,source,subtitle,manual,custom,custom_kind,in_net_worth,in_reports,balance,balance_at,sort)
       VALUES ($1,$2,'custom','manual',$3,TRUE,TRUE,$4,$5,$6,$7,now(),60) RETURNING id`,
      [name, cur, CUSTOM_KINDS[kind] + " · entered by you", kind, b.countNW !== false, b.countReports !== false, bal]);
    await c.query("INSERT INTO account_updates (account_id,old_balance,new_balance,note) VALUES ($1,NULL,$2,'Account created')", [r.rows[0].id, bal]);
    await audit(c, "Account created", name, "You");
    await bumpRev(c);
    return { id: r.rows[0].id };
  });
}

export async function updateAccount(id, b) {
  return tx(async (c) => {
    const a = (await c.query("SELECT * FROM accounts WHERE id=$1 AND custom", [id])).rows[0];
    if (!a) throw new Error("Only accounts you created can be edited here");
    const name = b.name != null ? clean(b.name) : a.name;
    if (!name) throw new Error("Give the account a name");
    if (name !== a.name) {
      if ((await c.query("SELECT 1 FROM accounts WHERE name=$1 AND currency=$2 AND id<>$3", [name, a.currency, id])).rowCount) throw new Error("An account with that name already exists");
      for (const col of ["from_name", "to_name"]) await c.query(`UPDATE transactions SET ${col}=$2 WHERE ${col}=$1`, [a.name, name]);
      await c.query("UPDATE reconciliation_adjustments SET account=$2 WHERE account=$1", [a.name, name]);
    }
    const kind = Object.hasOwn(CUSTOM_KINDS, b.kind) ? b.kind : a.custom_kind;
    await c.query("UPDATE accounts SET name=$2, custom_kind=$3, subtitle=$4, in_net_worth=$5, in_reports=$6 WHERE id=$1",
      [id, name, kind, CUSTOM_KINDS[kind] + " · entered by you", b.countNW ?? a.in_net_worth, b.countReports ?? a.in_reports]);
    await audit(c, "Account changed", name, "You");
    await bumpRev(c);
    return { ok: true };
  });
}

export async function setBalance(id, balance, note = "") {
  const v = +balance;
  if (!Number.isFinite(v)) throw new Error("Enter a number");
  return tx(async (c) => {
    const a = (await c.query("SELECT * FROM accounts WHERE id=$1 AND manual", [id])).rows[0];
    if (!a) throw new Error("Only hand-entered accounts have a balance you can set");
    if (+a.balance !== v) {
      await c.query("UPDATE accounts SET balance=$2, balance_at=now() WHERE id=$1", [id, v]);
      await c.query("INSERT INTO account_updates (account_id,old_balance,new_balance,note) VALUES ($1,$2,$3,$4)", [id, a.balance, v, clean(note, 200)]);
      await bumpRev(c);
    }
    return { ok: true };
  });
}

export async function deleteAccount(id) {
  return tx(async (c) => {
    const a = (await c.query("SELECT * FROM accounts WHERE id=$1 AND custom", [id])).rows[0];
    if (!a) throw new Error("Only accounts you created can be removed here");
    const n = (await c.query("SELECT count(*)::int AS n FROM transactions WHERE from_name=$1 OR to_name=$1", [a.name])).rows[0].n;
    if (n) throw new Error(`It has ${n} transaction${n === 1 ? "" : "s"}. Delete or move them first.`);
    await c.query("DELETE FROM accounts WHERE id=$1", [id]);
    await audit(c, "Account removed", a.name, "You");
    await bumpRev(c);
    return { ok: true };
  });
}

// ---------- alert history ----------
/** The UI reports the alerts it is showing right now; the history keeps when each one appeared and when it went away. */
export async function alertsSeen(list) {
  const now = (Array.isArray(list) ? list : []).slice(0, 200).map((a) => ({ key: clean(a.key, 120), title: clean(a.title, 160), detail: clean(a.detail, 400), sev: ["low", "med", "high"].includes(a.sev) ? a.sev : "med" })).filter((a) => a.key);
  return tx(async (c) => {
    const open = (await c.query("SELECT id,key FROM alert_log WHERE resolved_at IS NULL")).rows;
    const keys = new Set(now.map((a) => a.key));
    for (const a of now) {
      const o = open.find((x) => x.key === a.key);
      if (o) await c.query("UPDATE alert_log SET last_seen=now(), title=$2, detail=$3, sev=$4 WHERE id=$1", [o.id, a.title, a.detail, a.sev]);
      else await c.query("INSERT INTO alert_log (key,title,detail,sev) VALUES ($1,$2,$3,$4)", [a.key, a.title, a.detail, a.sev]);
    }
    for (const o of open) if (!keys.has(o.key)) await c.query("UPDATE alert_log SET resolved_at=now() WHERE id=$1", [o.id]);
    await c.query("DELETE FROM alert_log WHERE resolved_at < now() - interval '2 years'");
    return { ok: true };
  });
}

export async function alertHistory(limit = 50, offset = 0) {
  limit = Math.min(200, Math.max(1, +limit || 50)); offset = Math.max(0, +offset || 0);
  const rows = (await q(
    `SELECT l.id,l.key,l.title,l.detail,l.sev,l.first_seen,l.last_seen,l.resolved_at,(d.id IS NOT NULL) AS dismissed
     FROM alert_log l LEFT JOIN dismissed_alerts d ON d.id=l.key ORDER BY l.first_seen DESC, l.id DESC LIMIT $1 OFFSET $2`, [limit + 1, offset])).rows;
  return { rows: rows.slice(0, limit), more: rows.length > limit };
}
