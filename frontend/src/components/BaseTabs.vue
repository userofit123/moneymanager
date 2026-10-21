<script setup>
// A row of choices where one is picked (like "This month / Last month"). Use v-model for the picked value.
// options: [{ value, label }]. Markup is the old app's .seg (styled in styles/legacy.css).
defineProps({ modelValue: { type: [String, Number], required: true }, options: { type: Array, required: true }, label: { type: String, required: true } });
const emit = defineEmits(["update:modelValue"]);
const move = (e, opts, i) => {
  const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!k) return;
  const step = document.documentElement.classList.contains("he") ? -k : k;
  const next = opts[(i + step + opts.length) % opts.length];
  emit("update:modelValue", next.value);
  e.currentTarget.parentElement.children[opts.indexOf(next)]?.focus();
};
</script>

<template>
  <div class="seg" role="tablist" :aria-label="label">
    <button v-for="(o, i) in options" :key="o.value" type="button" role="tab" :aria-selected="o.value === modelValue" :tabindex="o.value === modelValue ? 0 : -1" :class="{ on: o.value === modelValue }" @click="emit('update:modelValue', o.value)" @keydown="move($event, options, i)">{{ o.label }}</button>
  </div>
</template>
