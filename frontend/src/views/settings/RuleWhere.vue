<script setup>
// Where a rule looks in an entry (lib/ruleFields.js): its usual place first, then each part of an entry, or everything.
// kind: cat, tag, card, in or name. Used by every rule list in Settings → Automatic sorting.
import { useI18n } from "vue-i18n";
import { whereOptions } from "../../lib/ruleFields.js";

defineProps({ kind: { type: String, required: true }, modelValue: { type: String, required: true } });
defineEmits(["update:modelValue"]);
const { t } = useI18n();
</script>

<template>
  <select class="rwhere" :value="modelValue" :aria-label="t('settings.sorting.where.label')" @change="$emit('update:modelValue', $event.target.value)"><option v-for="f in whereOptions(kind)" :key="f" :value="f">{{ t("settings.sorting.where." + f) }}</option></select>
</template>
