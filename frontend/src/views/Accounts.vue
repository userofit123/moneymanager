<script setup>
// Accounts: every account the app knows, and one account's own page. A copy of the current app's Accounts page
// (web/js/05-accounts-charts-help.js renderAccounts, accList, accCard, accDetail, accSvg, accTxFill and the acc* cases in 08-jars.js).
// The numbers come from lib/accounts.js. Adding, editing and updating a balance are shared windows (FormHost kinds "account" and "balance").
// /app/accounts?id=<id> opens that account's page.
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { home } from "../core/derived.js";
import { now, dayOf } from "../core/clock.js";
import { openForm } from "../core/forms.js";
import { goActivity } from "../core/shell.js";
import { openTx } from "../core/txwin.js";
import { toast } from "../core/toast.js";
import { tx } from "../core/heText.js";
import { getJson } from "../core/http.js";
import { fmtWhen } from "../core/sources.js";
import { go } from "../router.js";
import { openSettingsTab } from "./settings/tab.js";
import { SI } from "./settings/icons.js";
import { dstr } from "../dates.js";
import { f0, fm } from "../format.js";
import { withTransfers } from "./home.js";
import { TONEC, typeKey, accILS, accByName, accName, accTail, accState, accGroupList, accTotals, accMonthly, cardMonthly, accRows, tileCols, accSel } from "../lib/accounts.js";
import PageHeader from "../components/PageHeader.vue";
import BaseDialog from "../components/BaseDialog.vue";
import LineChart from "../components/charts/LineChart.vue";
import TxRows from "../components/TxRows.vue";

const { t, locale } = useI18n();
const tk = (k, ...a) => t(k, ...a);
const S = computed(() => data.state.value);
const fx = computed(() => data.fx.value.fx);
const today = computed(() => dayOf(now.value));
const an = (n) => String(n).split(" · ").map(tx).join(" · "); // a bank, card or wallet name, or a subtitle, in the page's language (the old dictionary)
const loc = computed(() => (locale.value === "he" ? "he-IL" : "en-GB"));
const mon = (k, o) => new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, 1).toLocaleDateString(loc.value, o);
const MSHORT = (k) => mon(k, { month: "short" }), MNAME = (k) => mon(k, { month: "long" });
const money = (v) => (v < 0 ? "−" : "") + "₪" + f0(v);
const curList = (L) => L.map((x) => (x.cur == "ILS" ? "₪" : x.cur + " ") + f0(x.v)).join(" · ");
const typeOf = (a) => tk("acc." + typeKey(a));
const stLabel = (st) => (st.key in { manual: 1, notConnected: 1, none: 1, untested: 1, tested: 1, connected: 1, stale: 1, failed: 1, locked: 1, otp: 1 } ? tk("acc.conn." + st.key) : st.key);
// a date and time; the time is kept left to right inside Hebrew text
const whenT = (w) => fmtWhen(w).replace(/\d+:\d+/, "\u2066$&\u2069");
const title = (n) => { const x = accName(S.value, n); return an(x.name) + (/··/.test(n) ? " ·· " + x.tail : ""); };
const cardOf = (n) => (home.value?.cards || []).find((c) => c.n == n);

// which account is open (null: the list); a name that no longer exists goes back to the list
const sel = computed(() => (accSel.value && S.value && accByName(S.value, accSel.value).length ? accSel.value : null));
const shown = ref(50), q = ref("");
watch(accSel, () => { shown.value = 50; q.value = ""; });
watch(q, () => { shown.value = 50; });
const openAcc = (n) => { accSel.value = n; scrollTo(0, 0); };
const back = () => { accSel.value = null; scrollTo(0, 0); };
onMounted(() => {
  data.start();
  const p = new URLSearchParams(location.search), id = p.get("id"), n = p.get("n");
  if (id || n) { const pick = () => { const a = (S.value?.accounts || []).find((x) => (id ? String(x.id) == id : x.n == n)); if (a) accSel.value = a.n; }; if (S.value) pick(); else { const w = watch(S, (s) => { if (s) { pick(); w(); } }); } }
  if (p.get("add")) openForm("account");
});

