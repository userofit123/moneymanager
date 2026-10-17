<script setup>
// A pop-up window. Open and close it with v-model:open. Escape, the close button and a click outside all close it.
import { ref, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import BaseButton from "./BaseButton.vue";
const props = defineProps({ open: Boolean, title: { type: String, required: true } });
const emit = defineEmits(["update:open"]);
const { t } = useI18n();
const el = ref(null);
const sync = () => { const d = el.value; if (!d) return; if (props.open && !d.open) d.showModal(); else if (!props.open && d.open) d.close(); };
watch(() => props.open, sync);
onMounted(sync);
const outside = (e) => { if (e.target === el.value) emit("update:open", false); };
</script>

<template>
  <dialog ref="el" class="dlg" @close="emit('update:open', false)" @click="outside">
    <h2>{{ title }}</h2>
    <div class="body"><slot /></div>
    <div class="actions">
      <slot name="actions"><BaseButton variant="text" @click="emit('update:open', false)">{{ t("common.close") }}</BaseButton></slot>
    </div>
  </dialog>
</template>

<style scoped>
.dlg { border: 0; border-radius: 24px; padding: 24px; max-width: min(28rem, calc(100vw - 32px)); background: var(--surface); color: var(--fg); box-shadow: 0 8px 32px rgba(0, 0, 0, .3); }
.dlg::backdrop { background: rgba(10, 12, 24, .5); }
h2 { margin: 0 0 12px; font-size: 1.25rem; }
.body { color: var(--muted); }
.actions { display: flex; justify-content: flex-end; gap: 8px; margin-block-start: 24px; }
</style>
