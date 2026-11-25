// Taxes and reports → Download everything: the zip writer (lib/zip.js) and what goes in the zip (lib/taxExport.js).
// Names and amounts are made up.
import test from "node:test";
import assert from "node:assert/strict";
import { crc32 as nodeCrc } from "node:zlib";
import { zipFiles, zipFits, crc32 } from "../src/lib/zip.js";
import { taxZipPlan, periodTag, safeName } from "../src/lib/taxExport.js";

// Read a zip back from its list at the end (the central directory), the way unzip programs do.
async function readZip(blob) {
  const z = new Uint8Array(await blob.arrayBuffer());
  const v = new DataView(z.buffer, z.byteOffset, z.byteLength), dec = new TextDecoder();
  const e = z.byteLength - 22;
  assert.equal(v.getUint32(e, true), 0x06054b50);
  const n = v.getUint16(e + 10, true);
  let p = v.getUint32(e + 16, true);
  const out = [];
  for (let i = 0; i < n; i++) {
    assert.equal(v.getUint32(p, true), 0x02014b50);
    const flags = v.getUint16(p + 8, true), method = v.getUint16(p + 10, true), crc = v.getUint32(p + 16, true), size = v.getUint32(p + 24, true);
    const nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), at = v.getUint32(p + 42, true);
    const name = dec.decode(z.subarray(p + 46, p + 46 + nl));
    assert.equal(v.getUint32(at, true), 0x04034b50);
    const ln = v.getUint16(at + 26, true), lx = v.getUint16(at + 28, true);
    assert.equal(dec.decode(z.subarray(at + 30, at + 30 + ln)), name);
    const data = z.subarray(at + 30 + ln + lx, at + 30 + ln + lx + size);
    out.push({ name, flags, method, crc, data, date: v.getUint16(at + 12, true) });
    p += 46 + nl + xl + cl;
  }
  return out;
}

