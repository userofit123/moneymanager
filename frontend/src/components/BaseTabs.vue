<script setup>
// A row of choices where one is picked (like "This month / Last month"). Use v-model for the picked value.
// options: [{ value, label }]
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

<style scoped>
.seg { display: inline-flex; max-inline-size: 100%; background: var(--s1); box-shadow: inset 0 0 0 1px var(--ol); border-radius: var(--pill); padding: 3px; overflow-x: auto; scrollbar-width: none; }
.seg button { flex: 1 0 auto; border: 0; background: none; font-size: 13px; padding: 8px 14px; border-radius: var(--pill); color: var(--tx2); cursor: pointer; white-space: nowrap; min-height: 34px; transition: background .2s, color .2s; }
.seg button.on { background: var(--acc); color: var(--on); font-weight: 600; }
.seg button:focus-visible { outline: 2px solid var(--acc); outline-offset: -2px; }
</style>
