<script setup>
// Budgets: a monthly limit for a category:
// the summary on top (what is left, what is spent, all budgets), suggested budgets, each budget with its pace, trend, bills and jar,
// spending with no budget, and "Add a budget". The numbers come from lib/budgets.js, worked out once for the app (core/derived.js).
// What the page knows and does lives in pagelogic/budgets.js (shared with the phone screen); the ⋯ menu is the shared PopMenu,
// changing an amount a BaseSheet, removing asks first (core/ask.js). Changes go through the data store.
import { ref, computed, onMounted } from "vue";
import { data } from "../stores/data.js";
import { catLabel } from "../core/cats.js";
import BaseCard from "../components/BaseCard.vue";
import CardColumns from "../components/CardColumns.vue";
import BaseSheet from "../components/BaseSheet.vue";
import PageHeader from "../components/PageHeader.vue";
import PopMenu from "../components/PopMenu.vue";
import MoneyInput from "../components/MoneyInput.vue"; // the amount boxes show "1,200" with thousands separators
import { vRich } from "../lib/richtip.js";
import { f0, fm } from "../lib/bills.js";
import { tx } from "../core/heText.js";
import { useBudgets } from "../pagelogic/budgets.js"; // what the page knows and does (shared with the phone screen)
import "../styles/pages/budgets.css"; // this page's own styles

const { t, tk, S, M, cc, mlab, kpis, stClass, stTip, fillColor, billSt, rvOf, trendTag, trendTip, typed, propOf, accept, acceptEvery, dismiss, later, resetNo, apply, setAmount, askRemove, openAdd, goCat, billOpen } = useBudgets();
onMounted(() => { data.start(); });

const today = computed(() => (M.value.DAYN / M.value.DIM) * 100); // the today mark on every bar
const totPc = computed(() => (M.value.totL ? (M.value.totS / M.value.totL) * 100 : 0));
const totFill = computed(() => (M.value.totS > M.value.totL ? "var(--neg)" : ""));
// the small month bars: the biggest month is full height; a month over the budget is red
const scale = (b) => Math.max(...b.trend.vals) || 1;
const TI = { up: "M12 19V5M6 11l6-6 6 6", down: "M12 5v14M6 13l6 6 6-6", steady: "M5 12h14" };

// the bills inside a budget fold open with the chevron
const billsOpen = ref({});
// the ⋯ menu of a budget, and the window that changes its amount
const menu = ref(null);
const toggleMenu = (k, ev) => { menu.value = menu.value?.k == k ? null : { k, btn: ev.currentTarget }; };
const editing = ref(null), amount = ref("");
const openChange = (k) => { menu.value = null; amount.value = M.value.budgets[k]; editing.value = k; };
const removeAsk = (k) => { menu.value = null; askRemove(k, catLabel(k)); };
const showSpending = (k) => { menu.value = null; goCat(k); };
const saveChange = () => { if (setAmount(editing.value, amount.value)) editing.value = null; };
</script>

