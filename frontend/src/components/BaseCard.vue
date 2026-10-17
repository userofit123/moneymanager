<script setup>
// A card. "hero" is the colored main card at the top of a screen; "clickable" lifts on hover and acts as a button; "warn" has a red edge.
defineProps({ title: String, hero: Boolean, clickable: Boolean, warn: Boolean });
defineEmits(["click"]);
</script>

<template>
  <component :is="clickable ? 'button' : 'section'" class="card" :class="{ hero, clickable, warn }" :type="clickable ? 'button' : undefined" @click="clickable && $emit('click')">
    <h2 v-if="title || $slots.head" class="head"><span>{{ title }}</span><slot name="head" /></h2>
    <slot />
  </component>
</template>

<style scoped>
.card { display: block; width: 100%; text-align: start; font: inherit; color: inherit; background: var(--s1); border: 1px solid var(--ol); border-radius: var(--r); padding: 18px 20px; position: relative; overflow: hidden; min-width: 0; transition: transform .2s, border-color .2s, box-shadow .2s; }
.clickable { cursor: pointer; }
.clickable:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--acc) 50%, var(--ol)); box-shadow: 0 14px 34px -16px var(--acc); }
.clickable:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px; }
.hero { background: linear-gradient(140deg, var(--accc), color-mix(in srgb, var(--accc) 55%, var(--s1))); border-color: transparent; color: var(--onc); }
.warn { border-color: color-mix(in srgb, var(--neg) 45%, var(--ol)); }
.head { display: flex; justify-content: space-between; align-items: center; gap: var(--sp2); margin: 0 0 var(--sp3); font-size: 13px; font-weight: 500; color: var(--tx2); }
.hero .head { color: color-mix(in srgb, var(--onc) 75%, transparent); }
</style>
