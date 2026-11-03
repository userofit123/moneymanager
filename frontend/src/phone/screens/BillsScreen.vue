<script setup>
// Bills (tab): the computer's Bills page for a phone. The three numbers on top (Monthly total highlighted), "+ Add bill",
// then one card per kind of bill (regular, irregular, instalments, one-off) with the kind's icon, colour, count and total,
// and the canceled bills with Restore and Remove. Every number comes from pagelogic/bills.js, the same as the computer.
// A bill opens its own screen (/bills?bill=<billKey>), which holds the computer's ⋯ menu and payment history;
// an instalment opens its last payment. "Found automatically" / "Why is this a bill?" explain on a tap.
import { computed, onMounted } from "vue";
import { data } from "../../stores/data.js";
import { tx } from "../../core/heText.js";
import { explain } from "../../core/tooltip.js";
import { dstr, titleCase } from "../../dates.js";
import { pages } from "../../routes.js";
import { billKey, f0, fm } from "../../lib/bills.js";
import { useBills } from "../../pagelogic/bills.js";
import { usePhoneNav } from "../navigation.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import AmountCard from "../components/AmountCard.vue";
import ListGroup from "../components/ListGroup.vue";
import EmptyState from "../components/EmptyState.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import PIcon from "../components/PIcon.vue";
import LoadError from "../components/LoadError.vue";
defineProps({ id: { type: String, default: null } });

const { t, tk, S, M, kpis, ICON, groups, cad, freq, avStyle, cc, srcOf, monYr, dueText, priceChange, lastLine, evTip, openAdd, makeRegular, keepIrregular, restore, remove } = useBills();
const nav = usePhoneNav();
onMounted(() => data.start());
const P = (k, o, n) => t("phone.bills." + k, o || {}, n);
const BILL_ICON = pages.find((p) => p.name === "bills").icon;
const empty = computed(() => !groups.value.length && !M.value.canceled.length);

const open = (b) => nav.push("bill", billKey(b));
const src = (b) => srcOf(b.src || "");
// when it is charged next, as on the computer: overdue in red, due now in amber, within a week in bold
const due = (b) => (b.status == "overdue" ? { text: t("bills.overdue", { date: dstr(b.pd) }), cls: "late" } : b.status == "pending" ? { text: t("bills.dueNow"), cls: "now" } : { text: dueText(b), cls: b.days <= 7 ? "soon" : "" });
const insAv = (x) => { const c = cc(x.last.c || "Uncategorized"); return { background: `color-mix(in srgb,${c} 22%,transparent)`, color: c }; };
</script>

