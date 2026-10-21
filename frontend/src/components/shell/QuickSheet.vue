<script setup>
// "Add or update" (the + button): every kind of thing that can be added, each opening its own window.
import { useI18n } from "vue-i18n";
import { quickOpen } from "../../core/shell.js";
import { openForm } from "../../core/forms.js";
import { syncNow } from "../../core/sources.js";
import { go } from "../../router.js";
import { openSettingsTab } from "../../views/settings/tab.js";
import BaseSheet from "../BaseSheet.vue";

const { t } = useI18n();
const QI = { plus: '<path d="M12 5v14M5 12h14"/>', camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', tag: '<path d="M3 12V4h8l10 10-8 8z"/><path d="M7.5 8h.01"/>', folder: '<path d="M3 6h6l2 2h10v11H3z"/>', doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7"/>', target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>', jar: '<path d="M7 3h10v3H7zM6 6h12v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/>', flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>', bank: '<path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>', upload: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>', refresh: '<path d="M20 11a8 8 0 1 0-2 6M20 5v6h-6"/>' };
const settings = (tab) => () => { openSettingsTab(tab); go("/settings"); };
const ITEMS = [
  ["plus", "tx", () => openForm("tx")],
  ["bank", "acc", () => openForm("account")],
  ["camera", "photo", () => openForm("tx", { photo: true })],
  ["tag", "rule", () => openForm("rule")],
  ["folder", "cat", () => openForm("category")],
  ["doc", "bill", () => openForm("bill")],
  ["target", "bud", () => openForm("budget")],
  ["jar", "jar", () => openForm("jar", { start: { kind: "goal" } })],
  ["flag", "goal", () => openForm("jar", { start: { kind: "goal" } })],
  ["bank", "pen", () => openForm("pension")],
  ["upload", "csv", settings("data")],
  ["refresh", "sync", () => syncNow()],
];
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
