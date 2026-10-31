<script setup>
// One transaction (pushed on any tab, ?tx=).
import PhoneScreen from "../components/PhoneScreen.vue";
import ScreenIntro from "../components/ScreenIntro.vue";
defineProps({ id: { type: String, default: null } });
</script>

<template>
  <PhoneScreen>
    <ScreenIntro name="transaction" />
  </PhoneScreen>
</template>
