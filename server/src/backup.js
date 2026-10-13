// Backups: one file with your data (activity, accounts, categories, tags, rules, budgets, jars, settings) and nothing secret.
// Never included: bank logins, the Wise token, the encryption key, the app password, two-factor secrets, sessions, notification links.
// Restoring replaces the data and leaves the connections as they are, so a new device only needs the logins added again.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { q, tx, bumpRev, audit } from "./db.js";
import { encrypt, decrypt } from "./secrets.js";
import { ensureDefaults } from "./state.js";
import { activeJob } from "./sync.js";

// parents first (restore inserts in this order and deletes in the reverse order)
export const TABLES = [
  "categories", "tags", "accounts", "jars", "transactions", "transaction_tags", "documents", "transfer_links",
  "rules", "tag_rules", "jar_movements", "jar_categories", "bills", "ignored_bills", "budgets", "settings", "dismissed_alerts",
  "reconciliation_adjustments", "balance_snapshots", "balance_gaps", "exchange_rates", "net_worth_snapshots", "planned_items",
  "account_updates", "alert_log",
];
// settings that stay on this device: links that notify you, the backup settings themselves, one-off "already told you" marks
const KEEP_KEYS = ["notify_channels", "ntfy", "backup_cfg", "backup_last"];
const keepKey = (k) => KEEP_KEYS.includes(k) || String(k).startsWith("notified:");

const MAGIC = Buffer.from("MMBK");
const EXT = ".mmbackup";
const NAME_OK = /^[\w.\- ()]{1,120}\.mmbackup$/;
const DEFAULTS = { on: true, at: "03:00", keep: 14, dir: "", withDocs: false };

const getSet = async (k) => (await q("SELECT value FROM settings WHERE key=$1", [k])).rows[0]?.value;
const putSet = (k, v) => q("INSERT INTO settings (key,value) VALUES ($1,$2::jsonb) ON CONFLICT (key) DO UPDATE SET value=$2::jsonb", [k, JSON.stringify(v)]);

export const defaultDir = () => process.env.BACKUP_DIR || path.join(process.env.DATA_DIR || path.resolve("data"), "backups");
export async function getCfg() {
  const c = { ...DEFAULTS, ...((await getSet("backup_cfg")) || {}) };
  return { ...c, dir: c.dir || defaultDir(), custom: !!((await getSet("backup_cfg")) || {}).dir };
}
const rawCfg = async () => ({ ...DEFAULTS, ...((await getSet("backup_cfg")) || {}) });
export async function putCfg(b) {
  const c = await rawCfg();
  if (typeof b.on === "boolean") c.on = b.on;
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(b.at || "")) c.at = b.at;
  if (Number.isFinite(+b.keep) && +b.keep >= 1 && +b.keep <= 3650) c.keep = Math.round(+b.keep);
  if (typeof b.withDocs === "boolean") c.withDocs = b.withDocs;
  if (typeof b.dir === "string") {
    const d = b.dir.trim();
    if (d) {
      if (!path.isAbsolute(d)) throw new Error("Type the full path of the folder, for example C:\\Backups or /data/backups.");
      try { fs.mkdirSync(d, { recursive: true }); fs.accessSync(d, fs.constants.W_OK); } catch { throw new Error("The app cannot write to that folder. Pick another one."); }
    }
    c.dir = d;
  }
  if (b.password === null || b.password === "") delete c.pw; // no password
  else if (typeof b.password === "string") {
    if (b.password.length < 6) throw new Error("Use at least 6 characters for the backup password.");
    c.pw = encrypt(b.password);
  }
  await putSet("backup_cfg", c);
  return view();
}
const pwOf = async () => { const c = await rawCfg(); try { return c.pw ? decrypt(c.pw) : null; } catch { return null; } };

