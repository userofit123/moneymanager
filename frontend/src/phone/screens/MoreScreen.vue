<script setup>
// More (tab): the computer's side menu without the pages of the tab bar, in the same order with the same icons and badges.
// First the other pages, then the computer's floating buttons (ideas, key numbers, help),
// then the menu's foot: the update, sync status (its coloured dot), Appearance and Settings. Install shows when the browser offers it.
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { pages } from "../../routes.js";
import { alertList } from "../../core/derived.js";
import { syncState } from "../../core/sources.js";
import { suggestions, suggestOpen } from "../../core/suggest.js";
import { appearanceOpen, syncOpen } from "../../core/shell.js";
import { installPrompt, install } from "../../core/pwa.js";
import { UP } from "../../core/updates.js";
import { helpOn } from "../help.js";
import { usePhoneNav } from "../navigation.js";
import { ICONS } from "../icons.js";
import { TABS } from "../screens.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
import SyncLine from "../components/SyncLine.vue";
import PIcon from "../components/PIcon.vue";
defineProps({ id: { type: String, default: null } });

const { t } = useI18n();
const nav = usePhoneNav();
// the menu's pages that are not tabs (the tab bar's list, phone/screens.js); Settings is at the foot of the menu
const menu = pages.filter((p) => p.nav && !TABS.includes(p.name) && p.name !== "settings");
const setPage = pages.find((p) => p.name === "settings");
const badge = (p) => (p.name === "alerts" ? alertList.value.length : 0);
const update = computed(() => ["available", "downloading", "ready", "installing"].includes(UP.status));
const openUpdate = () => nav.push("settingsSection", "app");
// the update row says where the update is, as the computer's update button: ready to get, coming down, waiting, being put in
const updateText = computed(() => (UP.status === "installing" ? t("upd.installing") : UP.status === "ready" ? t("upd.restart") : UP.status === "downloading" ? t("upd.updating", { p: UP.percent }) : ""));
</script>

<template>
  <PhoneScreen class="ph-more">
    <template #sub><SyncLine /></template>
    <ListGroup :title="t('phone.shell.moreGroups.money')">
      <ListRow v-for="p in menu" :key="p.name" :data-v="p.name" :title="t('nav.' + p.name)" :icon="p.icon" :badge="badge(p)" link @tap="nav.push(p.name)" />
    </ListGroup>
    <ListGroup :title="t('phone.shell.moreGroups.stay')">
      <ListRow v-if="suggestions.length" :title="t('txw.suggA')" :icon="ICONS.idea" :badge="suggestions.length" @tap="suggestOpen = true" />
      <ListRow :title="t('num.title')" :icon="ICONS.numbers" @tap="helpOn('nums')" />
      <ListRow :title="t('phone.sheets.help')" :icon="ICONS.help" @tap="helpOn('guide')" />
    </ListGroup>
    <ListGroup :title="t('phone.shell.moreGroups.app')">
      <ListRow v-if="update" :title="t('upd.available')" :sub="updateText" :icon="ICONS.update" tone="pos" link @tap="openUpdate" />
      <ListRow class="ph-more-sync" :title="t('shell.syncStatus')" :sub="syncState.top + ' ' + syncState.sub" @tap="syncOpen = true">
        <template #lead><span class="ph-tile" style="--tile: var(--acc)"><PIcon :svg="ICONS.sync" /><i class="live" :class="syncState.live" /></span></template>
      </ListRow>
      <ListRow :title="t('shell.appearance')" :icon="ICONS.look" @tap="appearanceOpen = true" />
      <ListRow :title="t('nav.settings')" :icon="setPage.icon" link @tap="nav.push('settings')" />
      <ListRow v-if="installPrompt" :title="t('shell.install')" :icon="ICONS.install" @tap="install()" />
    </ListGroup>
  </PhoneScreen>
</template>
