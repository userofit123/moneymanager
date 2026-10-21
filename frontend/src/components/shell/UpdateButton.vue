<script setup>
// "Update available" in the menu (updb). Opens Settings → Version and updates.
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { UP } from "../../core/updates.js";
import { go } from "../../router.js";
import { openSettingsTab } from "../../views/settings/tab.js";
const { t } = useI18n();
const show = computed(() => ["available", "downloading", "ready", "installing"].includes(UP.status));
const open = () => { openSettingsTab("app"); go("/settings"); };
</script>

<template>
  <button v-if="show" id="updb" type="button" class="updb" @click="open">
    <template v-if="UP.status === 'installing'"><i class="spinner" style="background:none;margin:0" />{{ t("upd.installing") }}</template>
    <template v-else><i />{{ UP.status === "ready" ? t("upd.restart") : UP.status === "downloading" ? t("upd.updating", { p: UP.percent }) : t("upd.available") }}</template>
  </button>
</template>