// ---- the list ----
const groups = computed(() => (S.value ? accGroupList(S.value) : []));
const SECS = [["secBank", "", ["bank"]], ["secCard", "", ["card"]], ["secWallet", "", ["wallet"]], ["secOther", "byYou", ["pension", "custom"]]];
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
  else if (card) { const h = cardMonthly(S.value, name, today.value); chart = { t: "purchases", sub: "last12", note: "purchasesNote", vals: h.vals, labels: h.keys.map(MSHORT), full: h.keys.map(MNAME), color: "var(--c1)" }; }
  const since = T.first != "9999-99-99" ? t("acc.since", { date: dstr(T.first) }) : "", latest = T.last ? dstr(T.last) : t("acc.none"), net = T.mIn - T.mOut;
  const tiles = card
    ? [["tChargedMonth", "₪" + f0(mo ? mo.now : 0), mo && mo.last ? t("acc.lastMonthAmt", { amount: "₪" + f0(mo.last) }) : ""], ["tLastMonth", "₪" + f0(mo ? mo.last : 0), t("acc.chargedFull")], ["tReported", fm(tot), a.at ? t("acc.updated", { when: when(a.at) }) : ""], ["tTx", String(T.n), since], ["tOutYear", "₪" + f0(T.yOut), "", "neg"], ["tLatest", latest, ""]]
    : [["tBalance", money(tot), L.some((x) => x.cur != "ILS") ? curList(L) : a.at ? t("acc.updated", { when: when(a.at) }) : "", tot < 0 ? "neg" : ""], ["tInMonth", "₪" + f0(T.mIn), "", "pos"], ["tOutMonth", "₪" + f0(T.mOut), "", "neg"], ["tNetMonth", money(net), "", net < 0 ? "neg" : "pos"], ["tInYear", "₪" + f0(T.yIn), "", "pos"], ["tOutYear", "₪" + f0(T.yOut), "", "neg"], ["tTx", String(T.n), since], ["tLatest", latest, ""]];
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

// the chart takes the page's width, measured like the current app (#acc's width)
const root = ref(null), box = ref(0);
let ro = null;
onMounted(() => { const m = () => { box.value = root.value?.clientWidth || 0; }; m(); if (typeof ResizeObserver != "undefined") { ro = new ResizeObserver(m); ro.observe(root.value); } });
onBeforeUnmount(() => ro && ro.disconnect());
</script>