<template>
  <PhoneScreen class="ph-bills">
    <LoadError v-if="data.error.value && !S" :text="t('bills.loadError')" />
    <SkeletonRows v-else-if="!S || !M" :rows="5" />

    <EmptyState v-else-if="empty" :icon="BILL_ICON" :title="P('emptyTitle')" :text="t('bills.emptyA') + '“' + t('bills.emptyB') + '”' + t('bills.emptyC')" :action="P('add')" @action="openAdd" />

    <template v-else>
      <!-- the three numbers on top, as on the computer -->
      <div class="ph-bills-kpis">
        <AmountCard v-for="(c, i) in kpis" :key="i" :class="'k' + i" :hero="c.c === 'hero'" :label="titleCase(c.l)" :value="(c.neg ? '−' : '') + f0(c.v)" :sub="c.s" />
      </div>
      <div class="ph-bills-addw"><button type="button" class="ph-btn plain ph-bills-add" @click="openAdd">{{ t("bills.addBill") }}</button></div>

      <!-- one card per kind of bill -->
      <section v-for="g in groups" :key="g.k" class="ph-bgrp" :class="g.k">
        <header class="ph-bgh">
          <span class="ph-bgi"><svg viewBox="0 0 24 24" aria-hidden="true" v-html="ICON[g.k]" /></span>
          <span class="ph-bgt"><b>{{ tk("bills.g." + g.k + ".title") }}</b><span class="ph-bcnt">{{ g.L.length }}</span></span>
          <span class="ph-bgs"><b class="ph-amt" dir="ltr">{{ fm(g.total) }}</b><small>{{ tk("bills.g." + g.k + ".unit") }}</small></span>
          <p class="ph-bgd">{{ tk("bills.g." + g.k + ".desc") }}</p>
        </header>

        <!-- regular -->
        <template v-if="g.k == 'rec'">
          <div v-for="b in g.L" :key="b.idx" class="ph-brow" role="button" tabindex="0" @click="open(b)" @keydown.enter="open(b)">
            <span class="ph-bills-av" :style="avStyle(b)" aria-hidden="true">{{ (b.n || "?")[0] }}</span>
            <div class="ph-brow-m">
              <div class="ph-brow-l"><span class="ph-brow-t">{{ tx(b.n) }}<span v-if="b.flag" class="ph-bpill warn">{{ t("bills.markedCancel") }}</span></span><span class="ph-brow-a"><b class="ph-amt" dir="ltr">{{ b.vari ? "≈ " : "" }}{{ fm(b.pred) }}</b></span></div>
              <div class="ph-brow-s ph-bdue" :class="due(b).cls">{{ due(b).text }}</div>
              <div class="ph-brow-s">{{ cad(b.every) }} · {{ tx(src(b).name) }}<bdi v-if="src(b).tail" class="ph-btail" dir="ltr"> ·· {{ src(b).tail }}</bdi></div>
              <div class="ph-brow-s">{{ lastLine(b) }}<template v-if="b.vari"> · {{ t("bills.varies", { lo: fm(b.lo), hi: fm(b.hi) }) }}</template></div>
              <div class="ph-brow-chips">
                <button type="button" class="ph-bq" @click.stop="explain(evTip(b))">{{ b.manual ? t("bills.byYou") : t("bills.auto") }}<PIcon name="info" /></button>
                <span v-if="priceChange(b)" class="ph-bbd" :class="priceChange(b) > 0 ? 'up' : 'dn'"><PIcon name="chevron" :class="priceChange(b) > 0 ? 'u' : 'd'" />{{ priceChange(b) > 0 ? P("priceUp", { amount: fm(priceChange(b)) }) : P("priceDown", { amount: fm(-priceChange(b)) }) }}</span>
              </div>
            </div>
          </div>
        </template>

        <!-- irregular -->
        <template v-else-if="g.k == 'irr'">
          <div v-for="b in g.L" :key="b.idx" class="ph-brow" role="button" tabindex="0" @click="open(b)" @keydown.enter="open(b)">
            <span class="ph-bills-av" :style="avStyle(b)" aria-hidden="true">{{ (b.n || "?")[0] }}</span>
            <div class="ph-brow-m">
              <div class="ph-brow-l"><span class="ph-brow-t">{{ tx(b.n) }}<span v-if="b.flag" class="ph-bpill warn">{{ t("bills.markedCancel") }}</span></span><span class="ph-brow-a"><b class="ph-amt" dir="ltr">≈ {{ fm(b.pred) }}</b></span></div>
              <div class="ph-brow-s ph-bstrong">{{ t("bills.perMonthAvg", { amount: fm(b.mo) }) }}</div>
              <div class="ph-brow-s">{{ t("bills.irregular") }}<template v-if="src(b).name"> · {{ tx(src(b).name) }}</template><bdi v-if="src(b).tail" class="ph-btail" dir="ltr"> ·· {{ src(b).tail }}</bdi></div>
              <div class="ph-brow-s"><template v-if="b.n_tx">{{ t("bills.irrSo", { n: b.n_tx, c: b.cnt12 }, b.n_tx) }} · {{ t("bills.lastPay", { amount: fm(b.amt), date: dstr(b.lp) }) }}</template><template v-else>{{ t("bills.noPay") }}</template><template v-if="b.hi > b.lo"> · {{ t("bills.ranges", { lo: fm(b.lo), hi: fm(b.hi) }) }}</template></div>
              <div class="ph-brow-chips"><button type="button" class="ph-bq" @click.stop="explain(evTip(b))">{{ t("bills.whyQ") }}<PIcon name="info" /></button></div>
              <div v-if="b.sug" class="ph-bsug" @click.stop>
                <p>{{ t("bills.sug", { freq: freq(b.sug) }) }}</p>
                <div class="ph-bsug-b"><button type="button" class="ph-btn tonal" @click="makeRegular(b)">{{ t("bills.makeReg") }}</button><button type="button" class="ph-btn plain" @click="keepIrregular(b)">{{ t("bills.keepIrr") }}</button></div>
              </div>
            </div>
          </div>
        </template>

        <!-- instalments: a tap opens the last payment -->
        <template v-else-if="g.k == 'ins'">
          <div v-for="x in g.L" :key="x.last.id" class="ph-brow" role="button" tabindex="0" @click="nav.push('transaction', String(x.last.id))" @keydown.enter="nav.push('transaction', String(x.last.id))">
            <span class="ph-bills-av" :style="insAv(x)" aria-hidden="true">{{ (x.name || "?")[0] }}</span>
            <div class="ph-brow-m">
              <div class="ph-brow-l"><span class="ph-brow-t">{{ x.name }}</span><span class="ph-brow-a"><b class="ph-amt" dir="ltr">{{ fm(x.amt) }}</b></span></div>
              <div class="ph-brow-l ph-brow-s"><span>{{ t("bills.instA", { paid: x.paid, total: x.total }) }} · <b class="ph-bstrong">{{ t("bills.instLeft", { n: x.left }) }}</b></span><span>{{ t("bills.instUnit") }}</span></div>
              <div class="bar ph-bins-bar"><i :style="{ width: (x.paid / x.total) * 100 + '%' }" /></div>
              <div class="ph-brow-l ph-brow-s"><span>{{ t("bills.instLast", { when: monYr(x.last.d, x.left) }) }}</span><span class="ph-amt">{{ t("bills.instRemain", { amount: fm(x.remain) }) }}</span></div>
            </div>
          </div>
        </template>

        <!-- one-off -->
        <template v-else>
          <div v-for="b in g.L" :key="b.idx" class="ph-brow" role="button" tabindex="0" @click="open(b)" @keydown.enter="open(b)">
            <span class="ph-bills-av" :style="avStyle(b)" aria-hidden="true">{{ (b.n || "?")[0] }}</span>
            <div class="ph-brow-m">
              <div class="ph-brow-l"><span class="ph-brow-t">{{ tx(b.n) }}</span><span class="ph-brow-a"><b class="ph-amt" dir="ltr">{{ fm(b.amt) }}</b></span></div>
              <div class="ph-brow-s">{{ t("bills.oneOff") }}<template v-if="src(b).name"> · {{ tx(src(b).name) }}</template><bdi v-if="src(b).tail" class="ph-btail" dir="ltr"> ·· {{ src(b).tail }}</bdi> · {{ b.lp ? t("bills.paidOn", { date: dstr(b.lp) }) : t("bills.noPayFound") }}</div>
            </div>
          </div>
        </template>
      </section>
      <p v-if="!groups.length" class="ph-meta ph-bills-none">{{ t("bills.emptyA") }}<i>{{ t("bills.emptyB") }}</i>{{ t("bills.emptyC") }}</p>

      <!-- canceled bills: not counted anywhere; Restore brings one back -->
      <ListGroup v-if="M.canceled.length" :title="t('bills.canceledTitle', { n: M.canceled.length })">
        <div v-for="b in M.canceled" :key="b.idx" class="ph-bcan">
          <div class="ph-brow-m">
            <div class="ph-brow-t">{{ tx(b.n) }}<span class="ph-bpill off">{{ t("bills.canceled") }}</span></div>
            <div class="ph-brow-s"><template v-if="b.canceledAt">{{ t("bills.canceledOn", { date: dstr(b.canceledAt) }) }} · </template>{{ b.n_tx ? t("bills.lastCharge", { amount: fm(b.amt), date: dstr(b.lp) }) : t("bills.noCharges") }}</div>
            <div class="ph-brow-s">{{ t("bills.notCounted") }}</div>
          </div>
          <div class="ph-bcan-b">
            <button type="button" class="ph-btn plain" @click="restore(b)">{{ t("bills.restore") }}</button>
            <button type="button" class="ph-ib ph-bcan-x" :aria-label="t('bills.remove')" @click="remove(b)"><PIcon name="close" /></button>
          </div>
        </div>
      </ListGroup>
    </template>
  </PhoneScreen>
</template>
