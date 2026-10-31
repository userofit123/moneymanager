// Where a rule looks in an entry: the same list as frontend/src/lib/ruleFields.js (frontend/test/rule-fields.test.js
// checks that the two match). The server reads it for category and tag rules on each import.
export const FIELDS = ["any", "desc", "memo", "bd", "bc", "from", "to", "note", "acct", "cur"];
const ANY = ["desc", "memo", "bd", "from", "to", "note"];
export const COMBOS = { dtf: ["desc", "to", "from"], dt: ["desc", "to"], dfm: ["desc", "from", "memo"] };
export const USUAL = { cat: "dtf", tag: "dtf", card: "dt", in: "dfm", name: "any" };
export const isWhere = (f) => FIELDS.includes(f) || Object.hasOwn(COMBOS, f);

const part = (t, k) => (k == "acct" ? (t.a > 0 ? t.to : t.from) : k == "cur" ? t.orig?.cur : t[k]);
export function fieldText(t, f) {
  if (f == "any") return ANY.map((k) => part(t, k)).filter(Boolean).join(" ");
  const L = COMBOS[f];
  if (L) return L.map((k) => part(t, k) || "").join(" ");
  return part(t, f) ?? "";
}

// The SQL columns a rule may read (from transactions t), and a row of them as the entry the app sees.
export const TX_COLS = "t.description,t.from_name,t.to_name,t.note,t.amount,t.orig_currency,NULLIF(t.details->>'memo','') AS memo,NULLIF(COALESCE(t.details->>'description',t.details->'details'->>'description'),'') AS bdesc,NULLIF(t.details->>'category','') AS bcat";
export const rowTx = (r) => ({
  desc: r.description, from: r.from_name, to: r.to_name, note: r.note, a: +r.amount,
  ...(r.orig_currency ? { orig: { cur: r.orig_currency } } : {}), ...(r.memo ? { memo: r.memo } : {}),
  ...(r.bdesc && r.bdesc !== r.description ? { bd: r.bdesc } : {}), ...(r.bcat ? { bc: r.bcat } : {}),
});
// The text a category or tag rule reads on the server. A rule with no choice (field '') reads the name only, as it always did.
export const ruleSees = (r, field) => (field ? fieldText(rowTx(r), field) : r.description);