<template>
  <PageHeader :title="sel ? title(sel) : t('acc.title')" />
  <section id="acc" ref="root" class="view on">
    <template v-if="S && !sel">
      <div class="flex" style="justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div class="sm" style="max-width:640px;line-height:1.5">{{ t("acc.intro") }}</div><button type="button" class="btn" @click="openForm('account')">{{ t("acc.add") }}</button></div>
      <template v-if="groups.length">
        <template v-for="s in sections" :key="s.k">
          <h2>{{ tk("acc." + s.k) }}<span v-if="s.sub" class="sm" style="text-transform:none;letter-spacing:0;font-weight:500">{{ tk("acc." + s.sub) }}</span></h2>
          <div class="grid ga">
            <div v-for="c in s.L.map(cardFor)" :key="c.g.n" class="card click acc" role="button" tabindex="0" @click="openAcc(c.g.n)" @keydown.enter="openAcc(c.g.n)">
              <div class="lbl"><span>{{ an(c.lbl.name) }}<template v-if="c.lbl.tail"> <span class="sm" dir="ltr" style="font-weight:500;opacity:.8;unicode-bidi:isolate">·· {{ c.lbl.tail }}</span></template></span><span class="chip" style="margin-inline-start:auto;padding:1px 9px">{{ typeOf(c.a) }}</span></div>
              <template v-if="c.card"><div class="val"><small>₪</small>{{ f0(c.mo ? c.mo.now : 0) }}</div><div class="sm">{{ t("acc.chargedMonth") }}<template v-if="c.mo && c.mo.last"> · {{ t("acc.lastMonthAmt", { amount: "₪" + f0(c.mo.last) }) }}</template></div></template>
              <template v-else><div class="val"><small>₪</small>{{ c.tot < 0 ? "−" : "" }}{{ f0(c.tot) }}</div><div class="sm">{{ c.g.L.some((x) => x.cur != "ILS") ? curList(c.g.L) : an(c.a.s || "") }}</div></template>
              <div class="flex" style="gap:8px;margin-top:12px;justify-content:space-between;align-items:center"><span class="bd" :class="TONEC[c.st.tone]">{{ stLabel(c.st) }}</span><span class="sm">{{ c.foot }}</span></div>
            </div>
          </div>
        </template>
      </template>
      <div v-else class="card" style="margin-top:16px"><b>{{ t("acc.noneT") }}</b><div class="sm" style="margin:6px 0 12px">{{ t("acc.noneX") }}</div><div class="flex" style="gap:8px"><button type="button" class="btn s" @click="goConn">{{ t("acc.connect") }}</button><button type="button" class="btn o s" @click="openForm('account')">{{ t("acc.addPlain") }}</button></div></div>
    </template>

    <template v-else-if="D">
      <div class="accd"><button type="button" class="btn o s" @click="back">{{ t("acc.back") }}</button><div class="flex" style="gap:8px;flex-wrap:wrap">
        <template v-if="D.a.custom"><button type="button" class="btn o s" @click="openForm('balance', { id: D.a.id })">{{ t("acc.updBal") }}</button><button type="button" class="btn o s" @click="openForm('account', { id: D.a.id })">{{ t("acc.edit") }}</button><button type="button" class="btn r s" @click="delAsk = D.a.id">{{ t("acc.remove") }}</button></template>
        <button v-else-if="D.a.kind == 'pension'" type="button" class="btn o s" @click="openForm('pension')">{{ t("acc.updBal") }}</button>
        <button v-else-if="D.conn && D.conn.configured" type="button" class="btn o s" @click="goConn">{{ t("acc.goConn") }}</button>
        <button type="button" class="btn s" @click="addTx">{{ t("acc.addTx") }}</button>
      </div></div>
      <div class="card accH"><div class="flex" style="justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap"><div><div class="lbl" style="margin:0">{{ D.lbl }}</div></div><span class="bd" :class="TONEC[D.st.tone]">{{ stLabel(D.st) }}</span></div>
        <div class="stg" :style="{ '--sc': tileCols(D.tiles.length) }"><div v-for="x in D.tiles" :key="x[0]" class="stl"><span>{{ tk("acc." + x[0]) }}</span><b class="num" :class="x[3] || ''" dir="ltr">{{ x[1] }}</b><i v-if="x[2]">{{ x[2] }}</i></div></div></div>
      <template v-if="D.chart">
        <h2>{{ tk("acc." + D.chart.t) }}<span class="sm" style="text-transform:none;letter-spacing:0;font-weight:500">{{ tk("acc." + D.chart.sub) }}</span></h2>
        <div class="card"><div v-if="D.chart.note" class="sm" style="margin-bottom:6px">{{ tk("acc." + D.chart.note) }}</div><LineChart :key="D.name + D.chart.t" :vals="D.chart.vals" :labels="D.chart.labels" :full="D.chart.full" :color="D.chart.color" :box="box" /></div>
      </template>
      <div class="card ss"><div class="ssh"><span class="ssi"><svg viewBox="0 0 24 24" v-html="SI[D.card ? 'card' : 'bank']" /></span><div><b>{{ t("acc.details") }}</b><div class="sm">{{ t("acc.detailsX") }}</div></div></div>
        <div class="ssb p"><div class="cdg"><div v-for="r in D.rows" :key="r[0] + r[1]" class="cdt" :data-tip="r[2] || null"><span>{{ tk("acc." + r[0]) }}</span><b>{{ r[1] }}</b></div></div></div></div>
      <div v-if="D.upd.length" class="card ss"><div class="ssh"><span class="ssi"><svg viewBox="0 0 24 24" v-html="SI.clock" /></span><div><b>{{ t("acc.balHist") }}</b><div class="sm">{{ t("acc.histX") }}</div></div></div>
        <div class="ssb"><div v-for="u in D.upd" :key="u.id" class="al"><span class="sev low" /><div style="flex:1;min-width:0"><b style="font-size:14px">{{ u.old == null ? t("acc.setTo", { amount: fm(u.nu) }) : t("acc.changed", { a: fm(u.old), b: fm(u.nu) }) }}</b><div v-if="u.note" class="sm">{{ u.note }}</div></div><span class="sm">{{ whenT(u.at) }}</span></div></div></div>
      <h2>{{ t("acc.activity") }}</h2>
      <div class="tools ftools"><div class="frow f1"><input id="accQ" v-model="q" type="search" :placeholder="t('acc.search')" autocomplete="off"><a class="btn o s" style="margin-inline-start:auto;white-space:nowrap;text-decoration:none" role="button" tabindex="0" @click="goActivity({ src: D.name })">{{ t("acc.openAct") }}</a></div></div>
      <TxRows :rows="vis" :empty="t(q ? 'acc.noMatch' : 'acc.noTx')" @open="openRow" />
      <div class="txm"><button v-if="all.length > shown" type="button" class="btn o" @click="shown += 50">{{ t("acc.more", { n: Math.min(50, all.length - shown) }) }} <span class="sm" style="margin-inline-start:6px">{{ t("acc.shown", { a: shown, b: all.length }) }}</span></button></div>
    </template>
  </section>
  <BaseDialog :open="!!delAsk" :title="t('acc.remove')" @update:open="delAsk = null">
    <div class="sm" style="line-height:1.5">{{ t("acc.f.delQ") }}</div>
    <template #actions><button type="button" class="btn o" @click="delAsk = null">{{ t("acc.f.cancel") }}</button><button type="button" class="btn r" @click="del">{{ t("acc.remove") }}</button></template>
  </BaseDialog>
</template>
