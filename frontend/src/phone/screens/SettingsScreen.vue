<script setup>
// Settings (in More): your profile on top, then every section in the same seven groups, icons and order as on the computer
// (views/settings/nav.js). Each row opens that one section on a screen of its own (SettingsSectionScreen).
import { computed, onMounted } from "vue";
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
// Profile is the card on top, so its group lists the other sections
const groups = NAV.map((g) => ({ ...g, tabs: g.tabs.filter((x) => x.id !== "prof" && (!x.desktop || inDesktop)) })).filter((g) => g.tabs.length);
const TONE = { you: "acc", banks: "var(--c3)", sorting: "var(--c5)", alerts: "warn", safety: "pos", data: "var(--c2)", about: "var(--c6)" };
const profIcon = NAV[0].tabs.find((x) => x.id === "prof").icon;
const name = computed(() => String(data.state.value?.cfg?.profile?.name || "").trim());
const open = (id) => nav.push("settingsSection", id);
</script>

<template>
  <PhoneScreen class="ph-settings">
    <ListGroup>
      <ListRow class="ph-me" :title="name || t('phone.settings.you')" :sub="t('phone.settings.edit')" link @tap="open('prof')">
        <template #lead>
          <span class="ph-me-av" aria-hidden="true"><b v-if="name">{{ [...name][0] }}</b><svg v-else viewBox="0 0 24 24" v-html="profIcon" /></span>
        </template>
      </ListRow>
    </ListGroup>
    <ListGroup v-for="g in groups" :key="g.group" :title="t('settings.nav.groups.' + g.group)">
      <ListRow v-for="x in g.tabs" :key="x.id" :data-sec="x.id" :title="t('settings.nav.tabs.' + x.id)" :sub="t('phone.settings.rows.' + x.id)" :icon="x.icon" :tone="TONE[g.group]" link @tap="open(x.id)" />
    </ListGroup>
  </PhoneScreen>
</template>
