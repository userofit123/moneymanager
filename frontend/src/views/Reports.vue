<script setup>
// Reports: the main chart, this month against last month, income against expenses, top merchants, spending by category and by tag, and the category trend.
// What it knows and does lives in pagelogic/reports.js (shared with the phone screen); this page only shows it.
import PageHeader from "../components/PageHeader.vue";
import RangeCal from "./RangeCal.vue";
import { vTip } from "../core/tooltip.js";
import { useReports } from "../pagelogic/reports.js";
import "../styles/pages/reports.css"; // this page's own styles

const {
  t, data, S, M, MK, MNAME, trM, optGroups, TR, trm, trDraw, f0, fm, nwA, trShow, trHov, trClick, tipEl, setPension, hasPension, cmp, pmN, catName, goActivity, RN, monOpts, bcw, barChart, RNG, onRange, rangeOpts, CMP, cmpOpts, merch, cc, dlt, hideMerch, merchCmp, cmpName, showMerch, catDonut, hoverCat, catB, totalOf, tagDonut, hoverTag, tagB, lw, lineChart, lineShow, lhov, lineHot, lineTip, cal, calApply, calCancel, dateFormat, weekStart,
} = useReports();
</script>

<template>
  <PageHeader :title="t('nav.reports')" />
  <section class="view on" id="rep">
    <p v-if="data.error.value && !S" class="muted">{{ t("home.loadError") }}</p>
    <p v-else-if="!M" class="muted">{{ t("home.loading") }}</p>

    <template v-else>
      <!-- the main chart -->
      <div class="card" id="nwc" v-if="trm && trDraw">
        <div class="trtop"><div class="trpick"><select :value="trM" :aria-label="t('rep.whatToShow')" @change="TR.m = $event.target.value"><optgroup v-for="g in optGroups" :key="g[0]" :label="g[0]"><option v-for="[v, l] in g[1]" :key="v" :value="v" :selected="trM == v">{{ l }}</option></optgroup></select></div>
          <div class="trrt"><label class="tg trtog" :class="{ off: trm.noCmp }" v-tip="t('rep.compareTip') + (trm.noCmp ? '\n' + t('rep.compareNone') : '')"><input type="checkbox" :checked="TR.c && !trm.noCmp" :disabled="trm.noCmp" @change="TR.c = $event.target.checked"><span>{{ t("rep.compare") }}</span></label><label v-if="trm.isNW && hasPension" class="tg trtog"><input type="checkbox" :checked="trm.wp" @change="setPension"><span>{{ t("rep.withPension") }}</span></label>
            <div class="seg trseg"><button v-for="[v, l] in [['area', t('rep.area')], ['line', t('rep.line')], ['bars', t('rep.bars')]]" :key="v" type="button" :class="{ on: TR.v == v }" @click="TR.v = v">{{ l }}</button></div>
            <div class="seg trseg"><button v-for="[v, l] in [[3, t('rep.r3')], [6, t('rep.r6')], [12, t('rep.r12')], [36, t('rep.r36')], [0, t('rep.rAll')]]" :key="v" type="button" :class="{ on: TR.r == v }" @click="TR.r = v">{{ l }}</button></div></div></div>
        <div class="trhead"><div class="val"><small>₪</small>{{ trm.big < 0 ? "−" : "" }}{{ f0(trm.big) }}</div><div class="sm trdelta"><template v-if="trm.delta.pill"><span class="bd" :class="trm.delta.pill.cls">{{ trm.delta.pill.text }}</span>{{ trm.delta.rest }}</template><template v-else>{{ trm.delta.text }}</template></div></div>
        <div id="nwA" :ref="(e) => (nwA.el.value = e)">
          <div class="trw">
            <svg class="trs" :width="trDraw.W" :height="trDraw.H" :viewBox="`0 0 ${trDraw.W} ${trDraw.H}`" @pointermove="trShow" @pointerdown="trShow" @pointerleave="trHov = null" @click="trClick">
              <defs><linearGradient id="tgm" x1="0" x2="0" y1="0" y2="1"><stop offset="0" :stop-color="trm.col" stop-opacity=".32" /><stop offset="1" :stop-color="trm.col" stop-opacity="0" /></linearGradient></defs>
              <template v-for="(g, i) in trDraw.grid" :key="'g' + i"><line class="gl" :x1="trDraw.Pl" :x2="trDraw.W - 8" :y1="g.y" :y2="g.y" :stroke-dasharray="g.zero ? undefined : '2 5'" /><text :x="trDraw.Pl - 7" :y="g.y + 4" text-anchor="end">{{ g.label }}</text></template>
              <text v-for="(l, i) in trDraw.xl" :key="'x' + i" :x="l.x" :y="trDraw.H - 8" text-anchor="middle">{{ l.l }}</text>
              <template v-if="trDraw.kind == 'bars'"><template v-for="(b, i) in trDraw.bars" :key="'b' + i"><rect :x="b.x" :y="b.y" :width="b.w" :height="b.h" :rx="b.rx" :fill="b.neg ? 'var(--neg)' : trm.col" :fill-opacity="b.op" /><line v-if="b.p" :x1="b.p.x1" :x2="b.p.x2" :y1="b.p.y" :y2="b.p.y" stroke="var(--tx)" stroke-opacity=".55" stroke-width="2" stroke-dasharray="3 3" stroke-linecap="round" /></template></template>
              <template v-else>
                <polyline v-if="trDraw.prevPts" fill="none" stroke="var(--tx)" stroke-opacity=".5" stroke-width="2" stroke-dasharray="4 4" stroke-linecap="round" stroke-linejoin="round" :points="trDraw.prevPts" />
                <polygon v-if="trDraw.kind == 'area'" fill="url(#tgm)" :points="trDraw.area" />
                <polyline fill="none" :stroke="trm.col" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" :points="trDraw.pts" />
                <circle v-for="(d, i) in trDraw.dots" :key="'d' + i" :cx="d.x" :cy="d.y" r="3" fill="var(--bg)" :stroke="trm.col" stroke-width="2" />
                <circle :cx="trDraw.end.x" :cy="trDraw.end.y" r="9" :fill="trm.col" fill-opacity=".18" /><circle :cx="trDraw.end.x" :cy="trDraw.end.y" r="4.5" :fill="trm.col" />
              </template>
              <line class="trx" :x1="trHov ? trHov.x : 0" :x2="trHov ? trHov.x : 0" :y1="trDraw.Pt" :y2="trDraw.H - trDraw.Pb" stroke="var(--tx)" stroke-opacity=".35" stroke-dasharray="3 3" :style="{ display: trHov ? '' : 'none' }" />
              <circle class="trd" r="5.5" :cx="trHov ? trHov.x : 0" :cy="trHov ? trHov.y : 0" :fill="trm.col" stroke="var(--bg)" stroke-width="2" :style="{ display: trHov && trDraw.kind != 'bars' ? '' : 'none' }" />
            </svg>
            <div v-if="trHov" ref="tipEl" class="trtip" :style="{ display: 'flex', left: trHov.lx + 'px', top: trHov.top + 'px' }"><b>{{ trm.fullL[trHov.i] }}</b><span>{{ fm(trm.vals[trHov.i]) }}</span><small v-if="trm.prev">{{ t("rep.prevLabel", { amt: fm(trm.prev[trHov.i]) }) }}</small><small>{{ t("rep.clickOpen") }}</small></div>
          </div>
        </div>
        <div class="trstats"><div v-for="s in trm.stats" :key="s[0]"><span>{{ s[1] }}<template v-if="s[3]">{{ " " }}<small>(<bdi>{{ s[3] }}</bdi>)</small></template></span><b class="num" :class="{ neg: s[0] == 'chg' && s[2] < 0 }">{{ s[2] < 0 ? "−" : "" }}{{ fm(Math.abs(s[2])) }}</b></div></div>
      </div>

      <!-- this month vs last month -->
      <div class="card" id="cmpCard" v-if="cmp">
        <div class="bh"><div><div class="lbl">{{ t("rep.cmpTitle") }}</div><div class="sm cmpsub">{{ t("rep.cmpSub") }}</div></div></div>
        <div id="cmp" style="margin-top:12px">
          <div class="flex" style="align-items:stretch;gap:28px;flex-wrap:wrap"><div class="cmpcol"><div class="cmpb cur"><div class="lbl"><i class="cd"></i>{{ MNAME(MK) }}<span class="tpill" :class="!cmp.same ? '' : cmp.dir > 0 ? 'up' : cmp.dir < 0 ? 'dn' : 'eq'"><template v-if="cmp.same"><span>{{ cmp.dir > 0 ? "▲" : cmp.dir < 0 ? "▼" : "=" }}</span><span>{{ cmp.p }}%</span></template><span>{{ t("rep.soFar") }}</span></span></div><div class="val"><small>₪</small>{{ f0(cmp.thisTot) }}</div>
            <div class="sm cmpx"><template v-if="cmp.same">{{ cmp.p ? t(cmp.d > 0 ? "rep.moreThan" : "rep.lessThan", { p: cmp.p }) : t("rep.sameAs") }} {{ t("rep.byDay", { month: pmN, day: cmp.DAYN, amt: f0(cmp.same) }) }}</template><template v-else>{{ t("rep.nothingByDay", { month: pmN, day: cmp.DAYN }) }}</template></div></div>
            <div class="cmpb prev"><div class="lbl"><i class="cd"></i>{{ pmN }}<span class="tpill">{{ t("rep.fullMonth") }}</span></div><div class="val"><small>₪</small>{{ f0(cmp.lastTot) }}</div>
              <div class="sm cmpx">{{ t("rep.byDay", { month: pmN, day: cmp.DAYN, amt: f0(cmp.same) }) }}<template v-if="cmp.lastTot">{{ " " }}{{ t("rep.shareOfMonth", { pc: Math.round((cmp.same / cmp.lastTot) * 100), tot: f0(cmp.lastTot), month: pmN }) }}</template></div></div></div>
            <div style="flex:1;min-width:min(260px,100%)"><div class="cmplg"><span class="tpill"><i class="cd"></i><span>{{ t("rep.monthSoFar", { month: MNAME(MK) }) }}</span></span><span class="tpill g"><i class="cd"></i><span>{{ t("rep.sameDays", { month: pmN }) }}</span></span></div>
              <div v-for="r in cmp.rows" :key="r.k" style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;font-size:13px"><b><span class="catl" @click="goActivity({ cat: r.k })">{{ catName(r.k) }}</span></b><span class="sm num">₪{{ f0(r.a) }} <span style="opacity:.6">{{ t("rep.vs") }} ₪{{ f0(r.b) }}</span></span></div>
                <div class="bar" style="margin:6px 0 3px;height:7px"><i :style="{ width: (r.a / cmp.mx) * 100 + '%' }" /></div><div class="bar" style="margin:0;height:7px"><i :style="{ width: (r.b / cmp.mx) * 100 + '%', background: 'color-mix(in srgb,var(--tx) 30%,transparent)' }" /></div></div></div></div>
        </div>
      </div>

      <div class="grid g2">
        <!-- income vs expenses -->
        <div class="card cfill"><div class="bh"><div class="lbl">{{ t("rep.incVsExp") }}</div><div class="rctl rng" id="ctl-bars"><select :value="RN.bars" :aria-label="t('rep.monthsShown')" @change="RN.bars = +$event.target.value"><option v-for="[n, l] in monOpts" :key="n" :value="n" :selected="RN.bars == n">{{ l }}</option></select></div></div>
          <div id="bars"><div class="bcw" :ref="(e) => (bcw.el.value = e)"><svg v-if="barChart" :width="barChart.W" :height="barChart.H" :viewBox="`0 0 ${barChart.W} ${barChart.H}`">
            <template v-for="(g, i) in barChart.grid" :key="'g' + i"><line class="gl" :x1="g.x1" :x2="g.x2" :y1="g.y" :y2="g.y" stroke-dasharray="3 5" /><text :x="g.x1 - 6" :y="g.y + 4" text-anchor="end">{{ g.label }}</text></template>
            <template v-for="c in barChart.cols" :key="c.mk"><rect class="gob" v-tip="t('rep.incomeTip', { m: c.m, v: f0(c.iv) })" :x="c.ix" :y="c.iy" :width="c.bw" :height="c.ih" :rx="c.rx" fill="var(--inc)" @click="goActivity({ from: c.mk + '-01', to: c.mk + '-31', ty: 'income' })" /><rect class="gob" v-tip="t('rep.expensesTip', { m: c.m, v: f0(c.ev) })" :x="c.ex" :y="c.ey" :width="c.bw" :height="c.eh" :rx="c.rx" fill="var(--exp)" @click="goActivity({ from: c.mk + '-01', to: c.mk + '-31', ty: 'expense' })" /><text :x="c.cx" :y="barChart.H - 6" text-anchor="middle" :style="{ fontSize: barChart.fs + 'px' }">{{ c.m }}</text></template>
          </svg></div><div class="flex sm" style="gap:16px"><span><span class="dot" style="background:var(--inc)"></span> {{ t("rep.income") }}</span><span><span class="dot" style="background:var(--exp)"></span> {{ t("rep.expenses") }}</span></div></div></div>

        <!-- top merchants -->
        <div class="card"><div class="bh"><div class="lbl">{{ t("rep.topMerch") }}</div><div class="rctl rng" id="ctl-merch"><select :value="RNG.merch.p" :aria-label="t('activity.timeFrame')" @change="onRange('merch', $event)"><option v-for="[v, l] in rangeOpts('merch')" :key="v" :value="v" :selected="RNG.merch.p == v">{{ l }}</option></select><select :value="CMP.merch" :aria-label="t('rep.compareWith')" @change="CMP.merch = $event.target.value"><option v-for="[v, l] in cmpOpts" :key="v" :value="v" :selected="CMP.merch == v">{{ l }}</option></select></div></div>
          <div id="merch" style="margin-top:14px" v-if="merch">
            <template v-if="merch.rows.length"><div v-for="r in merch.rows" :key="r.n" class="mrow" style="margin-bottom:12px" @click="goActivity({ q: r.n })"><div class="sm mmain" style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span class="mname">{{ r.n }}</span>
              <span class="mpills"><span v-if="r.cat" class="mpill"><i class="cd" :style="{ background: cc(r.cat) }"></i>{{ catName(r.cat) }}</span><span class="mpill">{{ r.count == 1 ? t("rep.payment1") : t("rep.paymentN", { n: r.count }) }}</span><span v-if="r.bill" class="mpill b">{{ r.bill == "irregular" ? t("rep.irregularBill") : t("rep.bill") }}</span></span>
              <span class="flex" style="gap:8px;flex:none"><template v-if="merch.prev"><span v-if="dlt(r.v, r.before)" class="bd" :class="dlt(r.v, r.before).cls">{{ dlt(r.v, r.before).text }}</span></template><b class="num" style="color:var(--tx)">₪{{ f0(r.v) }}</b><button type="button" class="mh" v-tip="t('rep.hideTip')" :aria-label="t('rep.hideAria', { n: r.n })" @click.stop="hideMerch(r.n)">✕</button></span></div>
              <div class="bar" style="margin:6px 0"><i :style="{ width: (r.v / merch.mx) * 100 + '%' }" /></div><div v-if="merch.prev" class="sm" style="opacity:.75">{{ t("rep.beforeAmt", { amt: "₪" + f0(r.before) }) }}</div></div></template>
            <div v-else class="sm">{{ t("rep.noSpendPeriod") }}</div>
            <div v-if="merchCmp" class="sm" style="margin-top:4px">{{ t("rep.comparedWith") }} {{ cmpName(merchCmp) }}</div>
            <div v-if="merch.hidden.length" class="sm" style="margin-top:12px">{{ t("rep.hiddenFrom") }} <button v-for="n in merch.hidden" :key="n" type="button" class="chip dchip" v-tip="t('rep.showAgain')" @click="showMerch(n)">{{ n }} ↩</button></div>
          </div></div>

        <!-- spending by category -->
        <div class="card"><div class="bh"><div class="lbl" id="repCatLbl">{{ t("rep.spendCat") }}</div><div class="rctl rng" id="ctl-cat"><select :value="RNG.cat.p" :aria-label="t('activity.timeFrame')" @change="onRange('cat', $event)"><option v-for="[v, l] in rangeOpts('cat')" :key="v" :value="v" :selected="RNG.cat.p == v">{{ l }}</option></select><select :value="CMP.cat" :aria-label="t('rep.compareWith')" @change="CMP.cat = $event.target.value"><option v-for="[v, l] in cmpOpts" :key="v" :value="v" :selected="CMP.cat == v">{{ l }}</option></select></div></div>
          <div class="flex dnt" :class="{ hv: hoverCat }" id="donutRep" style="margin-top:12px;justify-content:center" v-if="catDonut">
            <svg width="200" height="200" viewBox="0 0 200 200" class="dsvg" style="max-width:100%"><path v-for="p in catDonut.parts" :key="p.n" v-tip="p.tip" :d="p.d" :fill="p.color" :class="{ on: hoverCat === p.n }" style="cursor:pointer" @mouseenter="hoverCat = p.n" @mouseleave="hoverCat = null" @click="goActivity({ cat: p.n })" /><text x="100" y="98" text-anchor="middle" style="font-size:22px;font-weight:600;fill:var(--tx)">₪{{ f0(catDonut.tot) }}</text><text x="100" y="117" text-anchor="middle">{{ t("rep.spentPeriod") }}</text></svg>
            <div class="legend"><div v-for="p in catDonut.parts" :key="p.n" :class="{ on: hoverCat === p.n }" data-k="" @mouseenter="hoverCat = p.n" @mouseleave="hoverCat = null"><span class="dot" :style="{ background: p.color }"></span><span class="catl" @click="goActivity({ cat: p.n })">{{ p.label }}</span><b>₪{{ f0(p.v) }}</b></div></div></div>
          <div id="catCmp" style="margin-top:12px"><template v-if="catB && catB.prev"><div class="sm" style="margin-bottom:6px">{{ t("rep.comparedWith") }} <b>{{ cmpName(catB.B.cr) }}</b>{{ t("rep.totalVs", { a: fm(totalOf(catB.cur)), b: fm(totalOf(catB.prev)) }) }} <span v-if="dlt(totalOf(catB.cur), totalOf(catB.prev))" class="bd" :class="dlt(totalOf(catB.cur), totalOf(catB.prev)).cls">{{ dlt(totalOf(catB.cur), totalOf(catB.prev)).text }}</span></div>
            <div class="cmprow hd"><span>{{ t("rep.category") }}</span><span>{{ t("rep.thisPeriod") }}</span><span>{{ t("rep.before") }}</span><span></span></div>
            <div v-for="k in catB.keys.slice(0, 10)" :key="k" class="cmprow"><span><span class="dot" :style="{ background: cc(k) }"></span> <span class="catl" @click="goActivity({ cat: k })">{{ catName(k) }}</span></span><b class="num">{{ fm(catB.cur[k] || 0) }}</b><span class="sm num">{{ fm(catB.prev[k] || 0) }}</span><span v-if="dlt(catB.cur[k] || 0, catB.prev[k] || 0)" class="bd" :class="dlt(catB.cur[k] || 0, catB.prev[k] || 0).cls">{{ dlt(catB.cur[k] || 0, catB.prev[k] || 0).text }}</span><span v-else></span></div></template></div></div>

        <!-- spending by tag -->
        <div class="card"><div class="bh"><div class="lbl">{{ t("rep.spendTag") }}</div><div class="rctl rng" id="ctl-tag"><select :value="RNG.tag.p" :aria-label="t('activity.timeFrame')" @change="onRange('tag', $event)"><option v-for="[v, l] in rangeOpts('tag')" :key="v" :value="v" :selected="RNG.tag.p == v">{{ l }}</option></select><select :value="CMP.tag" :aria-label="t('rep.compareWith')" @change="CMP.tag = $event.target.value"><option v-for="[v, l] in cmpOpts" :key="v" :value="v" :selected="CMP.tag == v">{{ l }}</option></select></div></div>
          <div class="flex" :class="{ dnt: tagDonut, hv: tagDonut && hoverTag }" id="donutTag" style="margin-top:12px;justify-content:center">
            <template v-if="tagDonut"><svg width="200" height="200" viewBox="0 0 200 200" class="dsvg" style="max-width:100%"><path v-for="p in tagDonut.parts" :key="p.n" v-tip="p.tip" :d="p.d" :fill="p.color" :class="{ on: hoverTag === p.n }" style="cursor:pointer" @mouseenter="hoverTag = p.n" @mouseleave="hoverTag = null" @click="goActivity({ tag: p.n })" /><text x="100" y="98" text-anchor="middle" style="font-size:22px;font-weight:600;fill:var(--tx)">₪{{ f0(tagDonut.tot) }}</text><text x="100" y="117" text-anchor="middle">{{ t("rep.spentPeriod") }}</text></svg>
              <div class="legend"><div v-for="p in tagDonut.parts" :key="p.n" :class="{ on: hoverTag === p.n }" data-k="" @mouseenter="hoverTag = p.n" @mouseleave="hoverTag = null"><span class="dot" :style="{ background: p.color }"></span><span class="catl" @click="goActivity({ tag: p.n })">{{ p.label }}</span><b>₪{{ f0(p.v) }}</b></div></div></template>
            <span v-else class="sm">{{ t("rep.noTagged") }}</span></div>
          <div id="tagCmp" style="margin-top:12px"><template v-if="tagB && tagB.ents.length && tagB.prev"><div class="sm" style="margin-bottom:6px">{{ t("rep.comparedWith") }} <b>{{ cmpName(tagB.B.cr) }}</b>{{ t("rep.totalVs", { a: fm(totalOf(tagB.cur)), b: fm(totalOf(tagB.prev)) }) }} <span v-if="dlt(totalOf(tagB.cur), totalOf(tagB.prev))" class="bd" :class="dlt(totalOf(tagB.cur), totalOf(tagB.prev)).cls">{{ dlt(totalOf(tagB.cur), totalOf(tagB.prev)).text }}</span></div>
            <div class="cmprow hd"><span>{{ t("rep.tag") }}</span><span>{{ t("rep.thisPeriod") }}</span><span>{{ t("rep.before") }}</span><span></span></div>
            <div v-for="k in tagB.keys.slice(0, 10)" :key="k" class="cmprow"><span><span class="catl" @click="goActivity({ tag: k })"><bdi>#{{ k }}</bdi></span></span><b class="num">{{ fm(tagB.cur[k] || 0) }}</b><span class="sm num">{{ fm(tagB.prev[k] || 0) }}</span><span v-if="dlt(tagB.cur[k] || 0, tagB.prev[k] || 0)" class="bd" :class="dlt(tagB.cur[k] || 0, tagB.prev[k] || 0).cls">{{ dlt(tagB.cur[k] || 0, tagB.prev[k] || 0).text }}</span><span v-else></span></div></template></div></div>
      </div>

      <!-- category trend -->
      <div class="card"><div class="bh"><div class="lbl" id="lineTitle">{{ t("rep.catTrend") }}</div><div class="rctl rng" id="ctl-lines"><select :value="RN.lt" :aria-label="t('rep.type')" @change="RN.lt = $event.target.value"><option value="exp" :selected="RN.lt != 'inc'">{{ t("rep.expenses") }}</option><option value="inc" :selected="RN.lt == 'inc'">{{ t("rep.income") }}</option></select><select :value="RN.lines" :aria-label="t('rep.monthsShown')" @change="RN.lines = +$event.target.value"><option v-for="[n, l] in monOpts" :key="n" :value="n" :selected="RN.lines == n">{{ l }}</option></select></div></div>
        <div id="lines" :class="{ hv: lineHot }" :ref="(e) => (lw.el.value = e)">
          <template v-if="lineChart && lineChart.lines.length"><div class="trw tight"><svg width="100%" :viewBox="`0 0 ${lineChart.W} ${lineChart.H}`" @pointermove="lineShow" @pointerdown="lineShow" @pointerleave="lhov = null">
            <template v-for="(g, i) in lineChart.grid" :key="'g' + i"><line class="gl" :x1="g.x1" :x2="g.x2" :y1="g.y" :y2="g.y" stroke-dasharray="3 5" /><text :x="g.x1 - 6" :y="g.y + 4" text-anchor="end">{{ g.label }}</text></template>
            <text v-for="(m, i) in lineChart.labels" :key="'m' + i" :x="lineChart.x(i)" :y="lineChart.H - 6" text-anchor="middle" :style="{ fontSize: lineChart.fs + 'px' }">{{ m }}</text>
            <g v-for="l in lineChart.lines" :key="l.k" class="ls" :class="{ on: lineHot === l.k }" @mouseenter="lineHot = l.k" @mouseleave="lineHot = null"><polyline fill="none" :stroke="cc(l.k)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :points="l.pts" /><polyline fill="none" stroke="transparent" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" :points="l.pts" />
              <circle v-for="d in l.dots" :key="d.mk" class="gob" :cx="d.x" :cy="d.y" r="4.5" fill="var(--bg)" :stroke="cc(l.k)" stroke-width="2.5" @click="goActivity({ from: d.mk + '-01', to: d.mk + '-31', cat: l.k, ty: RN.lt == 'inc' ? 'income' : 'expense' })" /></g>
            <line v-if="lhov" :x1="lhov.x" :x2="lhov.x" y1="14" :y2="lineChart.H - 24" stroke="var(--tx)" stroke-opacity=".35" stroke-dasharray="3 3" style="pointer-events:none" />
          </svg>
          <div v-if="lhov" ref="lineTip" class="trtip m" :style="{ display: 'flex', left: lhov.lx + 'px', top: '4px' }"><b>{{ lineChart.labels[lhov.i] }}</b><span v-for="r in lineChart.lines.map((l) => [l.k, l.vals[lhov.i]]).sort((p, q) => q[1] - p[1]).slice(0, 7)" :key="r[0]"><i class="tdot" :style="{ background: cc(r[0]) }"></i>{{ catName(r[0]) }} ₪{{ f0(r[1]) }}</span></div></div>
          <div class="trleg"><div v-for="l in lineChart.lines" :key="l.k" class="lgi" :class="{ on: lineHot === l.k }" @mouseenter="lineHot = l.k" @mouseleave="lineHot = null"><span class="dot" :style="{ background: cc(l.k) }"></span><span class="catl" @click="goActivity({ cat: l.k })">{{ catName(l.k) }}</span><b class="num">₪{{ f0(l.total) }}</b></div></div></template>
          <div v-else class="sm" style="padding:20px 0">{{ RN.lt == "inc" ? t("rep.noIncomeMonths") : t("rep.noSpendMonths") }}</div></div></div>
    </template>
  </section>
  <RangeCal v-if="cal" :from="RNG[cal.id].p === 'custom' ? RNG[cal.id].from : ''" :to="RNG[cal.id].p === 'custom' ? RNG[cal.id].to : ''" :anchor="cal.anchor" :df="dateFormat" :ws="weekStart" @apply="calApply" @cancel="calCancel" />
</template>