// ---------- the file ----------
function seal(obj, password) {
  const gz = zlib.gzipSync(Buffer.from(JSON.stringify(obj)), { level: 6 });
  if (!password) return Buffer.concat([MAGIC, Buffer.from([1, 0]), gz]);
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(password, salt, 32);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(gz), c.final()]);
  return Buffer.concat([MAGIC, Buffer.from([1, 1]), salt, iv, c.getAuthTag(), ct]);
}
export function isEncrypted(buf) { return buf.length > 6 && buf.subarray(0, 4).equals(MAGIC) && buf[5] === 1; }
function open(buf, password) {
  if (buf.length < 8 || !buf.subarray(0, 4).equals(MAGIC)) throw new Error("This is not a Money Manager backup file.");
  if (buf[4] !== 1) throw new Error("This backup was made by a newer version of the app. Update the app first.");
  let gz;
  if (buf[5] === 1) {
    if (!password) { const e = new Error("This backup is protected. Enter its password."); e.needPassword = true; throw e; }
    try {
      const salt = buf.subarray(6, 22), iv = buf.subarray(22, 34), tag = buf.subarray(34, 50);
      const d = crypto.createDecipheriv("aes-256-gcm", crypto.scryptSync(password, salt, 32), iv);
      d.setAuthTag(tag);
      gz = Buffer.concat([d.update(buf.subarray(50)), d.final()]);
    } catch { const e = new Error("Wrong password for this backup."); e.needPassword = true; throw e; }
  } else gz = buf.subarray(6);
  let o;
  try { o = JSON.parse(zlib.gunzipSync(gz).toString("utf8")); } catch { throw new Error("This backup file is damaged."); }
  if (o?.app !== "money-manager" || !o.tables) throw new Error("This is not a Money Manager backup file.");
  return o;
}

async function collect(withDocs) {
  const tables = {};
  for (const t of TABLES) {
    if (t === "documents" && !withDocs) continue; // rows without their files would point at nothing
    let rows = (await q(`SELECT * FROM ${t}`)).rows;
    if (t === "settings") rows = rows.filter((r) => !keepKey(r.key));
    tables[t] = rows;
  }
  const files = {};
  if (withDocs) {
    const root = process.env.DOCS_DIR || path.join(process.env.DATA_DIR || path.resolve("data"), "documents");
    let total = 0;
    for (const d of tables.documents || []) {
      if (!d.path) continue;
      const f = path.resolve(root, d.path);
      if (!f.startsWith(path.resolve(root) + path.sep)) continue;
      try { const b = fs.readFileSync(f); total += b.length; if (total > 400e6) break; files[d.path] = b.toString("base64"); } catch { /* file missing: keep the row only */ }
    }
  }
  const migrations = (await q("SELECT name FROM schema_migrations ORDER BY name")).rows.map((r) => r.name);
  return { app: "money-manager", format: 1, created: new Date().toISOString(), migrations, withDocs: !!withDocs, tables, files };
}

const stamp = (d) => { const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; };
const sizeOf = (f) => { try { return fs.statSync(f).size; } catch { return 0; } };
const safeName = (n) => { if (!NAME_OK.test(String(n || "")) || n.includes("..")) throw new Error("That is not a backup file name."); return n; };

// ---------- make a backup now ----------
let running = false;
export async function runBackup(kind = "manual") {
  if (running) throw new Error("A backup is already running.");
  running = true;
  try {
    const cfg = await getCfg();
    fs.mkdirSync(cfg.dir, { recursive: true });
    const data = await collect(cfg.withDocs);
    const buf = seal(data, await pwOf());
    const name = `${kind === "before-restore" ? "before-restore" : "money-backup"}-${stamp(new Date())}${EXT}`;
    const tmp = path.join(cfg.dir, name + ".tmp");
    fs.writeFileSync(tmp, buf, { mode: 0o600 });
    fs.renameSync(tmp, path.join(cfg.dir, name));
    rotate(cfg);
    await putSet("backup_last", { at: new Date().toISOString(), ok: true, name, size: buf.length, kind, day: kind === "before-restore" ? ((await getSet("backup_last")) || {}).day : dayOf(new Date(), await tzOf()) });
    return { name, size: buf.length };
  } catch (e) {
    await putSet("backup_last", { at: new Date().toISOString(), ok: false, error: String(e.message || e).slice(0, 200), kind }).catch(() => {});
    throw e;
  } finally { running = false; }
}

