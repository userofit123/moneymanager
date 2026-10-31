<script setup>
// More (tab): everything that is not a tab, grouped by what it is for. Your money (the other pages), Stay on top (alerts,
// key numbers, ideas) and the app itself (settings, look, sync, help, install, update).
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { pages } from "../../routes.js";
import { alertList } from "../../core/derived.js";
import { suggestions, suggestOpen } from "../../core/suggest.js";
import { appearanceOpen, syncOpen } from "../../core/shell.js";
import { installPrompt, install } from "../../core/pwa.js";
import { UP } from "../../core/updates.js";
import { helpOn } from "../help.js";
import { usePhoneNav } from "../navigation.js";
import { ICONS } from "../icons.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
import SyncLine from "../components/SyncLine.vue";
defineProps({ id: { type: String, default: null } });

const { t } = useI18n();
const nav = usePhoneNav();
const icon = (n) => pages.find((p) => p.name === n)?.icon || "";
const r = (k) => t("phone.shell.moreRows." + k);
const MONEY = ["recap", "accounts", "budgets", "reports", "forecast", "categories"];
const pageName = (n) => (n === "reports" ? t("shell.moreRep") : t("nav." + n));
const update = computed(() => ["available", "downloading", "ready", "installing"].includes(UP.status));
const openUpdate = () => nav.push("settingsSection", "app");
</script>

<template>
  <PhoneScreen class="ph-more">
    <template #sub><SyncLine /></template>
    <ListGroup :title="t('phone.shell.moreGroups.money')">
      <ListRow v-for="n in MONEY" :key="n" :title="pageName(n)" :sub="r(n)" :icon="icon(n)" link @tap="nav.push(n)" />
    </ListGroup>
    <ListGroup :title="t('phone.shell.moreGroups.stay')">
      <ListRow :title="t('nav.alerts')" :sub="r('alerts')" :icon="icon('alerts')" tone="warn" :badge="alertList.length" link @tap="nav.push('alerts')" />
      <ListRow :title="t('num.title')" :sub="r('keyNumbers')" :icon="ICONS.numbers" tone="var(--c3)" @tap="helpOn('nums')" />
      <ListRow v-if="suggestions.length" :title="t('txw.suggA')" :sub="r('ideas')" :icon="ICONS.idea" tone="var(--c2)" :badge="suggestions.length" @tap="suggestOpen = true" />
    </ListGroup>
    <ListGroup :title="t('phone.shell.moreGroups.app')">
      <ListRow :title="t('nav.settings')" :sub="r('settings')" :icon="icon('settings')" tone="var(--c6)" link @tap="nav.push('settings')" />
      <ListRow :title="t('shell.appearance')" :sub="r('appearance')" :icon="ICONS.look" tone="var(--c5)" @tap="appearanceOpen = true" />
      <ListRow :title="t('shell.syncStatus')" :sub="r('syncStatus')" :icon="ICONS.sync" tone="var(--c3)" @tap="syncOpen = true" />
      <ListRow :title="t('shell.aboutPage')" :sub="r('help')" :icon="ICONS.help" tone="var(--c6)" @tap="helpOn('guide')" />
      <ListRow v-if="installPrompt" :title="t('shell.install')" :sub="r('install')" :icon="ICONS.install" tone="pos" @tap="install()" />
      <ListRow v-if="update" :title="t('upd.available')" :sub="r('update')" :icon="ICONS.update" tone="pos" link @tap="openUpdate" />
    </ListGroup>
  </PhoneScreen>
</template>
