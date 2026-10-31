<script setup>
// The phone form of a tooltip: a small "i" button that opens the explanation in a sheet (text with **bold** leads
// and "- " list lines, as in the computer's tooltips).
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import PhoneSheet from "./PhoneSheet.vue";
import PIcon from "./PIcon.vue";
const props = defineProps({ text: { type: String, required: true }, title: { type: String, default: "" } });
const { t } = useI18n();
const open = ref(false);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const html = computed(() => esc(props.text).split("\n").map((l) => l.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")).map((l) => (l.startsWith("- ") ? `<li>${l.slice(2)}</li>` : `<p>${l}</p>`)).join("").replace(/(<li>.*?<\/li>)+/g, (m) => `<ul>${m}</ul>`));
</script>

<template>
  <button type="button" class="ph-info" :aria-label="title || t('shell.moreInfo')" @click.stop="open = true"><PIcon name="info" /></button>
  <PhoneSheet v-model:open="open" :title="title"><div class="ph-tiptext" v-html="html" /></PhoneSheet>
</template>
