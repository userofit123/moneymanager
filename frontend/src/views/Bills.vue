<script setup>
// Bills: the same business or person charging you again and again:
// the three numbers on top, regular, irregular,
// instalment and one-off bills, canceled bills, the ⋯ menu, "Add a bill", "Change bill type" and the payment history.
// What it knows and does lives in pagelogic/bills.js (shared with the phone's Bills and Bill screens); here: the screen.
import { onMounted } from "vue";
import { data } from "../stores/data.js";
import { openTx } from "../core/txwin.js";
import { tx } from "../core/heText.js"; // names from the data are shown in Hebrew through tx() (core/heSaved.js)
import { dstr } from "../dates.js";
import PageHeader from "../components/PageHeader.vue";
import BaseSheet from "../components/BaseSheet.vue";
import PopMenu from "../components/PopMenu.vue";
import { displayName } from "../lib/activity.js";
import { vRich } from "../lib/richtip.js";
import { f0, fm } from "../lib/bills.js";
import { useBills } from "../pagelogic/bills.js";
import "../styles/pages/bills.css"; // this page's own styles

const {
  t, tk, S, monYr, cc, avStyle, srcOf, M, cad, freq, kpis, ICON, groups, dueText, priceChange, lastLine, evTip,
  menu, toggleMenu, MI, menuItems, pick, openBill, openAdd, typeFor, saveType, makeRegular, keepIrregular, restore, remove,
} = useBills();
onMounted(() => { data.start(); });
</script>

