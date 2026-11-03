<script setup>
// The phone's Forecast → Years ahead: three rows for the choices as they are now (what they add up to by an age, when the goal
// is reached and what it would take each month), each explained in its tooltip, then saving the goal, the choices and the chart. The same numbers as the
// computer page (pagelogic/yearsAhead.js). Only saving the goal (Save this goal, Update goal, Remove goal) changes the data.
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import MoneyInput from "../../components/MoneyInput.vue";
import YearsChart from "../../components/charts/YearsChart.vue";
import Segmented from "./Segmented.vue";
import PIcon from "./PIcon.vue";
import { useYearsAhead, useScrollToYears } from "../../pagelogic/yearsAhead.js";
import { usePhoneNav } from "../navigation.js";

const props = defineProps({ model: { type: Object, required: true } });
const { YAI, Y, Y_, set, back, G, same, saveGoal, removeGoal, goalState, atKey, typeAt, leaveAt, answer, mTip, ptName, axisLabel, legMine, pc, GROWTH } = useYearsAhead(computed(() => props.model));
const nav = usePhoneNav();
const { t } = useI18n();
const growth = computed(() => GROWTH.map((g) => ({ value: g, label: pc(g) + "%" })));
// an amount box left empty while typing keeps the last amount
const setNum = (k, v) => { if (v !== "" && isFinite(+v)) set(k, +v); };
// …and shows it again when the box is left empty
const redo = ref(0);
const fill = (e) => { if (!e.target.value.trim()) redo.value++; };
const BACK = '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>';
const PERSON = '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>';
// opened from Home's goal card: Years ahead comes into view
const top = ref(null);
useScrollToYears(top);
</script>

<template>
  <section ref="top" class="ph-group ph-ya">
    <div class="ph-group-h"><h3>{{ Y_("title") }}</h3></div>
    <div class="ph-group-b ph-ya-ans" aria-live="polite">
      <div v-for="r in answer" :key="r.k" class="ph-row ph-two ph-ya-r" :class="'r-' + r.k">
        <span class="ph-tile"><PIcon :svg="YAI[r.k]" /></span>
        <span class="ph-row-main">
          <!-- the label's text sits in its own span, so a new label never removes the tooltip's (i) after it -->
          <span class="ph-row-t ph-fc-wrap"><span :data-tip="r.tip"><span>{{ r.label }}</span></span></span>
          <span class="ph-row-s ph-fc-wrap">{{ r.sub }}</span>
        </span>
        <span class="ph-ya-e"><b class="ph-amt"><bdi>{{ r.value }}</bdi></b> <small v-if="r.unit">{{ r.unit }}</small></span>
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
    <!-- try other amounts: the goal, how much each month, when, and growth -->
    <h4 class="ph-ya-h">{{ t("phone.forecast.tryOther") }}</h4>
    <div class="ph-group-b ph-ya-play">
      <div class="fld">
        <label for="phYaGoal"><span :data-tip="Y_('goalTip')">{{ Y_("goal") }}</span></label>
        <MoneyInput id="phYaGoal" :key="'goal' + redo" @blur="fill" :model-value="String(Y.goal)" @update:model-value="setNum('goal', $event)" />
      </div>
      <div class="fld">
        <!-- the way back to your average, at the end of the heading, only when the amount differs from it -->
        <div class="ph-ya-lh">
          <label for="phYaM"><span :data-tip="mTip">{{ Y_("m") }}</span></label>
          <button v-if="Y.changed" type="button" class="ph-link ph-ya-back" @click="back"><PIcon :svg="BACK" dir />{{ Y_("back") }}</button>
        </div>
        <MoneyInput id="phYaM" :key="'m' + redo" @blur="fill" :model-value="String(Y.m)" @update:model-value="setNum('m', $event)" />
        <input type="range" class="ya-sl" min="0" :max="Y.slider.max" :step="Y.slider.step" :value="Math.min(Y.m, Y.slider.max)" :aria-label="Y_('m')" @input="set('m', +$event.target.value)">
      </div>
      <div class="fld">
        <label for="phYaAt"><span :data-tip="Y.hasAge ? Y_('atTip') : Y_('yrsTip')"><span>{{ Y.hasAge ? Y_("byAge") : Y_("inYears") }}</span></span></label>
        <input id="phYaAt" type="text" inputmode="numeric" :value="Y.at" @input="typeAt" @change="leaveAt">
        <input type="range" class="ya-sl" :min="Y.lo" :max="Y.hi" step="1" :value="Y.at" :aria-label="Y.hasAge ? Y_('byAge') : Y_('inYears')" @input="set(atKey, +$event.target.value)">
      </div>
      <div class="fld">
        <label><span :data-tip="Y_('gTip')">{{ Y_("g") }}</span></label>
        <Segmented :model-value="Y.g" :options="growth" :label="Y_('g')" @update:model-value="set('g', $event)" />
      </div>
    </div>
    <!-- saving the goal: whether it is saved, then Save this goal, or (once saved) Update goal when the choices differ, and Remove goal -->
    <div class="ph-group-b ph-ya-save" :class="'g-' + goalState.k">
      <div class="ph-ya-save-t">
        <span class="ph-ya-save-k">{{ Y_("goal") }}</span>
        <b>{{ goalState.head }}</b>
        <span class="ph-ya-save-s">{{ goalState.sub }}</span>
      </div>
      <div class="ph-ya-save-b">
        <template v-if="G">
          <button type="button" class="ph-btn tonal" :disabled="same" @click="saveGoal">{{ Y_("update") }}</button>
          <button type="button" class="ph-btn tonal" @click="removeGoal">{{ Y_("remove") }}</button>
        </template>
        <button v-else type="button" class="ph-btn tonal" @click="saveGoal">{{ Y_("save") }}</button>
      </div>
    </div>
    <!-- with no age saved, a way to add it (then everything counts by age) -->
    <div v-if="!Y.hasAge" class="ph-group-b ph-ya-inv">
      <button type="button" class="ph-row ph-two" @click="nav.push('settingsSection', 'prof')">
        <span class="ph-tile"><PIcon :svg="PERSON" /></span>
        <span class="ph-row-main"><span class="ph-row-t">{{ Y_("addAge") }}</span><span class="ph-row-s ph-fc-wrap">{{ Y_("noAge") }}</span></span>
        <PIcon name="chevron" dir class="ph-chev" />
      </button>
    </div>
  </section>
</template>
