// A small zip file writer: the files are stored as they are (no compression: receipts are already PDFs and images),
// with their CRC-32 check and UTF-8 names, so Hebrew file names open right in Windows, macOS and phones.
// zipFiles([{ name: "summary.csv", data: "text" | Uint8Array }], "2026-11-25") → Uint8Array (the .zip file).

const CRC = (() => {
  const T = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
  return T;
})();
export function crc32(b) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const enc = new TextEncoder();
const bytes = (d) => (typeof d == "string" ? enc.encode(d) : d instanceof Uint8Array ? d : new Uint8Array(d));
// The day the files are dated with, in the zip's own date format (1980 to 2107; the time is noon).
function dosDate(day) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(day || "")), y = m ? Math.min(2107, Math.max(1980, +m[1])) : 1980;
  return { date: ((y - 1980) << 9) | ((m ? +m[2] : 1) << 5) | (m ? +m[3] : 1), time: 12 << 11 };
}

export function zipFiles(files, day) {
  const { date, time } = dosDate(day), parts = [], dir = [];
  let at = 0;
  for (const f of files) {
    const name = enc.encode(String(f.name)), data = bytes(f.data), crc = crc32(data);
    const head = new DataView(new ArrayBuffer(30));
    // the file's own header: signature, version 2.0, UTF-8 names (bit 11), stored, date, CRC, sizes, name length
    head.setUint32(0, 0x04034b50, true); head.setUint16(4, 20, true); head.setUint16(6, 0x0800, true); head.setUint16(8, 0, true);
    head.setUint16(10, time, true); head.setUint16(12, date, true); head.setUint32(14, crc, true);
    head.setUint32(18, data.length, true); head.setUint32(22, data.length, true); head.setUint16(26, name.length, true); head.setUint16(28, 0, true);
    const c = new DataView(new ArrayBuffer(46));
    // the same file in the list at the end, with where its header starts
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
    c.setUint16(28, name.length, true); c.setUint32(42, at, true);
    parts.push(new Uint8Array(head.buffer), name, data);
    dir.push(new Uint8Array(c.buffer), name);
    at += 30 + name.length + data.length;
  }
  const dirSize = dir.reduce((s, p) => s + p.length, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, dirSize, true); end.setUint32(16, at, true);
  const all = [...parts, ...dir, new Uint8Array(end.buffer)], out = new Uint8Array(all.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of all) { out.set(p, o); o += p.length; }
  return out;
}