<template>
  <PageHeader :title="t('nav.budgets')" />
  <section class="view on" id="budg">
    <template v-if="!S">
      <p v-if="data.error.value" class="sm">{{ t("budgets.loadError") }}</p>
      <p v-else class="sm">{{ t("budgets.loading") }}</p>
    </template>

    <template v-else>
      <div id="budK" class="jhero bhero">
        <div class="jh1">
          <div class="lbl">{{ kpis[2].l }}</div>
          <div class="val" :class="{ neg: kpis[2].v < 0 }"><small>₪</small>{{ kpis[2].v < 0 ? "−" : "" }}{{ f0(Math.abs(kpis[2].v)) }}</div>
          <div class="sm">{{ kpis[2].v < 0 ? t("budgets.overLine") : kpis[2].s }}</div>
        </div>
        <div class="jh2">
          <div class="lbl">{{ kpis[1].l }}</div>
          <div class="val"><small>₪</small>{{ f0(M.totS) }}<span class="of">{{ " " + t("budgets.of", { amount: fm(M.totL) }) }}</span></div>
          <div class="jbar bar"><i :style="{ width: Math.min(100, totPc) + '%', background: totFill }" /><u v-rich="t('budgets.markTip', { day: M.DAYN, days: M.DIM })" :style="{ insetInlineStart: today + '%' }" /></div>
          <div class="sm">{{ kpis[1].s }}</div>
          <div class="jstats">
            <div><span>{{ kpis[0].l }}</span><b class="num">{{ fm(kpis[0].v) }}</b></div>
            <div v-rich="t('budgets.k.countTip')"><span>{{ t("budgets.k.count") }}</span><b class="num">{{ M.info.length }}</b></div>          </div>
        </div>
      </div>

      <div id="budS">
        <template v-if="M.fresh.length">
          <h2>{{ t("budgets.sugTitle") }}<span class="flex" style="gap:8px"><button type="button" class="btn o s" data-a="budAcceptAll" @click="acceptEvery">{{ t("budgets.acceptAll") }}</button></span></h2>
          <div class="card bsugs">
            <div class="sm bsugs-n">{{ t("budgets.sugText", { months: mlab }) }}</div>
            <div v-for="x in M.fresh.slice(0, 8)" :key="x.k" class="bsr">
              <span class="dot" :style="{ background: cc(x.k) }"></span>
              <div class="grow"><b class="catl" data-a="goCat" :data-cat="x.k" @click="goCat(x.k)">{{ catLabel(x.k) }}</b><div class="sm">{{ t("budgets.typically", { amount: fm(x.avg), list: x.vals.map((v) => fm(v)).join(" · ") }) }}</div></div>
              <div class="bsr-a"><MoneyInput :model-value="propOf(x)" :data-bp="x.k" class="bamt" :aria-label="t('budgets.budgetFor', { name: catLabel(x.k) })" @update:model-value="(v) => (typed[x.k] = v)" /><button type="button" class="btn s" data-a="budAccept" :data-k="x.k" @click="accept(x)">{{ t("budgets.accept") }}</button><button v-rich="t('budgets.notThisTip')" type="button" class="btn o s" data-a="budNo" :data-k="x.k" @click="dismiss(x.k)">{{ t("budgets.notThis") }}</button></div>
            </div>
            <div v-if="M.fresh.length > 8" class="sm bsugs-more">{{ t("budgets.more", { n: M.fresh.length - 8 }) }}</div>
          </div>
        </template>
        <template v-else>
          <template v-if="!Object.keys(M.budgets).length && M.budMonths.length < 2"><h2>{{ t("budgets.sugTitle") }}</h2><div class="card sm">{{ t("budgets.needTwo") }}</div></template>
          <div v-if="M.budgetNo.length" class="sm bagain"><button type="button" class="lnk" data-a="budReset" @click="resetNo">{{ t("budgets.showAgain") }}</button></div>
        </template>
      </div>

      <h2>{{ t("budgets.byCat") }}<button type="button" class="btn o s" data-a="budNew" @click="openAdd('')">{{ t("budgets.addBudget") }}</button></h2>
      <CardColumns id="budL" :items="M.info" item-key="k">
        <template #default="{ item: b }">
        <BaseCard class="bcard" :warn="b.st == 'over'">
          <div class="bhead">
            <div class="bname"><span class="dot" :style="{ background: cc(b.k) }"></span><span class="catl" data-a="goCat" :data-cat="b.k" @click="goCat(b.k)">{{ catLabel(b.k) }}</span></div>
            <div class="btools" data-menuanchor>
              <span v-rich="stTip(b)" class="bd" :class="stClass(b)">{{ b.st == "over" ? t("budgets.st.overBy", { amount: fm(-b.left) }) : tk("budgets.st." + b.st) }}</span>
              <button type="button" class="ib jmore" data-a="budMenu" :data-k="b.k" :aria-label="t('budgets.options')" aria-haspopup="menu" @click="toggleMenu(b.k, $event)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg></button>
            </div>
          </div>
          <div class="bmid">
            <div class="val bval"><small>₪</small>{{ f0(b.s) }}<span class="of">{{ " " + t("budgets.of", { amount: fm(b.lim) }) }}</span></div>
            <div v-if="b.trend" v-rich="trendTip(b)" class="btrend" :class="'tr-' + b.trend.change">
              <span class="btag"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="TI[b.trend.change]" /></svg><span>{{ trendTag(b) }}</span></span>
              <span class="bmini" aria-hidden="true"><i v-for="(v, i) in b.trend.vals" :key="i" :class="{ over: v > b.lim }" :style="{ blockSize: Math.max(4, (v / scale(b)) * 100) + '%' }" /></span>
            </div>
          </div>
          <div class="bar"><i :style="{ width: Math.min(100, b.pc) + '%', background: fillColor(b) }"></i><u v-rich="t('budgets.markTip', { day: M.DAYN, days: M.DIM })" :style="{ insetInlineStart: today + '%' }"></u></div>
          <div class="sm bline">{{ b.left >= 0 ? t("budgets.leftLine", { rest: fm(b.left), perDay: fm(b.perDay) }) : t("budgets.overLine") }} · {{ t("budgets.paceLine", { amount: fm(b.pace) }) }}</div>
          <div v-if="rvOf[b.k]" class="sugg"><div class="sm" v-html="rvOf[b.k].kind == 'lower' ? t('budgets.low', { avg: fm(rvOf[b.k].avg), prop: fm(rvOf[b.k].prop) }) : t('budgets.raise', { over: rvOf[b.k].over, n: M.budMonths.length, avg: fm(rvOf[b.k].avg), prop: fm(rvOf[b.k].prop) })"></div><div class="flex bsugg-a"><button type="button" class="btn s" data-a="budApply" :data-k="b.k" :data-v="rvOf[b.k].prop" @click="apply(rvOf[b.k])">{{ t("budgets.use", { amount: fm(rvOf[b.k].prop) }) }}</button><button type="button" class="btn o s" data-a="budLater" :data-k="b.k" @click="later(b.k)">{{ t("budgets.notNow") }}</button></div></div>
          <div v-if="M.billsIn(b.k).length || M.catJars[b.k]" class="bextra">
            <template v-if="M.billsIn(b.k).length">
              <button type="button" class="bxt" data-a="budBills" :data-k="b.k" :aria-expanded="!!billsOpen[b.k]" @click="billsOpen[b.k] = !billsOpen[b.k]"><span>{{ t("budgets.inc", { n: M.billsIn(b.k).length }, M.billsIn(b.k).length) }}</span><svg class="bcv" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></button>
              <div v-if="billsOpen[b.k]" class="bbin"><div v-for="x in M.billsIn(b.k)" :key="x.idx" class="chn" data-a="billOpen" :data-i="x.idx" @click="billOpen(x)"><span>{{ tx(x.n) }} <small class="sm">{{ billSt(x) }}</small></span><b class="num">{{ x.irregular ? "≈ " : "" }}{{ fm(x.pred) }}</b></div></div>
            </template>
            <div v-if="M.catJars[b.k]" class="sm bjar"><span class="bjl">{{ t("budgets.jarT") }}:</span> <b>{{ M.catJars[b.k].j.n }}</b>{{ t("budgets.jarPays", { amount: fm(M.catJars[b.k].j.bal) }) }}</div>
          </div>
        </BaseCard>
        </template>
      </CardColumns>

      <div id="budU">
        <template v-if="M.un.length">
          <h2>{{ t("budgets.unTitle") }}</h2>
          <div class="card bun"><div v-for="[k, v] in M.un" :key="k" class="row"><span class="dot" :style="{ background: cc(k) }"></span><div class="grow"><span class="catl" data-a="goCat" :data-cat="k" @click="goCat(k)">{{ catLabel(k) }}</span></div><b class="num">{{ fm(v) }}</b><button type="button" class="btn o s" data-a="budNew" :data-k="k" @click="openAdd(k)">{{ t("budgets.setBudget") }}</button></div></div>
        </template>
      </div>
    </template>
  </section>

  <template v-if="M">
    <PopMenu :at="menu?.btn" @close="menu = null">
      <template v-if="menu">
        <button role="menuitem" data-a="budEdit" @click="openChange(menu.k)"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" /></svg>{{ t("budgets.menu.change") }}</button>
        <button role="menuitem" data-a="goCat" @click="showSpending(menu.k)"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10" /></svg>{{ t("budgets.menu.inAct") }}</button>
        <button role="menuitem" class="dz" data-a="budDel" @click="removeAsk(menu.k)"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>{{ t("budgets.menu.remove") }}</button>
      </template>
    </PopMenu>

    <BaseSheet :open="editing != null" @close="editing = null">
      <h3>{{ t("budgets.change.title", { name: editing ? catLabel(editing) : "" }) }}</h3>
      <div class="fld"><label for="budC">{{ t("budgets.add.limit") }}</label><MoneyInput id="budC" v-model="amount" data-c="budget" :data-k="editing" @keydown.enter="saveChange" /></div>
      <div class="flex" style="justify-content:flex-end;gap:10px"><button type="button" class="btn o" data-a="close" @click="editing = null">{{ t("budgets.cancel") }}</button><button type="button" class="btn" data-a="budSave" @click="saveChange">{{ t("budgets.save") }}</button></div>
    </BaseSheet>
  </template>
</template>
