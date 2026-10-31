<script setup>
// One line of a card in Settings: a title and a small explanation on one side, the control on the other.
// "desc" can also be given as the "desc" slot when it has markup in it.
// toggle: the row is an on/off switch (v-model), and a click anywhere on the row flips it.
// stack: the control goes under the text, full width (long boxes, a folder path, several buttons).
// badge: true or false shows a small "On" / "Off" pill before the control.
import { useI18n } from "vue-i18n";
const { t } = useI18n();
const props = defineProps({
  title: { type: String, default: "" },
  desc: { type: String, default: "" },
  cls: { type: String, default: "" },
  toggle: { type: Boolean, default: false },
  stack: { type: Boolean, default: false },
  badge: { type: Boolean, default: null },
  disabled: { type: Boolean, default: false },
});
const on = defineModel({ type: Boolean, default: false });
</script>

<template>
  <component :is="props.toggle ? 'label' : 'div'" class="sr" :class="[cls, { srtg: toggle, stk: stack, dis: toggle && disabled }]">
    <div class="srt"><b><slot name="title">{{ title }}</slot></b><div v-if="desc || $slots.desc" class="sm"><slot name="desc">{{ desc }}</slot></div></div>
    <div class="src">
      <span v-if="badge != null" class="bd" :class="badge ? 'dn' : 'fl'">{{ t(badge ? "settings.common.on" : "settings.common.off") }}</span>
      <slot />
      <span v-if="toggle" class="tg"><input v-model="on" type="checkbox" :disabled="disabled" :aria-label="title"></span>
    </div>
  </component>
</template>
