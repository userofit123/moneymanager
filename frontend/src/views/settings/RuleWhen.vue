<script setup>
// The "If" part of every rule in Settings → Automatic sorting: where it looks (Everything or one part of the entry, its
// usual place first) and how it compares the text (contains, is exactly, starts with, ends with, does not contain).
// The lists come from lib/ruleFields.js. kind: cat, tag, card, in or name. The text and the result stay in each page.
import { useI18n } from "vue-i18n";
import { whereOptions, HOWS } from "../../lib/ruleFields.js";

defineProps({ kind: { type: String, required: true }, f: { type: String, required: true }, m: { type: String, default: "in" } });
defineEmits(["update:f", "update:m"]);
const { t } = useI18n();
const tk = (k) => t("settings.sorting." + k);
</script>

<template>
  <span>{{ tk("if") }}</span>
  <select class="rwhere" :value="f" :aria-label="tk('where.label')" @change="$emit('update:f', $event.target.value)"><option v-for="x in whereOptions(kind)" :key="x" :value="x">{{ tk("where." + x) }}</option></select>
  <select class="rhow" :value="m" :aria-label="tk('how.label')" @change="$emit('update:m', $event.target.value)"><option v-for="x in HOWS" :key="x" :value="x">{{ tk("how." + x) }}</option></select>
</template>
