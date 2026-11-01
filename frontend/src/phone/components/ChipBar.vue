<script setup>
// A row of filter chips that scrolls sideways (from the start side). A chip that is on shows its value and an × to clear it.
// The side with more chips out of sight fades out, so the row never looks cut off at the screen's edge.
// chips: [{ id, label, value? }]. Emits "open" (tap a chip) and "clear" (its ×).
import { ref, onMounted, onBeforeUnmount, onActivated, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import PIcon from "./PIcon.vue";
const props = defineProps({ chips: { type: Array, default: () => [] } });
defineEmits(["open", "clear"]);
const { t } = useI18n();
const el = ref(null), fade = ref({});
const FADE = "40px";
function edges() {
  const e = el.value; if (!e) return;
  const rtl = getComputedStyle(e).direction === "rtl", max = e.scrollWidth - e.clientWidth, s = Math.abs(e.scrollLeft);
  const start = s > 2, end = s < max - 2; // more out of sight on that side
  fade.value = { "--fl": (rtl ? end : start) ? FADE : "0px", "--fr": (rtl ? start : end) ? FADE : "0px" };
}
let ro = null;
onMounted(() => { edges(); ro = new ResizeObserver(edges); ro.observe(el.value); });
onActivated(edges);
onBeforeUnmount(() => ro?.disconnect());
watch(() => props.chips, () => nextTick(edges), { deep: true });
</script>

<template>
  <div ref="el" class="ph-chips" :style="fade" @scroll.passive="edges">
    <span v-for="c in chips" :key="c.id" class="ph-chip" :class="{ on: !!c.value }">
      <button type="button" class="ph-chip-b" @click="$emit('open', c.id)">{{ c.value || c.label }}</button>
      <button v-if="c.value" type="button" class="ph-chip-x" :aria-label="t('phone.shell.clear')" @click="$emit('clear', c.id)"><PIcon name="close" /></button>
    </span>
  </div>
</template>