// older than "keep" days goes, but the newest file always stays; safety copies made before a restore: the last three
function rotate(cfg) {
  const all = fs.readdirSync(cfg.dir).filter((f) => NAME_OK.test(f)).map((f) => ({ f, t: fs.statSync(path.join(cfg.dir, f)).mtimeMs })).sort((a, b) => b.t - a.t);
  const mine = all.filter((x) => x.f.startsWith("money-backup-"));
  mine.slice(1).filter((x) => x.t < Date.now() - cfg.keep * 864e5).forEach((x) => fs.rmSync(path.join(cfg.dir, x.f), { force: true }));
  all.filter((x) => x.f.startsWith("before-restore-")).slice(3).forEach((x) => fs.rmSync(path.join(cfg.dir, x.f), { force: true }));
}

// ---------- the list and the settings view ----------
export async function view() {
  const cfg = await getCfg(), raw = await rawCfg();
  let files = [];
  try {
    files = fs.readdirSync(cfg.dir).filter((f) => NAME_OK.test(f)).map((f) => {
      const p = path.join(cfg.dir, f), st = fs.statSync(p);
      let enc = false; try { const fd = fs.openSync(p, "r"), h = Buffer.alloc(8); fs.readSync(fd, h, 0, 8, 0); fs.closeSync(fd); enc = isEncrypted(h); } catch { /* unreadable */ }
      return { name: f, size: st.size, at: st.mtime.toISOString(), encrypted: enc, safety: f.startsWith("before-restore-"), imported: f.startsWith("imported-") };
    }).sort((a, b) => b.at.localeCompare(a.at));
  } catch { /* folder not there yet */ }
  return { on: cfg.on, at: cfg.at, keep: cfg.keep, dir: cfg.dir, defaultDir: defaultDir(), custom: cfg.custom, withDocs: cfg.withDocs, hasPassword: !!raw.pw, last: (await getSet("backup_last")) || null, files, tz: await tzOf() };
}
export function filePath(cfg, name) { return path.join(cfg.dir, safeName(name)); }
export async function removeFile(name) { fs.rmSync(filePath(await getCfg(), name), { force: true }); }
export async function saveUpload(buf, orig) {
  if (!buf.length || !buf.subarray(0, 4).equals(MAGIC)) throw new Error("This is not a Money Manager backup file.");
  const cfg = await getCfg();
  fs.mkdirSync(cfg.dir, { recursive: true });
  const base = String(orig || "backup").replace(/\.mmbackup$/i, "").replace(/[^\w.\- ()]/g, "_").slice(0, 60) || "backup";
  const name = `imported-${stamp(new Date())}-${base}${EXT}`;
  fs.writeFileSync(path.join(cfg.dir, name), buf, { mode: 0o600 });
  return name;
}

// ---------- look inside / restore ----------
const load = async (name, password) => open(fs.readFileSync(filePath(await getCfg(), name)), password);
export async function inspect(name, password) {
  const o = await load(name, password);
  const n = (t) => (o.tables[t] || []).length;
  const dates = (o.tables.transactions || []).map((t) => t.date).sort();
  const mine = (await q("SELECT name FROM schema_migrations")).rows.map((r) => r.name);
  const newerApp = (o.migrations || []).some((m) => !mine.includes(m));
  return { created: o.created, transactions: n("transactions"), accounts: n("accounts"), categories: n("categories"), rules: n("rules") + n("tag_rules"), budgets: n("budgets"), jars: n("jars"), from: dates[0] || null, to: dates[dates.length - 1] || null, files: Object.keys(o.files || {}).length, newerApp };
}

