<script setup>
// The bar at the top while a sync, test or bank verification runs: what runs, how far it got, and for how long (#jobBar, applyJobUI).
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { job, tick, mmss } from "../../core/jobs.js";
import { srcName } from "../../core/sources.js";
const { t } = useI18n();
const text = computed(() => {
  tick.value; const J = job.value; if (!J) return "";
  const word = { test: t("sync.testing"), sync: t("sync.syncing"), assist: t("sync.verifying") }[J.kind];
  const v = Object.values(J.items || {}).filter((x) => x.state != "skipped"), d = v.filter((x) => x.state == "done" || x.state == "failed").length;
  return word + " " + srcName(J.source) + "… " + (J.source == "all" && v.length > 1 ? t("sync.xOfY", { done: d, n: v.length }) : "") + mmss(Date.now() - J.since)
    + (J.kind == "assist" ? t("sync.finishAssist") : J.source != "all" && J.kind == "sync" ? t("sync.oneLong") : t("sync.fewMin"));
});
</script>

<template>
  <div id="jobBar" role="status" aria-live="polite" :style="{ display: job ? 'flex' : 'none' }"><i class="spinner" /><span>{{ text }}</span></div>
</template>
