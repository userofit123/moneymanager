<script setup>
// One bill (pushed on Bills, /bills?bill=).
import PhoneScreen from "../components/PhoneScreen.vue";
import ScreenIntro from "../components/ScreenIntro.vue";
defineProps({ id: { type: String, default: null } });
</script>

<template>
  <PhoneScreen>
    <ScreenIntro name="bill" />
  </PhoneScreen>
</template>
