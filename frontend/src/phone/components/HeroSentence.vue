<script setup>
// A screen's opening sentence, with its amounts set large inside it ("₪4,210 is free to use until the 1st.").
// text: the sentence from t() with each amount marked by {amount}-style slots: pass parts [{ text }, { amount: "₪4,210" }, ...].
// An amount keeps the stop or comma right after it on its line, and stays left to right in Hebrew.
// link: an optional line under it ("How is this worked out?") that emits "link".
import { computed } from "vue";
import PIcon from "./PIcon.vue";
const props = defineProps({ parts: { type: Array, default: () => [] }, link: { type: String, default: "" } });
defineEmits(["link"]);
const glued = computed(() => {
  const out = [];
  props.parts.forEach((p) => {
    const last = out[out.length - 1];
    if (p.amount == null && last?.amount != null && !last.tail) {
      const m = /^[.,;:!?)׳״]+/.exec(p.text || "");
      if (m) { last.tail = m[0]; const rest = p.text.slice(m[0].length); if (rest) out.push({ text: rest }); return; }
    }
    out.push({ ...p });
  });
  return out;
});
</script>

<template>
  <div class="ph-hero">
    <p class="ph-hero-s"><template v-for="(p, i) in glued" :key="i"><span v-if="p.amount != null" class="ph-hero-g"><b class="ph-hero-a" dir="ltr">{{ p.amount }}</b>{{ p.tail }}</span><template v-else>{{ p.text }}</template></template></p>
    <button v-if="link" type="button" class="ph-link ph-hero-l" @click="$emit('link')">{{ link }}<PIcon name="chevron" dir /></button>
  </div>
</template>
