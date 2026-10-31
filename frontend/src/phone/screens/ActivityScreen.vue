<script setup>
// Activity (tab): every transaction, with search and filters.
import PhoneScreen from "../components/PhoneScreen.vue";
import ScreenIntro from "../components/ScreenIntro.vue";
defineProps({ id: { type: String, default: null } });
</script>

<template>
  <PhoneScreen refresh>
    <ScreenIntro name="activity" />
  </PhoneScreen>
</template>
