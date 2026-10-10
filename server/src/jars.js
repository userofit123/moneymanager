// Jars are informational (not linked to real accounts). Each month, in priority order, every jar takes the lesser of
// what it still needs and its monthly amount; a full jar frees its share for the next; the rest is "Unallocated".
// A bill jar (no monthly amount) is refilled to its target every month.
import { tx, audit, bumpRev, q } from "./db.js";

export function allocate(total, jars) {
  let rem = +total || 0;
  return [...jars].sort((a, b) => a.priority - b.priority).map((j) => {
    const want = j.cap == null ? j.target : Math.max(0, Math.min(j.cap, j.target - j.balance));
    const give = Math.max(0, Math.min(rem, want));
    rem -= give;
    return { id: j.id, give, balance: Math.min(j.target, j.balance + give) };
  });
}

const nextMonth = (m) => { const [y, mo] = m.split("-").map(Number); const d = new Date(Date.UTC(y, mo, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };
export const thisMonth = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// Applies every month that has not been applied yet, up to and including `month` (at most 12 at once).
// A jar seen for the first time starts with this month: nothing is added retroactively.
export async function fillJars(month = thisMonth()) {
  return tx(async (c) => {
    const total = (await c.query("SELECT value FROM settings WHERE key='jars_total'")).rows[0]?.value ?? 0;
    await c.query("UPDATE jars SET last_filled=$1 WHERE last_filled IS NULL", [month]);
    let applied = 0;
    for (let guard = 0; guard < 12; guard++) {
      const jars = (await c.query("SELECT id,priority,target,cap,balance,last_filled FROM jars")).rows;
      const due = jars.filter((j) => j.last_filled < month);
      if (!due.length) break;
      const m = nextMonth(due.map((j) => j.last_filled).sort()[0]);
      // allocate across all jars (priority order), but only apply to jars that have not had month m yet
      const plan = allocate(total, jars.map((j) => ({ ...j, balance: j.balance })));
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
