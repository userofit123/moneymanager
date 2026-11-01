<script setup>
// Two to four choices where one is picked, at phone size: the app's own tab row (BaseTabs, with its sliding pill),
// spread over the full width. When the names do not fit (four kinds, long Hebrew words) the row scrolls sideways:
// the side with more choices out of sight fades out, like the filter chips, and the picked one is scrolled into view.
import { ref, computed, watch, nextTick } from "vue";
import BaseTabs from "../../components/BaseTabs.vue";
import { useEdgeFade } from "../edgeFade.js";
const props = defineProps({ modelValue: { type: [String, Number], required: true }, options: { type: Array, required: true }, label: { type: String, required: true } });
defineEmits(["update:modelValue"]);
// the tab row itself is what scrolls (its own overflow); the fade is drawn on the box around it
const box = ref(null), row = computed(() => box.value?.querySelector(".seg") || null);
const { fade, on, edges } = useEdgeFade(row, "28px");
function showPicked() {
  const b = row.value?.querySelector("button.on"); if (!b || !on.value) return;
  b.scrollIntoView({ block: "nearest", inline: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}
watch(() => props.options, () => nextTick(edges), { deep: true });
watch(() => props.modelValue, () => nextTick(showPicked));
</script>

<template>
  <div ref="box" class="ph-segwrap" :class="{ fades: on }" :style="fade" @scroll.capture.passive="edges"><BaseTabs class="ph-seg" :model-value="modelValue" :options="options" :label="label" @update:model-value="$emit('update:modelValue', $event)" /></div>
</template>
