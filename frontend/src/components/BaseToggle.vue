<script setup>
// An on/off switch with its label (and an optional short explanation). Use v-model.
// Markup is the old app's: .tg > span + checkbox (styled in styles/legacy.css).
import { useId } from "vue";
defineProps({ modelValue: Boolean, label: { type: String, required: true }, hint: String, disabled: Boolean });
const emit = defineEmits(["update:modelValue"]);
const id = useId();
</script>

<template>
  <label class="tg" :for="id">
    <span>{{ label }}<span v-if="hint" class="sm">{{ hint }}</span></span>
    <input :id="id" type="checkbox" role="switch" :checked="modelValue" :disabled="disabled" @change="emit('update:modelValue', $event.target.checked)" />
  </label>
</template>
