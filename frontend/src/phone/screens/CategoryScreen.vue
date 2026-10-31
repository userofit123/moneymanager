<script setup>
// One category or tag (pushed on Categories, /categories?cat=).
import PhoneScreen from "../components/PhoneScreen.vue";
import ScreenIntro from "../components/ScreenIntro.vue";
defineProps({ id: { type: String, default: null } });
</script>

<template>
  <PhoneScreen>
    <ScreenIntro name="category" />
  </PhoneScreen>
</template>
