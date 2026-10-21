<script setup>
// "Sources": every connection and how its last sync went, live while a sync runs, with Sync now.
import { useI18n } from "vue-i18n";
import { syncOpen } from "../../core/shell.js";
import { sources, syncNow, friendlyErr } from "../../core/sources.js";
import { job, lastItems } from "../../core/jobs.js";
import { go } from "../../router.js";
import { openSettingsTab } from "../../views/settings/tab.js";
import BaseSheet from "../BaseSheet.vue";
import JobButton from "../JobButton.vue";

const { t } = useI18n();
// What a row says while a sync runs, or how the last run went.
function row(s) {
  const it = (job.value && job.value.items?.[s.k]) || (!job.value && lastItems.value[s.k]) || null, st = it && it.state;
  if (st == "waiting") return { dot: "warn", msg: t("sync.waitTurn") };
  if (st == "syncing") return { dot: "spin", msg: (job.value && job.value.kind == "test" ? t("sync.testing") : t("sync.syncing")) + "…" };
  if (st == "done") return { dot: "ok", msg: it.added != null ? (it.added ? t("sync.doneN", { n: it.added }, it.added) : t("sync.doneNone")) : t("sync.done") };
  if (st == "failed") return { dot: "bad", msg: t("sync.failedRow") + (it.msg ? " · " + friendlyErr(it.msg) : "") };
  if (st == "skipped") return { dot: s.state, msg: s.text + " · " + t("sync.notConnected") };
  return { dot: s.state, msg: s.text + (s.msg ? " · " + s.msg : "") };
}
const goConn = () => { syncOpen.value = false; openSettingsTab("conn"); go("/settings"); };
</script>

<template>
  <BaseSheet v-model:open="syncOpen" :label="t('sync.title')">
    <h3>{{ t("sync.title") }}</h3>
    <div id="syncRows">
      <div v-for="s in sources" :key="s.k" class="row">
        <i class="live" :class="row(s).dot" />
        <div class="grow"><b>{{ s.n }}</b><div class="sm">{{ row(s).msg }}</div></div>
        <button v-if="s.goConn && !job" type="button" class="btn o s" @click="goConn">{{ s.state == "bad" ? t("sync.fix") : t("sync.connect") }}</button>
      </div>
    </div>
    <div class="sm" style="margin-top:10px"><i class="live ok" /> {{ t("sync.legOk") }} &nbsp; <i class="live warn" /> {{ t("sync.legWarn") }} &nbsp; <i class="live bad" /> {{ t("sync.legBad") }}</div>
    <div class="sm" style="margin-top:6px">{{ t("sync.readOnly") }}</div>
    <div class="flex" style="justify-content:flex-end;gap:8px;margin-top:10px">
      <JobButton class="btn o" kind="sync" source="all" @click="syncNow">{{ t("sync.syncNow") }}</JobButton>
      <button type="button" class="btn" @click="syncOpen = false">{{ t("sync.done") }}</button>
    </div>
  </BaseSheet>
</template>
