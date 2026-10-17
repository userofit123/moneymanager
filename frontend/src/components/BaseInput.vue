<script setup>
// A text box with its label above it, and an optional short hint or error under it. Use v-model.
// money: shows thousands separators while typing (6,000) and gives back a plain number; the ₪ sign sits inside the box.
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
  <div class="fld" :class="{ bad: error }">
    <label :for="id">{{ label }}</label>
    <div class="box">
      <span v-if="money" class="sym" aria-hidden="true">{{ currencySymbol(currency) }}</span>
      <textarea v-if="multiline" :id="id" :value="shown" :placeholder="placeholder" :disabled="disabled" rows="3" :aria-invalid="!!error" @input="onInput" />
      <input v-else :id="id" :type="money ? 'text' : type" :inputmode="money ? 'decimal' : undefined" :class="{ money }" :value="shown" :placeholder="placeholder" :disabled="disabled" :aria-invalid="!!error" @input="onInput" />
    </div>
    <span v-if="error" class="msg err" role="alert">{{ error }}</span>
    <span v-else-if="hint" class="msg">{{ hint }}</span>
  </div>
</template>

<style scoped>
.fld { display: grid; gap: 6px; min-width: 0; }
label { font-size: 12px; color: var(--tx2); font-weight: 600; }
.box { position: relative; display: flex; align-items: center; }
input, textarea { inline-size: 100%; font-size: var(--fs); padding: 10px 14px; border-radius: 14px; border: 1px solid var(--ol); background: var(--s1); color: var(--tx); min-height: 42px; transition: border-color .15s, box-shadow .15s; }
input:focus, textarea:focus { outline: 2px solid var(--acc); outline-offset: 1px; }
input:disabled, textarea:disabled { opacity: .7; }
.sym { position: absolute; inset-inline-start: 14px; color: var(--tx2); pointer-events: none; }
input.money { padding-inline-start: 32px; font-variant-numeric: tabular-nums; }
/* numbers and dates read left to right in Hebrew too, lined up to the right like the current app */
:global(html.he input.money), :global(html.he input[type="number"]), :global(html.he input[type="date"]) { direction: ltr; text-align: end; }
:global(html.he input.money) { padding-inline: 14px 32px; }
.bad input, .bad textarea { border-color: var(--neg); }
.msg { font-size: var(--fs-sm); color: var(--tx2); }
.err { color: var(--neg); }
@media (max-width: 760px) { input, textarea { font-size: 16px; } }
</style>
