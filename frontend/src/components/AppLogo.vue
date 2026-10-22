<script setup>
// The app's logo: the chosen currency symbol (Settings → Preferences → App icon). With `shuffle`, a click gives the app a random new look.
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { theme, shuffle as shuffleLook } from "../core/theme.js";
import { iconSvg } from "../core/symbols.js";
const props = defineProps({ shuffle: Boolean, sym: { type: String, default: "" } }); // sym: show this icon instead of the chosen one
const { t } = useI18n();
const el = ref(null), shake = ref(false);
function go() {
  if (!props.shuffle) return;
  shake.value = false; requestAnimationFrame(() => { shake.value = true; setTimeout(() => (shake.value = false), 520); });
  shuffleLook(el.value);
}
</script>

<template>
  <div v-if="shuffle" ref="el" class="logo" :class="{ shake }" :data-sym="props.sym || theme.sym" role="button" tabindex="0" :aria-label="t('ap.newLook')" :title="t('ap.newLook')" style="cursor:pointer" @click="go" @keydown.enter="go" v-html="iconSvg(props.sym || theme.sym)" />
  <div v-else class="logo" :data-sym="props.sym || theme.sym" aria-hidden="true" v-html="iconSvg(props.sym || theme.sym)" />
</template>
