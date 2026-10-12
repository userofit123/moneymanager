import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// DATE as 'YYYY-MM-DD' text, NUMERIC and BIGINT as numbers (single-user money app, values stay well inside 2^53)
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1700, (v) => parseFloat(v));
pg.types.setTypeParser(20, (v) => parseInt(v, 10));

// Two ways to run the same database. Normally a PostgreSQL server (Docker). The Windows desktop app sets DB_DRIVER=pglite:
// the same PostgreSQL engine running inside this process, keeping its data as plain files in PGLITE_DIR (no server, no port, no setup).
// PGlite has one connection, so queries take turns; code inside a transaction keeps using the transaction's connection.
let pool;
if (process.env.DB_DRIVER === "pglite") {
  const { PGlite, types: T } = await import("@electric-sql/pglite");
  const { AsyncLocalStorage } = await import("node:async_hooks");
  const db = new PGlite(process.env.PGLITE_DIR || path.resolve("data", "pgdata"), {
    parsers: { [T.DATE]: (v) => v, [T.NUMERIC]: (v) => parseFloat(v), [T.INT8]: (v) => parseInt(v, 10) },
  });
  await db.waitReady;
  const inTx = new AsyncLocalStorage();
  let tail = Promise.resolve();
  const exclusive = (fn) => { const run = tail.then(fn, fn); tail = run.then(() => {}, () => {}); return run; };
  const run = async (text, params) => {
    if (params == null) { const rs = await db.exec(text); const r = rs[rs.length - 1] || { rows: [] }; return { rows: r.rows, rowCount: r.rows.length || r.affectedRows || 0 }; }
    const r = await db.query(text, params);
    return { rows: r.rows, rowCount: r.rows.length || r.affectedRows || 0 }; // a SELECT reports 0 affected rows
  };
  pool = {
    query: (text, params) => (inTx.getStore() ? run(text, params) : exclusive(() => run(text, params))),
    // a checked-out client holds the connection until it is released, like a pooled client would
    async connect() {
      let release; const held = new Promise((ok) => (release = ok));
      await new Promise((ready) => exclusive(() => { ready(); return held; }));
      return { query: (text, params) => run(text, params), release: () => release() };
    },
    end: () => db.close(),
  };
  pool.runInTx = (fn) => inTx.run(true, fn);
} else {
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || "postgres://money:money@localhost:5432/money" });
}
export { pool };

export const q = (text, params) => pool.query(text, params);

export async function tx(fn) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const r = await (pool.runInTx ? pool.runInTx(() => fn(c)) : fn(c));
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
