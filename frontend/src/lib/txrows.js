// Every row the Activity list shows (ALL() + upBillRows() + balRows() in web/js/02-state-data.js), and the labels after a row's name (chipsT).
// Besides the transactions there are rows the app makes itself: the cost of moving money between your accounts, the bills expected in the
// next 31 days (never counted, never saved), and the balances you changed by hand (a note, never income or spending).
import { i18n } from "../i18n.js";
import { fm, f0 } from "../format.js";
import { dcell, dstr } from "../dates.js";
import { TP } from "../core/tooltip.js";
import { rmOf, instOf, cardOf } from "../views/activity.js";
import { billOf, refundTwin } from "./txactions.js";

const t = (...a) => i18n.global.t(...a);
const p2 = (n) => String(n).padStart(2, "0");
const ymd = (d) => d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());

// The cost of a transfer (what left minus what arrived), as its own expense row.
export function costRows(S) {
  const byId = new Map((S.tx || []).map((x) => [x.id, x]));
  return (S.xf || []).filter((x) => x.st != "rej").map((x) => {
    const o = byId.get(x.o), i = byId.get(x.i); if (!o || !i) return null; const c = -o.a - i.a;
    return c > 0.5 ? { id: "v" + x.o, virtual: true, d: o.d, desc: "Transfer cost · " + o.from + " → " + i.to, from: o.from, to: "Transfer fees / FX spread", a: -c, c: "Fees & FX costs", tags: [], docs: [], note: "", cost: c } : null;
  }).filter(Boolean);
}
// Each balance typed by hand, as a note row.
export const balRows = (S) => (S?.balUpdates || []).map((u) => ({ id: "bu" + u.id, balUpd: true, virtual: true, d: ymd(new Date(u.at)), desc: u.old == null ? u.acc + " started at " + fm(u.nu) : u.acc + " balance: " + fm(u.old) + " → " + fm(u.nu), from: u.acc, to: u.acc, a: u.nu - (u.old || 0), c: "Balance update", tags: [], docs: [], note: u.note || "" }));
// Bills expected in the next 31 days, and the ones whose day has come but the bank has not listed yet ("not seen yet"). BC: home.billsAll.
export function upBillRows(S, BC, now, today) {
  const lim = new Date(now.getTime() + 31 * 864e5), fut = (S.tx || []).filter((x) => String(x.d) > today && x.a < 0), ok = (b) => !b.once && !b.irregular && b.flag != "canceled";
  const row = (b, d, late) => ({ id: "ub" + b.idx + (late ? "l" : ""), upBill: b.idx, virtual: true, late: !!late, d, desc: b.n, from: b.src || "", to: b.n, a: -b.pred, c: b.cat || "", tags: [], docs: [], note: "" });
  return BC.filter((b) => ok(b) && b.nx && b.nx > now && b.nx <= lim && !fut.some((x) => (x.desc + " " + x.to).toLowerCase().includes(b.match) && Math.abs((new Date(x.d) - b.nx) / 864e5) <= 6)).map((b) => row(b, ymd(b.nx)))
    .concat(BC.filter((b) => ok(b) && b.status == "pending" && b.pd).map((b) => row(b, ymd(b.pd), true)));
}
export const allRows = (S, BC = [], now = new Date(), today = ymd(now)) => (S ? (S.tx || []).concat(costRows(S), upBillRows(S, BC, now, today), balRows(S)) : []);

// ---- texts about a bill or an upcoming payment ----
const SRCL = { hapoalim: "Bank Hapoalim", max: "Max", isracard: "Isracard", wise: "Wise" };
// Who reported an upcoming payment: the connection's name, "You (added by hand)", or "The bank".
export const srcLabel = (S, src) => S?.connStatus?.[src]?.label || SRCL[src] || (src == "manual" ? t("txw.chip.byHand") : src == "demo" ? t("txw.chip.sample") : t("txw.chip.theBank"));
const cadT = (n) => (n == 1 || n == 2 || n == 12 ? t("bills.cad." + n) : t("txw.why.everyN", { n }));
// Why a payment counts as a bill (whyBill).
export function whyBill(b) {
  if (b.once) return t("txw.why.once");
  const sc = b.manual ? t("txw.why.manual", { m: b.match }) : "";
  if (b.irregular) return t("txw.why.irr", { sc, m: b.match, n: b.n_tx, c: b.cnt12 || 0 }, b.n_tx);
  return t("txw.why.part", { n: b.n }) + (b.manual ? t("txw.why.repManual", { sc, cad: (b.every ? cadT(b.every) : t("txw.why.regularly")).toLowerCase() }) : t("txw.why.found", { n: b.n_tx, cad: cadT(b.every).toLowerCase(), amt: fm(b.amt) }, b.n_tx)) + (b.flag == "canceled" ? t("txw.why.canceled") : "");
}
export const futureTip = (S, x) => t("txw.why.fut", { d: dstr(x.d), src: srcLabel(S, x.src), p: x.pending ? t("txw.why.asPending") : "" });
const futureTipT = (S, x) => TP(t("txw.chip.upTitle"), [[t("txw.chip.date"), dstr(x.d)], [t("txw.chip.reported"), srcLabel(S, x.src)], [t("txw.chip.status"), x.pending ? t("txw.chip.pending") : t("txw.chip.scheduled")]], t("txw.chip.upNote"));

