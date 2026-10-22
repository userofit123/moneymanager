<script setup>
// variant: "filled" (main action), "outline" (other actions), "danger" (deletes or removes something).
// size "small" for buttons inside rows and cards. "busy" shows a spinner and blocks clicks while something is running.
// Markup uses the shared classes: btn, btn o, btn r, btn s, btn running, spinner (styled in styles/components/buttons.css).
defineProps({ variant: { type: String, default: "filled" }, size: { type: String, default: "normal" }, type: { type: String, default: "button" }, busy: Boolean, disabled: Boolean });
</script>

<template>
  <button :type="type" class="btn" :class="[{ o: variant === 'outline', r: variant === 'danger', s: size === 'small', running: busy }]" :disabled="disabled || busy" :aria-busy="busy || undefined">
    <span v-if="busy" class="spinner" aria-hidden="true" /><slot />
  </button>
</template>
