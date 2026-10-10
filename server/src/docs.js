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
