<script setup>
// Jars (tab): money set aside, and how much is safe to put in.
import PhoneScreen from "../components/PhoneScreen.vue";
import ScreenIntro from "../components/ScreenIntro.vue";
defineProps({ id: { type: String, default: null } });
</script>

<template>
  <PhoneScreen>
    <ScreenIntro name="jars" />
  </PhoneScreen>
</template>
