<script setup>
// A pop-up window. Open and close it with v-model:open. Escape, the close button and a click outside all close it.
// Same markup as the current app: a .scrim behind and a .sheet with an h3 title (centered window on a computer, slides up on a phone). Styled in styles/legacy.css.
import { watch, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import BaseButton from "./BaseButton.vue";
const props = defineProps({ open: Boolean, title: { type: String, required: true } });
const emit = defineEmits(["update:open"]);
const { t } = useI18n();
const close = () => emit("update:open", false);
const esc = (e) => { if (e.key === "Escape") close(); };
watch(() => props.open, (o) => { if (o) document.addEventListener("keydown", esc); else document.removeEventListener("keydown", esc); }, { immediate: true });
onBeforeUnmount(() => document.removeEventListener("keydown", esc));
</script>

<template>
  <Teleport to="body">
    <template v-if="open">
      <div class="scrim on" @click="close" />
      <div class="sheet on" role="dialog" aria-modal="true" :aria-label="title">
        <span class="grab" aria-hidden="true" />
        <h3>{{ title }}</h3>
        <div class="dlg-body"><slot /></div>
        <div class="flex dlg-actions">
          <slot name="actions"><BaseButton variant="outline" @click="close">{{ t("common.close") }}</BaseButton></slot>
        </div>
      </div>
    </template>
  </Teleport>
</template>

<style>
.sheet .dlg-actions { justify-content: flex-end; gap: 8px; margin-top: 22px; }
</style>
