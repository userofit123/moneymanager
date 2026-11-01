<script setup>
// Forecast → Years ahead (computer): one card. At the top three tiles for the choices as they are now (what they add up to by
// an age, when the goal is reached and what it would take each month), each explained in its tooltip; under them the choices in
// one row (goal, each month with your average and the way back to it, age, growth), then the chart across the card.
// What it knows lives in pagelogic/yearsAhead.js (shared with the phone's Forecast screen). Nothing here changes the data.
import { ref, computed } from "vue";
import MoneyInput from "../../components/MoneyInput.vue";
import YearsChart from "../../components/charts/YearsChart.vue";
import { useYearsAhead } from "../../pagelogic/yearsAhead.js";
import { openSettingsTab } from "../settings/tab.js";
import { go } from "../../router.js";

const props = defineProps({ model: { type: Object, required: true } });
const { YAI, Y, Y_, set, back, atKey, typeAt, leaveAt, answer, avg, ptName, axisLabel, legMine, pc, GROWTH, fm } = useYearsAhead(computed(() => props.model));
const toProfile = () => { openSettingsTab("prof"); go("/settings"); };
// an amount box left empty while typing keeps the last amount
const setNum = (k, v) => { if (v !== "" && isFinite(+v)) set(k, +v); };
// …and shows it again when the box is left empty
const redo = ref(0);
const fill = (e) => { if (!e.target.value.trim()) redo.value++; };
</script>

<template>
  <h2 id="fcYears"><span>{{ Y_("title") }}</span></h2>
  <div class="card ya">
    <ol class="fcsum ya-sum" aria-live="polite">
      <li v-for="r in answer" :key="r.k" :class="'r-' + r.k">
        <span class="qb" aria-hidden="true"><svg viewBox="0 0 24 24" v-html="YAI[r.k]" /></span>
        <div class="d">
          <!-- the label's text sits in its own span, so a new label never removes the tooltip's (i) after it -->
          <span class="k tipd" :data-tip="r.tip"><span>{{ r.label }}</span></span>
          <b class="v"><bdi>{{ r.value }}</bdi> <small v-if="r.unit">{{ r.unit }}</small></b>
          <small class="s">{{ r.sub }}</small>
        </div>
      </li>
    </ol>
    <div v-if="!Y.hasAge" class="ya-inv">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg>
      <span>{{ Y_("noAge") }}</span>
      <button type="button" class="btn o s" data-a="yaAge" @click="toProfile">{{ Y_("addAge") }}</button>
    </div>

    <div class="ya-ctl">
      <div class="fld">
        <div class="ya-lh"><label for="yaGoal"><span class="tipd" :data-tip="Y_('goalTip')">{{ Y_("goal") }}</span></label></div>
        <MoneyInput id="yaGoal" :key="'goal' + redo" @blur="fill" :model-value="String(Y.goal)" @update:model-value="setNum('goal', $event)" />
      </div>
      <div class="fld">
        <!-- the way back to your average, at the end of the heading, only when the amount differs from it -->
        <div class="ya-lh">
          <label for="yaM"><span class="tipd" :data-tip="Y_('mTip', { amount: fm(Y.kept) })">{{ Y_("m") }}</span></label>
          <button v-if="Y.changed" type="button" class="ya-back" data-a="yaBack" @click="back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>{{ Y_("back") }}</button>
        </div>
        <MoneyInput id="yaM" :key="'m' + redo" @blur="fill" :model-value="String(Y.m)" @update:model-value="setNum('m', $event)" />
        <input type="range" class="ya-sl" min="0" :max="Y.slider.max" :step="Y.slider.step" :value="Math.min(Y.m, Y.slider.max)" :aria-label="Y_('m')" @input="set('m', +$event.target.value)">
        <div class="sm ya-avg"><span class="tipd" :data-tip="avg.tip"><span>{{ avg.text }}</span></span></div>
      </div>
      <div class="fld">
        <div class="ya-lh"><label for="yaAt"><span class="tipd" :data-tip="Y.hasAge ? Y_('atTip') : Y_('yrsTip')"><span>{{ Y.hasAge ? Y_("byAge") : Y_("inYears") }}</span></span></label></div>
        <input id="yaAt" type="text" inputmode="numeric" :value="Y.at" @input="typeAt" @change="leaveAt">
        <input type="range" class="ya-sl" :min="Y.lo" :max="Y.hi" step="1" :value="Y.at" :aria-label="Y.hasAge ? Y_('byAge') : Y_('inYears')" @input="set(atKey, +$event.target.value)">
      </div>
      <div class="fld">
        <div class="ya-lh"><label><span class="tipd" :data-tip="Y_('gTip')">{{ Y_("g") }}</span></label></div>
        <div class="seg ya-g" role="group" :aria-label="Y_('g')"><button v-for="g in GROWTH" :key="g" type="button" :class="{ on: Y.g == g }" :aria-pressed="Y.g == g" @click="set('g', g)">{{ pc(g) }}%</button></div>
      </div>
    </div>
    <div class="ya-out">
      <div class="flex sm ya-leg">
        <span><span class="dot" style="background:var(--acc)" /> {{ legMine }}</span>
        <span v-if="Y.changed"><i class="ya-dash pace" /> {{ Y_("legPace") }}</span>
        <span><i class="ya-dash goal" /> {{ Y_("legGoal") }}</span>
      </div>
      <YearsChart :chart="Y.chart" :name="ptName" :axis="axisLabel" :label="Y_('chartLabel')" :pace-label="Y_('legPace')" />
      <div class="sm ya-axis">{{ Y.hasAge ? Y_("axisAge") : Y_("axisYears") }}</div>
    </div>
  </div>
</template>
