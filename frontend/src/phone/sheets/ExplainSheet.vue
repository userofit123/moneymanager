<script setup>
// A tooltip's text in the phone app: a tap on an (i), or a press and hold on anything with a tooltip, opens it here
// (core/tooltip.js), formatted as on the computer: bold title, rows of label and amount, notes and warnings.
import { ref, watch, nextTick, onBeforeUnmount } from "vue";
import { tipSheet, tipFill } from "../../core/tooltip.js";
import PhoneSheet from "../components/PhoneSheet.vue";

const text = ref(""), open = ref(false), box = ref(null);
tipSheet((s) => { text.value = s; open.value = true; });
onBeforeUnmount(() => tipSheet(null));
watch([open, text], () => nextTick(() => { if (open.value && box.value) tipFill(box.value, text.value); }));
</script>

<template>
  <PhoneSheet v-model:open="open" cls="ph-explain">
    <div ref="box" class="tip rich on ph-tipbox" :class="{ one: !text.includes('\n') }" />
  </PhoneSheet>
</template>
