<script setup>
// The list the suggestions stay in. The light-bulb button that opens it is in App.vue.
import { watch } from "vue";
import { useI18n } from "vue-i18n";
import { suggestions, suggestOpen, runSuggestion, dropSuggestion, clearSuggestions } from "../../core/suggest.js";
import BaseSheet from "../BaseSheet.vue";
const { t } = useI18n();
const run = (x, a) => { suggestOpen.value = false; runSuggestion(x, a); };
watch(() => suggestions.value.length, (n) => { if (!n) suggestOpen.value = false; });
</script>

<template>
  <BaseSheet v-model:open="suggestOpen" :label="t('txw.suggTitle')">
    <h3>{{ t("txw.suggTitle") }}</h3>
    <div class="sm" style="margin-bottom:12px;line-height:1.5">{{ t("txw.suggIntro") }}</div>
    <div v-for="x in suggestions" :key="x.key" class="sgi"><b>{{ x.title }}</b><div class="sm" style="margin:3px 0 10px;line-height:1.5">{{ x.text }}</div>
      <div class="flex" style="gap:8px;flex-wrap:wrap"><button v-for="a in x.actions" :key="a.label" type="button" class="btn s" @click="run(x, a)">{{ a.label }}</button><button type="button" class="btn o s" @click="dropSuggestion(x.key)">{{ t("txw.dismiss") }}</button></div>
    </div>
    <div class="flex" style="justify-content:space-between;gap:10px;margin-top:14px"><button type="button" class="btn o" @click="clearSuggestions">{{ t("txw.clearAll") }}</button><button type="button" class="btn" @click="suggestOpen = false">{{ t("txw.close") }}</button></div>
  </BaseSheet>
</template>
