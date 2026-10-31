// Where a rule looks in an entry (Settings → Automatic sorting): one part of it, or everything.
// The server keeps the same list in server/src/ruleFields.js; test/rule-fields.test.js checks that they match.
// No imports, so the server's test can read this file too.

// One part each. "any" is every text part, read together (the same as Display names always did).
export const FIELDS = ["any", "desc", "memo", "bd", "bc", "from", "to", "note", "acct", "cur"];
const ANY = ["desc", "memo", "bd", "from", "to", "note"];
// Several parts read together: what each kind of rule read before the person could choose.
export const COMBOS = { dtf: ["desc", "to", "from"], dt: ["desc", "to"], dfm: ["desc", "from", "memo"] };
// What a rule with no choice reads, per kind of rule (a rule saved before the choice existed has none).
export const USUAL = { cat: "dtf", tag: "dtf", card: "dt", in: "dfm", name: "any" };
// The choices offered for a kind of rule: its usual parts first, then each part.
export const whereOptions = (kind) => (USUAL[kind] == "any" ? FIELDS : [USUAL[kind], ...FIELDS]);
export const isWhere = (f) => FIELDS.includes(f) || Object.hasOwn(COMBOS, f);
// The English names written in the change history (shown in Hebrew through core/heSaved.js).
export const WHERE_EN = {
  any: "Everything", desc: "Transaction name", memo: "Bank's note", bd: "Bank's description", bc: "Bank's category",
  from: "Who paid", to: "Paid to", note: "Your note", acct: "Your account", cur: "Currency paid in",
  dtf: "Name, who paid or paid to", dt: "Name or paid to", dfm: "Name, who paid or bank's note",
};

// One part of an entry. acct: your own account (money out leaves it, money in arrives in it). cur: the currency
// of a payment made in another currency (like USD). bc: the bank's own category. bd: the bank's description.
const part = (t, k) => (k == "acct" ? (t.a > 0 ? t.to : t.from) : k == "cur" ? t.orig?.cur : t[k]);
// The text a rule reads. Parts read together are joined by a space, exactly as before the choice existed.
export function fieldText(t, f) {
  if (f == "any") return ANY.map((k) => part(t, k)).filter(Boolean).join(" ");
  const L = COMBOS[f];
  if (L) return L.map((k) => part(t, k) || "").join(" ");
  return part(t, f) ?? "";
}
// A card payment rule is its text, or { k: text, f: where } when the person chose where it looks.
export const ruleText = (r) => (r && typeof r == "object" ? String(r.k || "") : String(r ?? ""));
export const ruleWhere = (r, kind) => (r && typeof r == "object" && isWhere(r.f) ? r.f : USUAL[kind]);
