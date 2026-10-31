<script setup>
// "Add or update" (the + button): every kind of thing that can be added (core/addActions.js), each opening its own window.
import { useI18n } from "vue-i18n";
import { quickOpen } from "../../core/shell.js";
import { ADD_ITEMS as ITEMS, ADD_ICONS as QI } from "../../core/addActions.js";
import BaseSheet from "../BaseSheet.vue";

const { t } = useI18n();
const pick = (run) => { quickOpen.value = false; run(); };
</script>

<template>
  <BaseSheet v-model:open="quickOpen" :label="t('qa.title')">
    <h3>{{ t("qa.title") }}</h3>
    <div class="qa">
      <button v-for="[ic, k, run] in ITEMS" :key="k" type="button" @click="pick(run)"><span class="qi"><svg viewBox="0 0 24 24" v-html="QI[ic]" /></span><span><b>{{ t("qa." + k) }}</b><span class="sm">{{ t("qa." + k + "H") }}</span></span></button>
    </div>
    <div class="flex" style="justify-content:flex-end;margin-top:12px"><button type="button" class="btn o" @click="quickOpen = false">{{ t("qa.close") }}</button></div>
  </BaseSheet>
</template>
