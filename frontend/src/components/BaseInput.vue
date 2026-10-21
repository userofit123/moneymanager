<script setup>
// A text box with its label above it, and an optional short hint or error under it. Use v-model.
// money: shows thousands separators while typing (6,000) and gives back a plain number; the currency sign is in the label, like the current app ("Amount (₪)").
// Markup is the old app's: .fld > label + input, hints in .sm (styled in styles/legacy.css).
import { computed, useId } from "vue";
import { currencySymbol } from "../format.js";
const props = defineProps({ modelValue: [String, Number], label: { type: String, required: true }, hint: String, error: String, type: { type: String, default: "text" }, money: Boolean, currency: { type: String, default: "ILS" }, placeholder: String, disabled: Boolean, multiline: Boolean });
const emit = defineEmits(["update:modelValue"]);
const id = useId();
const group = (v) => { const m = String(v ?? "").match(/^(-?)(\d*)(\.\d*)?$/); return m ? m[1] + m[2].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (m[3] || "") : String(v ?? ""); };
const shown = computed(() => (props.money ? group(props.modelValue) : props.modelValue ?? ""));
const onInput = (e) => {
  if (!props.money) return emit("update:modelValue", e.target.value);
  const raw = e.target.value.replace(/[^\d.\-]/g, "");
  e.target.value = group(raw);
  emit("update:modelValue", raw === "" || raw === "-" ? null : Number(raw));
};
</script>

<template>
  <div class="fld">
    <label :for="id">{{ label }}<span v-if="money"> ({{ currencySymbol(currency).trim() }})</span></label>
    <textarea v-if="multiline" :id="id" :value="shown" :placeholder="placeholder" :disabled="disabled" rows="2" :aria-invalid="!!error" @input="onInput" />
    <input v-else :id="id" :type="money ? 'text' : type" :inputmode="money ? 'decimal' : undefined" :dir="money ? 'ltr' : undefined" :value="shown" :placeholder="placeholder" :disabled="disabled" :aria-invalid="!!error" @input="onInput" />
    <div v-if="error" class="sm" style="color: var(--neg)" role="alert">{{ error }}</div>
    <div v-else-if="hint" class="sm">{{ hint }}</div>
  </div>
</template>
