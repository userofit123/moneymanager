<script setup>
// Forecast → Years ahead (computer): one card with the plain answer (what today's pace adds up to by an age, and when it
// reaches the goal) and one card to try other amounts, with the chart and what they would do.
// What it knows lives in pagelogic/yearsAhead.js (shared with the phone's Forecast screen). Nothing here changes the data.
import { computed } from "vue";
import MoneyInput from "../../components/MoneyInput.vue";
import EmText from "../../components/EmText.vue";
import YearsChart from "../../components/charts/YearsChart.vue";
import { useYearsAhead } from "../../pagelogic/yearsAhead.js";
import { openSettingsTab } from "../settings/tab.js";
import { go } from "../../router.js";

const props = defineProps({ model: { type: Object, required: true } });
const { Y, Y_, set, back, atKey, answer, results, ptName, axisLabel, pc, GROWTH, fm } = useYearsAhead(computed(() => props.model));
const toProfile = () => { openSettingsTab("prof"); go("/settings"); };
const basis = computed(() => (Y.value.pace < 0 ? Y_("paceNeg", { amount: fm(-Y.value.pace) }) : Y_("pace", { amount: fm(Y.value.pace), start: fm(Y.value.start) })) + (Y.value.g > 0 ? " " + Y_("growth", { pc: pc(Y.value.g) }) : ""));
const basisTip = computed(() => Y_("paceTip") + "\n---\n" + Y_("startTip"));
// an amount box left empty while typing keeps the last amount
const setNum = (k, v) => { if (v !== "" && isFinite(+v)) set(k, +v); };
</script>

<template>
  <h2 id="fcYears"><span>{{ Y_("title") }}</span></h2>
  <div class="card ya-ans">
    <p class="ya-l1"><EmText :text="answer.at" /></p>
    <p class="ya-l2"><EmText :text="answer.reach" /></p>
    <p class="sm ya-basis"><span class="tipd" :data-tip="basisTip">{{ basis }}</span></p>
    <div v-if="!Y.hasAge" class="ya-inv">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg>
      <span>{{ Y_("noAge") }}</span>
      <button type="button" class="btn o s" data-a="yaAge" @click="toProfile">{{ Y_("addAge") }}</button>
    </div>
  </div>

  <div class="card ya-play">
    <div class="ya-h"><h3>{{ Y_("play") }}</h3><span class="sm">{{ Y_("playNote") }}</span></div>
    <div class="ya-grid">
      <div class="ya-ctl">
        <div class="fld">
          <label for="yaM"><span class="tipd" :data-tip="Y_('mTip', { amount: fm(Math.max(0, Y.pace)) })">{{ Y_("m") }}</span></label>
          <MoneyInput id="yaM" :model-value="String(Y.m)" @update:model-value="setNum('m', $event)" />
          <input type="range" min="0" :max="Math.max(20000, Math.ceil((Math.max(Y.m, Y.pace) * 2) / 1000) * 1000)" step="100" :value="Y.m" :aria-label="Y_('m')" @input="set('m', +$event.target.value)">
          <button v-if="Y.changed" type="button" class="ya-back" data-a="yaBack" @click="back">{{ Y_("back") }} ({{ fm(Math.max(0, Y.pace)) }})</button>
        </div>
        <div class="fld">
          <label for="yaGoal">{{ Y_("goal") }}</label>
          <MoneyInput id="yaGoal" :model-value="String(Y.goal)" @update:model-value="setNum('goal', $event)" />
        </div>
        <div class="fld">
          <label for="yaAt">{{ Y.hasAge ? Y_("byAge") : Y_("inYears") }}</label>
          <div class="ya-rng"><input id="yaAt" type="range" :min="Y.lo" :max="Y.hi" step="1" :value="Y.at" @input="set(atKey, +$event.target.value)"><output class="num">{{ Y.hasAge ? Y.at : Y_("years", { n: Y.at }, Y.at) }}</output></div>
        </div>
        <div class="fld">
          <label><span class="tipd" :data-tip="Y_('gTip')">{{ Y_("g") }}</span></label>
          <div class="seg ya-g" role="group" :aria-label="Y_('g')"><button v-for="g in GROWTH" :key="g" type="button" :class="{ on: Y.g == g }" :aria-pressed="Y.g == g" @click="set('g', g)">{{ pc(g) }}%</button></div>
        </div>
      </div>
      <div class="ya-out">
        <div class="flex sm ya-leg">
          <span><span class="dot" style="background:var(--acc)" /> {{ Y_("legMine") }}</span>
          <span><i class="ya-dash pace" /> {{ Y_("legPace") }}</span>
          <span><i class="ya-dash goal" /> {{ Y_("legGoal") }} · {{ fm(Y.goal) }}</span>
        </div>
        <YearsChart :chart="Y.chart" :name="ptName" :axis="axisLabel" :label="Y_('chartLabel')" :pace-label="Y_('legPace')" />
        <div class="sm ya-axis">{{ Y.hasAge ? Y_("axisAge") : Y_("axisYears") }}</div>
        <ul class="ya-res">
          <li v-for="r in results" :key="r.k" :class="'r-' + r.k"><EmText :text="r.text" /><small v-if="r.sub">{{ r.sub }}</small></li>
        </ul>
      </div>
    </div>
  </div>
</template>
