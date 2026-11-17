<script setup>
// "Update available" in the menu (updb). Opens Settings → Version and updates.
// It follows this app's own update (core/updates.js ownUpdate): the desktop app's, the Android app's own download, or the server's in a browser.
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { ownUpdate, openUpdates, updateLine } from "../../core/updates.js";
const { t } = useI18n();
const U = ownUpdate;
const show = computed(() => ["available", "downloading", "ready", "installing"].includes(U.value.status));
</script>

<template>
  <button v-if="show" id="updb" type="button" class="updb" @click="openUpdates">
    <template v-if="U.status === 'installing'"><i class="spinner" style="background:none;margin:0" />{{ t("upd.installing") }}</template>
    <template v-else><i />{{ updateLine(t) || t("upd.available") }}</template>
  </button>
</template>
