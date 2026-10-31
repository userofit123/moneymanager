<script setup>
// Accounts (in More): every account and its balance.
import PhoneScreen from "../components/PhoneScreen.vue";
import ScreenIntro from "../components/ScreenIntro.vue";
defineProps({ id: { type: String, default: null } });
</script>

<template>
  <PhoneScreen refresh>
    <ScreenIntro name="accounts" />
  </PhoneScreen>
</template>
