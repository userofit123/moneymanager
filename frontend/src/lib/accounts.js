// The Accounts page's numbers and lists, kept apart from the screen so they can be tested against the current app
// (web/js/05-accounts-charts-help.js: accState, accTail, accGroupList, accTotals, accMonthly, accTxFill, balRows).
// Nothing here changes the data. S: the whole data, today: "YYYY-MM-DD", fx: { USD: 3.7 }.
import { shallowRef } from "vue";
import { kinds } from "../views/activity.js";
import { withTransfers, addM } from "../views/home.js";
import { balRows, costRows } from "./txrows.js";
import { CURS } from "../views/settings/currencies.js";

// The type names (keys of the acc.kind / acc.ck texts) and the colour of each connection state's badge, as in the current app.
export const ACC_KINDS = ["bank", "card", "wallet", "pension", "custom"];
export const CK = ["cash", "savings", "investment", "loan", "other"];
export const TONEC = { green: "dn", yellow: "am2", red: "up", gray: "fl" };
export const typeKey = (a) => (a.custom ? (CK.includes(a.ck) ? "ck." + a.ck : "ck.account") : "kind." + a.kind);

const rate = (fx, c) => (c === "ILS" ? 1 : (fx || {})[c] || 1);
export const accILS = (a, fx) => a.v * rate(fx, a.cur);
export const accByName = (S, n) => (S?.accounts || []).filter((a) => a.n == n && !a.hide);
const penEmpty = (a) => a.kind == "pension" && !(+a.v > 0);

// "·· 1234" at the end of the name, or the number the bank gave.
export const accTail = (S, n) => { const m = /··\s*(\S+)$/.exec(n); if (m) return m[1]; const a = (S?.accounts || []).find((x) => x.n == n && x.tail); return a ? a.tail : ""; };
// The name without its "·· 1234" end, and that number (shown apart, left to right).
export const accName = (S, n) => { const m = /^(.*?)\s*··\s*(\S+)$/.exec(n); return m ? { name: m[1], tail: m[2] } : { name: n, tail: accTail(S, n) }; };

// How the account is read: by hand, not connected, or the last sync's state (key of the acc.conn texts) with its badge colour.
export function accState(S, a) {
  if (a.manual) return { key: "manual", tone: "gray" };
  const c = (S?.connStatus || {})[a.src];
  if (!c) return { key: "notConnected", tone: "gray" };
  return { key: c.key, tone: c.tone, since: c.since };
}

// One group per account name (an account with several currencies is one card), hidden ones and an empty pension left out.
export function accGroupList(S) {
  const gs = [];
  (S?.accounts || []).filter((a) => !a.hide && !penEmpty(a)).forEach((a) => { let g = gs.find((x) => x.n == a.n); if (!g) gs.push((g = { n: a.n, L: [] })); g.L.push(a); });
  return gs;
}

const ctx = (S, today) => { const S2 = withTransfers(S || {}); return { S: S2, k: kinds(S2, today), tx: S2.tx || [], MK: today.slice(0, 7) }; };

// Counts and totals of one account: in and out this month and in the last 12 months (transfers and card payments left out),
// how many transactions, the first and the latest date.
export function accTotals(S, name, today) {
  const { k, tx, MK } = ctx(S, today), on = (t) => t.from == name || t.to == name;
  const L = tx.filter((t) => !t.virtual && !t.pending && !k.isFut(t) && on(t) && !k.isXf(t) && !k.isCp(t));
  const month = L.filter((t) => t.d.startsWith(MK)), sum = (a, s) => a.filter((t) => t.a * s > 0).reduce((x, t) => x + Math.abs(t.a), 0), y = addM(MK, -11), yr = L.filter((t) => t.d.slice(0, 7) >= y);
  const all = tx.filter((t) => !t.virtual && on(t));
  return { n: all.length, mIn: sum(month, 1), mOut: sum(month, -1), yIn: sum(yr, 1), yOut: sum(yr, -1), first: all.reduce((m, t) => (t.d < m ? t.d : m), "9999-99-99"), last: all.filter((t) => !k.isFut(t)).reduce((m, t) => (t.d > m ? t.d : m), "") };
}

// The balance at the end of each of the last 13 months, worked back from today's balance and the transactions.
export function accMonthly(S, name, today, fx) {
  const { k, tx, MK } = ctx(S, today), now = accByName(S, name).reduce((s, a) => s + accILS(a, fx), 0), keys = Array.from({ length: 13 }, (_, i) => addM(MK, -(12 - i))), after = {};
  tx.forEach((t) => { if (t.virtual || t.pending || k.isFut(t)) return; const v = t.to == name ? t.a : t.from == name ? t.a : 0; if (!v) return; const m = t.d.slice(0, 7); after[m] = (after[m] || 0) + v; });
  const vals = []; let b = now; for (let i = 12; i >= 0; i--) { vals[i] = Math.round(b); b -= after[keys[i]] || 0; }
  return { keys, vals };
}

// What was bought with a card in each of the last 12 months (this month so far).
export function cardMonthly(S, name, today) {
  const { k, tx, MK } = ctx(S, today), keys = Array.from({ length: 12 }, (_, i) => addM(MK, -(11 - i)));
  return { keys, vals: keys.map((m) => Math.round(tx.filter((t) => !t.virtual && !t.pending && t.a < 0 && t.from == name && t.d.startsWith(m) && !k.isXf(t)).reduce((s, t) => s - t.a, 0))) };
}

// The balance updates typed by hand, as rows of the account's activity (balRows, shared with Activity).
export { balRows };

// The account's own activity: every transaction from or to it (and the fees of moving money) plus its balance updates,
// newest first, filtered by the search box (description, from, to, note, tags).
export function accRows(S, name, q) {
  const s = String(q || "").toLowerCase();
  return (S?.tx || []).concat(costRows(S), balRows(S)).filter((t) => (t.from == name || t.to == name) && (!s || (t.desc + " " + t.to + " " + t.from + " " + (t.note || "") + " " + (t.tags || []).join(" ")).toLowerCase().includes(s)))
    .sort((a, b) => b.d.localeCompare(a.d) || String(b.id).localeCompare(String(a.id)));
}

// How many tiles in a row on the account's header card.
export const tileCols = (n) => (n <= 4 ? n : [4, 3, 5, 6].find((c) => n % c == 0) || 4);

// The currencies to choose from for a new account: the shekel, then every currency the app knows (CUR_OPTS).
// name(c): the currency's name in the page's language.
export const curOpts = (name) => [["ILS", "₪ " + name("ILS")], ...CURS.map((c) => [c, c + " · " + name(c)])];

// A bank to start adding in Settings → Connections (accConnectGo / connStart): the source id the Connections section should open
// The account whose page is open on Accounts (ACC_SEL: its name; null = the list). Kept here so the add and edit windows can open the account they saved.
export const accSel = shallowRef(null);
