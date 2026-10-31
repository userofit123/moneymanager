<script setup>
// Alerts (in More and the Home bell): alerts now and before.
import PhoneScreen from "../components/PhoneScreen.vue";
import ScreenIntro from "../components/ScreenIntro.vue";
defineProps({ id: { type: String, default: null } });
</script>

<template>
  <PhoneScreen>
    <ScreenIntro name="alerts" />
  </PhoneScreen>
</template>
