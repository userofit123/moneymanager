// Jars are informational (not linked to real accounts). Each month, in priority order, every jar takes what it is still
// entitled to from the money that is really available: cash (bank + Wise) minus what is already in jars, minus a buffer,
// minus what is still to be paid this month (unpaid bills and the unspent part of budgets).
//   fixed jar:  up to its monthly amount in total this month, never beyond its target (a jar with no target just keeps going)
//   bill jar:   topped up to its target
// A fill that could not happen yet (not enough money) is retried on the next run, so a jar that did not get its money
// this month takes it as soon as money is available, in priority order. Every fill is recorded.
import { tx, audit, bumpRev } from "./db.js";

export const thisMonth = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// A jar with no target (0) has no goal: it simply puts its monthly amount aside. A jar with a deadline and "auto" on works out
// its own monthly amount: what is still missing (before this month's fill) spread over the months left, this one included.
export const monthsLeft = (due, now = new Date()) => Math.max(1, Math.ceil((new Date(due) - now) / (864e5 * 30.44)));
export const capOf = (j, received = 0, now = new Date()) => {
  if (j.cap == null) return null;
  if (j.auto_cap && j.due && j.target > 0) return Math.max(0, Math.ceil((j.target - (j.balance - received)) / monthsLeft(j.due, now)));
  return j.cap;
};
export const wantOf = (j, received = 0, now = new Date()) => {
  const open = !(j.target > 0), cap = capOf(j, received, now);
  if (cap == null) return open ? 0 : Math.max(0, j.target - j.balance);
  return Math.max(0, Math.min(cap - received, open ? Infinity : Math.max(0, j.target - j.balance)));
};

export function allocate(free, jars, received = {}) {
  let rem = Math.max(0, +free || 0);
  return [...jars].sort((a, b) => a.priority - b.priority).map((j) => {
    const give = Math.max(0, Math.min(rem, wantOf(j, received[j.id] || 0)));
    rem -= give;
    return { id: j.id, give, balance: j.target > 0 ? Math.min(j.target, j.balance + give) : j.balance + give };
  });
}

// cash in ILS: bank and Wise balances counted in net worth, at the latest exchange rate
export async function cashNow(c) {
  const rates = Object.fromEntries((await c.query("SELECT DISTINCT ON (base) base,rate FROM exchange_rates WHERE quote='ILS' ORDER BY base,date DESC")).rows.map((r) => [r.base, r.rate]));
  rates.ILS = 1;
  return (await c.query("SELECT currency,balance FROM accounts WHERE in_net_worth AND kind IN ('bank','wallet')")).rows.reduce((s, a) => s + a.balance * (rates[a.currency] ?? 1), 0);
}

export async function fillJarsTx(c, month = thisMonth()) {
  const buffer = +((await c.query("SELECT value FROM settings WHERE key='jars_buffer'")).rows[0]?.value ?? 0);
  // what the app has set aside for bills still to pay and the unspent part of budgets (worked out by the app, refreshed whenever it is open)
  const reserve = Math.max(0, +((await c.query("SELECT value FROM settings WHERE key='jars_reserve'")).rows[0]?.value ?? 0));
  const jars = (await c.query("SELECT id,priority,target,cap,balance,due,auto_cap FROM jars WHERE done_at IS NULL")).rows;
  if (!jars.length) return { applied: 0, total: 0 };
  const received = Object.fromEntries((await c.query("SELECT jar_id, sum(amount)::float AS s FROM jar_movements WHERE month=$1 GROUP BY jar_id", [month])).rows.map((r) => [r.jar_id, r.s]));
  const free = (await cashNow(c)) - jars.reduce((t, j) => t + j.balance, 0) - buffer - reserve;
  let applied = 0, total = 0;
  for (const p of allocate(free, jars, received)) {
    if (p.give <= 0) continue;
    await c.query("UPDATE jars SET balance=$2, last_filled=$3 WHERE id=$1", [p.id, p.balance, month]);
    await c.query("INSERT INTO jar_movements (jar_id,amount,note,month) VALUES ($1,$2,$3,$4)", [p.id, p.give, `Auto-fill ${month}`, month]);
    applied++; total += p.give;
  }
  return { applied, total };
}

export async function fillJars(month = thisMonth()) {
  return tx(async (c) => {
    const r = await fillJarsTx(c, month);
    if (r.applied) { await audit(c, "Jars filled", `${r.applied} jar${r.applied > 1 ? "s" : ""} received ₪${Math.round(r.total)} for ${month}`); await bumpRev(c); }
    return r;
  });
}

// the jars as the UI shows them: with what each received this month and the last fills
export async function readJars(c) {
  const month = thisMonth();
  const jars = (await c.query("SELECT id,name,priority,target,cap,balance,due,bill_match,auto_cap,description,bill_months,done_at FROM jars ORDER BY priority,id")).rows;
  const mv = (await c.query("SELECT jar_id,amount,note,month,created_at FROM jar_movements ORDER BY id DESC LIMIT 400")).rows;
  return jars.map((j) => {
    const mine = mv.filter((m) => m.jar_id === j.id);
    return {
      id: j.id, n: j.name, p: j.priority, need: j.target, cap: j.cap, bal: j.balance, due: j.due || "", bill: j.bill_match || "", auto: !!j.auto_cap, desc: j.description || "", months: j.bill_months || 0, done: j.done_at ? String(j.done_at).slice(0, 10) : "",
      got: +mine.filter((m) => m.month === month).reduce((s, m) => s + m.amount, 0).toFixed(2),
      moves: mine.slice(0, 8).map((m) => ({ amt: m.amount, note: m.note, at: m.created_at.toISOString() })),
    };
  });
}
