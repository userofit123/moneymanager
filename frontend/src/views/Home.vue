<script setup>
// Home: the overview: alerts, the four totals, accounts, cards,
// the money flow, spending by category, budgets, upcoming bills, recent activity, your goal (when one is saved), jars and exchange
// rates, with the same hover texts.
// It only reads: the shared data store and GET /api/fx. A block with nothing to show is hidden.
// What it knows and does lives in pagelogic/home.js (shared with the phone's Home screen); here: the screen and its hover parts.
import { ref, computed, onMounted } from "vue";
import { data } from "../stores/data.js";
import { goActivity } from "../core/shell.js";
import { openForm } from "../core/forms.js";
import { amtText } from "../lib/txrows.js";
import { pages } from "../routes.js";
import { hrefOf, onLink } from "../router.js";
import { currencySymbol } from "../format.js";
import PageHeader from "../components/PageHeader.vue";
import { brandIcon, glyphIcon } from "../brands.js";
import BaseTabs from "../components/BaseTabs.vue";
import CardColumns from "../components/CardColumns.vue";
import AvailWhy from "./AvailWhy.vue";
import { vTip } from "../core/tooltip.js";
import { dcell, dstr, titleCase } from "../dates.js";
import { useHome } from "../pagelogic/home.js";
import { sparkPath } from "../lib/home.js";
import { useGoalCard, openYearsNext } from "../pagelogic/yearsAhead.js";
import { go } from "../router.js";
import "../styles/pages/home.css"; // this page's own styles

const {
  t, fm, n0, an, pair, fx, S, M, monthName, catName, catColor, nm, accLbl, alertList, alerts3, openTxId, openAlert, accGo, goConn,
  kpis, money2, accSub, cardRows, flowMode, flowOpts, W, pay, calm, cols, startTip, cardsTip, upTip, endTip, colTip, asideTip, tileTip, leftOf,
  donut, fxCur, fxKeys, fxView, fxOpts, openBill,
} = useHome();
// your goal (saved in Forecast → Years ahead): the card opens the Forecast there
const goal = useGoalCard();
const openGoal = () => { openYearsNext(); go(link("forecast")); };
const link = (name) => hrefOf(pages.find((p) => p.name === name));
onMounted(async () => {
  data.start();
});
const avail = ref(false);
const hover = ref(null);
// Hover over the chart: a dashed line, a dot and the day's rate.
const hv = ref(null), fxSvg = ref(null), fxWrap = ref(null);
function hvShow(e) {
  const F = fxView.value, svg = fxSvg.value; if (!F || !svg) return;
  const r = svg.getBoundingClientRect(); if (!r.width) return;
  const k = F.Wd / r.width, vx = (e.clientX - r.left) * k; let i = 0, best = 1e9;
  F.xs.forEach((x, j) => { const d = Math.abs(x - vx); if (d < best) { best = d; i = j; } });
  hv.value = { i, x: F.xs[i], y: F.ys[i], px: F.xs[i] / k, py: F.ys[i] / k };
}
const hvStyle = computed(() => {
  if (!hv.value) return { display: "none" };
  const w = fxWrap.value?.querySelector(".trtip")?.offsetWidth || 120, h = fxWrap.value?.querySelector(".trtip")?.offsetHeight || 44, W0 = fxSvg.value?.getBoundingClientRect().width || 0;
  return { direction: "ltr", insetInlineStart: Math.max(0, Math.min(W0 - w, hv.value.px - w / 2)) + "px", top: Math.max(0, hv.value.py - h - 12) + "px" };
});

// The lower blocks shown, in this order (CardColumns puts them in two columns, each straight under the one above it).
const bbKeys = computed(() => {
  const h = M.value?.has || {};
  const on = { donut: h.donut, budg: h.budg, bills: h.bills, recent: h.recent, goal: !!goal.value, jars: h.jars, fx: fxKeys.value.length > 0 };
  return Object.keys(on).filter((k) => on[k]);
});

const H2 = { recent: "activity", budg: "budgets", bills: "bills", jars: "jars", donut: "reports", accts: "accounts", fx: "settings" };
</script>

