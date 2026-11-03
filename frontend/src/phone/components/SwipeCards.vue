<script setup>
// A row of cards that slides sideways, for a computer grid with many cards (accounts): each card nearly the screen's
// width, the next one peeking at the edge so it is clear there is more. Snaps to one card at a time.
// With two cards or fewer they stack instead, so nothing hides off screen.
defineProps({ count: { type: Number, default: 0 } });
</script>

<template>
  <div class="ph-swipe" :class="{ on: count > 2 }"><slot /></div>
</template>
