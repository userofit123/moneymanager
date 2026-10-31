import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { reset, q } from "./helpers.js";
process.env.BACKUP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "mm-bk-"));
const bk = await import("../src/backup.js");

const count = async (t) => (await q(`SELECT count(*)::int n FROM ${t}`)).rows[0].n;

test("a backup holds the data but no secrets, and restoring replaces the data and keeps the connections", async () => {
  await reset();
  await q("INSERT INTO categories (name) VALUES ('Food') ON CONFLICT DO NOTHING");
  await q("INSERT INTO transactions (date,description,amount,category,source,external_id) VALUES ('2026-10-01','Shop',-12.5,'Food','max','a1'),('2026-10-02','Cafe',-4,'Food','max','a2')");
  await q("INSERT INTO credentials (source,data) VALUES ('max','SECRET-LOGIN')");
  await q("INSERT INTO settings (key,value) VALUES ('ntfy','\"secret-topic\"')");
  const { name } = await bk.runBackup("manual");
  const raw = fs.readFileSync(path.join(process.env.BACKUP_DIR, name));
  assert.ok(!raw.toString("latin1").includes("SECRET-LOGIN"));
  await q("DELETE FROM transactions");
  await q("UPDATE credentials SET data='NEWER-LOGIN'");
  await bk.restore(name);
  assert.equal(await count("transactions"), 2);
  assert.equal((await q("SELECT data FROM credentials")).rows[0].data, "NEWER-LOGIN"); // connections are left alone
  assert.equal((await q("SELECT 1 FROM settings WHERE key='ntfy'")).rowCount, 1); // so are notification links
  await q("INSERT INTO transactions (date,description,amount) VALUES ('2026-10-03','New',1)"); // ids carry on after the restore
  assert.equal(await count("transactions"), 3);
});

test("a password protects the file, a wrong one is refused, and old backups are cleaned up", async () => {
  await reset();
  await bk.putCfg({ password: "hunter22", keep: 3 });
  const { name } = await bk.runBackup("manual");
  await assert.rejects(() => bk.inspect(name), /protected/);
  await assert.rejects(() => bk.inspect(name, "nope"), /Wrong password/);
  assert.ok((await bk.inspect(name, "hunter22")).created);
  const old = path.join(process.env.BACKUP_DIR, "money-backup-2020-01-01-0000.mmbackup");
  fs.writeFileSync(old, "x"); fs.utimesSync(old, new Date("2020-01-01"), new Date("2020-01-01"));
  await bk.runBackup("manual");
  assert.ok(!fs.existsSync(old));
  await assert.rejects(() => bk.removeFile("../x.mmbackup"), /not a backup file name/);
});

test("the backup folder's place on the computer: a Docker volume, a linked folder, or no Docker", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "mm-place-")), env = path.join(d, "dockerenv"), mi = path.join(d, "mountinfo");
  assert.deepEqual(bk.hostPlace("/data/backups", { dockerenv: env, mountinfo: mi }), { docker: false });
  fs.writeFileSync(env, "");
  fs.writeFileSync(mi, "1 0 0:1 / / rw - overlay overlay rw\n568 558 254:1 /docker/volumes/demo_appdata/_data /data rw,relatime - ext4 /dev/vda1 rw\n");
  assert.deepEqual(bk.hostPlace("/data/backups", { dockerenv: env, mountinfo: mi }), { docker: true, volume: "demo_appdata", inVolume: "/backups" });
  fs.appendFileSync(mi, "570 558 254:1 /home/someone/backups /data/backups rw - ext4 /dev/vda1 rw\n");
  assert.deepEqual(bk.hostPlace("/data/backups", { dockerenv: env, mountinfo: mi }), { docker: true, linked: true });
  assert.deepEqual(bk.hostPlace("/srv/x", { dockerenv: env, mountinfo: mi }), { docker: true });
});