test("zip: the files read back the same, stored, with UTF-8 names and a right CRC", async () => {
  const img = new Uint8Array(3000).map((_, i) => (i * 7) % 256);
  const z = zipFiles([{ name: "summary.csv", data: "﻿תאריך,סכום\r\n2026-09-14,1200" }, { name: "files/2026-09-14 עיצוב לוגו.pdf", data: img }, { name: "empty.txt", data: "" }], "2026-11-25");
  const F = await readZip(z);
  assert.deepEqual(F.map((f) => f.name), ["summary.csv", "files/2026-09-14 עיצוב לוגו.pdf", "empty.txt"]);
  for (const f of F) { assert.equal(f.method, 0); assert.equal(f.flags & 0x0800, 0x0800); assert.equal(f.crc, crc32(f.data)); assert.equal(f.crc, nodeCrc(f.data)); }
  assert.equal(new TextDecoder("utf-8", { ignoreBOM: true }).decode(F[0].data), "﻿תאריך,סכום\r\n2026-09-14,1200");
  assert.deepEqual([...F[1].data], [...img]);
  assert.equal(F[2].data.length, 0);
  assert.equal(F[0].date, ((2026 - 1980) << 9) | (11 << 5) | 25);
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

test("zip name: the item and its months, safe for every system", () => {
  assert.equal(periodTag({ start: "2026-09-01", end: "2026-10-31" }), "2026-09–10");
  assert.equal(periodTag({ start: "2026-11-01", end: "2026-11-30" }), "2026-11");
  assert.equal(periodTag({ start: "2026-01-01", end: "2026-12-31" }), "2026");
  assert.equal(periodTag({ start: "2026-12-01", end: "2027-03-31" }), "2026-12–2027-03");
  assert.equal(safeName('a/b:c*?"<>| .'), "a-b-c------");
  assert.equal(safeName("..hidden"), "hidden");
  assert.equal(safeName("a\u202bb\u2066c\u200f"), "abc");
  assert.equal(safeName("name. . "), "name");
  assert.equal(safeName("😀😀😀", 2), "😀😀");
  assert.ok(!/[\ud800-\udbff]$/.test(safeName("ab😀", 3)));
});

const W = { span: "Money from September–October 2026", last: "Last day 15/11/2026", made: "Made on 25/11/2026", in: "Money in", out: "Money out", amt: "Amount to pay", back: "Money to get back", noAmt: "Not set", vatIn: "VAT on money in", vatOut: "VAT on money out",
  papers: "Missing papers", papersNone: "Nothing missing", need: { receipt: "Needs a receipt", invoice: "Needs an invoice" }, tx: "Transactions", txNone: "None", note: "An estimate.", notHere: "the file is not on the server",
  c: { date: "Date", desc: "Description", from: "From", to: "To", cat: "Category", tags: "Tags", amount: "Amount (₪)", docs: "Attachments" } };
const t1 = { id: 1, d: "2026-09-14", desc: "Logo design", from: "Client A", to: "Checking", c: "Freelance", a: 1180, docs: ["inv.PDF", "inv2.pdf"], docIds: [11, 12] };
const t2 = { id: 2, d: "2026-09-14", desc: "Logo design", from: "Client B", to: "Checking", c: "Freelance", a: 590, docs: ["scan.jpg"], docIds: [13] };
const t3 = { id: 3, d: "2026-10-02", desc: "Laptop <b>bag</b>", from: "Card", to: "Shop", c: "Office", a: -236, tags: ["work"] };
const t4 = { id: 4, d: "2026-10-05", desc: "Printer ink", from: "Card", to: "Shop", c: "Office", a: -118, docs: ["old.png"], docIds: [14], docHas: [false] };
const report = { period: { start: "2026-09-01", end: "2026-10-31", last: "2026-11-15" }, rows: { in: [t1, t2], out: [t3, t4] }, totals: { in: 1770, out: 354, net: 1416 }, amount: 216, vat: { in: 270, out: 54 }, missing: [{ t: t3, side: "out", need: "receipt", note: "" }] };
const plan = () => taxZipPlan({ name: "VAT report", report, W, lang: "en", cat: (c) => c, money: (n) => "₪" + n, day: (d) => d });

test("zip contents: every attached file once, named after its transaction", () => {
  const p = plan();
  assert.equal(p.zipName, "VAT report 2026-09–10.zip");
  assert.deepEqual(p.fetch, [{ id: 11, path: "files/2026-09-14 Logo design.pdf" }, { id: 12, path: "files/2026-09-14 Logo design (2).pdf" }, { id: 13, path: "files/2026-09-14 Logo design.jpg" }]);
});

test("summary.csv: BOM, the page's totals, the transactions with their files, the missing papers", () => {
  const p = plan(), L = p.csv.split("\r\n");
  assert.ok(p.csv.startsWith("﻿"));
  for (const line of ["Money in,1770", "Money out,354", "Amount to pay,216", "VAT on money in,270", "VAT on money out,54"]) assert.ok(L.includes(line), line);
  assert.ok(L.includes("Date,Description,From,To,Category,Tags,Amount (₪),Attachments,Missing papers"));
  assert.ok(L.includes("2026-09-14,Logo design,Client A,Checking,Freelance,,1180,files/2026-09-14 Logo design.pdf; files/2026-09-14 Logo design (2).pdf,"));
  assert.ok(L.includes("2026-10-02,Laptop bag,Card,Shop,Office,work,-236,,Needs a receipt"));
  assert.ok(L.includes("2026-10-05,Printer ink,Card,Shop,Office,,-118,old.png (the file is not on the server),"));
  assert.ok(L.includes("2026-10-02,Laptop bag,-236,Needs a receipt,"));
  // money back shows as Money to get back, without its minus
  const back = taxZipPlan({ name: "VAT", report: { ...report, amount: -40 }, W, lang: "en", cat: (c) => c, money: String, day: String });
  assert.ok(back.csv.split("\r\n").includes("Money to get back,40"));
});

test("summary.html: right to left in Hebrew, nothing from outside, text escaped", () => {
  const h = taxZipPlan({ name: "דיווח <מע״מ>", report, W, lang: "he", cat: (c) => c, money: (n) => "₪" + n, day: (d) => d }).html;
  assert.match(h, /<html lang="he" dir="rtl">/);
  assert.ok(h.includes("דיווח &lt;מע״מ&gt;"));
  assert.ok(!/(src|href)=/.test(h));
  assert.ok(h.includes("Needs a receipt") && h.includes("₪1770"));
});

test("zip limits: too many files or too many bytes are refused before writing", () => {
  assert.ok(zipFits(65535, 1000) && !zipFits(65536, 1000));
  assert.ok(zipFits(1, 0xfffffffe) && !zipFits(1, 0xffffffff));
  assert.throws(() => zipFiles(Array.from({ length: 65536 }, () => ({ name: "a", data: "" })), "2026-11-25"), { code: "ZIP_TOO_BIG" });
});

test("a file the server does not have is listed as not on the server; a missing docHas counts as not there", () => {
  const gone = taxZipPlan({ name: "VAT report", report, W, lang: "en", cat: (c) => c, money: (n) => "₪" + n, day: (d) => d, gone: new Set([12]) });
  assert.deepEqual(gone.fetch.map((f) => f.id), [11, 13]);
  assert.ok(gone.csv.includes("inv.PDF"[0]) && gone.csv.includes("inv2.pdf (the file is not on the server)"));
  const t5 = { ...t4, id: 5, docHas: [] };
  const r2 = { ...report, rows: { in: [], out: [t5] }, missing: [] };
  assert.deepEqual(taxZipPlan({ name: "V", report: r2, W, lang: "en", cat: (c) => c, money: String, day: String }).fetch, []);
});

test("summary.html amounts: missing papers without a minus, transactions with the page's text", () => {
  const h = taxZipPlan({ name: "V", report, W, lang: "en", cat: (c) => c, money: (n) => "₪" + n, day: (d) => d, amtText: (x) => (x.a > 0 ? "+" : "−") + "₪" + Math.abs(x.a) }).html;
  assert.ok(h.includes("<bdi>₪236</bdi> · <span") && h.includes("+₪1180") && h.includes("−₪236"));
});
