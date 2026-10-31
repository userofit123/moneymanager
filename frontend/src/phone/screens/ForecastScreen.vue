<script setup>
// Forecast (in More): where the balance is heading.
import PhoneScreen from "../components/PhoneScreen.vue";
import ScreenIntro from "../components/ScreenIntro.vue";
defineProps({ id: { type: String, default: null } });
</script>

<template>
  <PhoneScreen>
    <ScreenIntro name="forecast" />
  </PhoneScreen>
</template>
