<script setup>
// variant: "filled" (main action), "tonal" (second action), "outline", "text" (quiet action), "danger" (deletes or removes something).
// size "small" for buttons inside rows and cards. "busy" shows a spinner and blocks clicks while something is running.
defineProps({ variant: { type: String, default: "filled" }, size: { type: String, default: "normal" }, type: { type: String, default: "button" }, busy: Boolean, disabled: Boolean });
</script>

<template>
  <button :type="type" class="btn" :class="[variant, { small: size === 'small', busy }]" :disabled="disabled || busy" :aria-busy="busy || undefined">
    <span v-if="busy" class="spin" aria-hidden="true" /><slot />
  </button>
</template>

<style scoped>
.btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--sp2); min-height: 42px; padding: 10px 22px; border-radius: var(--pill); border: 0; cursor: pointer; font-size: var(--fs); font-weight: 600; background: var(--acc); color: var(--on); transition: transform .12s, filter .15s, background .2s, opacity .2s; }
.btn.tonal { background: var(--accc); color: var(--onc); }
.btn.outline { background: none; border: 1px solid var(--ol); color: var(--acc); }
.btn.text { background: transparent; color: var(--acc); padding-inline: 12px; }
.btn.danger { background: none; border: 1px solid color-mix(in srgb, var(--neg) 40%, transparent); color: var(--neg); }
.btn.small { min-height: 32px; padding: 5px 13px; font-size: 12px; }
.btn:hover:not(:disabled) { filter: brightness(1.1); }
.btn:active:not(:disabled) { transform: scale(.97); }
.btn:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px; }
.btn:disabled { opacity: .45; cursor: not-allowed; }
.btn.busy:disabled { opacity: 1; cursor: progress; }
.spin { width: 14px; height: 14px; border: 2px solid currentColor; border-inline-end-color: transparent; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
