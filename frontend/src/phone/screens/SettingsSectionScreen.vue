<script setup>
// One Settings section (pushed on Settings, /settings?sec=).
import { useI18n } from "vue-i18n";
import PhoneScreen from "../components/PhoneScreen.vue";
import ScreenIntro from "../components/ScreenIntro.vue";
defineProps({ id: { type: String, default: null } });
const { t } = useI18n();
</script>

<template>
  <PhoneScreen :title="id ? t('settings.nav.tabs.' + id) : ''">
    <ScreenIntro name="settingsSection" />
  </PhoneScreen>
</template>
