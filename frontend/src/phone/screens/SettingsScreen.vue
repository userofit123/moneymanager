<script setup>
// Settings (in More): the computer's Settings side list (views/settings/nav.js), the same seven groups, sections, icons and
// order, one row per section. Each row opens that one section on a screen of its own (SettingsSectionScreen).
import { onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { NAV } from "../../views/settings/nav.js";
import { usePhoneNav } from "../navigation.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
defineProps({ id: { type: String, default: null } });

const { t } = useI18n();
const nav = usePhoneNav();
onMounted(() => data.start());
const inDesktop = typeof window !== "undefined" && !!window.desktopServers; // sections that need the desktop app's shell
const groups = NAV.map((g) => ({ ...g, tabs: g.tabs.filter((x) => !x.desktop || inDesktop) })).filter((g) => g.tabs.length);
const open = (id) => nav.push("settingsSection", id);
</script>

<template>
  <PhoneScreen class="ph-settings">
    <ListGroup v-for="g in groups" :key="g.group" :title="t('settings.nav.groups.' + g.group)">
      <ListRow v-for="x in g.tabs" :key="x.id" :data-sec="x.id" :title="t('settings.nav.tabs.' + x.id)" :icon="x.icon" link @tap="open(x.id)" />
    </ListGroup>
  </PhoneScreen>
</template>
