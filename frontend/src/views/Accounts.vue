<script setup>
// Accounts: every account the app knows, and one account's own page.
// What the page knows and does is in pagelogic/accounts.js (shared with the phone); the numbers come from lib/accounts.js.
// Adding, editing and updating a balance are shared windows (FormHost kinds "account" and "balance").
// /accounts?id=<id> opens that account's page.
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { data } from "../stores/data.js";
import { openForm } from "../core/forms.js";
import { goActivity } from "../core/shell.js";
import { go, query } from "../router.js";
import { SI } from "./settings/icons.js";
import { f0, fm } from "../format.js";
import { TONEC, hasRate, accByName, tileCols, accSel } from "../lib/accounts.js";
import { useAccounts } from "../pagelogic/accounts.js";
import PageHeader from "../components/PageHeader.vue";
import BaseDialog from "../components/BaseDialog.vue";
import LineChart from "../components/charts/LineChart.vue";
import TxRows from "../components/TxRows.vue";
import "../styles/pages/accounts.css"; // this page's own styles

// which account is open (null: the list); a name that no longer exists goes back to the list
const sel = computed(() => (accSel.value && data.state.value && accByName(data.state.value, accSel.value).length ? accSel.value : null));
// The open account lives in the address (/accounts?n=Name), so the browser's Back and Forward and a refresh work by themselves:
// opening an account is a step to its address, Back is the step before it. accSel follows the address.
const inAddress = computed(() => {
  const p = new URLSearchParams(query.value), id = p.get("id"), n = p.get("n");
  if (!id && !n) return null;
  return (data.state.value?.accounts || []).find((x) => (id ? String(x.id) == id : x.n == n))?.n || null;
});
watch(inAddress, (n) => { accSel.value = n; }, { immediate: true });
// an account opened from elsewhere in the app (the add window sets accSel) gets its address too
watch(accSel, (n) => { if (n !== inAddress.value) go("/accounts" + (n ? "?n=" + encodeURIComponent(n) : "")); });
const openAcc = (n) => { accSel.value = n; scrollTo(0, 0); };
// The "All accounts" button always shows the list (a step forward, like a link); the browser's Back is separate
const back = () => { accSel.value = null; scrollTo(0, 0); };
onMounted(() => {
  data.start();
  const p = new URLSearchParams(location.search);
  if (p.get("add")) openForm("account");
});

const { t, tk, S, fx, an, curSub, typeOf, stLabel, whenT, title, shown, q, groups, sections, cardFor, D, all, vis, openRow, goConn, addTx, delAsk, del } = useAccounts(sel, { openAcc });
watch(accSel, () => { shown.value = 50; q.value = ""; });

// the chart takes the page's width (#acc's width)
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
              <div class="lbl"><span>{{ an(c.lbl.name) }}<template v-if="c.lbl.tail">{{ " " }}<span class="sm" dir="ltr" style="font-weight:500;opacity:.8;unicode-bidi:isolate">·· {{ c.lbl.tail }}</span></template></span><span class="chip" style="margin-inline-start:auto;padding:1px 9px">{{ typeOf(c.a) }}</span></div>
              <template v-if="c.card"><div class="val"><small>₪</small>{{ f0(c.mo ? c.mo.now : 0) }}</div><div class="sm">{{ t("acc.chargedMonth") }}<template v-if="c.mo && c.mo.last"> · {{ t("acc.lastMonthAmt", { amount: "₪" + f0(c.mo.last) }) }}</template></div></template>
              <template v-else><div class="val"><template v-if="c.g.L.some((x) => hasRate(x, fx))"><small>₪</small>{{ c.tot < 0 ? "−" : "" }}{{ f0(c.tot) }}</template><template v-else>—</template></div><div class="sm">{{ c.g.L.some((x) => x.cur != "ILS") ? curSub(c.g.L) : an(c.a.s || "") }}</div></template>
              <div class="flex" style="gap:8px;margin-top:12px;justify-content:space-between;align-items:center"><span class="bd" :class="TONEC[c.st.tone]">{{ stLabel(c.st) }}</span><span class="sm">{{ c.foot }}</span></div>
            </div>
          </div>
        </template>
      </template>
      <div v-else class="card" style="margin-top:16px"><b>{{ t("acc.noneT") }}</b><div class="sm" style="margin:6px 0 12px">{{ t("acc.noneX") }}</div><div class="flex" style="gap:8px"><button type="button" class="btn s" @click="goConn">{{ t("acc.connect") }}</button><button type="button" class="btn o s" @click="openForm('account')">{{ t("acc.addPlain") }}</button></div></div>
    </template>

    <template v-else-if="D">
      <div class="accd"><button type="button" class="btn o s" @click="back"><svg class="bkar" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>{{ t("acc.back") }}</button><div class="flex" style="gap:8px;flex-wrap:wrap">
        <template v-if="D.a.custom"><button type="button" class="btn o s" @click="openForm('balance', { id: D.a.id })">{{ t("acc.updBal") }}</button><button type="button" class="btn o s" @click="openForm('account', { id: D.a.id })">{{ t("acc.edit") }}</button><button type="button" class="btn r s" @click="delAsk = D.a.id">{{ t("acc.remove") }}</button></template>
        <button v-else-if="D.a.kind == 'pension'" type="button" class="btn o s" @click="openForm('pension')">{{ t("acc.updBal") }}</button>
        <button v-else-if="D.conn && D.conn.configured" type="button" class="btn o s" @click="goConn">{{ t("acc.goConn") }}</button>
        <button type="button" class="btn s" @click="addTx">{{ t("acc.addTx") }}</button>
      </div></div>
      <div class="card accH"><div class="flex" style="justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap"><div><div class="lbl" style="margin:0">{{ D.lbl }}</div></div><span class="bd" :class="TONEC[D.st.tone]">{{ stLabel(D.st) }}</span></div>
        <div class="stg" :style="{ '--sc': tileCols(D.tiles.length) }"><div v-for="x in D.tiles" :key="x[0]" class="stl"><span>{{ tk("acc." + x[0]) }}</span><b class="num" :class="x[3] || ''" dir="ltr">{{ x[1] }}</b><i v-if="x[2]">{{ x[2] }}</i></div></div></div>
      <template v-if="D.chart">
        <h2>{{ tk("acc." + D.chart.t) }}<span class="sm achsub">{{ tk("acc." + D.chart.sub, { n: D.chart.n }) }}</span></h2>
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
