<script setup>
// Alerts: what needs attention now, and the history of every alert. The alerts themselves
// come from lib/alerts.js (the same rules as the Home box); their words from lib/alerttext.js and the language files.
// Dismiss is saved directly: change a copy, PUT /api/state, load the fresh copy.
import { openSettingsTab } from "./settings/tab.js";
import { go } from "../router.js";
import { ref, computed, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { home, budgets } from "../core/derived.js";
import { now } from "../core/clock.js";
import { request } from "../core/http.js";
import { alertsReported, makeFriendly } from "../core/alertReport.js";
import PageHeader from "../components/PageHeader.vue";
import { openAlert } from "../core/shell.js";
import { alertsModel } from "../lib/alerts.js";
import { alertTexts, reverseTable, reverseText } from "../lib/alerttext.js";
import { dstr } from "../dates.js";
import { categoryName } from "../catnames.js";
import en from "../locales/en.json";

const { t, locale } = useI18n();
const S = computed(() => data.state.value);
// When each open alert first appeared (the server keeps it in the alert history)
const since = ref({});
async function loadSince() {
  try { since.value = await (await request("/api/alerts/open", { cache: "no-store" })).json(); } catch { /* the dates are simply left out */ }
}
onMounted(async () => {
  data.start();
  loadSince();
});

const loc = computed(() => (locale.value === "he" ? "he-IL" : "en-GB"));
const an = (n) => categoryName(n, locale.value);
const catName = (c) => (!c || c === "Uncategorized" ? t("home.uncategorizedCat") : categoryName(c, locale.value));
const monthYear = (m) => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(loc.value, { month: "short", year: "numeric" });
const friendly = makeFriendly(t);

// ---- the alerts ----
const M = home; // worked out once for the whole app (core/derived.js)
const list = computed(() => (S.value && M.value ? alertsModel(S.value, { ...M.value, budgets: budgets.value.info }, now.value, {}, friendly) : []));
const ctx = computed(() => ({ t, catName, an, dstr, monthYear }));
const rows = computed(() => list.value.map((x) => { const [title, text] = alertTexts(x, ctx.value); return { ...x, title, text }; }));

// The open alerts are reported to the server on every page (core/alertReport.js); an open History tab then loads again.
watch(alertsReported, () => { loadSince(); if (tab.value === "hist" && hist.value.loaded) loadHist(false); });

// ---- saving ----
// Saving goes through the data store (stores/data.js).
function change(edit) { data.change((next) => { edit(next); return []; }); }
const dismiss = (x) => change((n) => { n.dismissed = { ...(n.dismissed || {}), [x.id]: 1 }; });

// ---- Open: each alert goes to its place (openAlert in core/shell.js) ----
const open = (x) => openAlert(x, x.title);

// ---- tabs and history ----
const tab = ref("now");
const hist = ref({ rows: [], more: false, loaded: false, busy: false });
async function loadHist(more) {
  const h = hist.value; if (h.busy) return; h.busy = true;
  try {
    const off = more ? h.rows.length : 0, r = await request("/api/alerts/history?limit=50&offset=" + off, { cache: "no-store" }), j = await r.json();
    h.rows = more ? h.rows.concat(j.rows) : j.rows; h.more = j.more; h.loaded = true;
  } catch { /* stays on Loading */ }
  h.busy = false;
}
const pick = (v) => { tab.value = v; if (v === "hist" && !hist.value.loaded) loadHist(false); };
const table = reverseTable(en);
const when = (x) => new Date(x).toLocaleString(loc.value, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const dur = (a, b) => { const m = Math.max(1, Math.round((new Date(b) - new Date(a)) / 6e4)); return m < 60 ? t("alerts.durMin", { n: m }) : m < 2880 ? t("alerts.durH", { n: Math.round(m / 60) }) : t("alerts.durD", { n: Math.round(m / 1440) }); };
const monthD = (d) => d.toLocaleDateString(loc.value, { month: "short", year: "numeric" });
const said = (s) => (locale.value === "en" ? s : reverseText(table, t, s, { catName, an, monthYear: monthD })?.text ?? s);
const histRows = computed(() => hist.value.rows.map((r) => ({ ...r, title2: said(r.title), detail2: said(r.detail) })));
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
      <div id="alNow" :style="{ display: tab === 'now' ? '' : 'none' }"><div class="card" id="alL" style="padding:6px 18px">
        <template v-if="rows.length"><div v-for="x in rows" :key="x.id" class="al"><span class="sev" :class="x.sev"></span><div style="flex:1;min-width:0"><b>{{ x.title }}</b><div class="sm">{{ x.text }}</div><div v-if="since[x.id]" class="sm" style="opacity:.75">{{ t("alerts.appeared", { when: when(since[x.id]) }) }}</div></div><div class="flex" style="gap:6px"><button class="btn o s" data-a="alOpen" :data-id="x.id" @click="open(x)">{{ t("alerts.open") }}</button><button class="btn o s" data-a="alDismiss" :data-id="x.id" @click="dismiss(x)">{{ t("alerts.dismiss") }}</button></div></div></template>
        <div v-else class="sm" style="padding:22px;text-align:center">{{ t("alerts.clear") }}</div>
      </div></div>
      <div id="alHist" :style="{ display: tab === 'hist' ? '' : 'none' }">
        <template v-if="tab === 'hist'">
          <div v-if="!hist.loaded" class="card sm" style="margin-top:14px">{{ t("alerts.loadingHist") }}</div>
          <template v-else>
            <div class="card" style="padding:6px 18px;margin-top:14px">
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
