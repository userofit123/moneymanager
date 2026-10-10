// Jars are informational (not linked to real accounts). Each month, in priority order, every jar takes the lesser of
// what it still needs and its monthly amount; a full jar frees its share for the next; the rest is "Unallocated".
// A bill jar (no monthly amount) is refilled to its target every month.
import { tx, audit, bumpRev, q } from "./db.js";

// Jars fill from the money you actually have: cash (bank + Wise) minus what is already set aside in jars minus an optional
// buffer you keep untouched. A bill jar is topped up to its target each month.
export function allocate(free, jars) {
  let rem = Math.max(0, +free || 0);
  return [...jars].sort((a, b) => a.priority - b.priority).map((j) => {
    const need = Math.max(0, j.target - j.balance);
    const want = j.cap == null ? need : Math.max(0, Math.min(j.cap, need));
    const give = Math.max(0, Math.min(rem, want));
    rem -= give;
    return { id: j.id, give, balance: Math.min(j.target, j.balance + give) };
  });
}

// cash in ILS: bank and Wise balances counted in net worth, at the latest exchange rate
export async function cashNow(c) {
  const rates = Object.fromEntries((await c.query("SELECT DISTINCT ON (base) base,rate FROM exchange_rates WHERE quote='ILS' ORDER BY base,date DESC")).rows.map((r) => [r.base, r.rate]));
  rates.ILS = 1;
  return (await c.query("SELECT currency,balance FROM accounts WHERE in_net_worth AND kind IN ('bank','wallet')")).rows.reduce((s, a) => s + a.balance * (rates[a.currency] ?? 1), 0);
}

const nextMonth = (m) => { const [y, mo] = m.split("-").map(Number); const d = new Date(Date.UTC(y, mo, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };
export const thisMonth = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// Applies every month that has not been applied yet, up to and including `month` (at most 12 at once).
// A jar seen for the first time starts with this month: nothing is added retroactively.
export async function fillJars(month = thisMonth()) {
  return tx(async (c) => {
    const buffer = +((await c.query("SELECT value FROM settings WHERE key='jars_buffer'")).rows[0]?.value ?? 0);
    const cash = await cashNow(c);
    await c.query("UPDATE jars SET last_filled=$1 WHERE last_filled IS NULL", [month]);
    let applied = 0;
    for (let guard = 0; guard < 12; guard++) {
      const jars = (await c.query("SELECT id,priority,target,cap,balance,last_filled FROM jars")).rows;
      const due = jars.filter((j) => j.last_filled < month);
      if (!due.length) break;
      const m = nextMonth(due.map((j) => j.last_filled).sort()[0]);
      // allocate across all jars (priority order), but only apply to jars that have not had month m yet
      const free = cash - jars.reduce((t, j) => t + j.balance, 0) - buffer; // recomputed each month from the current balances
      const plan = allocate(free, jars);
      for (const j of jars.filter((x) => x.last_filled < m)) {
        const p = plan.find((x) => x.id === j.id);
        if (p.give > 0) {
          await c.query("UPDATE jars SET balance=$2 WHERE id=$1", [j.id, p.balance]);
          await c.query("INSERT INTO jar_movements (jar_id,amount,note) VALUES ($1,$2,$3)", [j.id, p.give, `Auto-fill ${m}`]);
          applied++;
        }
        await c.query("UPDATE jars SET last_filled=$2 WHERE id=$1", [j.id, m]);
      }
    }
    if (applied) { await audit(c, "Jars filled", `${applied} jar fill${applied > 1 ? "s" : ""} applied for ${month}`); await bumpRev(c); }
    return { applied };
  });
}

export const lastMoves = async () => (await q("SELECT DISTINCT ON (jar_id) jar_id, amount, note FROM jar_movements ORDER BY jar_id, id DESC")).rows;
