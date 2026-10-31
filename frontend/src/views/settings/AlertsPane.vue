<script setup>
// Settings → Which alerts: each kind of alert on or off (with its amount under it), and dismissed ones back.
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { go, hrefOf } from "../../router.js";
import { pages } from "../../routes.js";
import SetSection from "./SetSection.vue";
import SetRow from "./SetRow.vue";

const { t } = useI18n();
const tk = (k) => t("settings.alr." + k);
const S = computed(() => data.state.value);
onMounted(() => { data.start(); });
const TYPES = ["jars", "bills", "price", "budget", "card", "large", "xfer", "recon", "pending", "sync", "uncat", "forecast", "docs"];
// the amount that sets off an alert, shown right under its switch
const NUM = { card: "cardPct", large: "largeAmt", bills: "billDays", budget: "budgetPct" };
// none of these write a change-history line
const setOn = (k, on) => data.change((s) => { s.cfg[k] = on ? 1 : 0; return []; });
const setNum = (k, v) => data.change((s) => { s.cfg[k] = +v; return []; });
const reset = () => data.change((s) => { s.dismissed = {}; return []; });
const toAlerts = () => go(hrefOf(pages.find((p) => p.name === "alerts")));
</script>

<template>
  <div v-if="S" id="setAlr">
    <SetSection icon="bell" :title="tk('showT')" :desc="tk('showD')">
      <template v-for="k in TYPES" :key="k">
        <SetRow toggle :title="tk('types.' + k)" :data-k="k" :model-value="!!S.cfg[k]" @update:model-value="setOn(k, $event)" />
        <SetRow v-if="NUM[k]" cls="srsub inl" :title="tk(NUM[k])"><input type="number" inputmode="numeric" data-c="cfgn" :data-k="NUM[k]" :aria-label="tk(NUM[k])" :value="S.cfg[NUM[k]]" @change="setNum(NUM[k], $event.target.value)"></SetRow>
      </template>
    </SetSection>
    <SetSection icon="eye" :title="tk('dismT')" :desc="tk('dismD')">
      <template #head><button type="button" class="btn o s" data-a="nav" data-v="alerts" @click="toAlerts">{{ tk("goAlerts") }}</button></template>
      <SetRow :title="tk('mistake')" :desc="tk('mistakeD')"><button type="button" class="btn o s" data-a="alReset" @click="reset">{{ tk("reset") }}</button></SetRow>
    </SetSection>
  </div>
</template>
