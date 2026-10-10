import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// DATE as 'YYYY-MM-DD' text, NUMERIC and BIGINT as numbers (single-user money app, values stay well inside 2^53)
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1700, (v) => parseFloat(v));
pg.types.setTypeParser(20, (v) => parseInt(v, 10));

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgres://money:money@localhost:5432/money",
});

export const q = (text, params) => pool.query(text, params);

export async function tx(fn) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const r = await fn(c);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

export async function migrate() {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");
  await q("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, at TIMESTAMPTZ NOT NULL DEFAULT now())");
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const done = await q("SELECT 1 FROM schema_migrations WHERE name=$1", [f]);
    if (done.rowCount) continue;
    await tx(async (c) => {
      await c.query(fs.readFileSync(path.join(dir, f), "utf8"));
      await c.query("INSERT INTO schema_migrations (name) VALUES ($1)", [f]);
    });
    console.log("migrated", f);
  }
}

export async function audit(c, action, detail, who = "System", undo = null) {
  await (c || pool).query("INSERT INTO audit_log (who, action, detail, undo) VALUES ($1,$2,$3,$4)", [
    who, action, detail, undo ? JSON.stringify(undo) : null,
  ]);
}

export async function bumpRev(c) {
  await (c || pool).query("UPDATE app_meta SET value=(value::int+1)::text WHERE key='rev'");
}
