<script setup>
// One row in a ListGroup: a leading icon tile (or the "lead" slot), a title and a second line, and at the end a value,
// an amount (the "end" slot), a switch or a chevron. link: it opens a screen (chevron). Taps emit "tap".
// tone colours the icon tile: "acc" (default), "pos", "neg", "warn", or a colour.
import { computed } from "vue";
import PIcon from "./PIcon.vue";
const props = defineProps({
  title: { type: String, default: "" }, sub: { type: String, default: "" }, value: { type: String, default: "" },
  icon: { type: String, default: "" }, iconName: { type: String, default: "" }, tone: { type: String, default: "acc" },
  link: { type: Boolean, default: false }, badge: { type: [Number, String], default: 0 }, danger: { type: Boolean, default: false },
  toggle: { type: Boolean, default: undefined }, disabled: { type: Boolean, default: false },
});
const emit = defineEmits(["tap", "update:toggle"]);
const tile = computed(() => (["acc", "pos", "neg", "warn"].includes(props.tone) ? { "--tile": `var(--${props.tone})` } : { "--tile": props.tone }));
const tap = () => { if (props.disabled) return; if (props.toggle !== undefined) emit("update:toggle", !props.toggle); emit("tap"); };
</script>

<template>
  <button type="button" class="ph-row" :class="{ danger, two: !!sub }" :disabled="disabled" :role="toggle !== undefined ? 'switch' : undefined" :aria-checked="toggle !== undefined ? String(toggle) : undefined" @click="tap">
    <span v-if="$slots.lead || icon || iconName" class="ph-row-lead">
      <slot name="lead"><span class="ph-tile" :style="tile"><PIcon :svg="icon" :name="iconName" /></span></slot>
    </span>
    <span class="ph-row-main">
      <span class="ph-row-t">{{ title }}<slot name="title" /></span>
      <span v-if="sub || $slots.sub" class="ph-row-s"><slot name="sub">{{ sub }}</slot></span>
    </span>
    <span class="ph-row-end">
      <slot name="end"><span v-if="value" class="ph-row-v">{{ value }}</span></slot>
      <span v-if="badge" class="ph-badge">{{ badge }}</span>
      <span v-if="toggle !== undefined" class="ph-switch" :class="{ on: toggle }" aria-hidden="true"><i /></span>
      <PIcon v-else-if="link" class="ph-chev" name="chevron" dir />
    </span>
  </button>
</template>
