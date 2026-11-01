<script setup>
// The phone's Forecast → Years ahead: the answer for the choices as they are now (what they add up to by an age, when the
// goal is reached and what it would take) and what it starts from, then the choices and the chart. The same numbers as the
// computer page (pagelogic/yearsAhead.js). Nothing here changes the data.
import { ref, computed } from "vue";
import MoneyInput from "../../components/MoneyInput.vue";
import EmText from "../../components/EmText.vue";
import YearsChart from "../../components/charts/YearsChart.vue";
import Segmented from "./Segmented.vue";
import PIcon from "./PIcon.vue";
import { useYearsAhead } from "../../pagelogic/yearsAhead.js";
import { usePhoneNav } from "../navigation.js";

const props = defineProps({ model: { type: Object, required: true } });
const { Y, Y_, set, back, atKey, answer, basis, ptName, axisLabel, legMine, pc, GROWTH, fm } = useYearsAhead(computed(() => props.model));
const nav = usePhoneNav();
const growth = computed(() => GROWTH.map((g) => ({ value: g, label: pc(g) + "%" })));
// an amount box left empty while typing keeps the last amount
const setNum = (k, v) => { if (v !== "" && isFinite(+v)) set(k, +v); };
// …and shows it again when the box is left empty
const redo = ref(0);
const fill = (e) => { if (!e.target.value.trim()) redo.value++; };
const PERSON = '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>';
</script>

<template>
  <section class="ph-group ph-ya">
    <div class="ph-group-h"><h3>{{ Y_("title") }}</h3></div>
    <div class="ph-group-b ph-ya-ans">
      <p v-for="r in answer" :key="r.k" class="ph-ya-r" :class="'r-' + r.k"><EmText :text="r.text" /><small v-if="r.sub">{{ r.sub }}</small></p>
      <p class="ph-ya-basis"><span :data-tip="Y_('avgTip')">{{ basis.avg }}</span> <span :data-tip="Y_('startTip')">{{ basis.start }}</span></p>
      <button v-if="Y.changed" type="button" class="ph-link ph-ya-back" @click="back">{{ Y_("back", { amount: fm(Y.kept) }) }}</button>
    </div>
    <button v-if="!Y.hasAge" type="button" class="ph-ya-inv" @click="nav.push('settingsSection', 'prof')">
      <PIcon :svg="PERSON" />
      <span>{{ Y_("noAge") }}<b>{{ Y_("addAge") }}</b></span>
      <PIcon name="chevron" dir class="ph-chev" />
    </button>
    <div class="ph-group-b ph-ya-play">
      <div class="fld">
        <label for="phYaGoal">{{ Y_("goal") }}</label>
        <MoneyInput id="phYaGoal" :key="'goal' + redo" @blur="fill" :model-value="String(Y.goal)" @update:model-value="setNum('goal', $event)" />
      </div>
      <div class="fld">
        <label for="phYaM"><span :data-tip="Y_('mTip', { amount: fm(Y.kept) })">{{ Y_("m") }}</span></label>
        <MoneyInput id="phYaM" :key="'m' + redo" @blur="fill" :model-value="String(Y.m)" @update:model-value="setNum('m', $event)" />
        <input type="range" class="ya-sl" min="0" :max="Y.slider.max" :step="Y.slider.step" :value="Math.min(Y.m, Y.slider.max)" :aria-label="Y_('m')" @input="set('m', +$event.target.value)">
      </div>
      <div class="fld">
        <label for="phYaAt">{{ Y.hasAge ? Y_("byAge") : Y_("inYears") }}</label>
        <div class="ph-ya-rng"><input id="phYaAt" type="range" class="ya-sl" :min="Y.lo" :max="Y.hi" step="1" :value="Y.at" @input="set(atKey, +$event.target.value)"><output class="ph-amt" for="phYaAt">{{ Y.hasAge ? Y.at : Y_("years", { n: Y.at }, Y.at) }}</output></div>
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
        <span><i class="ln" />{{ legMine }}</span>
        <span v-if="Y.changed"><i class="ya-dash pace" />{{ Y_("legPace") }}</span>
        <span><i class="ya-dash goal" />{{ Y_("legGoal") }}</span>
      </div>
    </div>
    <p class="ph-group-n">{{ Y_("playNote") }}</p>
  </section>
</template>
