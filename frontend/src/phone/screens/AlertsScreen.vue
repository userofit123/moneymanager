<script setup>
// Alerts (in More and the Home bell): what needs a look now, and every alert from before. It opens with one sentence (how
// many alerts wait), then the alerts: a tap goes to the alert's place, Dismiss (the button, or a swipe) hides it. History lists
// each alert with when it came and when it went. Everything comes from pagelogic/alerts.js, the same as the computer's page.
import { computed } from "vue";
import { pages } from "../../routes.js";
import { useAlerts } from "../../pagelogic/alerts.js";
import { usePhoneNav } from "../navigation.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import HeroSentence from "../components/HeroSentence.vue";
import Segmented from "../components/Segmented.vue";
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
import SwipeRow from "../components/SwipeRow.vue";
import EmptyState from "../components/EmptyState.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import PIcon from "../components/PIcon.vue";
defineProps({ id: { type: String, default: null } });

const { t, data, S, since, rows, dismiss, open, tab, hist, loadHist, pick, when, dur, histRows } = useAlerts();
const nav = usePhoneNav();
const P = (k, o, n) => t("phone.alerts." + k, o || {}, n);
// a sentence with a date and time in it: the date is set apart (<bdi>), so its time keeps its order in Hebrew
// (Hebrew texts set each number apart, which would turn 03:25 into 25:03)
const withWhen = (text, at) => { const [a, b = ""] = text.split("\u0000"); return { a, at: when(at), b }; };
const appeared = (at) => withWhen(t("alerts.appeared", { when: "\u0000" }), at);
const ended = (r) => withWhen(P("gone", { when: "\u0000", dur: dur(r.first_seen, r.resolved_at) }), r.resolved_at);
const histList = computed(() => histRows.value.map((r) => ({ ...r, ap: appeared(r.first_seen), end: r.resolved_at ? ended(r) : null })));
const BELL = pages.find((p) => p.name === "alerts").icon;
const SETTINGS = pages.find((p) => p.name === "settings").icon;

// the sentence at the top: how many alerts wait, the number set large
const hero = computed(() => {
  const n = rows.value.length, [a, b = ""] = P("hero", { n: "\u0000" }, n).split("\u0000");
  return [{ text: a }, { amount: String(n) }, { text: b }];
});
const tabOpts = computed(() => [{ value: "now", label: t("alerts.tabNow") + (rows.value.length ? " " + rows.value.length : "") }, { value: "hist", label: t("alerts.tabHist") }]);
const tabModel = computed({ get: () => tab.value, set: pick });
const tone = (sev) => (sev === "high" ? "neg" : sev === "med" ? "warn" : "acc");
const swipe = (x) => [{ label: t("alerts.dismiss"), tone: "neg", run: () => dismiss(x) }];
const status = (r) => (!r.resolved_at ? ["act", t("alerts.active")] : r.dismissed ? ["dis", t("alerts.dismissed")] : ["res", t("alerts.resolved")]);
const settings = () => nav.push("settingsSection", "alr");
</script>

<template>
  <PhoneScreen class="ph-alerts">
    <p v-if="data.error.value && !S" class="ph-alerts-err">{{ t("alerts.loadError") }}</p>
    <SkeletonRows v-else-if="!S" :rows="4" />

    <template v-else>
      <HeroSentence v-if="rows.length" :parts="hero" />

      <section class="ph-group ph-alerts-tabs">
        <Segmented v-model="tabModel" :options="tabOpts" :label="P('tabs')" />

        <!-- now: each alert opens its place; Dismiss (the button or a swipe) hides it -->
        <template v-if="tab === 'now'">
          <EmptyState v-if="!rows.length" :icon="BELL" :title="P('clearTitle')" :text="P('clearText')" />
          <template v-else>
            <div class="ph-group-b">
              <SwipeRow v-for="x in rows" :key="x.id" :end="swipe(x)">
                <div class="ph-al" :class="x.sev">
                  <button type="button" class="ph-row two ph-al-open" @click="open(x)">
                    <span class="ph-row-lead"><span class="ph-tile" :style="{ '--tile': `var(--${tone(x.sev)})` }"><PIcon :svg="BELL" /></span></span>
                    <span class="ph-row-main">
                      <span class="ph-row-t">{{ x.title }}</span>
                      <span class="ph-row-s ph-al-text">{{ x.text }}</span>
                      <span v-if="since[x.id]" class="ph-row-s ph-al-when"><span>{{ appeared(since[x.id]).a }}<bdi>{{ appeared(since[x.id]).at }}</bdi>{{ appeared(since[x.id]).b }}</span></span>
                    </span>
                    <span class="ph-row-end"><PIcon class="ph-chev" name="chevron" dir /></span>
                  </button>
                  <button type="button" class="ph-link ph-al-dis" @click="dismiss(x)">{{ t("alerts.dismiss") }}</button>
                </div>
              </SwipeRow>
            </div>
            <p class="ph-group-n">{{ P("openHint") }}</p>
          </template>
        </template>

        <!-- history: when each alert came and went -->
        <template v-else>
          <SkeletonRows v-if="!hist.loaded" :rows="4" />
          <EmptyState v-else-if="!histList.length" :icon="BELL" :title="t('alerts.tabHist')" :text="t('alerts.histEmpty')" />
          <template v-else>
            <div class="ph-group-b">
              <div v-for="r in histList" :key="r.id ?? r.key + r.first_seen" class="ph-row two ph-alh">
                <span class="ph-row-lead"><span class="ph-alh-dot" :class="r.sev" aria-hidden="true" /></span>
                <span class="ph-row-main">
                  <span class="ph-row-t">{{ r.title2 }}</span>
                  <span class="ph-row-s ph-al-text">{{ r.detail2 }}</span>
                  <span class="ph-row-s ph-al-when"><span>{{ r.ap.a }}<bdi>{{ r.ap.at }}</bdi>{{ r.ap.b }}</span><span v-if="r.end">{{ r.end.a }}<bdi>{{ r.end.at }}</bdi>{{ r.end.b }}</span><span v-else>{{ P("still") }}</span></span>
                </span>
                <span class="ph-row-end"><span class="ph-alh-st" :class="status(r)[0]">{{ status(r)[1] }}</span></span>
              </div>
            </div>
            <p class="ph-group-n">{{ P("histNote") }}</p>
            <div v-if="hist.more" class="ph-alerts-more"><button type="button" class="ph-btn tonal" :disabled="hist.busy" @click="loadHist(true)">{{ t("alerts.more") }}</button></div>
          </template>
        </template>
      </section>

      <ListGroup>
        <ListRow :title="t('phone.shell.open.alerts')" :sub="P('settingsSub')" :icon="SETTINGS" tone="var(--c6)" link @tap="settings" />
      </ListGroup>
    </template>
  </PhoneScreen>
</template>
