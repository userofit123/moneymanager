// The Activity list's rules, kept apart from the screen so they can be tested: which rows show, in what order,
// how they are grouped, and how In, Out and Net are counted. They follow the current app (web/js/04-transactions.js, 07-periods-rules.js).

// Money moved between the user's own accounts (confirmed or guessed). Not income or spending.
// A pair is "auto" (found by the app, waiting for review), "ok" (confirmed) or "rej" (the user said it is not a transfer).
export const transferIds = (S) => new Set((S?.xf || []).filter((x) => x.st !== "rej").flatMap((x) => [x.o, x.i]));
export const isIgnored = (S, t) => !!(S?.txIgnore && S.txIgnore[t.id]);
export const isFuture = (t, today) => t.upBill != null || (!t.virtual && String(t.d) > today);
// Paying the credit card bill from the bank: the purchases are already counted on the card.
// Exactly like the current app (web/js/07-periods-rules.js): a payment from a bank account whose text names a card company,
// one of the user's cards, or one of their card rules. ccOverride: 1 = counted as spending anyway, 2 = marked as a card payment by hand.
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function cardRe(name) {
  const n = String(name).toLowerCase();
  if (n === "max") return /(\bmax\b|max it|מקס|leumi ?card|לאומי ?קארד)/i;
  if (n === "isracard") return /(isracard|ישראכרט)/i;
  if (/(\bcal\b|visa ?cal|כאל|ויזה)/i.test(n)) return /(visa ?cal|\bcal\b|ויזה|כאל|כרטיסי אשראי לישראל)/i;
  if (/(amex|american)/i.test(n)) return /(american ?express|amex|אמריקן|אמקס)/i;
  if (/(diners|דיינרס)/i.test(n)) return /(diners|דיינרס)/i;
  return new RegExp(esc(n), "i");
}
export const normD = (s) => String(s || "").toLowerCase().replace(/[.'"״׳_,\-]/g, "").replace(/\s+/g, " ").trim();
// Names a bank prints for a card bill. The strong ones are enough alone; "max" and "cal" are also ordinary words, so they need "charge" (חיוב) next to them.
const CARD_STRONG = /(ישראכרט|isracard|(^| )כאל( |$)|visa ?cal|ויזה ?כאל|אמריקן ?אקס|american ?express|amex|דיינרס|diners|לאומי ?קארד|leumi ?card|כרטיסי אשראי|מקס ?איט|max ?it)/;
const CARD_WEAK = /((^| )(מקס|max|cal)( |$).*(חיוב|charge|debit))|((חיוב|charge|debit).*(^| )(מקס|max|cal)( |$))/;
// The user's cards (that have spending) and bank accounts, worked out once per data load.
export function cardInfo(S) {
  const acc = S?.accounts || [], tx = S?.tx || [];
  return {
    cards: acc.filter((a) => a.kind === "card" && tx.some((t) => t.from === a.n && t.a < 0)).map((a) => ({ n: a.n, re: cardRe(a.n) })),
    banks: new Set(acc.filter((a) => a.kind !== "card" && a.kind !== "pension").map((a) => a.n)),
  };
}
const cardRuleHit = (S, t) => { const x = normD(t.desc + " " + (t.to || "")); return CARD_STRONG.test(x) || CARD_WEAK.test(x) || (S?.cardRules || []).some((r) => { const n = normD(r); return n.length > 1 && x.includes(n); }); };
export function isCardPay(S, t, ci = cardInfo(S)) {
  if (t.virtual || t.a >= 0) return false;
  const ov = S?.ccOverride?.[t.id];
  if (ov == 2) return true;
  if (ov || !ci.banks.has(t.from)) return false;
  const x = t.desc + " " + (t.to || "");
  return cardRuleHit(S, t) || ci.cards.some((c) => c.re.test(x));
}
export const cardOf = (t, ci) => { const x = t.desc + " " + (t.to || ""); return ci.cards.find((c) => c.re.test(x))?.n || ""; };
// Name rules ("Look in", "Match", "Text", "Call it"), the same as the current app's nameField / nameHit / dn.
export const NFIELDS = ["any", "desc", "memo", "from", "to", "note"];
export const nameField = (t, f) => (f === "desc" ? t.desc : f === "memo" ? t.memo : f === "from" ? t.from : f === "to" ? t.to : f === "note" ? t.note : [t.desc, t.memo, t.bd, t.from, t.to, t.note].filter(Boolean).join(" "));
export function nameHit(t, r) { const q = rn(r.k); if (!q) return false; const v = rn(nameField(t, r.f || "any")); return r.m === "eq" ? v === q : v.includes(q); }
export function displayName(S, t) {
  const c = S?.cfg || {}, o = c.renames && c.renames[t.id];
  if (o) return o;
  if (c.nameRules) { const r = c.nameRules.find((x) => nameHit(t, x)); if (r) return r.n; }
  return String(t.desc || "").replace(/<[^>]*>/g, "");
}

export function kinds(S, today) {
  const xs = transferIds(S), ci = cardInfo(S);
  return {
    ci,
    isXf: (t) => xs.has(t.id),
    isIgn: (t) => isIgnored(S, t),
    isFut: (t) => isFuture(t, today),
    isCp: (t) => isCardPay(S, t, ci),
  };
}

// Only real income and spending count. Transfers, card payments, upcoming items, balance notes and rows the user left out do not.
export function totals(list, k) {
  let inc = 0, out = 0;
  for (const t of list) {
    if (t.balUpd || k.isXf(t) || k.isIgn(t) || k.isFut(t) || k.isCp(t)) continue;
    if (t.a > 0) inc += t.a; else out -= t.a;
  }
  return { inc, out, net: inc - out };
}

export function leftOut(list, k) {
  return {
    transfers: list.filter(k.isXf).length,
    cardPays: list.filter(k.isCp).length,
    upcoming: list.filter(k.isFut).length,
    balance: list.filter((t) => t.balUpd).length,
    ignored: list.filter((t) => k.isIgn(t) && !k.isXf(t) && !k.isFut(t) && !k.isCp(t) && !t.balUpd).length,
  };
}

export const hasFilters = (f) => !!(f.q || f.src || f.cat || f.type || f.tag || (f.p && f.p !== "all"));

// The time frame filter, the same choices as the current app. The week starts on Sunday unless the user chose Monday.
export const RANGES = ["all", "today", "yesterday", "week", "lastweek", "month", "lastmonth", "30d", "90d", "year", "lastyear"];
const p2 = (n) => String(n).padStart(2, "0");
const isoD = (d) => d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
export function rangeOf(p, now = new Date(), ws = "sun", from = "", to = "") {
  const n = new Date(now.getFullYear(), now.getMonth(), now.getDate()), add = (d, k) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + k);
  const wk = add(n, -((n.getDay() - (ws === "mon" ? 1 : 0) + 7) % 7)), Y = n.getFullYear(), MK = Y + "-" + p2(n.getMonth() + 1);
  const lm = isoD(new Date(Y, n.getMonth() - 1, 1)).slice(0, 7);
  switch (p) {
    case "today": return [isoD(n), isoD(n)];
    case "yesterday": return [isoD(add(n, -1)), isoD(add(n, -1))];
    case "week": return [isoD(wk), isoD(add(wk, 6))];
    case "lastweek": return [isoD(add(wk, -7)), isoD(add(wk, -1))];
    case "month": return [MK + "-01", MK + "-31"];
    case "lastmonth": return [lm + "-01", lm + "-31"];
    case "30d": return [isoD(add(n, -29)), isoD(n)];
    case "90d": return [isoD(add(n, -89)), isoD(n)];
    case "year": return [Y + "-01-01", Y + "-12-31"];
    case "lastyear": return [(Y - 1) + "-01-01", (Y - 1) + "-12-31"];
    case "custom": return [from || "0000-01-01", to || "9999-12-31"];
    default: return ["0000-01-01", "9999-12-31"];
  }
}
// The date reports count a transaction on: its own date, or the same day in the month the user moved it to.
export const rmOf = (t) => (t.rm && t.rm !== String(t.d).slice(0, 7) ? t.rm : "");
export function rdOf(t) {
  const m = rmOf(t); if (!m) return t.d;
  const last = new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate();
  return m + "-" + p2(Math.min(+String(t.d).slice(8, 10) || 1, last));
}

export function filterRows(S, rows, f, k) {
  const q = (f.q || "").toLowerCase();
  const [ra, rb] = rangeOf(f.p || "all", f.now, f.ws, f.from, f.to);
  return rows.filter((t) => {
    const tags = t.tags || [];
    const rd = rdOf(t);
    if (rd < ra || rd > rb) return false;
    if (t.balUpd && (f.type || f.cat || f.tag)) return false;
    if (q && !(displayName(S, t) + " " + t.desc + " " + t.to + " " + (t.note || "") + " " + tags.join(" ")).toLowerCase().includes(q)) return false;
    if (f.src && t.from !== f.src && t.to !== f.src) return false;
    if (f.tag && !tags.includes(f.tag)) return false;
    if (f.cat && (f.cat === "Uncategorized" ? !((!t.c || t.c === "Uncategorized") && !k.isXf(t)) : t.c !== f.cat)) return false;
    if (f.type) {
      if (f.type === "transfer") return k.isXf(t);
      if (f.type === "cardpay") return k.isCp(t);
      if (f.type === "bill") return t.upBill != null || !!t.bill;
      return !k.isXf(t) && !k.isCp(t) && (f.type === "income") === (t.a > 0);
    }
    return true;
  });
}

const tie = (a, b) => String(b.id).localeCompare(String(a.id));
export const SORTS = {
  new: (a, b) => b.d.localeCompare(a.d) || tie(a, b),
  old: (a, b) => a.d.localeCompare(b.d) || tie(b, a),
  big: (a, b) => Math.abs(b.a) - Math.abs(a.a) || b.d.localeCompare(a.d) || tie(a, b),
  small: (a, b) => Math.abs(a.a) - Math.abs(b.a) || b.d.localeCompare(a.d) || tie(a, b),
};
export const sortRows = (rows, mode) => [...rows].sort(SORTS[mode] || SORTS.new);

export const GROUPS = ["none", "day", "week", "month", "cat", "type", "acct", "merchant", "tag"];
const weekStart = (d) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() - x.getUTCDay()); return x.toISOString().slice(0, 10); };

