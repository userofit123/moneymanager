<script setup>
// A pop-up window. Open and close it with v-model:open. Escape, the close button and a click outside all close it.
// On a phone it slides up from the bottom (a "bottom sheet"), like the current app.
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
  <dialog ref="el" class="sheet" @close="emit('update:open', false)" @click="outside">
    <span class="grab" aria-hidden="true" />
    <h2>{{ title }}</h2>
    <div class="body"><slot /></div>
    <div class="actions">
      <slot name="actions"><BaseButton variant="text" @click="emit('update:open', false)">{{ t("common.close") }}</BaseButton></slot>
    </div>
  </dialog>
</template>

<style scoped>
.sheet { border: 1px solid var(--ol); border-radius: var(--r-sheet); padding: var(--sp5); width: min(560px, 94vw); max-height: 88vh; overflow: auto; background: var(--bg); color: var(--tx); box-shadow: var(--shadow-sheet); }
.sheet[open] { animation: sin .24s var(--ease); }
.sheet::backdrop { background: var(--scrim); }
.grab { display: none; }
h2 { margin: 0 0 var(--sp3); font-size: 20px; font-weight: 600; }
.body { color: var(--tx2); }
.actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: var(--sp2); margin-block-start: var(--sp5); }
@keyframes sin { from { opacity: 0; scale: .97; translate: 0 10px; } }
@media (max-width: 760px) {
  .sheet { margin: auto 0 0; width: 100%; max-width: 100%; max-height: 92vh; border-radius: var(--r-sheet) var(--r-sheet) 0 0; border-width: 1px 0 0; padding: 10px 18px calc(22px + var(--sb)); overscroll-behavior: contain; }
  .sheet[open] { animation: up .28s var(--ease); }
  .grab { display: block; width: 40px; height: 4px; border-radius: var(--pill); background: var(--ol); margin: 0 auto var(--sp3); }
}
@keyframes up { from { translate: 0 100%; } }
</style>
