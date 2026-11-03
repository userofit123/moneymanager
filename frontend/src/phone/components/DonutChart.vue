<script setup>
// The computer's ring chart with its legend, for a phone: the ring with the total in its middle, then one line per part
// (dot, name, amount). Tapping a part of the ring or a line picks it (Home: that category's activity).
// parts: [{ n, d, color, v, label }] where d is the part's path in a 200×200 box (pagelogic/home.js builds them).
defineProps({ parts: { type: Array, default: () => [] }, total: { type: String, default: "" }, caption: { type: String, default: "" } });
defineEmits(["pick"]);
</script>

<template>
  <div class="ph-donut">
    <svg class="ph-donut-c" viewBox="0 0 200 200" role="img" :aria-label="caption + ' ' + total">
      <path v-for="p in parts" :key="p.n" :d="p.d" :fill="p.color" @click="$emit('pick', p.n)" />
      <text x="100" y="98" text-anchor="middle" class="ph-donut-t">{{ total }}</text>
      <text x="100" y="118" text-anchor="middle" class="ph-donut-s">{{ caption }}</text>
    </svg>
    <div class="ph-donut-l">
      <button v-for="p in parts" :key="p.n" type="button" class="ph-donut-r" @click="$emit('pick', p.n)">
        <i :style="{ background: p.color }" /><span>{{ p.label }}</span><b class="ph-amt">{{ p.amount }}</b>
      </button>
    </div>
  </div>
</template>
