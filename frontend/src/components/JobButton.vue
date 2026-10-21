<script setup>
// A button that starts a sync, test or bank verification. While any of them runs it is turned off ("Wait for the current one to finish"),
// and the one that runs shows a spinner (applyJobUI in web/js/06-trend-forecast-sync.js). kind: sync | test | assist; source: a connection or "all".
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { job } from "../core/jobs.js";
const props = defineProps({ kind: { type: String, default: "sync" }, source: { type: String, default: "all" } });
const { t } = useI18n();
const mine = computed(() => !!job.value && job.value.kind == props.kind && (props.source == "all" ? job.value.source == "all" : job.value.source == props.source || job.value.source == "all"));
const word = computed(() => ({ test: t("sync.testing"), sync: t("sync.syncing"), assist: t("sync.verifying") })[props.kind]);
</script>

<template>
  <button type="button" :disabled="!!job" :class="{ running: mine }" :title="job && !mine ? t('sync.waitFirst') : undefined">
    <template v-if="mine"><i class="spinner" />{{ word }}…</template><slot v-else />
  </button>
</template>
