<script setup>
// Alerts: what needs attention now, and the history of every alert. What it knows and does is in pagelogic/alerts.js,
// shared with the phone's Alerts screen.
import PageHeader from "../components/PageHeader.vue";
import { useAlerts } from "../pagelogic/alerts.js";

const { t, data, openSettingsTab, go, S, since, rows, dismiss, open, tab, hist, loadHist, pick, when, dur, histRows } = useAlerts();
</script>

<template>
  <PageHeader :title="t('nav.alerts')" />
  <section class="view on" id="alerts">
    <template v-if="!S">
      <p v-if="data.error.value" class="sm">{{ t("alerts.loadError") }}</p>
      <p v-else class="sm">{{ t("alerts.loading") }}</p>
    </template>

    <template v-else>
      <div class="flex" style="justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div class="seg" id="alTabs"><button data-a="alTab" data-t="now" :class="{ on: tab === 'now' }" @click="pick('now')">{{ t("alerts.tabNow") }}</button><button data-a="alTab" data-t="hist" :class="{ on: tab === 'hist' }" @click="pick('hist')">{{ t("alerts.tabHist") }}</button></div><button class="btn o s" data-a="alSettings" @click="openSettingsTab('alr'); go('/settings')">{{ t("alerts.settings") }}</button></div>
      <div id="alNow" class="tabfade" :style="{ display: tab === 'now' ? '' : 'none' }"><div class="card" id="alL" style="padding:6px 18px">
        <template v-if="rows.length"><div v-for="x in rows" :key="x.id" class="al"><span class="sev" :class="x.sev"></span><div style="flex:1;min-width:0"><b>{{ x.title }}</b><div class="sm">{{ x.text }}</div><div v-if="since[x.id]" class="sm" style="opacity:.75">{{ t("alerts.appeared", { when: when(since[x.id]) }) }}</div></div><div class="flex" style="gap:6px"><button class="btn o s" data-a="alOpen" :data-id="x.id" @click="open(x)">{{ t("alerts.open") }}</button><button class="btn o s" data-a="alDismiss" :data-id="x.id" @click="dismiss(x)">{{ t("alerts.dismiss") }}</button></div></div></template>
        <div v-else class="sm" style="padding:22px;text-align:center">{{ t("alerts.clear") }}</div>
      </div></div>
      <div id="alHist" class="tabfade" :style="{ display: tab === 'hist' ? '' : 'none' }">
        <template v-if="tab === 'hist'">
          <div v-if="!hist.loaded" class="card sm">{{ t("alerts.loadingHist") }}</div>
          <template v-else>
            <div class="card" style="padding:6px 18px">
              <template v-if="histRows.length"><div v-for="r in histRows" :key="r.id ?? r.key + r.first_seen" class="al"><span class="sev" :class="r.sev"></span><div style="flex:1;min-width:0"><b>{{ r.title2 }}</b><div class="sm" style="word-break:break-word">{{ r.detail2 }}</div><div class="sm" style="opacity:.75">{{ t("alerts.appeared", { when: when(r.first_seen) }) }}{{ !r.resolved_at ? t("alerts.still") : t("alerts.gone", { when: when(r.resolved_at), dur: dur(r.first_seen, r.resolved_at) }) }}</div></div><span v-if="!r.resolved_at" class="bd am2">{{ t("alerts.active") }}</span><span v-else-if="r.dismissed" class="bd fl">{{ t("alerts.dismissed") }}</span><span v-else class="bd dn">{{ t("alerts.resolved") }}</span></div></template>
              <div v-else class="sm" style="padding:22px;text-align:center">{{ t("alerts.histEmpty") }}</div>
            </div>
            <div v-if="hist.more" class="txm"><button class="btn o" data-a="alHistMore" @click="loadHist(true)">{{ t("alerts.more") }}</button></div>
          </template>
        </template>
      </div>
    </template>
  </section>
</template>
