<script setup>
// Home (tab): how the month is going at a glance. The bell opens Alerts, + opens "Add or update".
import { useI18n } from "vue-i18n";
import { alertList } from "../../core/derived.js";
import { quickOpen } from "../../core/shell.js";
import { usePhoneNav } from "../navigation.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import IconButton from "../components/IconButton.vue";
import SyncLine from "../components/SyncLine.vue";
import ScreenIntro from "../components/ScreenIntro.vue";
defineProps({ id: { type: String, default: null } });
const { t } = useI18n();
const nav = usePhoneNav();
</script>

<template>
  <PhoneScreen refresh>
    <template #actions>
      <IconButton :label="t('shell.alerts')" icon-name="bell" :badge="alertList.length" @tap="nav.push('alerts')" />
      <IconButton :label="t('shell.add')" icon-name="add" @tap="quickOpen = true" />
    </template>
    <template #sub><SyncLine /></template>
    <ScreenIntro name="home" />
  </PhoneScreen>
</template>
