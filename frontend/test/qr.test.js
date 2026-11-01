import { test } from "node:test";
import assert from "node:assert/strict";
import qrcode from "qrcode-generator";
import { qrPath, keyGroups } from "../src/lib/qr.js";

const URI = "otpauth://totp/Money%20Manager?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=Money%20Manager";

test("qrPath draws one square per dark module of the code", () => {
  const { size, d } = qrPath(URI);
  const q = qrcode(0, "M"); q.addData(URI, "Byte"); q.make();
  assert.equal(size, q.getModuleCount());
  let dark = 0;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (q.isDark(r, c)) { dark++; assert.ok(d.includes(`M${c} ${r}h1`)); }
  assert.equal((d.match(/M/g) || []).length, dark);
});

test("keyGroups spaces a key in groups of four", () => {
  assert.equal(keyGroups("JBSWY3DPEHPK3PXP"), "JBSW Y3DP EHPK 3PXP");
  assert.equal(keyGroups("ABCDEF"), "ABCD EF");
  assert.equal(keyGroups(""), "");
});
