// What the Accounts page knows and does, without the screen: every account grouped by kind, one account's numbers, chart,
// details, balance updates and own activity, and its actions (add a transaction, connection settings, remove).
// Used by the computer's Accounts page (views/Accounts.vue) and the phone's Accounts and Account screens.
// sel: the name of the open account (null: none). openAcc(name): how the screen opens another account.
// The numbers come from lib/accounts.js.
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { home } from "../core/derived.js";
import { now, dayOf } from "../core/clock.js";
import { openForm } from "../core/forms.js";
import { openTx } from "../core/txwin.js";
import { toast } from "../core/toast.js";
import { tx } from "../core/heText.js";
import { getJson } from "../core/http.js";
import { fmtWhen } from "../core/sources.js";
import { go } from "../router.js";
import { openSettingsTab } from "../views/settings/tab.js";
import { dstr } from "../dates.js";
import { f0, fm, fmCur } from "../format.js";
import { withTransfers } from "../lib/home.js";
import { typeKey, accILS, hasRate, accByName, accName, accTail, accState, accGroupList, accTotals, accMonthly, cardMonthly, accRows, accSel } from "../lib/accounts.js";

export function useAccounts(sel, { openAcc = () => {} } = {}) {
  const { t, locale } = useI18n();
  const tk = (k, ...a) => t(k, ...a);
  const S = computed(() => data.state.value);
  const fx = computed(() => data.fx.value.fx);
  const today = computed(() => dayOf(now.value));
  const an = (n) => String(n).split(" · ").map(tx).join(" · "); // a bank, card or wallet name, or a subtitle, in the page's language (tx(), core/heSaved.js)
  const loc = computed(() => (locale.value === "he" ? "he-IL" : "en-GB"));
  const mon = (k, o) => new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, 1).toLocaleDateString(loc.value, o);
  const MSHORT = (k) => mon(k, { month: "short" }), MNAME = (k) => mon(k, { month: "long" });
  const money = (v) => (v < 0 ? "−" : "") + "₪" + f0(v);
  const curList = (L) => L.map((x) => fmCur(x.v, x.cur)).join(" · ");
  // A currency with no exchange rate yet is not counted in shekels (the same as Home): its amounts, then "not counted yet".
  const noRate = (L) => L.some((x) => !hasRate(x, fx.value));
  const curSub = (L) => curList(L) + (noRate(L) ? " · " + t("tip.noRate") : "");
  const typeOf = (a) => tk("acc." + typeKey(a));
  const stLabel = (st) => (st.key in { manual: 1, notConnected: 1, none: 1, untested: 1, tested: 1, connected: 1, stale: 1, failed: 1, locked: 1, otp: 1 } ? tk("acc.conn." + st.key) : st.key);
  // a date and time; the time is kept left to right inside Hebrew text
  const whenT = (w) => fmtWhen(w).replace(/\d+:\d+/, "⁦$&⁩");
  const title = (n) => { const x = accName(S.value, n); return an(x.name) + (/··/.test(n) ? " ·· " + x.tail : ""); };
  const cardOf = (n) => (home.value?.cards || []).find((c) => c.n == n);

  const shown = ref(50), q = ref("");
  watch(q, () => { shown.value = 50; });

  // ---- the list ----
  const groups = computed(() => (S.value ? accGroupList(S.value) : []));
  const SECS = [["secBank", "", ["bank"]], ["secCard", "", ["card"]], ["secWallet", "", ["wallet"]], ["secOther", "", ["pension", "custom"]]];
  const sections = computed(() => SECS.map(([k, sub, kinds]) => ({ k, sub, L: groups.value.filter((g) => kinds.includes(g.L[0].kind)) })).filter((s) => s.L.length));
  const cards = computed(() => groups.value.map((g) => {
    const a = g.L[0], tot = g.L.reduce((s, x) => s + accILS(x, fx.value), 0), T = accTotals(S.value, g.n, today.value), mo = cardOf(g.n), tl = accTail(S.value, g.n);
    return { g, a, tot, st: accState(S.value, a), T, mo, card: a.kind == "card", lbl: accName(S.value, g.n), foot: t("acc.txCount", { n: T.n }, T.n) + (tl ? " · " + t("acc.ending", { tail: tl }) : "") };
  }));
  const cardFor = (g) => cards.value.find((c) => c.g === g);

  // ---- one account ----
  const conns = ref([]);
  watch(sel, (n) => { if (n) getJson("/api/connections").then((j) => { conns.value = j || []; }).catch(() => {}); }, { immediate: true });
  const D = computed(() => {
    const name = sel.value; if (!name) return null;
    const L = accByName(S.value, name), a = L[0], tot = L.reduce((s, x) => s + accILS(x, fx.value), 0), st = accState(S.value, a), T = accTotals(S.value, name, today.value), card = a.kind == "card", mo = cardOf(name);
    const conn = conns.value.find((c) => c.source == a.src), tail = accTail(S.value, name), when = (w) => (w ? whenT(w) : t("acc.never"));
    const upd = (S.value.balUpdates || []).filter((u) => u.acc == name);
    let chart = null;
    if (!card && !a.manual) { const h = accMonthly(S.value, name, today.value, fx.value); chart = { t: "balance", sub: "last12", note: "workedBack", vals: h.vals, labels: h.keys.map((k) => MSHORT(k) + " " + k.slice(2, 4)), full: h.keys.map(MNAME), color: "var(--acc)" }; }
    else if (a.manual && upd.length > 1) { const m = upd.slice().reverse(); chart = { t: "balHist", sub: "everyUpd", note: "", vals: m.map((u) => u.nu), labels: m.map((u) => new Date(u.at).toLocaleDateString(loc.value, { day: "numeric", month: "short" })), full: null, color: "var(--acc)" }; }
    else if (card) { const h = cardMonthly(S.value, name, today.value); chart = { t: "purchases", sub: "lastN", n: h.keys.length, note: "purchasesNote", vals: h.vals, labels: h.keys.map((k) => (h.keys.length > 12 ? MSHORT(k) + " " + k.slice(2, 4) : MSHORT(k))), full: h.keys.map(MNAME), color: "var(--c1)" }; }
    const since = T.first != "9999-99-99" ? t("acc.since", { date: dstr(T.first) }) : "", latest = T.last ? dstr(T.last) : t("acc.none"), net = T.mIn - T.mOut;
    const tiles = card
      ? [["tChargedMonth", "₪" + f0(mo ? mo.now : 0), mo && mo.last ? t("acc.lastMonthAmt", { amount: "₪" + f0(mo.last) }) : ""], ["tLastMonth", "₪" + f0(mo ? mo.last : 0), t("acc.chargedFull")], ["tReported", fm(tot), a.at ? t("acc.updated", { when: when(a.at) }) : ""], ["tTx", String(T.n), since], ["tOutYear", "₪" + f0(T.yOut), "", "neg"], ["tLatest", latest, ""]]
      : [["tBalance", L.some((x) => hasRate(x, fx.value)) ? money(tot) : "—", L.some((x) => x.cur != "ILS") ? curSub(L) : a.at ? t("acc.updated", { when: when(a.at) }) : "", tot < 0 ? "neg" : ""], ["tInMonth", "₪" + f0(T.mIn), "", "pos"], ["tOutMonth", "₪" + f0(T.mOut), "", "neg"], ["tNetMonth", money(net), "", net < 0 ? "neg" : "pos"], ["tInYear", "₪" + f0(T.yIn), "", "pos"], ["tOutYear", "₪" + f0(T.yOut), "", "neg"], ["tTx", String(T.n), since], ["tLatest", latest, ""]];
    const yn = (v) => t(v ? "acc.yes" : "acc.no");
    const rows = [["rType", typeOf(a)], ["rCur", L.map((x) => x.cur).join(" + ")], ["rProvider", conn ? tx(conn.providerLabel || conn.label) : a.manual ? t("acc.byHand") : ""], ...(conn && conn.nickname ? [["rNick", conn.nickname]] : []),
      ...(a.manual ? [] : [["rSync", stLabel(st), t("acc.rSyncTip")]]), ...(a.manual || !st.since ? [] : [["rLastSync", whenT(st.since)]]), ["rBalUpd", a.at ? when(a.at) : t("acc.never")], ...(tail ? [["rNumber", t("acc.ending", { tail })]] : []),
      ...(a.kind == "card" ? [] : [["rNW", yn(a.inNW), t("acc.rNWTip")]]), ...(a.custom ? [["rRep", yn(a.inR !== false), t("acc.rRepTip")]] : []), ...(a.kind == "pension" ? [["rNW", t("acc.penNW")]] : [])].filter((r) => r[1]);
    return { name, L, a, tot, st, card, conn, tail, chart, tiles, rows, upd: upd.slice(0, 30), lbl: typeOf(a) + (tail ? " · " + t("acc.ending", { tail }) : "") };
  });
  const all = computed(() => (sel.value ? accRows(withTransfers(S.value), sel.value, q.value) : []));
  const vis = computed(() => all.value.slice(0, shown.value));
  const openRow = (x) => { if (x.balUpd) openAcc(x.from); else if (!x.virtual) openTx(x.id); };

  // actions
  const goConn = () => { openSettingsTab("conn"); go("/settings"); };
  const addTx = () => openForm("tx", { gap: { acc: D.value.name, cur: D.value.a.cur, amt: 0 }, plain: true });
  const delAsk = ref(null);
  async function del() {
    const id = delAsk.value; delAsk.value = null;
    try { await data.api("/api/accounts/" + id, { method: "DELETE" }); await data.load(); accSel.value = null; toast(t("acc.f.removed")); }
    catch (e) { toast(tx(e.message), { kind: "err" }); }
  }

  return { t, tk, S, fx, today, an, money, curSub, typeOf, stLabel, whenT, title, cardOf, shown, q, groups, sections, cards, cardFor, conns, D, all, vis, openRow, goConn, addTx, delAsk, del };
}
