<script setup>
// The phone's Forecast → Years ahead: the plain answer (what today's pace adds up to by an age, and when it reaches the goal),
// then a place to try other amounts with the chart and what they would do. The same numbers as the computer page
// (pagelogic/yearsAhead.js). Nothing here changes the data.
import { computed } from "vue";
import MoneyInput from "../../components/MoneyInput.vue";
import EmText from "../../components/EmText.vue";
import YearsChart from "../../components/charts/YearsChart.vue";
import Segmented from "./Segmented.vue";
import PIcon from "./PIcon.vue";
import { useYearsAhead } from "../../pagelogic/yearsAhead.js";
import { usePhoneNav } from "../navigation.js";

const props = defineProps({ model: { type: Object, required: true } });
const { Y, Y_, set, back, atKey, answer, results, ptName, axisLabel, pc, GROWTH, fm } = useYearsAhead(computed(() => props.model));
const nav = usePhoneNav();
const basis = computed(() => (Y.value.pace < 0 ? Y_("paceNeg", { amount: fm(-Y.value.pace) }) : Y_("pace", { amount: fm(Y.value.pace), start: fm(Y.value.start) })) + (Y.value.g > 0 ? " " + Y_("growth", { pc: pc(Y.value.g) }) : ""));
const basisTip = computed(() => Y_("paceTip") + "\n---\n" + Y_("startTip"));
const growth = computed(() => GROWTH.map((g) => ({ value: g, label: pc(g) + "%" })));
// an amount box left empty while typing keeps the last amount
const setNum = (k, v) => { if (v !== "" && isFinite(+v)) set(k, +v); };
const PERSON = '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>';
</script>

<template>
  <section class="ph-group ph-ya">
    <div class="ph-group-h"><h3>{{ Y_("title") }}</h3></div>
    <div class="ph-group-b ph-ya-ans">
      <p class="ph-ya-l1"><EmText :text="answer.at" /></p>
      <p class="ph-ya-l2"><EmText :text="answer.reach" /></p>
      <p class="ph-ya-basis"><span :data-tip="basisTip">{{ basis }}</span></p>
    </div>
    <button v-if="!Y.hasAge" type="button" class="ph-ya-inv" @click="nav.push('settingsSection', 'prof')">
      <PIcon :svg="PERSON" />
      <span>{{ Y_("noAge") }}<b>{{ Y_("addAge") }}</b></span>
      <PIcon name="chevron" dir class="ph-chev" />
    </button>
  </section>

  <section class="ph-group ph-ya">
    <div class="ph-group-h"><h3>{{ Y_("play") }}</h3></div>
    <div class="ph-group-b ph-ya-play">
      <div class="fld">
        <label for="phYaM"><span :data-tip="Y_('mTip', { amount: fm(Math.max(0, Y.pace)) })">{{ Y_("m") }}</span></label>
        <MoneyInput id="phYaM" :model-value="String(Y.m)" @update:model-value="setNum('m', $event)" />
        <input type="range" min="0" :max="Math.max(20000, Math.ceil((Math.max(Y.m, Y.pace) * 2) / 1000) * 1000)" step="100" :value="Y.m" :aria-label="Y_('m')" @input="set('m', +$event.target.value)">
        <button v-if="Y.changed" type="button" class="ph-link ph-ya-back" @click="back">{{ Y_("back") }} ({{ fm(Math.max(0, Y.pace)) }})</button>
      </div>
      <div class="fld">
        <label for="phYaGoal">{{ Y_("goal") }}</label>
        <MoneyInput id="phYaGoal" :model-value="String(Y.goal)" @update:model-value="setNum('goal', $event)" />
      </div>
      <div class="fld">
        <label for="phYaAt">{{ Y.hasAge ? Y_("byAge") : Y_("inYears") }}</label>
        <div class="ph-ya-rng"><input id="phYaAt" type="range" :min="Y.lo" :max="Y.hi" step="1" :value="Y.at" @input="set(atKey, +$event.target.value)"><output class="ph-amt">{{ Y.hasAge ? Y.at : Y_("years", { n: Y.at }, Y.at) }}</output></div>
      </div>
      <div class="fld">
        <label><span :data-tip="Y_('gTip')">{{ Y_("g") }}</span></label>
        <Segmented :model-value="Y.g" :options="growth" :label="Y_('g')" @update:model-value="set('g', $event)" />
      </div>
    </div>
    <div class="ph-group-b ph-ya-chart">
      <YearsChart :chart="Y.chart" :name="ptName" :axis="axisLabel" :label="Y_('chartLabel')" :pace-label="Y_('legPace')" :height="200" />
      <p class="ph-ya-axis">{{ Y.hasAge ? Y_("axisAge") : Y_("axisYears") }}</p>
      <div class="ph-ya-leg">
        <span><i class="ln" />{{ Y_("legMine") }}</span>
        <span><i class="ya-dash pace" />{{ Y_("legPace") }}</span>
        <span><i class="ya-dash goal" />{{ Y_("legGoal") }}</span>
      </div>
    </div>
    <div class="ph-group-b ph-ya-res">
      <p v-for="r in results" :key="r.k" class="ph-ya-r"><EmText :text="r.text" /><small v-if="r.sub">{{ r.sub }}</small></p>
    </div>
    <p class="ph-group-n">{{ Y_("playNote") }}</p>
  </section>
</template>
