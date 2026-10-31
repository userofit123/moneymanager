<script setup>
// A screen's opening sentence, with its amounts set large inside it ("₪4,210 is free to use until the 1st.").
// text: the sentence from t() with each amount marked by {amount}-style slots: pass parts [{ text }, { amount: "₪4,210" }, ...].
// link: an optional line under it ("How is this worked out?") that emits "link".
import PIcon from "./PIcon.vue";
defineProps({ parts: { type: Array, default: () => [] }, link: { type: String, default: "" } });
defineEmits(["link"]);
</script>

<template>
  <div class="ph-hero">
    <p class="ph-hero-s"><template v-for="(p, i) in parts" :key="i"><b v-if="p.amount != null" class="ph-hero-a">{{ p.amount }}</b><template v-else>{{ p.text }}</template></template></p>
    <button v-if="link" type="button" class="ph-link ph-hero-l" @click="$emit('link')">{{ link }}<PIcon name="chevron" dir /></button>
  </div>
</template>
