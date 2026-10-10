// Optional sample data (ALLOW_DEMO_SEED=1) so the screens can be tried before any bank is connected.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tx, audit, bumpRev } from "./db.js";
import { rateOn } from "./fx.js";

export async function seedDemo() {
  const d = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "seed", "demo.json"), "utf8"));
  return tx(async (c) => {
    const n = (await c.query("SELECT count(*)::int AS n FROM transactions")).rows[0].n;
    if (n) throw new Error("database already has transactions; not seeding");
    for (const [k, v] of Object.entries(d.cats)) await c.query("INSERT INTO categories (name,color) VALUES ($1,$2) ON CONFLICT (name) DO UPDATE SET color=$2", [k, v]);
    for (const [i, r] of d.rules.entries()) await c.query("INSERT INTO rules (keyword,category,tag,position) VALUES ($1,$2,$3,$4)", [r.k, r.c, r.t, i]);
    for (const t of d.tx) {
      const rate = t.orig ? await rateOn(t.orig.cur, t.d) : null;
      await c.query(
        `INSERT INTO transactions (id,date,description,from_name,to_name,amount,orig_currency,orig_amount,rate,category,note,source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'demo')`,
        [t.id, t.d, t.desc, t.from, t.to, t.orig && rate ? +(t.orig.amt * rate).toFixed(2) : t.a, t.orig?.cur || null, t.orig?.amt ?? null, rate, t.c || null, t.note || ""]);
      for (const [i, g] of t.tags.entries()) {
        await c.query("INSERT INTO tags (name) VALUES ($1) ON CONFLICT DO NOTHING", [g]);
        await c.query("INSERT INTO transaction_tags (transaction_id,tag,position) VALUES ($1,$2,$3)", [t.id, g, i]);
      }
      for (const f of t.docs) await c.query("INSERT INTO documents (transaction_id,filename) VALUES ($1,$2)", [t.id, f]);
    }
    await c.query("SELECT setval(pg_get_serial_sequence('transactions','id'), (SELECT max(id) FROM transactions))");
    for (const [k, v] of Object.entries(d.budgets)) await c.query("INSERT INTO budgets (category,monthly_limit) VALUES ($1,$2)", [k, v]);
    for (const j of d.jars) await c.query("INSERT INTO jars (id,name,priority,target,cap,balance,due) VALUES ($1,$2,$3,$4,$5,$6,$7)", [j.id, j.n, j.p, j.need, j.cap, j.bal, j.due || null]);
    await c.query("SELECT setval(pg_get_serial_sequence('jars','id'), (SELECT max(id) FROM jars))");
    await c.query("INSERT INTO settings (key,value) VALUES ('jars_total',$1) ON CONFLICT (key) DO UPDATE SET value=$1", [JSON.stringify(d.jarsTotal)]);
    for (const [name, bal] of [["Bank Hapoalim", 18450], ["Wise", 756], ["Pension", 412000]])
      await c.query("UPDATE accounts SET balance=$2, balance_at=now() WHERE name=$1", [name, bal]);
    await audit(c, "Sample data loaded", `${d.tx.length} sample transactions`);
    await bumpRev(c);
    return { transactions: d.tx.length };
  });
}
