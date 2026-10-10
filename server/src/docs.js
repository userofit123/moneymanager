// Receipts and invoices: stored on disk under DOCS_DIR, listed in the documents table.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { q } from "./db.js";

export const DOCS_DIR = process.env.DOCS_DIR || path.resolve("data/documents");

export async function saveDoc(txId, filename, mime, buf) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  const safe = path.basename(filename).replace(/[^\w.\- ()]/g, "_").slice(0, 120) || "file";
  const rel = `${crypto.randomUUID()}-${safe}`;
  fs.writeFileSync(path.join(DOCS_DIR, rel), buf, { mode: 0o640 });
  const r = await q("INSERT INTO documents (transaction_id,filename,mime,size,path) VALUES ($1,$2,$3,$4,$5) RETURNING id,filename", [txId, safe, mime, buf.length, rel]);
  return r.rows[0];
}

export async function readDoc(id) {
  const r = await q("SELECT filename,mime,path FROM documents WHERE id=$1", [id]);
  if (!r.rowCount || !r.rows[0].path) return null;
  const file = path.join(DOCS_DIR, r.rows[0].path);
  if (!file.startsWith(DOCS_DIR) || !fs.existsSync(file)) return null;
  return { ...r.rows[0], file };
}

// Streams a stored file. Never throws into the generic error handler: a broken file is a 404, not a 500.
const SAFE_MIME = /^[\w.+-]+\/[\w.+-]+$/;
export async function sendDoc(id, res) {
  if (!Number.isSafeInteger(id) || id < 1) return res.status(404).json({ error: "No such file" });
  const d = await readDoc(id);
  if (!d) return res.status(404).json({ error: "This file is no longer on the server" });
  const mime = SAFE_MIME.test(d.mime || "") ? d.mime : "application/octet-stream";
  const size = fs.statSync(d.file).size;
  res.status(200).set({ "Content-Type": mime, "Content-Length": String(size), "X-Content-Type-Options": "nosniff", "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(d.filename)}` });
  await new Promise((ok) => {
    const s = fs.createReadStream(d.file);
    s.on("error", () => { res.destroy(); ok(); });
    res.on("close", ok);
    s.pipe(res);
  });
}
