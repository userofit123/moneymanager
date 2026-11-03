<script setup>
// Alerts (in More and the Home bell): the computer's Alerts page for a phone. Alert settings at the top, the two tabs
// (Alerts now, History), then one card of alerts: each with its coloured dot, title, text, when it appeared, and the
// computer's Open and Dismiss buttons (a swipe also dismisses; press and hold opens the same two in a menu).
// History lists each alert with when it came and went and its badge (Active, Dismissed, Resolved).
// Everything comes from pagelogic/alerts.js, the same as the computer's page.
import { ref, computed } from "vue";
import { pages } from "../../routes.js";
import { useAlerts } from "../../pagelogic/alerts.js";
import { usePhoneNav } from "../navigation.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import Segmented from "../components/Segmented.vue";
import ListGroup from "../components/ListGroup.vue";
import SwipeRow from "../components/SwipeRow.vue";
import EmptyState from "../components/EmptyState.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import LoadError from "../components/LoadError.vue";
import ActionSheet from "../components/ActionSheet.vue";
defineProps({ id: { type: String, default: null } });

const { t, data, S, since, rows, dismiss, open, tab, hist, loadHist, pick, when, dur, said } = useAlerts();
const nav = usePhoneNav();
const P = (k, o, n) => t("phone.alerts." + k, o || {}, n);
// a sentence with a date and time in it: the date is set apart (<bdi>), so its time keeps its order in Hebrew
// (Hebrew texts set each number apart, which would turn 03:25 into 25:03)
const withWhen = (text, at) => { const [a, b = ""] = text.split("\u0000"); return { a, at: when(at), b }; };
const appeared = (at) => withWhen(t("alerts.appeared", { when: "\u0000" }), at);
const ended = (r) => withWhen(P("gone", { when: "\u0000", dur: dur(r.first_seen, r.resolved_at) }), r.resolved_at);
// the history keeps each alert's English words; newer ones hold invisible marks around their numbers (⁦1⁩), which are
// taken out first so the words are found and shown in Hebrew
const histList = computed(() => hist.value.rows.map((r) => ({ ...r, title2: said(r.title), detail2: said(r.detail), ap: appeared(r.first_seen), end: r.resolved_at ? ended(r) : null })));
const BELL = pages.find((p) => p.name === "alerts").icon;

const tabOpts = computed(() => [{ value: "now", label: t("alerts.tabNow") + (rows.value.length ? " " + rows.value.length : "") }, { value: "hist", label: t("alerts.tabHist") }]);
const tabModel = computed({ get: () => tab.value, set: pick });
const swipe = (x) => [{ label: t("alerts.dismiss"), tone: "neg", run: () => dismiss(x) }];
// the computer's badge for each alert in History
const status = (r) => (!r.resolved_at ? ["am2", t("alerts.active")] : r.dismissed ? ["fl", t("alerts.dismissed")] : ["dn", t("alerts.resolved")]);
const settings = () => nav.push("settingsSection", "alr");
// press and hold an alert (or right click): its menu, with Open and Dismiss
const held = ref(null);
const heldOpen = computed({ get: () => !!held.value, set: (v) => { if (!v) held.value = null; } });
const heldActs = computed(() => (held.value ? [{ label: t("alerts.open"), run: ((x) => () => open(x))(held.value) }, { label: t("alerts.dismiss"), danger: true, run: ((x) => () => dismiss(x))(held.value) }] : []));
</script>

<template>
  <PhoneScreen class="ph-alerts">
    <LoadError v-if="data.error.value && !S" :text="t('alerts.loadError')" />
    <SkeletonRows v-else-if="!S" :rows="4" />

    <template v-else>
      <!-- the computer's top row: the two tabs, and Alert settings at its end -->
      <ListGroup :more="t('phone.shell.open.alerts')" @more="settings">
        <template #top>
          <Segmented v-model="tabModel" :options="tabOpts" :label="P('tabs')" />
          <template v-if="tab === 'now'"><EmptyState v-if="!rows.length" :icon="BELL" :title="P('clearTitle')" :text="P('clearText')" /></template>
          <SkeletonRows v-else-if="!hist.loaded" :rows="4" />
          <EmptyState v-else-if="!histList.length" :icon="BELL" :title="t('alerts.tabHist')" :text="t('alerts.histEmpty')" />
        </template>
        <template v-if="tab === 'now' ? rows.length : hist.loaded && histList.length" #default>
          <template v-if="tab === 'now'">
            <SwipeRow v-for="x in rows" :key="x.id" :end="swipe(x)" @hold="held = x">
              <div class="ph-al">
                <span class="sev" :class="x.sev" aria-hidden="true" />
                <div class="ph-al-m">
                  <b class="ph-al-t">{{ x.title }}</b>
                  <span class="ph-al-x">{{ x.text }}</span>
                  <span v-if="since[x.id]" class="ph-al-w">{{ appeared(since[x.id]).a }}<bdi>{{ appeared(since[x.id]).at }}</bdi>{{ appeared(since[x.id]).b }}</span>
                  <span class="ph-al-b">
                    <button type="button" class="ph-btn tonal" @click="open(x)">{{ t("alerts.open") }}</button>
                    <button type="button" class="ph-btn tonal" @click="dismiss(x)">{{ t("alerts.dismiss") }}</button>
                  </span>
                </div>
              </div>
            </SwipeRow>
          </template>
          <template v-else>
            <div v-for="r in histList" :key="r.id ?? r.key + r.first_seen" class="ph-al">
              <span class="sev" :class="r.sev" aria-hidden="true" />
              <div class="ph-al-m">
                <span class="ph-al-th"><b class="ph-al-t">{{ r.title2 }}</b><span class="bd" :class="status(r)[0]">{{ status(r)[1] }}</span></span>
                <span class="ph-al-x">{{ r.detail2 }}</span>
                <span class="ph-al-w"><span>{{ r.ap.a }}<bdi>{{ r.ap.at }}</bdi>{{ r.ap.b }}</span> · <span v-if="r.end">{{ r.end.a }}<bdi>{{ r.end.at }}</bdi>{{ r.end.b }}</span><span v-else>{{ P("still") }}</span></span>
              </div>
            </div>
          </template>
        </template>
      </ListGroup>
      <div v-if="tab !== 'now' && hist.loaded && histList.length && hist.more" class="ph-alerts-more"><button type="button" class="ph-btn tonal" :disabled="hist.busy" @click="loadHist(true)">{{ t("alerts.more") }}</button></div>
    </template>

    <ActionSheet v-model:open="heldOpen" :title="held ? held.title : ''" :actions="heldActs" />
  </PhoneScreen>
</template>
