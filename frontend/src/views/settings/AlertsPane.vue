<script setup>
// Settings → Which alerts. A copy of the current app's section (web/js/04-transactions.js renderAlertSettings, first half; the cfg/cfgn
// changes and the alReset case in 08-jars.js): each kind of alert on or off, the amounts that trigger them, and dismissed ones back.
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { go, hrefOf } from "../../router.js";
import { pages } from "../../routes.js";
import SetHead from "./SetHead.vue";

const { t } = useI18n();
const tk = (k) => t("settings.alr." + k);
const S = computed(() => data.state.value);
onMounted(() => { data.start(); });
const TYPES = ["jars", "bills", "price", "budget", "card", "large", "xfer", "recon", "pending", "sync", "uncat", "forecast", "docs"];
const NUMS = ["cardPct", "largeAmt", "billDays", "budgetPct"];
// none of these write a change-history line, like the current app
const setOn = (k, on) => data.change((s) => { s.cfg[k] = on ? 1 : 0; return []; });
const setNum = (k, v) => data.change((s) => { s.cfg[k] = +v; return []; });
const reset = () => data.change((s) => { s.dismissed = {}; return []; });
const toAlerts = () => go(hrefOf(pages.find((p) => p.name === "alerts")));
</script>

<template>
  <div v-if="S" id="setAlr">
    <div class="card ss">
      <SetHead icon="bell" :title="tk('showT')" :desc="tk('showD')" />
      <div class="ssb p"><div v-for="k in TYPES" :key="k" class="tg"><span>{{ tk("types." + k) }}</span><input type="checkbox" data-c="cfg" :data-k="k" :checked="!!S.cfg[k]" @change="setOn(k, $event.target.checked)"></div></div>
    </div>
    <div class="card ss">
      <SetHead icon="sliders" :title="tk('whenT')" :desc="tk('whenD')" />
      <div class="ssb p"><div class="two"><div v-for="k in NUMS" :key="k" class="fld"><label>{{ tk(k) }}</label><input type="number" inputmode="numeric" data-c="cfgn" :data-k="k" :value="S.cfg[k]" @change="setNum(k, $event.target.value)"></div></div></div>
    </div>
    <div class="card ss">
      <div class="ssb p flex" style="gap:10px;flex-wrap:wrap;justify-content:space-between;align-items:center"><span class="sm">{{ tk("mistake") }}</span><span class="flex" style="gap:8px"><button type="button" class="btn o s" data-a="alReset" @click="reset">{{ tk("reset") }}</button><button type="button" class="btn o s" data-a="nav" data-v="alerts" @click="toAlerts">{{ tk("goAlerts") }}</button></span></div>
    </div>
  </div>
</template>