<template>
  <PageHeader :title="t('nav.home')" />
  <section id="dash" class="view on">

    <p v-if="data.error.value && !S" class="muted">{{ t("home.loadError") }}</p>
    <p v-else-if="!S" class="muted">{{ t("home.loading") }}</p>

    <template v-else>
      <div id="attn">
        <div v-if="alerts3.length" class="card warn" style="margin-bottom:16px;padding:6px 18px">
          <div v-for="x in alerts3" :key="x.id" class="al" style="padding:10px 0"><span class="sev" :class="x.sev" /><div style="flex:1;min-width:0"><b style="font-size:14px">{{ x.title }}</b><div class="sm">{{ x.text }}</div></div><button type="button" class="btn o s" @click="openAlert(x)">{{ t("home.alertOpen") }}</button></div>
          <div style="padding:8px 0"><a class="sm" style="cursor:pointer;color:var(--acc);font-weight:600" :href="link('alerts')" @click="onLink">{{ t("home.allAlerts", { n: alertList.length }) }}</a></div>
        </div>
      </div>

      <div v-if="!M.any && !fxKeys.length" id="homeEmpty" class="card">
        <b>{{ t("home.emptyTitle") }}</b>
        <div class="sm" style="margin:6px 0 12px">{{ t("home.emptyText") }}</div>
        <div class="flex" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn s" @click="goConn">{{ t("home.connect") }}</button><button type="button" class="btn o s" @click="openForm('tx')">{{ t("home.addTx") }}</button></div>
      </div>

      <template v-else>
        <div id="kpis" class="grid g4">
          <div v-for="c in kpis" :key="c.key" class="card" :class="{ hero: c.hero }" v-tip="c.tip">
            <div class="lbl"><span class="gi" v-html="glyphIcon(c.key, { worth: 'var(--acc)', income: 'var(--pos)', expense: 'var(--neg)', net: 'var(--acc)' }[c.key])" /><span>{{ titleCase(c.label) }}</span></div>
            <div class="val"><small>₪</small>{{ c.key === "net" && c.v < 0 ? "−" : "" }}{{ n0(c.v) }}</div>
            <div class="sm">{{ c.sub }}</div>
            <div v-if="c.lasts" class="sm lasts" v-tip="c.lasts.tip">{{ c.lasts.text }}</div>
            <svg v-if="c.spark" class="spark" viewBox="0 0 200 46" preserveAspectRatio="none">
              <defs><linearGradient :id="'sg' + c.key" x1="0" x2="0" y1="0" y2="1"><stop offset="0" :stop-color="c.col" stop-opacity=".35" /><stop offset="1" :stop-color="c.col" stop-opacity="0" /></linearGradient></defs>
              <polygon :points="sparkPath(c.spark).area" :fill="'url(#sg' + c.key + ')'" /><polyline :points="sparkPath(c.spark).line" fill="none" :stroke="c.col" stroke-width="2" vector-effect="non-scaling-stroke" />
            </svg>
          </div>
        </div>

        <div v-if="M.has.accts" id="sec-accts">
          <h2>{{ t("home.accounts") }}<a class="sm hl" :href="link('accounts')" @click="onLink">{{ t("home.all") }}</a></h2>
          <div id="accts" class="grid g3">
            <div v-for="g in M.groups" :key="g.n" class="card click" role="button" tabindex="0" @click="accGo(g.n)">
              <div class="lbl"><span class="gi" v-html="brandIcon(g.n, g.L[0].src, g.L[0].kind, g.L[0].ck)" /><span>{{ an(g.n) }}</span><span v-if="accSub(g).chips" class="chip" style="margin-inline-start:auto;padding:1px 9px">{{ accSub(g).chips }}</span></div>
              <div class="val"><small>₪</small>{{ n0(g.total) }}</div>
              <div class="sm">
                <template v-if="accSub(g).lines">
                  <div v-for="x in accSub(g).lines" :key="x.cur" class="flex" style="justify-content:space-between;gap:8px;margin-top:3px"><span><template v-if="x.none">ILS · <i>{{ t("home.noShekel") }}</i></template><template v-else>{{ x.cur }} · {{ money2(x) }}<span v-if="x.cur != 'ILS'" style="opacity:.65"> × {{ (fx.fx[x.cur] || 1).toFixed(4) }}</span></template></span><b class="num" style="color:var(--tx)">₪{{ n0(x.none ? 0 : x.v * M.rate(x.cur)) }}</b></div>
                  <div v-if="accSub(g).stale" style="margin-top:4px;opacity:.7">{{ fx.live ? t("home.fxStale") : t("home.fxNone") }}</div>
                </template>
                <template v-else>{{ accSub(g).text }}</template>
              </div>
            </div>
          </div>
        </div>

        <div v-if="M.has.cards" id="sec-cards">
          <h2>{{ t("home.cards") }}<a class="sm hl" :href="link('accounts')" @click="onLink">{{ t("home.all") }}</a></h2>
          <div id="cards" class="grid g3">
            <div v-for="c in cardRows" :key="c.n" class="card click" v-tip="c.tip" role="button" tabindex="0" @click="accGo(c.wise ? 'Wise' : c.n)">
              <div class="lbl"><span class="gi" v-html="brandIcon(c.n, c.acc?.src, c.acc?.kind || 'card', c.acc?.ck)" /><span><template v-if="c.wise">{{ titleCase(c.nme) }} · {{ titleCase(t("home.paidNow")) }}</template><template v-else><span v-html="accLbl(c.n)" /> · {{ titleCase(t("home.upcomingCharge")) }}</template></span></div>
              <div class="val"><small>₪</small>{{ n0(c.now) }}</div>
              <div class="sm">{{ t("home.lastMonthAmount", { amount: "₪" + n0(c.last) }) }} <span v-if="c.last" class="bd" :class="c.d > 0 ? 'up' : 'dn'">{{ c.d > 0 ? "▲" : "▼" }} {{ c.p }}%</span></div>
              <div class="bar"><i :style="{ width: Math.min(100, c.now / Math.max(c.now, c.last, 1) * 100) + '%', background: c.d > 0 ? 'var(--neg)' : 'var(--pos)' }" /></div>
            </div>
          </div>
        </div>

        <div v-if="M.has.flow" id="sec-flow">
          <h2><span id="flowTitle">{{ t("home.flowTitle") }}</span><span class="h2r"><BaseTabs id="flowSeg" v-model="flowMode" :options="flowOpts" :label="t('home.flowMode')" /><a class="sm hl" href="#" @click.prevent="avail = true">{{ t("home.fullBreakdown") }}</a></span></h2>
          <div id="flowHome" class="card flow">
            <div class="fs"><div class="fsr">
              <div class="fst" v-tip="startTip(true)"><span>{{ t("num.inAccounts") }}</span><b class="num">{{ fm(W.start) }}</b></div>
              <template v-if="M.flow.cards >= 1"><i>−</i>
              <div class="fst" v-tip="cardsTip"><span>{{ t("num.cardsUnpaid") }}</span><b class="num">{{ fm(M.flow.cards) }}</b></div></template>
              <template v-if="W.upTot >= 1"><i>−</i>
              <div class="fst" v-tip="upTip"><span>{{ t("num.upcoming") }}</span><b class="num">{{ fm(W.upTot) }}</b></div></template>
              <template v-if="!W.ACT"><i>−</i>
              <div class="fst" v-tip="tileTip"><span>{{ t("num.leftBudgets") }}</span><b class="num">{{ fm(W.leftTot) }}</b></div></template>
              <template v-if="!W.ACT"><i>−</i>
              <div class="fst" v-tip="asideTip"><span>{{ t("num.putAside") }}</span><b class="num">{{ fm(W.jarsA + M.flow.buffer) }}</b></div></template>
              <i>=</i>
              <div class="fst key end" :class="{ neg: W.eOver > 0 && !calm }" v-tip="endTip"><span>{{ W.eOver > 0 && !calm ? t("home.shortBy") : W.ACT ? t("num.afterKnown") : t("num.free") }}</span><b class="num" :class="{ neg: W.eOver > 0 && !calm }">{{ W.eOver > 0 ? "−₪" + n0(W.eOver) : fm(W.eFree) }}</b><small v-if="pay" v-tip="pay.tip">{{ pay.after }}</small></div>
            </div></div>
            <div class="wf2" :style="{ '--n': cols.length }">
              <div class="wrl w1" style="grid-row:1">{{ t("home.stepAmount") }}</div>
              <div class="wrl wnb" style="grid-row:3">{{ t("home.whatsLeft") }}</div>
              <div v-for="(c, i) in cols" :key="i" class="wc" :class="c.kind === 'end' ? 'end ' + c.tone : c.kind === 'item' ? '' : c.kind" :style="{ '--c': i + 2 }" v-tip="colTip(c)">
                <div class="wca num" :data-l="t('num.leftBudgets')"><span v-if="c.kind === 'end'" class="dim">–</span><template v-else><small>₪</small>{{ n0(c.a) }}</template></div>
                <div class="wcp"><i class="wcg" :style="{ '--b': c.b, '--h': c.h }" /><i class="wcs" :class="[c.kind === 'end' ? 'end ' + c.tone : c.kind === 'item' ? '' : c.kind, c.kind === 'start' || c.kind === 'end' ? '' : 'jn']" :style="{ '--h': c.s }" /></div>
                <div class="wct" :data-l="t('home.whatsLeft')"><span v-if="c.kind === 'end' && W.eOver > 0" :class="{ neg: !calm }">−{{ fm(W.eOver) }}</span><template v-else>{{ leftOf(c) }}</template><small v-if="c.k === W.remain" class="wry">{{ t("num.afterKnownS") }}</small></div>
                <div class="wcn"><b>{{ c.name }}</b></div>
              </div>
            </div>
          </div>
        </div>

        <CardColumns v-show="bbKeys.length" id="row-bb" class="grid" :items="bbKeys" :item-key="(k) => k">
          <template #default="{ item: k }">
          <div v-if="k === 'donut'" id="sec-donut">
            <h2 style="margin-top:0"><span>{{ t("home.byCategory") }}<span class="mo"> · {{ monthName(M.MK) }}</span></span><a class="sm hl" :href="link(H2.donut)" @click="onLink">{{ t("home.all") }}</a></h2>
            <div class="card"><div id="donutHome" class="flex dnt" :class="{ hv: hover }">
              <svg width="200" height="200" viewBox="0 0 200 200" class="dsvg" style="max-width:100%">
                <path v-for="p in donut.parts" :key="p.n" :d="p.d" :fill="p.color" :class="{ on: hover === p.n }" style="cursor:pointer" v-tip="p.tip" @mouseenter="hover = p.n" @mouseleave="hover = null" @click="goActivity({ cat: p.n })" />
                <text x="100" y="98" text-anchor="middle" style="font-size:22px;font-weight:600;fill:var(--tx)">₪{{ n0(donut.tot) }}</text>
                <text x="100" y="117" text-anchor="middle">{{ t("home.spentThisMonth") }}</text>
              </svg>
              <div class="legend">
                <div v-for="p in donut.parts" :key="p.n" :class="{ on: hover === p.n }" data-k="" @mouseenter="hover = p.n" @mouseleave="hover = null"><span class="dot" :style="{ background: p.color }" /><span class="catl" @click="goActivity({ cat: p.n })">{{ catName(p.n) }}</span><b>₪{{ n0(p.v) }}</b></div>
              </div>
            </div></div>
          </div>

          <div v-if="k === 'budg'" id="sec-budg">
            <h2 style="margin-top:0"><span>{{ t("home.budgets") }}<span class="mo"> · {{ monthName(M.MK) }}</span></span><a class="sm hl" :href="link(H2.budg)" @click="onLink">{{ t("home.all") }}</a></h2>
            <div id="budHome" class="card">
              <div v-for="b in M.budgets.slice(0, 8)" :key="b.k" style="margin-bottom:14px">
                <div style="display:flex;justify-content:space-between;font-size:14px"><b><span class="catl" @click="goActivity({ cat: b.k })">{{ catName(b.k) }}</span></b><span class="sm num">{{ fm(b.s) }} / {{ fm(b.lim) }}</span></div>
                <div class="bar" style="margin:8px 0 2px"><i :style="{ width: Math.min(100, b.pc) + '%', background: b.st == 'over' ? 'var(--neg)' : b.st == 'warn' ? '#e68a00' : '' }" /><u :style="{ insetInlineStart: (M.DAYN / M.DIM) * 100 + '%' }" /></div>
              </div>
              <div v-if="M.budgets.length > 8" class="sm" style="padding-top:4px"><a style="cursor:pointer;color:var(--acc)" :href="link('budgets')" @click="onLink">{{ t("home.moreBudgets", { n: M.budgets.length - 8 }) }}</a></div>
            </div>
          </div>

          <div v-if="k === 'bills'" id="sec-bills">
            <h2 style="margin-top:0">{{ t("home.upcomingBills") }}<a class="sm hl" :href="link(H2.bills)" @click="onLink">{{ t("home.all") }}</a></h2>
            <div id="billHome" class="card">
              <div v-for="b in M.upcoming" :key="b.idx" class="row" style="cursor:pointer" @click="openBill(b)">
                <div class="grow"><b style="font-size:14px">{{ an(b.n) }}</b><div class="sm">{{ b.status == "overdue" ? t("home.overdueSince", { date: dstr(b.pd) }) : t("home.dueIn", { date: dstr(b.nx), n: b.days }) }}</div></div>
                <b class="num">{{ b.vari ? "≈ " : "" }}{{ fm(b.pred) }}</b>
              </div>
            </div>
          </div>

          <div v-if="k === 'recent'" id="sec-recent">
            <h2 style="margin-top:0">{{ t("home.recent") }}<a class="sm hl" :href="link(H2.recent)" @click="onLink">{{ t("home.all") }}</a></h2>
            <div id="recent" class="card" style="padding:8px 12px">
              <div v-for="x in M.recent" :key="x.id" class="txi" @click="openTxId(x.id)">
                <span class="av" :style="{ background: 'color-mix(in srgb,' + catColor(x.c || 'Uncategorized') + ' 22%,transparent)', color: catColor(x.c || 'Uncategorized') }">{{ (nm(x) || "?")[0] }}</span>
                <div style="flex:1;min-width:0"><div class="mer" style="font-size:14px">{{ nm(x) }}</div><div class="sm">{{ catName(x.c) }} · {{ dcell(x.d) }}</div></div>
                <b class="num" :class="{ pos: x.a > 0 }">{{ amtText(x) }}</b>
              </div>
            </div>
          </div>

          <div v-if="k === 'goal'" id="sec-goal">
            <h2 style="margin-top:0">{{ t("home.goal.title") }}<a class="sm hl" :href="link('forecast')" @click.prevent="openGoal">{{ t("home.goal.open") }}</a></h2>
            <div id="goalHome" class="card click" role="button" tabindex="0" v-tip="goal.tip" @click="openGoal" @keydown.enter="openGoal">
              <div style="display:flex;align-items:center;gap:8px;font-size:14px"><b style="flex:1">{{ goal.name }}</b><span class="num">{{ goal.pc }}%</span></div>
              <div class="bar" style="margin:8px 0 5px"><i :style="{ width: goal.pc + '%', background: goal.on ? 'var(--pos)' : '' }" /></div>
              <div class="sm num">{{ goal.have }}</div>
              <div class="sm goal-st"><b :class="goal.on ? 'pos' : 'neg'">{{ goal.lead }}</b> {{ goal.line }}</div>
            </div>
          </div>

          <div v-if="k === 'jars'" id="sec-jars">
            <h2 style="margin-top:0">{{ t("home.jars") }}<a class="sm hl" :href="link(H2.jars)" @click="onLink">{{ t("home.all") }}</a></h2>
            <div id="jarHome" class="card">
              <div v-for="j in M.jars" :key="j.id" style="margin-bottom:16px">
                <div style="display:flex;justify-content:space-between;font-size:14px"><b>{{ an(j.n) }}</b><span class="num" :class="{ pos: j.got }">{{ j.got ? t("home.gotThisMonth", { amount: "+₪" + n0(j.got) }) : j.want > 0 ? t("home.waiting") : "" }}</span></div>
                <div v-if="!j.open" class="bar" style="margin:8px 0 5px"><i :style="{ width: j.pc + '%', background: 'var(--c' + ((j.p - 1) % 7) + ')' }" /></div>
                <div class="sm num" :style="j.open ? 'margin-top:4px' : ''">{{ j.open ? t("home.savedNoGoal", { amount: "₪" + n0(j.bal) }) : t("home.ofGoal", { amount: "₪" + n0(j.bal), goal: "₪" + n0(j.need), pc: j.pc }) }}</div>
              </div>
              <div style="border-top:1px solid var(--ol);padding-top:14px;display:flex;justify-content:space-between;align-items:center"><span class="sm">{{ t("num.free") }}</span><b class="num" style="font-size:18px">₪{{ n0(M.flow.free) }}</b></div>
            </div>
          </div>

          <div v-if="k === 'fx'" id="sec-fx">
            <h2 style="margin-top:0">{{ t("home.fx") }}<a class="sm hl" :href="link(H2.fx)" @click="onLink">{{ t("home.currencies") }}</a></h2>
            <div id="fxc" class="card">
              <template v-if="fxView">
                <div class="fxh"><BaseTabs v-if="fxKeys.length > 1" v-model="fxCur" style="margin:0" :options="fxOpts" :label="t('home.fx')" /><span v-else class="fxpair">{{ pair(fxCur) }}</span><span class="bd" :class="Math.abs(fxView.ch) < .005 ? '' : fxView.ch > 0 ? 'dn' : 'up'">{{ Math.abs(fxView.ch) < .005 ? "▬" : fxView.ch > 0 ? "▲" : "▼" }} {{ Math.abs(fxView.ch).toFixed(2) }}% · {{ t("home.days30") }}</span></div>
                <div class="fxr"><span class="fxl">{{ currencySymbol(fxCur) }}1</span><span class="fxe">=</span><b class="num">₪{{ fxView.last.toFixed(4) }}</b></div>
                <div :ref="(el) => (fxWrap = el)" class="trw tight">
                  <svg :ref="(el) => (fxSvg = el)" width="100%" :viewBox="`0 0 ${fxView.Wd} ${fxView.H}`" style="margin-top:6px" @pointermove="hvShow" @pointerdown="hvShow" @pointerleave="hv = null">
                    <g v-for="(g, i) in fxView.grid" :key="i"><line class="gl" :x1="fxView.P" :x2="fxView.Wd - 12" :y1="g.y" :y2="g.y" stroke-dasharray="3 5" /><text :x="fxView.P - 6" :y="g.y + 4" text-anchor="end">{{ g.label }}</text></g>
                    <defs><linearGradient id="fxg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".35" /><stop offset="1" stop-color="var(--acc)" stop-opacity="0" /></linearGradient></defs>
                    <polygon fill="url(#fxg)" :points="fxView.area" /><polyline fill="none" stroke="var(--acc)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" :points="fxView.pts" />
                    <template v-if="hv"><line :x1="hv.x" :x2="hv.x" :y1="fxView.y0" :y2="fxView.y1" stroke="var(--tx)" stroke-opacity=".35" stroke-dasharray="3 3" style="pointer-events:none" /><circle :cx="hv.x" :cy="hv.y" r="5" fill="var(--acc)" stroke="var(--bg)" stroke-width="2" style="pointer-events:none" /></template>
                    <circle :cx="fxView.lastX" :cy="fxView.lastY" r="5" fill="var(--bg)" stroke="var(--acc)" stroke-width="2.5" />
                    <text :x="fxView.P" :y="fxView.H - 5">{{ fxView.first }}</text><text :x="fxView.Wd - 12" :y="fxView.H - 5" text-anchor="end">{{ fxView.end }}</text>
                  </svg>
                  <div v-if="hv" class="trtip" :style="hvStyle"><b>{{ fxView.ser[hv.i][0] }}</b><span>{{ currencySymbol(fxCur) }}1 = ₪{{ fxView.ser[hv.i][1].toFixed(4) }}</span></div>
                </div>
                <div class="fxs">
                  <div class="fxt"><span>{{ t("home.low") }}</span><b class="num">{{ fxView.mn.toFixed(3) }}</b></div>
                  <div class="fxt"><span>{{ t("home.average") }}</span><b class="num">{{ fxView.av.toFixed(3) }}</b></div>
                  <div class="fxt"><span>{{ t("home.high") }}</span><b class="num">{{ fxView.mx.toFixed(3) }}</b></div>
                  <div class="fxt fxnow"><span>{{ t("home.vsRange") }}</span><b class="num">{{ fxView.last.toFixed(3) }}</b><div class="fxbar"><i :style="{ insetInlineStart: fxView.pos.toFixed(1) + '%' }" /></div></div>
                </div>
                <div class="fxf"><span>{{ fx.stale ? t("home.fxStaleAt", { date: fx.asOf }) : t("home.fxSource", { date: fx.asOf }) }}</span><span>{{ t("home.fxUse") }}</span></div>
              </template>
            </div>
          </div>
          </template>
        </CardColumns>
      </template>
    </template>
    <AvailWhy v-if="S" v-model:open="avail" :M="M" />
  </section>
</template>

<style scoped>
.gi { display: contents; }
.hl, .card a, a.sm { text-decoration: none; }
.goal-st { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--ol); line-height: 1.5; }
</style>