// [key, label parts, is it by date]. The screen turns the parts into words in the chosen language.
export function groupOf(t, mode, k) {
  switch (mode) {
    case "day": return [t.d, { day: t.d }, true];
    case "week": { const w = weekStart(t.d); return [w, { week: w }, true]; }
    case "month": { const r = rdOf(t); return [r.slice(0, 7), { month: r.slice(0, 7) }, true]; }
    case "cat": return [t.c || "Uncategorized", { cat: t.c || "Uncategorized" }];
    case "type": { const x = k.isXf(t) ? "transfers" : t.a > 0 ? "income" : "expenses"; return [x, { type: x }]; }
    case "acct": { const x = (t.a < 0 ? t.from : t.to) || ""; return [x, { name: x }]; }
    case "merchant": { const x = (t.a < 0 ? t.to : t.from) || ""; return [x, { name: x }]; }
    case "tag": { const x = (t.tags || [])[0] || ""; return [x, { tag: x }]; }
  }
}

export function groupRows(rows, mode, sort, k) {
  const gs = new Map();
  for (const t of rows) {
    const [key, label, chrono] = groupOf(t, mode, k);
    if (!gs.has(key)) gs.set(key, { key, label, chrono: !!chrono, rows: [] });
    gs.get(key).rows.push(t);
  }
  const size = (g) => Math.abs(g.T.out) + Math.abs(g.T.inc);
  const last = (g) => g.rows.reduce((m, t) => (t.d > m ? t.d : m), "");
  // P: upcoming spending in the group, which the header shows as "still to come"; E: upcoming income.
  const ok = (t) => !t.balUpd && !k.isXf(t) && !k.isIgn(t) && !k.isCp(t) && k.isFut(t);
  return [...gs.values()].map((g) => ({ ...g, T: totals(g.rows, k), P: g.rows.filter((t) => ok(t) && t.a < 0).reduce((x, t) => x - t.a, 0), E: g.rows.filter((t) => ok(t) && t.a > 0).reduce((x, t) => x + t.a, 0), allFut: g.rows.every(k.isFut) })).sort((a, b) => {
    if (a.chrono) return sort === "old" ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key);
    return sort === "big" ? size(b) - size(a) : sort === "small" ? size(a) - size(b) : sort === "old" ? last(a).localeCompare(last(b)) : last(b).localeCompare(last(a));
  });
}

