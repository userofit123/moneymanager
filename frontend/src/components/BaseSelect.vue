<script setup>
// A drop-down list with its label above it. options: [{ value, label }]. Use v-model.
// Markup is the old app's: .fld > label + select (styled in styles/legacy.css).
import { useId } from "vue";
defineProps({ modelValue: [String, Number], label: { type: String, required: true }, options: { type: Array, required: true }, hint: String });
const emit = defineEmits(["update:modelValue"]);
const id = useId();
</script>

<template>
  <div class="fld">
    <label :for="id">{{ label }}</label>
    <select :id="id" :value="modelValue" @change="emit('update:modelValue', $event.target.value)">
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
    <div v-if="hint" class="sm">{{ hint }}</div>
  </div>
</template>
