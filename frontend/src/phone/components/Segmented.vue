<script setup>
// Two to four choices where one is picked, at phone size: the app's own tab row (BaseTabs, with its sliding pill),
// spread over the full width, and scrolling sideways when the names do not fit (long Hebrew words).
import BaseTabs from "../../components/BaseTabs.vue";
defineProps({ modelValue: { type: [String, Number], required: true }, options: { type: Array, required: true }, label: { type: String, required: true } });
defineEmits(["update:modelValue"]);
</script>

<template>
  <div class="ph-segwrap"><BaseTabs class="ph-seg" :model-value="modelValue" :options="options" :label="label" @update:model-value="$emit('update:modelValue', $event)" /></div>
</template>
