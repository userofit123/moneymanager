<script setup>
// One jar (pushed on Jars, /jars?jar=).
import PhoneScreen from "../components/PhoneScreen.vue";
import ScreenIntro from "../components/ScreenIntro.vue";
defineProps({ id: { type: String, default: null } });
</script>

<template>
  <PhoneScreen>
    <ScreenIntro name="jar" />
  </PhoneScreen>
</template>
