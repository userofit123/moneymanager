<script setup>
// A short list of actions in a sheet, with Cancel apart at the bottom. Actions that remove something are red.
// actions: [{ label, icon?, danger?, run }]. Used for "more" menus and long press.
import { useI18n } from "vue-i18n";
import PhoneSheet from "./PhoneSheet.vue";
import PIcon from "./PIcon.vue";
defineProps({ open: { type: Boolean, default: false }, title: { type: String, default: "" }, actions: { type: Array, default: () => [] } });
const emit = defineEmits(["update:open"]);
const { t } = useI18n();
const pick = (a) => { emit("update:open", false); a.run?.(); };
</script>

<template>
  <PhoneSheet :open="open" :label="title" @update:open="$emit('update:open', $event)">
    <p v-if="title" class="ph-act-t">{{ title }}</p>
    <div class="ph-acts">
      <button v-for="a in actions" :key="a.label" type="button" class="ph-act" :class="{ danger: a.danger }" @click="pick(a)"><PIcon v-if="a.icon" :svg="a.icon" />{{ a.label }}</button>
    </div>
    <button type="button" class="ph-act ph-act-x" @click="$emit('update:open', false)">{{ t("phone.shell.cancel") }}</button>
  </PhoneSheet>
</template>
