<script setup>
// An on/off switch with its label (and an optional short explanation). Use v-model.
import { useId } from "vue";
defineProps({ modelValue: Boolean, label: { type: String, required: true }, hint: String, disabled: Boolean });
const emit = defineEmits(["update:modelValue"]);
const id = useId();
</script>

<template>
  <label class="tg" :for="id">
    <span class="text"><span class="title">{{ label }}</span><span v-if="hint" class="hint">{{ hint }}</span></span>
    <input :id="id" type="checkbox" role="switch" :checked="modelValue" :disabled="disabled" @change="emit('update:modelValue', $event.target.checked)" />
  </label>
</template>

<style scoped>
.tg { display: flex; align-items: center; justify-content: space-between; gap: var(--sp3); padding: 10px 0; cursor: pointer; }
.text { display: flex; flex-direction: column; min-width: 0; }
.title { font-weight: 500; }
.hint { font-size: var(--fs-sm); color: var(--tx2); }
.tg { --tg-move: 18px; }
:global(html.he .tg) { --tg-move: -18px; }
input { appearance: none; -webkit-appearance: none; margin: 0; width: 44px; height: 26px; border-radius: var(--pill); background: var(--s2); border: 1px solid var(--ol); position: relative; cursor: pointer; flex: none; transition: background .22s, border-color .22s; }
input::after { content: ""; position: absolute; top: 2px; inset-inline-start: 2px; width: 20px; height: 20px; border-radius: 50%; background: var(--tx2); transition: translate .22s var(--ease), background .22s; }
input:checked { background: var(--acc); border-color: var(--acc); }
input:checked::after { translate: var(--tg-move) 0; background: var(--on); }
input:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px; }
input:disabled { opacity: .5; cursor: not-allowed; }
</style>
