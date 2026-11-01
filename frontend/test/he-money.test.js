// In Hebrew, an amount is kept left to right as one piece, without the space before it, a comma after it or a joined "מ-".
import test from "node:test";
import assert from "node:assert/strict";
import { MONEY, isolateNumbers } from "../src/core/polish.js";

const iso = (s) => s.replace(MONEY, "⁦$&⁩");
test("Hebrew amounts: only the amount is kept left to right", () => {
  assert.equal(iso("נכנסים ₪18,000 ויוצאים ₪15,000, כך"), "נכנסים ⁦₪18,000⁩ ויוצאים ⁦₪15,000⁩, כך");
  assert.equal(iso("מ-₪30,000 תגיעו"), "מ-⁦₪30,000⁩ תגיעו");
  assert.equal(iso("יתרה −₪80"), "יתרה ⁦−₪80⁩");
  assert.equal(iso("-₪1,250.50"), "⁦-₪1,250.50⁩");
  assert.equal(iso("₪1250 ו-12%"), "⁦₪1250⁩ ו-12%");
});

test("Hebrew sentences: a time stays one piece, hours before minutes", () => {
  assert.equal(isolateNumbers("הופיעה ב-03:25"), "הופיעה ב-⁦03:25⁩");
  assert.equal(isolateNumbers("(+₪12,257)"), "(⁦+\u2060₪12,257⁩)");
});
