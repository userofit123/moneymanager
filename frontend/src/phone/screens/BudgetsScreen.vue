<script setup>
// Budgets (in More): spending limits per category.
import PhoneScreen from "../components/PhoneScreen.vue";
import ScreenIntro from "../components/ScreenIntro.vue";
defineProps({ id: { type: String, default: null } });
</script>

<template>
  <PhoneScreen>
    <ScreenIntro name="budgets" />
  </PhoneScreen>
</template>
