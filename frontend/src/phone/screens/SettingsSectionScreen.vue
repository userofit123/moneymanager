<script setup>
// One Settings section on its own screen (pushed on Settings, /settings?sec=conn): the same section as on the computer
// (views/settings/*Pane.vue), with the phone's look for its cards, rows, fields and buttons (styles/adopted.css).
import { computed, defineAsyncComponent, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { NAV, PANES } from "../../views/settings/nav.js";
import { settingsTab } from "../../views/settings/tab.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import "../../styles/pages/settings.css"; // the sections' own styles, as on the computer

const props = defineProps({ id: { type: String, default: null } });
const { t } = useI18n();
onMounted(() => data.start());
const inDesktop = typeof window !== "undefined" && !!window.desktopServers;
const known = (id) => NAV.some((g) => g.tabs.some((x) => x.id === id && (!x.desktop || inDesktop)));
const sec = computed(() => (known(props.id) ? props.id : "prof"));
const pane = computed(() => defineAsyncComponent(PANES[sec.value]));
// the computer's Settings opens where the phone was last
onMounted(() => { settingsTab.value = sec.value; });
</script>

<template>
  <PhoneScreen :title="t('settings.nav.tabs.' + sec)">
    <div class="ph-set" :data-sec="sec"><component :is="pane" /></div>
  </PhoneScreen>
</template>
