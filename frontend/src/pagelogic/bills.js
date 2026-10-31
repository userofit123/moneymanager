// What the Bills page knows and does, without the screen: the three numbers on top, the groups of bills, the canceled ones,
// the ⋯ menu, "Change bill type", the payment history and the changes. Used by the computer's Bills page (views/Bills.vue)
// and the phone's Bills and Bill screens. The numbers come from lib/bills.js. Changes go through the data store; a bill is
// found by what it is (billKey), not its place in the list.
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { openTx, openPop } from "../core/txwin.js";
import { now } from "../core/clock.js";
import { openForm } from "../core/forms.js";
import { dstr } from "../dates.js";
import { billsModel, billState, flagBill, cancelBill, restoreBill, deleteBill, setBillType, sugYes, sugNo, typeOf, billKey, billIndex, cadText, freqText, evTipText, priceMoved, fm } from "../lib/bills.js";
import { goActivity } from "../core/shell.js";

export function useBills() {
  const { t, locale } = useI18n();
  const tk = (key, ...a) => t(key, ...a);
  const S = computed(() => data.state.value);

  // ---- how dates, amounts and accounts are written ----
  const loc = computed(() => (locale.value === "he" ? "he-IL" : "en-GB"));
  const monYr = (d, k) => { const x = new Date(d); x.setMonth(x.getMonth() + k); return x.toLocaleDateString(loc.value, { month: "short", year: "numeric" }); };
  const cc = (n) => (n == "Income" || S.value?.cats?.[n] === 99 ? "var(--pos)" : `var(--c${((S.value?.cats?.[n] == null ? 6 : S.value.cats[n])) % 7})`);
  const avStyle = (b) => { const c = cc(b.cat || "Other"); return { background: `color-mix(in srgb,${c} 22%,transparent)`, color: c }; };
  // "Max ·· 1234": the name with the last digits of a card, like accLbl.
  const srcOf = (n) => {
    n = n || ""; const A = S.value?.accounts || [], a = A.find((x) => x.n == n), m = /^(.*?)\s*··\s*(\S+)$/.exec(n);
    const tail = (x) => { const mm = /··\s*(\S+)$/.exec(x); if (mm) return mm[1]; const q = A.find((y) => y.n == x && y.tail); return q ? q.tail : ""; };
    if (!((a && a.kind == "card") || /··/.test(n))) return { name: n, tail: "" };
    return m ? { name: m[1], tail: m[2] } : { name: n, tail: tail(n) };
  };

  // ---- the page ----
  const M = computed(() => (S.value ? billsModel(S.value, now.value) : null));
  const cad = (every) => cadText(t, every);
  const freq = (every, plain) => freqText(t, every, plain);
  const kpis = computed(() => {
    const m = M.value; if (!m) return [];
    const irr = m.irr.length > 0;
    return [
      { c: "hero", l: t("bills.k.monthly"), v: m.mo, s: t(irr ? "bills.k.monthlySubIrr" : "bills.k.monthlySub", { amount: fm(m.mo * 12) }) },
      { c: "", l: t("bills.k.due"), v: m.soonT, s: t("bills.k.dueSub", { n: m.soon.length }, m.soon.length) },
      { c: "", l: t("bills.k.changes"), v: m.chT, s: t("bills.k.changesSub", { n: m.ch.length }, m.ch.length), neg: m.chT < 0 },
    ];
  });
  const ICON = {
    ins: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h3"/>',
    rec: '<path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5"/>',
    irr: '<path d="M3 17c3 0 3-10 6-10s3 10 6 10 3-10 6-10"/>',
    one: '<circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="9"/>',
  };
  const groups = computed(() => {
    const m = M.value; if (!m) return [];
    return [["rec", m.rec], ["irr", m.irr], ["ins", m.inst], ["one", m.one]].filter(([, L]) => L.length).map(([k, L]) => ({ k, L, total: m.tot[k] }));
  });
  const dueText = (b) => b.status == "overdue" ? "" : b.days <= 7 ? t("bills.dueIn", { n: b.days }, b.days) : t("bills.nextCharge", { date: dstr(b.nx) });
  const priceChange = (b) => (b.fresh && !b.vari && priceMoved(b) ? b.amt - b.was : 0);
  const lastLine = (b) => (b.n_tx ? t("bills.lastCharge", { amount: fm(b.amt), date: dstr(b.lp) }) : t("bills.noCharge"));

  const evTip = (b) => evTipText(b, t, dstr);

  // ---- saving: through the data store (stores/data.js). Bills the app finds are saved by the upkeep after every load (core/settle.js). ----
  // edit(copy, i) gets the bill's place in the copy being changed (looked up by its key, so a sync in between cannot shift it).
  function change(key, edit) {
    data.change((next) => { const i = billIndex(next, key); if (i < 0) return false; const r = edit(next, i); if (r === false) return false; return r.map(([a, d, who]) => [a, d, null, who]); });
  }
  // The payments of bill number i, worked out on the same state the change is made on.
  const txOf = (next, i) => { const st = billState(next, now.value); return st.billTx(next.bills[i]); };

  // ---- the ⋯ menu ----
  const menu = ref(null); // { i, key, btn }
  const toggleMenu = (b, ev) => { menu.value = menu.value && menu.value.i == b.idx ? null : { i: b.idx, key: billKey(b), btn: ev.currentTarget }; };
  const MI = { a: '<path d="M4 6h16M4 12h16M4 18h10"/>', h: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', t: '<path d="M7 4v16M7 4L4 7M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3"/>', f: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', c: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>', k: '<path d="M5 12l5 5L20 7"/>', x: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>' };
  const menuItems = computed(() => {
    if (!menu.value || !M.value) return [];
    const bi = M.value.all.find((x) => x.idx == menu.value.i) || {}, rec = !bi.once && !bi.irregular, it = [["billHist", "h", "menu.hist"], ["billAct", "a", "menu.inAct"]];
    if (rec || bi.irregular) it.push(["billType", "t", "menu.type"]);
    if (rec) { if (bi.flag) it.push(["billCanceled", "c", "menu.cancelNow"], ["billFlag", "k", "menu.keep"]); else it.push(["billFlag", "f", "menu.cancel"]); }
    it.push(["billDel", "x", "menu.remove", 1]);
    return it;
  });
  function pick(a) {
    const { i, key } = menu.value; menu.value = null;
    if (a == "billHist") openHist(i);
    else if (a == "billAct") showInActivity(i);
    else if (a == "billType") openType(i);
    else if (a == "billFlag") change(key, flagBill);
    else if (a == "billCanceled") change(key, (n, j) => cancelBill(n, j, billState(n, now.value).TODAY));
    else if (a == "billDel") change(key, deleteBill);
  }

  // Activity showing only this bill's payments, with its name above them (like an alert's Open)
  function showInActivity(i) {
    const st = billState(S.value, now.value), b = st.bills[i]; if (!b) return;
    goActivity({ focus: st.billTx(b).map((x) => x.id), label: b.n });
  }

  // ---- opening a bill: its last payment's entry window, or its payment history (billOpen, billHist) ----
  function openHist(i) {
    const st = billState(S.value, now.value), b = st.bills[i]; if (!b) return;
    openPop("hist", { title: b.n, rows: st.billTx(b), sub: b.mode == "once" ? t("bills.h.once") : t("bills.h.bill"), q: b.mode == "once" ? b.n : b.match });
  }
  function openBill(bi) {
    const st = billState(S.value, now.value), b = st.bills[bi.idx]; if (!b) return;
    const L = st.billTx(b), last = L[L.length - 1];
    if (last) openTx(last.id); else openPop("hist", { title: b.n, rows: L, sub: t("bills.h.bill"), q: b.match });
  }

  // ---- Add a bill: the shared window (components/forms/BillForm.vue) ----
  const openAdd = () => openForm("bill");

  // ---- Change bill type ----
  const typeFor = ref(null); // { i, name, v }
  function openType(i) {
    const b = S.value && billState(S.value, now.value).bills[i]; if (!b) return;
    const info = M.value.all.find((x) => x.idx == i) || {};
    typeFor.value = { key: billKey(b), name: b.n, v: typeOf(b, info) };
  }
  function saveType() { const { key, v } = typeFor.value; typeFor.value = null; change(key, (n, i) => setBillType(n, i, v, txOf(n, i))); }

  const makeRegular = (b) => change(billKey(b), (n, i) => sugYes(n, i, b.sug, txOf(n, i)));
  const keepIrregular = (b) => change(billKey(b), (n, i) => sugNo(n, i, txOf(n, i)));
  const restore = (b) => change(billKey(b), restoreBill);
  const remove = (b) => change(billKey(b), deleteBill);

  return { t, locale, tk, S, loc, monYr, cc, avStyle, srcOf, M, cad, freq, kpis, ICON, groups, dueText, priceChange, lastLine, evTip, change, txOf, menu, toggleMenu, MI, menuItems, pick, showInActivity, openHist, openBill, openAdd, typeFor, openType, saveType, makeRegular, keepIrregular, restore, remove };
}
