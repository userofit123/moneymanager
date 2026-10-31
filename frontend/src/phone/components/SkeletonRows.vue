<script setup>
// Grey stand-in rows while a list loads the first time (they shimmer gently, not under reduced motion).
defineProps({ rows: { type: Number, default: 4 } });
</script>

<template>
  <div class="ph-group-b ph-skel" aria-hidden="true"><div v-for="i in rows" :key="i" class="ph-skel-r"><i class="a" /><span><i class="b" /><i class="c" /></span><i class="d" /></div></div>
</template>