<template>
  <PageHeader :title="t('nav.bills')" />
  <section class="view on" id="bills">
    <template v-if="!S">
      <p v-if="data.error.value" class="sm">{{ t("bills.loadError") }}</p>
      <p v-else class="sm">{{ t("bills.loading") }}</p>
    </template>

    <template v-else>
      <div class="grid g3" id="billK">
        <div v-for="(c, i) in kpis" :key="i" class="card" :class="c.c"><div class="lbl">{{ c.l }}</div><div class="val"><small>₪</small>{{ c.neg ? "−" : "" }}{{ f0(c.v) }}</div><div class="sm">{{ c.s }}</div></div>
      </div>
      <div class="billbar"><button class="btn o s" data-a="billNew" @click="openAdd">{{ t("bills.addBill") }}</button></div>

      <div id="billL">
        <section v-for="g in groups" :key="g.k" class="bgrp" :class="g.k">
          <header class="bgh"><span class="bgi"><svg viewBox="0 0 24 24" v-html="ICON[g.k]" /></span><div class="bgt"><b>{{ tk("bills.g." + g.k + ".title") }}</b><span class="cnt">{{ g.L.length }}</span><div class="sm">{{ tk("bills.g." + g.k + ".desc") }}</div></div><div class="bgs"><b class="num">{{ fm(g.total) }}</b><span>{{ tk("bills.g." + g.k + ".unit") }}</span></div></header>
          <div class="bgr">
            <!-- regular -->
            <template v-if="g.k == 'rec'">
              <div v-for="b in g.L" :key="b.idx" class="brow" data-a="billOpen" :data-i="b.idx" @click="openBill(b)">
                <span class="av" :style="avStyle(b)">{{ (b.n || "?")[0] }}</span>
                <div class="bm"><div class="bt"><b>{{ tx(b.n) }}</b><template v-if="b.flag">{{ " " }}<span class="bd am2">{{ t("bills.markedCancel") }}</span></template></div>
                  <div class="bsub">{{ cad(b.every) }} <span class="dsep">·</span> {{ tx(srcOf(b.src).name) }} <span v-if="srcOf(b.src).tail" class="sm" dir="ltr" style="font-weight:500;opacity:.8;unicode-bidi:isolate">·· {{ srcOf(b.src).tail }}</span> <span v-rich="evTip(b)" class="bq">{{ b.manual ? t("bills.byYou") : t("bills.auto") }}</span></div>
                  <div class="bsub bs2">{{ lastLine(b) }}<template v-if="b.vari">{{ " " }}<span class="dsep">·</span>{{ " " + t("bills.varies", { lo: fm(b.lo), hi: fm(b.hi) }) }}</template></div>
                  <span v-if="priceChange(b)" class="bd" :class="priceChange(b) > 0 ? 'up' : 'dn'" style="margin-top:6px">{{ priceChange(b) > 0 ? t("bills.more", { amount: fm(priceChange(b)) }) : t("bills.less", { amount: fm(-priceChange(b)) }) }}</span></div>
                <div class="ba"><b class="num">{{ b.vari ? "≈ " : "" }}{{ fm(b.pred) }}</b>
                  <div class="sm"><span v-if="b.status == 'overdue'" class="neg">{{ t("bills.overdue", { date: dstr(b.pd) }) }}</span><span v-else-if="b.status == 'pending'" class="am">{{ t("bills.dueNow") }}</span><b v-else-if="b.days <= 7">{{ dueText(b) }}</b><template v-else>{{ dueText(b) }}</template></div>
                  <div class="sm bfaint">{{ b.vari ? t("bills.avg3") : t("bills.sameLast") }}</div></div>
                <button class="ib jmore bmore" data-a="billMenu" :data-i="b.idx" :aria-label="t('bills.options')" aria-haspopup="menu" @click.stop="toggleMenu(b, $event)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg></button>
              </div>
            </template>
            <!-- irregular -->
            <template v-else-if="g.k == 'irr'">
              <div v-for="b in g.L" :key="b.idx" class="brow" data-a="billOpen" :data-i="b.idx" @click="openBill(b)">
                <span class="av" :style="avStyle(b)">{{ (b.n || "?")[0] }}</span>
                <div class="bm"><div class="bt"><b>{{ tx(b.n) }}</b><template v-if="b.flag">{{ " " }}<span class="bd am2">{{ t("bills.markedCancel") }}</span></template></div>
                  <div class="bsub">{{ t("bills.irregular") }} <span class="dsep">·</span> {{ tx(srcOf(b.src || "").name) }} <span v-if="srcOf(b.src || '').tail" class="sm" dir="ltr" style="font-weight:500;opacity:.8;unicode-bidi:isolate">·· {{ srcOf(b.src || "").tail }}</span> <span v-rich="evTip(b)" class="bq">{{ t("bills.whyQ") }}</span></div>
                  <div class="bsub bs2"><template v-if="b.n_tx">{{ t("bills.irrSo", { n: b.n_tx, c: b.cnt12 }, b.n_tx) }} <span class="dsep">·</span> {{ t("bills.lastPay", { amount: fm(b.amt), date: dstr(b.lp) }) }}</template><template v-else>{{ t("bills.noPay") }}</template><template v-if="b.hi > b.lo">{{ " " }}<span class="dsep">·</span>{{ " " + t("bills.ranges", { lo: fm(b.lo), hi: fm(b.hi) }) }}</template></div></div>
                <div class="ba"><b class="num">≈ {{ fm(b.pred) }}</b><div class="sm">{{ t("bills.typical") }}</div><div v-if="b.n_tx" class="sm" style="font-weight:600">{{ t("bills.lastPayment", { amount: fm(b.amt) }) }}</div><div class="sm bfaint">{{ t("bills.perMonthAvg", { amount: fm(b.mo) }) }}</div></div>
                <button class="ib jmore bmore" data-a="billMenu" :data-i="b.idx" :aria-label="t('bills.options')" aria-haspopup="menu" @click.stop="toggleMenu(b, $event)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg></button>
                <div v-if="b.sug" class="bsug"><span>{{ t("bills.sug", { freq: freq(b.sug) }) }}</span><button class="btn s" data-a="billSugYes" :data-i="b.idx" @click.stop="makeRegular(b)">{{ t("bills.makeReg") }}</button><button class="btn o s" data-a="billSugNo" :data-i="b.idx" @click.stop="keepIrregular(b)">{{ t("bills.keepIrr") }}</button></div>
              </div>
            </template>
            <!-- instalments -->
            <template v-else-if="g.k == 'ins'">
              <div v-for="x in g.L" :key="x.last.id" class="row" data-a="openTx" :data-id="x.last.id" style="cursor:pointer" @click="openTx(x.last.id)">
                <span class="av" :style="{ background: `color-mix(in srgb,${cc(x.last.c || 'Uncategorized')} 22%,transparent)`, color: cc(x.last.c || 'Uncategorized') }">{{ (displayName(S, x.last) || "?")[0] }}</span>
                <div class="grow"><b>{{ x.name }}</b><div class="sm">{{ t("bills.instA", { paid: x.paid, total: x.total }) }} · <b style="color:var(--tx)">{{ t("bills.instLeft", { n: x.left }) }}</b> · {{ t("bills.instLast", { when: monYr(x.last.d, x.left) }) }}</div><div class="bar" style="margin:8px 0 0;height:6px;max-width:260px"><i :style="{ width: (x.paid / x.total) * 100 + '%' }" /></div></div>
                <div style="text-align:end"><b class="num">{{ fm(x.amt) }}</b><div class="sm">{{ t("bills.instUnit") }}</div><div class="sm num">{{ t("bills.instRemain", { amount: fm(x.remain) }) }}</div></div>
              </div>
            </template>
            <!-- one-off -->
            <template v-else>
              <div v-for="b in g.L" :key="b.idx" class="brow" data-a="billOpen" :data-i="b.idx" @click="openBill(b)">
                <span class="av" :style="avStyle(b)">{{ (b.n || "?")[0] }}</span>
                <div class="bm"><div class="bt"><b>{{ tx(b.n) }}</b></div><div class="bsub">{{ t("bills.oneOff") }} <span class="dsep">·</span> {{ tx(srcOf(b.src || "").name) }} <span v-if="srcOf(b.src || '').tail" class="sm" dir="ltr" style="font-weight:500;opacity:.8;unicode-bidi:isolate">·· {{ srcOf(b.src || "").tail }}</span> <span class="dsep">·</span> {{ b.lp ? t("bills.paidOn", { date: dstr(b.lp) }) : t("bills.noPayFound") }}</div></div>
                <div class="ba"><b class="num">{{ fm(b.amt) }}</b></div>
                <button class="ib jmore bmore" data-a="billMenu" :data-i="b.idx" :aria-label="t('bills.options')" aria-haspopup="menu" @click.stop="toggleMenu(b, $event)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg></button>
              </div>
            </template>
          </div>
        </section>
        <div v-if="!groups.length" class="sm" style="padding:22px;text-align:center">{{ t("bills.emptyA") }}<i>{{ t("bills.emptyB") }}</i>{{ t("bills.emptyC") }}</div>
      </div>

      <div id="billCw">
        <template v-if="M.canceled.length">
          <h2>{{ t("bills.canceledTitle", { n: M.canceled.length }) }}</h2>
          <div class="card" style="padding:6px 18px">
            <div v-for="b in M.canceled" :key="b.idx" class="row" style="flex-wrap:wrap;opacity:.8">
              <div class="grow"><b>{{ b.n }}</b> <span class="bd fl">{{ t("bills.canceled") }}</span><div class="sm"><template v-if="b.canceledAt"><span>{{ t("bills.canceledOn", { date: dstr(b.canceledAt) }) }}</span> · </template><span>{{ b.n_tx ? t("bills.lastCharge", { amount: fm(b.amt), date: dstr(b.lp) }) : t("bills.noCharges") }}</span><br><span>{{ t("bills.notCounted") }}</span></div></div>
              <div class="flex" style="gap:6px"><button class="btn o s" data-a="billRestore" :data-i="b.idx" @click="restore(b)">{{ t("bills.restore") }}</button><button class="btn r s" data-a="billDel" :data-i="b.idx" :aria-label="t('bills.remove')" @click="remove(b)">✕</button></div>
            </div>
          </div>
        </template>
      </div>
    </template>
  </section>

  <template v-if="S">
    <PopMenu :at="menu?.btn" @close="menu = null">
      <button v-for="[a, ic, label, z] in menuItems" :key="a" role="menuitem" :class="z ? 'dz' : undefined" :data-a="a" :data-i="menu.i" @click="pick(a)"><svg viewBox="0 0 24 24" v-html="MI[ic]" />{{ tk("bills." + label) }}</button>
    </PopMenu>


    <BaseSheet :open="!!typeFor" @close="typeFor = null">
      <h3>{{ t("bills.type.title") }}</h3>
      <div class="sm" style="margin-bottom:12px">{{ typeFor.name }}</div>
      <div class="inf"><div class="it"><b>{{ t("bills.type.recT") }}</b>{{ t("bills.type.rec") }}</div></div>
      <div class="inf"><div class="it"><b>{{ t("bills.type.irrT") }}</b>{{ t("bills.type.irr") }}</div></div>
      <div class="fld"><label>{{ t("bills.type.label") }}</label><select v-model="typeFor.v"><option value="1">{{ t("bills.type.o1") }}</option><option value="2">{{ t("bills.type.o2") }}</option><option value="12">{{ t("bills.type.o12") }}</option><option value="irregular">{{ t("bills.type.oirr") }}</option></select></div>
      <div class="flex" style="justify-content:flex-end;gap:10px"><button class="btn o" data-a="close" @click="typeFor = null">{{ t("bills.cancel") }}</button><button class="btn" data-a="billTypeSave" @click="saveType">{{ t("bills.save") }}</button></div>
    </BaseSheet>

  </template>
</template>