// Tags used anywhere, the most used first (rule tags count too, so a new rule's tag can be picked).
export function allTags(S) {
  const m = {};
  for (const t of S?.tx || []) if (!t.virtual) for (const g of t.tags || []) m[g] = (m[g] || 0) + 1;
  for (const r of S?.tagRules || []) for (const g of String(r.t || "").split(",").map((x) => x.trim()).filter(Boolean)) if (!(g in m)) m[g] = 0;
  return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
// "#food" and "Food" become the tag already in use, so the same tag is not made twice.
export function normTag(S, v) {
  v = String(v).trim().replace(/^#+/, "");
  if (!v) return "";
  const e = allTags(S).find(([t]) => t.toLowerCase() === v.toLowerCase());
  return e ? e[0] : v;
}
export const categoryNames = (S) => [...new Set([...Object.keys(S?.cats || {}), ...(S?.tx || []).map((t) => t.c)].filter((c) => c && c !== "Uncategorized"))].sort((a, b) => a.localeCompare(b));
export const accountNames = (S) => [...new Set((S?.tx || []).flatMap((t) => [t.from, t.to]).filter(Boolean))].sort((a, b) => a.localeCompare(b));

// Text compared the same way as the current app's rules: lower case, numbers and punctuation turned into spaces.
export const rn = (s) => String(s == null ? "" : s).toLowerCase().replace(/[0-9*#_\/\\\-.,:;()'"\u05f3\u05f4]+/g, " ").replace(/\s+/g, " ").trim();
export const ruleHit = (t, kw) => { const q = rn(kw); return q.length > 0 && rn(t.desc + " " + (t.to || "") + " " + (t.from || "")).includes(q); };
export const ruleTags = (r) => String(r?.t || "").split(",").map((x) => x.trim().replace(/^#+/, "")).filter(Boolean);
// The words a rule would look for: the store's name (or the description), first two words.
export function guessKw(t, ci) {
  const store = t.a < 0 && t.to && !ci.banks.has(t.to) && !ci.cards.some((c) => c.n === t.to) ? t.to : t.desc;
  const w = String(store).toLowerCase().replace(/[0-9*#_\/\\\-.,:;()]+/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  let kw = w.slice(0, 2).join(" ");
  if (kw.length < 3 && w[0]) kw = w[0];
  return kw;
}
// Other transactions like this one that are missing at least one of the tags.
export const tagSimilar = (S, kw, except, tags) => (kw.length < 2 ? [] : (S?.tx || []).filter((x) => x.id !== except && !x.virtual && ruleHit(x, kw) && tags.some((g) => !(x.tags || []).includes(g))));
// After tags are added to one transaction: offer a rule for the others, unless a rule already gives these tags.
export function tagOffer(S, t, tags, ci) {
  const kw = guessKw(t, ci);
  if (kw.length < 3 || !tags.length) return null;
  const ex = (S?.tagRules || []).find((r) => r.k.toLowerCase() === kw);
  if (ex && tags.every((g) => ruleTags(ex).includes(g))) return null;
  return { id: t.id, tags, kw, n: tagSimilar(S, kw, t.id, tags).length };
}
// Saves the tag rule on a copy of the data, and tags the similar transactions too when asked. Returns how many were tagged.
export function applyTagRule(next, kw, tags, except, all) {
  kw = kw.trim().toLowerCase();
  const L = all ? tagSimilar(next, kw, except, tags) : [];
  next.tagRules = next.tagRules || [];
  let ex = next.tagRules.find((r) => r.k.toLowerCase() === kw);
  if (ex) ex.t = [...new Set([...ruleTags(ex), ...tags])].join(",");
  else { ex = { k: kw, t: tags.join(",") }; next.tagRules.push(ex); }
  for (const x of L) { x.tags = x.tags || []; for (const g of tags) if (!x.tags.includes(g)) x.tags.push(g); }
  return { rule: ex, n: L.length };
}

// Needs review: transfers the app found, possible duplicates and balance changes no transaction explains. Same rules as the current app.
export const reviewTransfers = (S) => {
  const by = new Map((S?.tx || []).map((t) => [t.id, t]));
  return (S?.xf || []).filter((x) => x.st === "auto").map((x) => ({ x, o: by.get(x.o), i: by.get(x.i) })).filter((r) => r.o && r.i)
    .map((r) => ({ ...r, cost: -r.o.a - r.i.a }));
};
// The same day, text, amount and account twice. Two identical charges listed by the same bank or card are two real purchases;
// it is only a possible duplicate when they came from different places, or were typed by hand.
export function duplicateIds(S) {
  const m = {}, out = new Set();
  for (const t of S?.tx || []) (m[[t.d, t.desc, t.a, t.from].join("|")] ||= []).push(t);
  for (const a of Object.values(m)) {
    if (a.length < 2 || a.some((t) => S.dupOk?.[t.id])) continue;
    const srcs = new Set(a.map((t) => t.src || "")), one = srcs.size === 1 ? [...srcs][0] : null;
    if (one !== null && !["manual", "csv", ""].includes(one)) continue;
    a.slice(1).forEach((t) => out.add(t.id));
  }
  return out;
}
const nmOf = (x) => String(x || "").replace(/\s*··.*$/, "").trim();
// Do these amounts (pending charges) add up to the gap? One, all together, or a group of them, give or take a shekel.
export function amountsFit(L, need) {
  const near = (v) => Math.abs(v - need) <= 1;
  if (L.some(near)) return true;
  if (L.length > 1 && near(L.reduce((x, v) => x + v, 0))) return true;
  let budget = 200000;
  const go = (k, from, left) => { if (budget-- <= 0) return false; if (k === 0) return Math.abs(left) <= 1; for (let i = from; i <= L.length - k; i++) if (go(k - 1, i + 1, left - L[i])) return true; return false; };
  for (let k = 2; k < L.length; k++) if (go(k, 0, need)) return true;
  return false;
}
function pendCover(S, r) {
  const need = Math.abs(r.diff); if (!need) return false;
  const t0 = new Date(r.from).getTime() - 7 * 864e5, t1 = new Date(r.to).getTime() + 7 * 864e5, sg = Math.sign(r.diff);
  const L = (S.tx || []).filter((t) => t.pending && !t.virtual && Math.sign(t.a) === sg && nmOf(t.a < 0 ? t.from : t.to) === nmOf(r.n))
    .filter((t) => { const d = new Date(t.d).getTime(); return d >= t0 && d <= t1; })
    .map((t) => Math.abs(r.cur === "ILS" ? t.a : t.orig && t.orig.cur === r.cur ? t.orig.amt : 0)).filter((x) => x > 0);
  return amountsFit(L.slice(0, 40), need);
}
// Open balance gaps that pending charges do not already explain.
export const reviewGaps = (S) => (S?.gaps || []).filter((g) => g.status === "open" && g.remaining != 0)
  .map((g) => ({ id: g.id, n: g.account, cur: g.currency, diff: g.remaining, amount: g.amount, from: g.window_from, to: g.window_to }))
  .filter((r) => !pendCover(S, r));

// The transaction window's facts, as [label key, value] pairs, from what the app knows and what the bank sent (GET /api/transactions/:id/details).
const ilD = (v) => { const s = String(v || ""); if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; const d = new Date(s); return isNaN(d) ? s.slice(0, 10) : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(d); };
const nohtml = (s) => String(s ?? "").replace(/<[^>]*>/g, "").trim();
export const prettyKey = (k) => String(k).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_.]+/g, " ").replace(/^./, (c) => c.toUpperCase());
export function flat(o, pre = "", out = []) {
  if (o == null) return out;
  if (typeof o !== "object") { out.push([pre, String(o)]); return out; }
  for (const [k, v] of Object.entries(o)) { if (v == null || v === "") continue; const key = pre ? pre + "." + k : k; if (typeof v === "object") flat(v, key, out); else out.push([key, String(v)]); }
  return out;
}
const SRCL = { hapoalim: "Bank Hapoalim", max: "Max", isracard: "Isracard", wise: "Wise", demo: "The sample data" };
const SYMS = { ILS: "₪", USD: "$", EUR: "€", GBP: "£", JPY: "¥" };
const n0 = (v) => Math.abs(v).toLocaleString("en-IL", { maximumFractionDigits: 0 });
const sym = (c) => SYMS[c] || c + " ";
// "Payment n of N" for instalments (the same reading of the bank's text as the current app).
export function instOf(t) {
  if (t.inst && t.inst[1] > 1 && t.inst[0] >= 1 && t.inst[0] <= t.inst[1]) return { n: t.inst[0], total: t.inst[1] };
  const d = String(t.desc || ""), m = d.match(/תשלום\s*(\d{1,2})\s*(?:\/|מתוך)\s*(\d{1,2})/) || d.match(/payment\s*(\d{1,2})\s*(?:\/|of)\s*(\d{1,2})/i) || d.match(/(\d{1,2})\s*מתוך\s*(\d{1,2})/);
  return m && +m[2] >= 2 && +m[2] <= 60 && +m[1] >= 1 && +m[1] <= +m[2] ? { n: +m[1], total: +m[2] } : null;
}
// The rows of the details box, in the order of the current app. The screen turns { key } and { date } into words.
export function detailRows(S, t, x, xf) {
  const det = x?.details || {}, nested = det.details || {}, rows = [], R = (k, v, o = {}) => { if (v == null || v === "") return; rows.push({ k, v: o.raw ? v : nohtml(v), ...o }); };
  const i = instOf(t), fee = det.totalFees, ex = det.exchangeDetails, rb = det.runningBalance;
  R("date", { date: t.d }, { raw: true });
  if (det.processedDate && ilD(det.processedDate) !== t.d) R("chargedOn", { date: ilD(det.processedDate) }, { raw: true });
  R("account", t.from && t.to ? nohtml(t.from) + " → " + nohtml(t.to) : t.from || t.to);
  R("source", t.src === "manual" ? { key: "byHand" } : SRCL[t.src] || t.src, { raw: t.src === "manual" });
  R("amount", { amtDir: t.a }, { raw: true });
  if (t.orig) R("origAmount", sym(t.orig.cur) + n0(t.orig.amt) + " " + t.orig.cur);
  else if (det.originalAmount != null && det.originalCurrency && det.originalCurrency !== "ILS") R("origAmount", sym(det.originalCurrency) + n0(det.originalAmount) + " " + det.originalCurrency);
  if (det.chargedCurrency && det.chargedCurrency !== "ILS") R("chargedIn", det.chargedCurrency);
  const st = det.status || (x?.pending ? "pending" : "");
  R("status", t.pending || /pending/i.test(st) ? { key: "pending" } : st ? prettyKey(String(st).toLowerCase()) : t.src === "manual" ? "" : { key: "completed" }, { raw: true });
  if (det.type && !/^normal$/i.test(det.type)) R("type", prettyKey(String(det.type).toLowerCase()));
  if (i) R("instalment", { inst: i }, { raw: true });
  R("bankCategory", det.category || x?.bankCategory);
  if (det.description && det.description !== t.desc) R("bankDescription", det.description);
  R("memo", det.memo);
  if (displayName(S, t) !== nohtml(t.desc)) R("originalName", t.desc);
  R("merchant", nested.merchant && nested.merchant.name);
  R("recipient", nested.recipient && nested.recipient.name);
  if (nested.type && det.via) R("paymentType", prettyKey(String(nested.type).toLowerCase()));
  const plain = (v) => String(v).replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ");
  if (det.title && det.via === "activity list") R("title", det.title);
  if (det.primaryAmount && det.via === "activity list") R("shownAs", plain(det.primaryAmount));
  if (det.secondaryAmount && det.via === "activity list") R("otherSide", plain(det.secondaryAmount));
  if (fee && fee.value) R("fees", n0(fee.value) + " " + (fee.currency || ""));
  if (ex) R("exchange", [ex.rate ? "rate " + ex.rate : "", ex.fromAmount && ex.fromAmount.value ? n0(ex.fromAmount.value) + " " + ex.fromAmount.currency + " →" : "", ex.toAmount && ex.toAmount.value ? n0(ex.toAmount.value) + " " + ex.toAmount.currency : ""].filter(Boolean).join(" "));
  if (rb && rb.value != null) R("balanceAfter", n0(rb.value) + " " + (rb.currency || ""));
  R("reference", det.identifier || det.referenceNumber || det.id || (x?.externalId && !/^[0-9a-f]{20}:/.test(x.externalId) ? x.externalId : ""), { mono: true });
  if (det.account) R("accountNumber", det.account, { mono: true });
  R("entry", "#" + t.id, { mono: true });
  return rows;
}
