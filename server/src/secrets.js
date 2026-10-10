// Encryption at rest for credentials: AES-256-GCM. The key is NOT in the database:
// it comes from APP_KEY (base64, 32 bytes) or from DATA_DIR/app.key (created on first start, mode 600).
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR || path.resolve("data");
let KEY = null;

export function loadKey() {
  if (KEY) return KEY;
  if (process.env.APP_KEY) {
    KEY = Buffer.from(process.env.APP_KEY, "base64");
    if (KEY.length !== 32) throw new Error("APP_KEY must be 32 bytes, base64 encoded");
    return KEY;
  }
  const f = path.join(DATA_DIR, "app.key");
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(32).toString("base64"), { mode: 0o600 });
  KEY = Buffer.from(fs.readFileSync(f, "utf8").trim(), "base64");
  if (KEY.length !== 32) throw new Error(`${f} is not a valid key file`);
  return KEY;
}

export function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", loadKey(), iv);
  const ct = Buffer.concat([c.update(String(plain), "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), ct.toString("base64")].join(":");
}

export function decrypt(blob) {
  const [v, iv, tag, ct] = String(blob).split(":");
  if (v !== "v1") throw new Error("unknown ciphertext version");
  const d = crypto.createDecipheriv("aes-256-gcm", loadKey(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64")), d.final()]).toString("utf8");
}

// Remove any secret value from a message before it is stored, logged or shown.
export function scrub(message, values) {
  let m = String(message || "");
  for (const v of values || []) if (v && String(v).length >= 3) m = m.split(String(v)).join("***");
  return m.slice(0, 300);
}
