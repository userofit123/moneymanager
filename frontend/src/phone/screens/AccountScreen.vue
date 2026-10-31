<script setup>
// One account (pushed on Accounts, /accounts?id=).
import PhoneScreen from "../components/PhoneScreen.vue";
import ScreenIntro from "../components/ScreenIntro.vue";
defineProps({ id: { type: String, default: null } });
</script>

<template>
  <PhoneScreen>
    <ScreenIntro name="account" />
  </PhoneScreen>
</template>