// ---- the labels after a row's name ----
const loc = () => (i18n.global.locale.value === "he" ? "he-IL" : "en-GB");
const mname = (m, o = "long") => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(loc(), { month: o });
// c: { K: kinds(), dup: the possible duplicates (Set), BC: every bill }. Each label: { cls, label, tip, icon }.
export function txChips(S, x, c) {
  const { K, dup, BC = [] } = c, out = [], add = (cls, label, tip, icon) => out.push({ cls, label, tip, icon });
  if (x.balUpd) add("p-bal", t("activity.chip.bal"), t("activity.chip.balTip"));
  if (x.jar) { const j = (S.jars || []).find((y) => y.id == x.jar.id); if (j) add("p-jar", t("activity.chip.jar", { n: j.n }), t("activity.chip.jarTip", { n: j.n })); }
  { const i = instOf(x); if (i && x.a < 0) add("p-inst", i.n + "/" + i.total, i.total > i.n ? t("activity.chip.instTip", { n: i.n, total: i.total, more: i.total - i.n }, i.total - i.n) : t("activity.chip.instLast", { n: i.n, total: i.total })); }
  if (rmOf(x) && !x.virtual) { const m = rmOf(x), lab = mname(m, "short") + " " + m.slice(0, 4); add("p-mv", t(m > String(x.d).slice(0, 7) ? "activity.chip.pushed" : "activity.chip.moved", { m: lab }), t("activity.chip.movedTip", { d: dcell(x.d), m: mname(m) + " " + m.slice(0, 4) })); }
  if (x.pending && !x.virtual) add("p-pend", t("activity.chip.pending"), t("activity.chip.pendingTip"));
  if (K.isIgn(x)) add("p-ign", t("activity.chip.ignored"), t("activity.chip.ignoredTip"));
  else if (refundTwin(S, x)) add("p-twin", t("txw.chip.twin"), t("txw.chip.twinTip"));
  if (K.isCp(x)) add("p-card", t("activity.chip.cardpay"), t("activity.chip.cardpayTip", { card: cardOf(x, K.ci) || t("activity.chip.card") }));
  if (x.upBill != null) {
    const b = BC.find((y) => y.idx == x.upBill);
    if (b) add("p-exp", x.late ? t("txw.chip.late") : t("txw.chip.exp"), TP(t("txw.chip.expTitle", { n: b.n }), [[t("txw.chip.expOn"), dstr(x.d)], [t("txw.chip.usually"), fm(b.pred)], [t("txw.chip.repeats"), b.every ? cadT(b.every) : t("txw.chip.regularly")], ...(b.lp ? [[t("txw.chip.lastPaid"), dstr(b.lp)]] : [])], (x.late ? t("txw.chip.expLate") : "") + t("txw.chip.expNote")));
  } else if (K.isFut(x)) add("p-up", t("activity.chip.upcoming"), futureTipT(S, x));
  { const b = billOf(x, BC); if (b) add("p-bill", b.once ? t("txw.chip.billOnce") : t("txw.chip.bill"), whyBill(b), !b.once && !b.irregular ? "rep" : ""); }
  if (K.isXf(x)) add("p-xf", t("activity.chip.xf"), t("activity.chip.xfTip"), "xf");
  if (dup && dup.has(x.id)) add("p-dup", t("activity.chip.dup"), t("activity.chip.dupTip"));
  if (x.virtual && x.upBill == null) add("p-auto", t("activity.chip.auto"), t("activity.chip.autoTip"));
  if (x.note) add("p-note", "", TP(t("txw.chip.note"), [], String(x.note).slice(0, 600)), "note");
  return out;
}
// "+₪1,250" / "−₪80" ("≈" in front of an expected bill); a balance update is "balance +₪500".
export const amtText = (x) => (x.balUpd ? t("activity.balance") + " " + (x.a >= 0 ? "+" : "−") + "₪" + f0(x.a) : (x.upBill != null ? "≈ " : "") + (x.a > 0 ? "+" : "−") + "₪" + f0(x.a));
export const SYM = { ILS: "₪", USD: "$", EUR: "€", GBP: "£", JPY: "¥" };
// the small icons inside some labels
export const CHIP_ICON = { xf: '<path d="M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4"/>', note: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>', rep: '<path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5"/>' };
