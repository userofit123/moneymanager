<script setup>
// What a screen is for, while its full phone version is being made: the screen's icon, one sentence about what it shows,
// and the one action people come to it for (add a transaction, a new jar...).
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { pages } from "../../routes.js";
import { openForm } from "../../core/forms.js";
import { usePhoneNav } from "../navigation.js";
import { ICONS } from "../icons.js";
import EmptyState from "./EmptyState.vue";

const props = defineProps({ name: { type: String, required: true } });
const { t, te } = useI18n();
const nav = usePhoneNav();
const ON = { account: "accounts", jar: "jars", bill: "bills", category: "categories", settingsSection: "settings", transaction: "activity" };
const icon = computed(() => pages.find((p) => p.name === (ON[props.name] || props.name))?.icon || ICONS.more4);
const ACT = {
  home: () => nav.tab("activity"),
  activity: () => openForm("tx"),
  jars: () => openForm("jar"),
  bills: () => openForm("bill"),
  accounts: () => openForm("account"),
  budgets: () => openForm("budget"),
  categories: () => openForm("category"),
  alerts: () => nav.push("settingsSection", "alr"),
  settings: () => nav.push("settingsSection", "prof"),
};
const action = computed(() => (ACT[props.name] && te("phone.shell.open." + props.name) ? t("phone.shell.open." + props.name) : ""));
</script>

<template>
  <EmptyState class="ph-intro" :icon="icon" :text="t('phone.shell.about.' + name)" :action="action" @action="ACT[name]()" />
</template>
