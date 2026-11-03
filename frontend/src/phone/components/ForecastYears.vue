<script setup>
// The phone's Forecast → Years ahead: the computer's card for one column. At the top the three tiles for the choices as
// they are now (what they add up to by an age, when the goal is reached and what it would take each month; a tap explains
// each), then the quieter goal tile (Save this goal, or Update goal and Remove goal once one is saved), the way to add an
// age when none is saved, the four choices (goal, each month with the way back to your average, age, growth) and the chart.
// The same numbers as the computer (pagelogic/yearsAhead.js). Only saving the goal changes the data.
import { ref, computed } from "vue";
import MoneyInput from "../../components/MoneyInput.vue";
import YearsChart from "../../components/charts/YearsChart.vue";
import { explain } from "../../core/tooltip.js";
import Segmented from "./Segmented.vue";
import PIcon from "./PIcon.vue";
import { useYearsAhead, useScrollToYears } from "../../pagelogic/yearsAhead.js";
import { usePhoneNav } from "../navigation.js";

const props = defineProps({ model: { type: Object, required: true } });
const { YAI, Y, Y_, set, back, G, same, saveGoal, removeGoal, goalState, atKey, typeAt, leaveAt, answer, mTip, ptName, axisLabel, legMine, pc, GROWTH } = useYearsAhead(computed(() => props.model));
const nav = usePhoneNav();
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
    <div class="ph-group-b pad">
      <ol class="ph-fc-sum ph-ya-sum" aria-live="polite">
        <li v-for="(r, i) in answer" :key="r.k" :class="'r-' + r.k" :style="{ '--i': i }" role="button" tabindex="0" @click="explain(r.tip)" @keydown.enter="explain(r.tip)">
          <span class="qb" aria-hidden="true"><PIcon :svg="YAI[r.k]" /></span>
          <span class="d">
            <span class="k"><span>{{ r.label }}</span></span>
            <b class="v"><bdi class="ph-amt">{{ r.value }}</bdi> <small v-if="r.unit">{{ r.unit }}</small></b>
            <small class="s">{{ r.sub }}</small>
          </span>
        </li>
        <!-- saving the goal: Save this goal, or (once saved) Update goal when the choices differ, and Remove goal -->
        <li class="r-goal" :class="'g-' + goalState.k" :style="{ '--i': 3 }">
          <span class="d">
            <span class="k">{{ Y_("goal") }}</span>
            <b class="gh">{{ goalState.head }}</b>
            <small class="s">{{ goalState.sub }}</small>
          </span>
          <span class="ph-ya-goal-b">
            <template v-if="G">
              <button type="button" class="ph-btn" :disabled="same" @click="saveGoal">{{ Y_("update") }}</button>
              <button type="button" class="ph-btn tonal" @click="removeGoal">{{ Y_("remove") }}</button>
            </template>
            <button v-else type="button" class="ph-btn" @click="saveGoal">{{ Y_("save") }}</button>
          </span>
        </li>
      </ol>

      <!-- with no age saved, a way to add it (then everything counts by age) -->
      <div v-if="!Y.hasAge" class="ph-ya-inv">
        <PIcon :svg="PERSON" />
        <span>{{ Y_("noAge") }}</span>
        <button type="button" class="ph-btn tonal" @click="nav.push('settingsSection', 'prof')">{{ Y_("addAge") }}</button>
      </div>

      <!-- the four choices -->
      <div class="ph-ya-ctl">
        <div class="fld">
          <div class="ph-ya-lh"><label for="phYaGoal"><span :data-tip="Y_('goalTip')">{{ Y_("goal") }}</span></label></div>
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
          <div class="ph-ya-lh"><label for="phYaAt"><span :data-tip="Y.hasAge ? Y_('atTip') : Y_('yrsTip')"><span>{{ Y.hasAge ? Y_("byAge") : Y_("inYears") }}</span></span></label></div>
          <input id="phYaAt" type="text" inputmode="numeric" :value="Y.at" @input="typeAt" @change="leaveAt">
          <input type="range" class="ya-sl" :min="Y.lo" :max="Y.hi" step="1" :value="Y.at" :aria-label="Y.hasAge ? Y_('byAge') : Y_('inYears')" @input="set(atKey, +$event.target.value)">
        </div>
        <div class="fld">
          <div class="ph-ya-lh"><label><span :data-tip="Y_('gTip')">{{ Y_("g") }}</span></label></div>
          <Segmented :model-value="Y.g" :options="growth" :label="Y_('g')" @update:model-value="set('g', $event)" />
        </div>
      </div>

      <!-- the chart -->
      <div class="ph-ya-out">
        <div class="ph-ya-leg">
          <span><span class="dot" style="background:var(--acc)" />{{ legMine }}</span>
          <span v-if="Y.changed"><i class="ya-dash pace" />{{ Y_("legPace") }}</span>
          <span><i class="ya-dash goal" />{{ Y_("legGoal") }}</span>
        </div>
        <YearsChart :chart="Y.chart" :name="ptName" :axis="axisLabel" :label="Y_('chartLabel')" :pace-label="Y_('legPace')" :height="220" />
        <p class="ph-ya-axis">{{ Y.hasAge ? Y_("axisAge") : Y_("axisYears") }}</p>
      </div>
    </div>
  </section>
</template>
