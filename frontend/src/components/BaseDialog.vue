<script setup>
// A pop-up window with a title and buttons at the bottom (BaseSheet with the current app's h3 and footer). Open and close it with v-model:open.
import { useI18n } from "vue-i18n";
import BaseSheet from "./BaseSheet.vue";
import BaseButton from "./BaseButton.vue";
defineProps({ open: Boolean, title: { type: String, required: true }, cls: { type: String, default: "" } });
const emit = defineEmits(["update:open"]);
const { t } = useI18n();
const close = () => emit("update:open", false);
</script>

<template>
  <BaseSheet :open="open" :cls="cls" :label="title" @close="close">
    <h3>{{ title }}</h3>
    <div class="dlg-body"><slot /></div>
    <div class="flex dlg-actions">
      <slot name="actions"><BaseButton variant="outline" @click="close">{{ t("common.close") }}</BaseButton></slot>
    </div>
  </BaseSheet>
</template>

<style>
.sheet .dlg-actions { justify-content: flex-end; gap: 8px; margin-top: 22px; }
</style>
