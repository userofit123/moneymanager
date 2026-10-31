<script setup>
// "Updated 10 Oct, 09:40" under a screen's title; tap it for the sync status of each bank. It spins while a sync runs.
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { syncState } from "../../core/sources.js";
import { job } from "../../core/jobs.js";
import { syncOpen } from "../../core/shell.js";
import PIcon from "./PIcon.vue";
const { t } = useI18n();
const text = computed(() => {
  if (job.value) return t("phone.shell.syncing");
  const s = syncState.value;
  return s.live === "ok" ? t("phone.shell.updated", { when: s.sub }) : s.live === "bad" ? t("phone.shell.syncFailed") : t("phone.shell.notSynced");
});
</script>

<template>
  <button type="button" class="ph-syncline" :class="[syncState.live, { run: !!job }]" @click="syncOpen = true"><PIcon name="sync" /><span>{{ text }}</span></button>
</template>
