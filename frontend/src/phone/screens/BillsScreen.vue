<script setup>
// Bills (tab): payments that repeat, and what is due soon.
import PhoneScreen from "../components/PhoneScreen.vue";
import ScreenIntro from "../components/ScreenIntro.vue";
defineProps({ id: { type: String, default: null } });
</script>

<template>
  <PhoneScreen>
    <ScreenIntro name="bills" />
  </PhoneScreen>
</template>
