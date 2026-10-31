<script setup>
// A search box: magnifier, the words, and a button that clears them. 16px text, so phones do not zoom in.
import { useI18n } from "vue-i18n";
import PIcon from "./PIcon.vue";
defineProps({ modelValue: { type: String, default: "" }, placeholder: { type: String, default: "" } });
defineEmits(["update:modelValue"]);
const { t } = useI18n();
</script>

<template>
  <label class="ph-search">
    <PIcon name="search" />
    <input type="search" enterkeyhint="search" :value="modelValue" :placeholder="placeholder || t('phone.shell.search')" :aria-label="placeholder || t('phone.shell.search')" @input="$emit('update:modelValue', $event.target.value)">
    <button v-if="modelValue" type="button" class="ph-search-x" :aria-label="t('phone.shell.clear')" @click.prevent="$emit('update:modelValue', '')"><PIcon name="close" /></button>
  </label>
</template>
