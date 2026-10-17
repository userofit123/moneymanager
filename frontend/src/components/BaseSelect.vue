<script setup>
// A drop-down list with its label above it. options: [{ value, label }]. Use v-model.
import { useId } from "vue";
defineProps({ modelValue: [String, Number], label: { type: String, required: true }, options: { type: Array, required: true }, hint: String });
const emit = defineEmits(["update:modelValue"]);
const id = useId();
</script>

<template>
  <div class="fld">
    <label :for="id">{{ label }}</label>
    <div class="box">
      <select :id="id" :value="modelValue" @change="emit('update:modelValue', $event.target.value)">
        <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <svg class="arrow" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
    </div>
    <span v-if="hint" class="msg">{{ hint }}</span>
  </div>
</template>

<style scoped>
.fld { display: grid; gap: 6px; min-width: 0; }
label { font-size: 12px; color: var(--tx2); font-weight: 600; }
.box { position: relative; display: flex; align-items: center; }
select { appearance: none; inline-size: 100%; font-size: var(--fs); padding-block: 10px; padding-inline: 14px 40px; border-radius: 14px; border: 1px solid var(--ol); background: var(--s1); color: var(--tx); min-height: 42px; cursor: pointer; }
select:focus { outline: 2px solid var(--acc); outline-offset: 1px; }
.arrow { position: absolute; inset-inline-end: 14px; inset-block-start: 50%; translate: 0 -50%; color: var(--tx2); pointer-events: none; }
:global(html.he .box .arrow) { inset: 50% auto auto 14px; }
.msg { font-size: var(--fs-sm); color: var(--tx2); }
</style>
