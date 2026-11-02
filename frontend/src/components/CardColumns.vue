<script setup>
// Cards side by side in columns, each card keeping its own height and sitting right under the card above it in its column
// (no rows lined up across, so a short card is never stretched to match a tall neighbour and leaves no gap).
// Cards go into the columns in turn, in their order: 1st, 2nd, … column, then back to the 1st. In Hebrew the 1st column is on the right.
//   cols: a fixed number of columns; or min: the narrowest a column may be, and as many columns as fit the width.
//   The default slot gets each item as `item` (and its place in the list as `index`).
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps({
  items: { type: Array, required: true },
  cols: { type: Number, default: 2 },
  min: { type: Number, default: 0 },
  itemKey: { type: [String, Function], default: "id" },
});

const root = ref(null), fit = ref(props.cols);
const n = computed(() => (props.min ? fit.value : props.cols));
const keyOf = (it, i) => (typeof props.itemKey === "function" ? props.itemKey(it, i) : it?.[props.itemKey] ?? i);
const columns = computed(() => {
  const out = Array.from({ length: n.value }, () => []);
  props.items.forEach((item, index) => out[index % n.value].push({ item, index }));
  return out;
});

// with `min`, the number of columns follows the width (like a grid's auto-fill)
let ro = null;
const measure = () => {
  const el = root.value;
  if (!el) return;
  const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
  fit.value = Math.max(1, Math.floor((el.clientWidth + gap) / (props.min + gap)));
};
onMounted(() => {
  if (!props.min) return;
  measure();
  ro = new ResizeObserver(measure);
  ro.observe(root.value);
});
onBeforeUnmount(() => ro?.disconnect());
</script>

<template>
  <div ref="root" class="ccols" :style="{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }">
    <div v-for="(col, ci) in columns" :key="ci" class="ccol">
      <template v-for="c in col" :key="keyOf(c.item, c.index)"><slot :item="c.item" :index="c.index" /></template>
    </div>
  </div>
</template>
