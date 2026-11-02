<script setup>
// Forecast: where the money is heading:
// the choices at the top, the balance now and ahead, what it is based on, the chart, what drives it, what each jar will hold and the years ahead.
// What it knows and does lives in pagelogic/forecast.js (shared with the phone's Forecast screen).
import { data } from "../stores/data.js";
import PageHeader from "../components/PageHeader.vue";
import CardColumns from "../components/CardColumns.vue";
import BaseCard from "../components/BaseCard.vue";
import YearsAhead from "./forecast/YearsAhead.vue";
import { useForecast } from "../pagelogic/forecast.js";
import "../styles/pages/forecast.css"; // this page's own styles

const {
  t, tk, sg, n0, fm, tx, S, fc, pick, M, d, H, goCat, zeroMonths, monthsHead, CARDS, gap, C, realPt, hover, svgEl, tipEl, onMove, onLeave, ptName, ptDay, ptLabel,
  big, horizonLabel, last, amt, upText, lkText, barTip, open, seen, toggle, body, TT, thisMon, endLab, eomTip, steps, SUMI, WARN, jarCards,
} = useForecast();
</script>

<template>
  <PageHeader :title="t('nav.forecast')" />
  <section class="view on" id="fc">
    <template v-if="!S">
      <p v-if="data.error.value" class="sm">{{ t("forecast.loadError") }}</p>
      <p v-else class="sm">{{ t("forecast.loading") }}</p>
    </template>
    <template v-else>
      <div class="ctl" id="fcCtl">
        <div><div class="pl" :data-tip="t('fc.x.ctlTip')">{{ t("forecast.based") }}</div><div class="seg"><button v-for="[v, l] in [[3, 'mo3'], [6, 'mo6'], [12, 'mo12']]" :key="v" :class="{ on: fc.n == v }" data-a="fc" @click="pick('n', v)">{{ tk("forecast." + l) }}</button></div></div>
      </div>

      <div class="grid g4" id="fcK">
        <BaseCard v-for="[k, l] in CARDS" :key="k" :hero="k == H">
          <div class="lbl"><span :data-tip="k ? null : eomTip">{{ k ? tk("forecast." + l) + " · " + endLab(k) : t("num.endMonthS", { month: thisMon }) }}</span></div>
          <div class="val"><small>₪</small>{{ (k ? d.bal[k] : d.really) < 0 ? "−" : "" }}{{ n0(k ? d.bal[k] : d.really) }}</div>
          <template v-if="k">
            <div class="sm"><span class="bd" :class="gap(k) >= 0 ? 'dn' : 'up'">{{ gap(k) >= 0 ? "▲" : "▼" }} ₪{{ n0(gap(k)) }}</span> {{ t("forecast.vsEnd", { month: thisMon }) }}</div>
            <div class="sm" style="margin-top:6px">{{ t("forecast.range", { lo: sg(d.lo[k]), hi: sg(d.hi[k]) }) }}</div>
          </template>
          <template v-else>
            <div class="sm">{{ t("fc.x.bankToday", { amt: fm(d.eom.bank) }) }}</div>
          </template>
        </BaseCard>
      </div>

      <div v-if="zeroMonths.length" class="sm neg" id="fcDiag" style="line-height:1.55">{{ t("forecast.diag.zero", { months: zeroMonths.join(", ") }) }}</div>

      <!-- the inner span keeps the parts around the dot together (polish.js puts the dot inside it) -->
      <h2><span>{{ M.wallet ? t("fc.x.chartTitle") : t("fc.x.chartTitleBank") }}</span></h2>
      <div class="card" id="fcChart">
        <div class="flex" style="justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px">
          <div class="flex sm" style="gap:18px;flex-wrap:wrap"><span><span class="dot" style="background:var(--acc)" /> {{ t("forecast.legBal") }}</span><span :data-tip="t('forecast.legRangeTip')"><span class="dot" style="background:color-mix(in srgb,var(--acc) 25%,transparent)" /> {{ t("forecast.legRange") }}</span></div>
          <span v-if="C.fn != null" class="bd up">{{ t("forecast.warnNeg", { when: ptName(C.fn) }) }}</span>
          <span v-else-if="C.fl != null" class="bd fl">{{ t("forecast.warnLow", { when: ptName(C.fl) }) }}</span>
          <span v-else class="bd dn">{{ t("forecast.warnOk") }}</span>
        </div>
        <div class="trw fcw">
          <svg ref="svgEl" class="fcs" style="direction:ltr" width="100%" :viewBox="`0 0 ${C.W} ${C.Ht}`" @pointermove="onMove" @pointerdown="onMove" @pointerleave="onLeave">
            <template v-for="(tk2, i) in C.ticks" :key="i"><line class="gl" :x1="0" :x2="C.W" :y1="tk2.y" :y2="tk2.y" stroke-dasharray="3 5" /><text :x="2" :y="tk2.y - 5" text-anchor="start">{{ tk2.label }}</text></template>
            <template v-if="C.zeroY != null"><line :x1="C.Pl" :x2="C.W - C.Pr" :y1="C.zeroY" :y2="C.zeroY" stroke="var(--neg)" stroke-width="1.5" stroke-dasharray="6 4" /><text :x="C.W - C.Pr" :y="C.zeroY - 5" text-anchor="end" style="fill:var(--neg)">{{ t("forecast.zero") }}</text></template>
            <defs><linearGradient id="fcg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".28" /><stop offset="1" stop-color="var(--acc)" stop-opacity=".06" /></linearGradient></defs>
            <polygon fill="url(#fcg)" :points="C.band" />
            <template v-for="k in [3, 6, 12].filter((x) => x <= H)" :key="'m' + k"><line :x1="C.X(k)" :x2="C.X(k)" :y1="C.Pt" :y2="C.Ht - C.Pb" stroke="var(--tx2)" stroke-opacity=".35" stroke-dasharray="2 5" /><text :x="k == H ? C.W : C.X(k)" :y="C.Pt - 7" :text-anchor="k == H ? 'end' : 'middle'" style="font-weight:600;fill:var(--tx)">{{ horizonLabel(k) }}</text></template>
            <polyline fill="none" stroke="var(--acc)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" :points="C.line" />
            <template v-for="p in C.pts" :key="'p' + p.k"><circle :cx="p.x" :cy="p.y" :r="big(p.k) ? 5.5 : 4" :fill="big(p.k) ? 'var(--acc)' : 'var(--bg)'" stroke="var(--acc)" stroke-width="2.5" /><text v-if="ptLabel(p)" :x="p.k === 'e' ? 0 : p.k === H ? C.W : p.x" :y="C.Ht - 9" :text-anchor="p.k === 'e' ? 'start' : p.k === H ? 'end' : 'middle'">{{ ptLabel(p) }}</text></template>
            <line class="trx" :x1="hover ? C.pts[hover.i].x : 0" :x2="hover ? C.pts[hover.i].x : 0" :y1="C.Pt" :y2="C.Ht - C.Pb" stroke="var(--tx)" stroke-opacity=".35" stroke-dasharray="3 3" :style="{ display: hover ? '' : 'none' }" />
            <circle class="trd" :cx="hover ? C.pts[hover.i].x : 0" :cy="hover ? C.pts[hover.i].y : 0" r="6" fill="var(--acc)" stroke="var(--bg)" stroke-width="2.5" :style="{ display: hover ? '' : 'none' }" />
          </svg>
          <div ref="tipEl" class="trtip" :style="hover ? { display: 'flex', inset: hover.py + 'px auto auto ' + hover.px + 'px' } : { display: 'none' }"><template v-if="hover"><b>{{ ptDay(hover.k) }}</b><span>{{ sg(realPt(hover.k).v) }}</span><small>{{ t("forecast.tipRange", { lo: sg(realPt(hover.k).lo), hi: sg(realPt(hover.k).hi) }) }}</small></template></div>
        </div>
      </div>

      <h2>{{ t("forecast.how.title") }}</h2>
      <div class="card fchow">
        <ol class="fcsum">
          <li v-for="(x, i) in steps" :key="i" :class="'s-' + x.k">
            <span v-if="x.op" class="op" aria-hidden="true"><svg v-if="x.op == 'go'" viewBox="0 0 24 24"><path d="M10 7l5 5-5 5" /></svg><template v-else>{{ x.op }}</template></span>
            <span class="qb" aria-hidden="true"><svg viewBox="0 0 24 24" v-html="SUMI[x.k]" /></span>
            <div class="d">
              <span class="k" :class="{ tipd: x.tip }" :data-tip="x.tip || null">{{ x.label }}</span>
              <b class="v"><bdi dir="ltr">{{ x.amt }}</bdi></b>
              <template v-for="(s, j) in x.sub || []" :key="j">
                <!-- money in − money out: on a narrow tile it may break after the "−" -->
                <small v-if="s[0] == 'io'" class="s io"><span>{{ s[1].split(" − ")[0] }} −</span> <span>{{ s[1].split(" − ")[1] }}</span></small>
                <small v-else class="s">{{ s[1] }}</small>
              </template>
            </div>
          </li>
        </ol>
      </div>

      <h2>{{ t("forecast.drives") }}</h2>
      <div id="fcTab">
        <table class="rt">
          <colgroup><col class="cn"><col class="cb"><col class="cv"><col class="cv"><col class="cv"><col class="cd"></colgroup>
          <thead><tr><th>{{ t("forecast.rowHead") }}</th><th class="mog">{{ monthsHead }}</th><th class="vc" :data-tip="t('forecast.th.usually')"><b class="thl">{{ t("forecast.usually") }}</b><small class="ths">{{ t("forecast.usuallySub") }}</small></th><th class="vc" :data-tip="t('forecast.th.next')"><b class="thl">{{ t("forecast.nextMonth") }}</b><small class="ths">{{ t("forecast.nextMonthSub") }}</small></th><th class="vc" :data-tip="t('forecast.th.year')"><b class="thl">{{ t("forecast.nextYear") }}</b><small class="ths">{{ t("forecast.nextYearSub") }}</small></th><th class="dc" :data-tip="t('forecast.th.dir')" :aria-label="t('forecast.direction')"><span class="dhl">{{ t("forecast.direction") }}</span><span class="dhs" aria-hidden="true">▲▼</span></th></tr></thead>
          <tbody>
            <template v-for="e in body" :key="e.x.key">
              <tr :class="e.tr">
                <td :class="{ mer: !e.tr }"><span v-if="e.link" class="catl" @click="goCat(e.link)">{{ e.label }}</span><span v-else :class="{ tipd: e.tip }" :data-tip="e.tip || null">{{ e.label }}</span></td>
                <td class="mog fcbars"><button type="button" class="fcbw" :aria-expanded="open.has(e.x.key)" :aria-label="t('forecast.showMonths', { name: e.label })" @click="toggle(e.x.key)"><span class="fcb"><span v-for="(b, i) in e.x.bars" :key="i" class="fcbar" :class="{ now: i == e.x.bars.length - 1, neg: b.v < 0 }" :data-tip="barTip(e, i)" data-ti="1"><i class="ex" :style="{ insetBlockEnd: b.b + '%', blockSize: b.h + '%' }" /><i v-if="i == e.x.bars.length - 1 && b.v >= 0" class="so" :style="{ insetBlockEnd: b.b + '%', blockSize: b.s + '%' }" /></span></span><svg class="fccv" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></button></td>
                <td v-for="(v, i) in e.vals" :key="i" class="am" :class="e.signed ? (v < 0 ? 'neg' : 'pos') : ''">{{ amt(v) }}</td>
                <td class="dc"><span v-if="e.x.dr.none" class="fcnd" :aria-label="t('forecast.dir.none')">—</span><span v-else class="bd" :class="e.x.dr.cls" :aria-label="tk('forecast.dir.' + e.x.dr.word)"><span aria-hidden="true">{{ e.x.dr.sym.trim() }}</span><span class="dw" aria-hidden="true"> {{ tk("forecast.dir." + e.x.dr.word) }}</span></span></td>
              </tr>
              <!-- a row's months: one small cell each (month above amount), from the row's start; this month marked.
                   It opens and closes smoothly (the inner box grows from no height). -->
              <tr v-if="seen.has(e.x.key)" class="fcx"><td colspan="6"><div class="fcxw" :class="{ on: open.has(e.x.key) }" :inert="!open.has(e.x.key)"><div class="fcxi"><ul class="fcml"><li v-for="m in e.x.months" :key="m.j" :class="{ now: m.j == last, more: m.so != null || m.counted != null, neg: m.v < 0 }"><span>{{ m.label }}</span><b class="num">{{ m.so != null ? t("forecast.soFarAmt", { amt: amt(m.so) }) : amt(m.v) }}</b><small v-if="m.up != null">{{ upText(m.up) }}</small><small v-if="m.lk != null">{{ lkText(m.lk) }}</small><small v-if="m.so != null">{{ t("forecast.normallyAmt", { amt: amt(m.v) }) }}</small><small v-if="m.counted != null">{{ t("forecast.countedAt", { amt: amt(m.counted) }) }}</small></li></ul></div></div></td></tr>
            </template>
            <tr class="tot bal"><td><span class="tipd" :data-tip="t('forecast.endTip')">{{ t("forecast.endRow") }}</span></td><td class="mog" /><td /><td class="am">{{ sg(TT.end1) }}</td><td class="am">{{ sg(TT.endH) }}</td><td /></tr>
          </tbody>
        </table>
      </div>

      <h2>{{ t("forecast.jarTitle") }}</h2>
      <div id="fcJars">
        <CardColumns v-if="jarCards.length" :items="jarCards" :min="340" :item-key="(c) => c.j.id">
          <template #default="{ item: c }">
          <div class="card jf">
            <div class="jfh"><div style="min-width:0"><b>{{ tx(c.j.n) }}</b><div class="sm">{{ c.sub }}</div></div><span class="bd" :class="c.chip[0]"><span>{{ c.chip[1] }}</span></span></div>
            <div class="jfc">
              <svg :viewBox="`0 0 ${c.sp.W} ${c.sp.Ht}`" width="100%" :height="c.sp.Ht" preserveAspectRatio="none" aria-hidden="true">
                <defs><linearGradient :id="'jfg' + c.j.id" x1="0" x2="0" y1="0" y2="1"><stop offset="0" :stop-color="c.sp.col" stop-opacity=".35" /><stop offset="1" :stop-color="c.sp.col" stop-opacity="0" /></linearGradient></defs>
                <line v-if="c.sp.goal != null" :x1="c.sp.P" :x2="c.sp.W - c.sp.P" :y1="c.sp.goal" :y2="c.sp.goal" :stroke="c.sp.col" stroke-opacity=".6" stroke-dasharray="4 4" />
                <polygon :fill="`url(#jfg${c.j.id})`" :points="c.sp.area" />
                <polyline fill="none" :stroke="c.sp.col" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" :points="c.sp.pts" />
                <circle v-for="(p, i) in c.sp.dots" :key="i" :cx="p.cx" :cy="p.cy" r="3.2" fill="var(--bg)" :stroke="c.sp.col" stroke-width="2" vector-effect="non-scaling-stroke" />
              </svg>
            </div>
            <div class="jfs"><div v-for="x in c.tiles" :key="x.label"><span>{{ x.label }}</span><b class="num">{{ x.v }}</b><i :class="{ pos: x.pos }">{{ x.g }}</i></div></div>
            <div v-if="c.warn" class="jfw"><svg viewBox="0 0 24 24" aria-hidden="true" v-html="WARN" /><span>{{ c.warn }}</span></div>
          </div>
          </template>
        </CardColumns>
        <div v-else class="card sm">{{ t("forecast.j.none") }}</div>
      </div>

      <YearsAhead :model="M" />
    </template>
  </section>
</template>
