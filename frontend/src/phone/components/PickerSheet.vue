<script setup>
// Choose one (or several, multi) from a list in a sheet: a search field when the list is long, a check at the picked ones,
// and "Clear" when something is picked. options: [{ value, label, sub? }].
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import PhoneSheet from "./PhoneSheet.vue";
import SearchField from "./SearchField.vue";
import PIcon from "./PIcon.vue";
const props = defineProps({ open: { type: Boolean, default: false }, title: { type: String, default: "" }, options: { type: Array, default: () => [] }, modelValue: { type: [String, Number, Array], default: null }, multi: { type: Boolean, default: false } });
const emit = defineEmits(["update:open", "update:modelValue"]);
const { t } = useI18n();
const q = ref("");
const list = computed(() => { const s = q.value.trim().toLowerCase(); return s ? props.options.filter((o) => String(o.label).toLowerCase().includes(s)) : props.options; });
const picked = (v) => (props.multi ? (props.modelValue || []).includes(v) : props.modelValue === v);
const some = computed(() => (props.multi ? (props.modelValue || []).length > 0 : props.modelValue != null && props.modelValue !== ""));
function pick(v) {
  if (!props.multi) { emit("update:modelValue", v); emit("update:open", false); return; }
  const cur = props.modelValue || [];
  emit("update:modelValue", cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
}
const clear = () => emit("update:modelValue", props.multi ? [] : null);
</script>

<template>
  <PhoneSheet :open="open" :title="title" @update:open="$emit('update:open', $event)">
    <SearchField v-if="options.length > 8" v-model="q" class="ph-pick-q" />
    <div class="ph-pick">
      <button v-for="o in list" :key="o.value" type="button" class="ph-pick-o" :aria-pressed="picked(o.value)" @click="pick(o.value)">
        <span class="ph-row-main"><span class="ph-row-t">{{ o.label }}</span><span v-if="o.sub" class="ph-row-s">{{ o.sub }}</span></span>
        <PIcon v-if="picked(o.value)" name="check" class="ph-pick-ck" />
      </button>
    </div>
    <template v-if="some" #foot><button type="button" class="ph-btn tonal" @click="clear">{{ t("phone.shell.clear") }}</button></template>
  </PhoneSheet>
</template>
