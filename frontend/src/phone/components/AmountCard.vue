<script setup>
// The computer's amount card on the phone: a small icon and a name on top, the amount large, a line under it, and
// optionally a small trend line along the bottom (Home's totals) or anything else in the "foot" slot (a bar).
// hero: the highlighted card (In your accounts). With @tap the whole card opens something (its explanation, a screen).
// Slots: label (a name with markup), sub (lines under the amount), foot (a bar or a chart at the bottom).
import { computed } from "vue";
import { sparkPath } from "../../lib/home.js";
const props = defineProps({
  icon: { type: String, default: "" }, label: { type: String, default: "" }, chip: { type: String, default: "" },
  value: { type: String, default: "" }, sub: { type: String, default: "" }, spark: { type: Array, default: null },
  sparkColor: { type: String, default: "var(--acc)" }, hero: { type: Boolean, default: false }, onTap: { type: Function, default: null },
});
const sp = computed(() => (props.spark?.length > 1 ? sparkPath(props.spark, 200, 40) : null));
const gid = "phsg" + Math.random().toString(36).slice(2, 8); // the trend line's own shading
const tap = () => props.onTap && props.onTap();
</script>

<template>
  <div class="ph-acard" :class="{ hero, spk: !!sp, tap: !!onTap }" :role="onTap ? 'button' : null" :tabindex="onTap ? 0 : null" @click="tap" @keydown.enter="tap">
    <div class="ph-acard-l">
      <span v-if="icon" class="ph-acard-i" v-html="icon" />
      <span class="ph-acard-n"><slot name="label">{{ label }}</slot></span>
      <span v-if="chip" class="ph-acard-chip">{{ chip }}</span>
    </div>
    <div class="ph-acard-v"><bdi dir="ltr"><small>₪</small>{{ value }}</bdi></div>
    <div v-if="sub || $slots.sub" class="ph-acard-s"><slot name="sub">{{ sub }}</slot></div>
    <slot name="foot" />
    <svg v-if="sp" class="ph-acard-spark" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient :id="gid" x1="0" x2="0" y1="0" y2="1"><stop offset="0" :stop-color="sparkColor" stop-opacity=".35" /><stop offset="1" :stop-color="sparkColor" stop-opacity="0" /></linearGradient></defs>
      <polygon :points="sp.area" :fill="'url(#' + gid + ')'" /><polyline :points="sp.line" fill="none" :stroke="sparkColor" stroke-width="2" vector-effect="non-scaling-stroke" />
    </svg>
  </div>
</template>