export async function restore(name, password) {
  const o = await load(name, password);
  const mine = (await q("SELECT name FROM schema_migrations")).rows.map((r) => r.name);
  if ((o.migrations || []).some((m) => !mine.includes(m))) throw new Error("This backup was made by a newer version of the app. Update the app first, then restore it.");
  if (activeJob()) throw new Error("A sync is running. Try again when it has finished.");
  await runBackup("before-restore"); // a way back if this was the wrong file
  await tx(async (c) => {
    const cols = {};
    for (const t of TABLES) cols[t] = (await c.query("SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=$1", [t])).rows.map((r) => r.column_name);
    for (const t of [...TABLES].reverse()) {
      if (t === "settings") await c.query("DELETE FROM settings WHERE NOT (key = ANY($1) OR key LIKE 'notified:%')", [KEEP_KEYS]);
      else await c.query(`DELETE FROM ${t}`);
    }
    for (const t of TABLES) {
      let rows = o.tables[t] || [];
      if (t === "settings") rows = rows.filter((r) => !keepKey(r.key));
      if (!rows.length) continue;
      const use = Object.keys(rows[0]).filter((k) => cols[t].includes(k)); // columns this version does not have are ignored, new ones get their defaults
      if (!use.length) continue;
      const list = use.map((k) => `"${k}"`).join(",");
      for (let i = 0; i < rows.length; i += 1000) {
        await c.query(`INSERT INTO ${t} (${list}) SELECT ${list} FROM jsonb_populate_recordset(null::${t}, $1::jsonb)`, [JSON.stringify(rows.slice(i, i + 1000))]);
      }
    }
    for (const t of TABLES) {
      if (!cols[t].includes("id")) continue;
      const s = (await c.query("SELECT pg_get_serial_sequence($1,'id') AS s", [t])).rows[0]?.s;
      if (s) await c.query("SELECT setval($1, COALESCE((SELECT max(id) FROM " + t + "), 1), (SELECT count(*) FROM " + t + ") > 0)", [s]);
    }
    await audit(c, "Backup restored", `From ${name}`, "You");
    await bumpRev(c);
  });
  if (o.files && Object.keys(o.files).length) {
    const root = path.resolve(process.env.DOCS_DIR || path.join(process.env.DATA_DIR || path.resolve("data"), "documents"));
    for (const [p, b64] of Object.entries(o.files)) {
      const f = path.resolve(root, p);
      if (!f.startsWith(root + path.sep)) continue;
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, Buffer.from(b64, "base64"));
    }
  }
  await ensureDefaults({ demoAccounts: false });
  return inspect(name, password);
}

// ---------- every day ----------
const tzOf = async () => (await getSet("sync_tz")) || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
function parts(d, tz) {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
}
const dayOf = (d, tz) => { const p = parts(d, tz); return `${p.year}-${p.month}-${p.day}`; };

// Runs once a minute: if today's backup has not been made and the time has come (or passed, say the computer was off), make it.
export async function dailyTick() {
  try {
    const cfg = await getCfg();
    if (!cfg.on || running) return;
    const tz = await tzOf(), now = new Date(), p = parts(now, tz), last = await getSet("backup_last");
    if (last?.ok && last.day === dayOf(now, tz)) return;
    if (last && !last.ok && Date.now() - new Date(last.at).getTime() < 30 * 60e3) return; // failed just now: wait before trying again
    if (+p.hour * 60 + +p.minute < +cfg.at.slice(0, 2) * 60 + +cfg.at.slice(3)) return;
    await runBackup("auto");
  } catch (e) { console.error("backup:", e.message); }
}
export function startBackups() { setTimeout(dailyTick, 30e3).unref?.(); setInterval(dailyTick, 60e3).unref?.(); }
