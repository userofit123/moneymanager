<script setup>
// A row of filter chips that scrolls sideways (from the start side). A chip that is on shows its value and an × to clear it.
// chips: [{ id, label, value? }]. Emits "open" (tap a chip) and "clear" (its ×).
import { useI18n } from "vue-i18n";
import PIcon from "./PIcon.vue";
defineProps({ chips: { type: Array, default: () => [] } });
defineEmits(["open", "clear"]);
const { t } = useI18n();
</script>

<template>
  <div class="ph-chips">
    <span v-for="c in chips" :key="c.id" class="ph-chip" :class="{ on: !!c.value }">
      <button type="button" class="ph-chip-b" @click="$emit('open', c.id)">{{ c.value || c.label }}</button>
      <button v-if="c.value" type="button" class="ph-chip-x" :aria-label="t('phone.shell.clear')" @click="$emit('clear', c.id)"><PIcon name="close" /></button>
    </span>
  </div>
</template>
