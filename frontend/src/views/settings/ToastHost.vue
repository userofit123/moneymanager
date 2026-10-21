<script setup>
// The messages at the bottom of the page, the current app's toast markup (web/js/07-periods-rules.js toast()).
import { useI18n } from "vue-i18n";
import { toasts, dismissToast } from "./shared.js";
const { t } = useI18n();
const ICON = {
  ok: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  err: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
};
const act = (a, id) => { dismissToast(id); a.run && a.run(); };
</script>

<template>
  <div v-if="toasts.length" id="toasts" role="status" aria-live="polite">
    <div v-for="x in toasts" :key="x.id" class="toast" :class="[x.kind, { out: x.out }]">
      <span class="ti"><svg viewBox="0 0 24 24" v-html="ICON[x.kind] || ICON.ok" /></span>
      <div class="tm">
        <b v-if="x.title">{{ x.title }}</b>
        <div>{{ x.m }}</div>
        <div v-if="x.undo || x.actions.length" class="tacts">
          <button v-if="x.undo" type="button" class="tu" @click="act({ run: x.undo }, x.id)">{{ t("settings.common.undo") }}</button>
          <button v-for="(a, i) in x.actions" :key="i" type="button" class="tu" @click="act(a, x.id)">{{ a.label }}</button>
        </div>
      </div>
      <button type="button" class="tx" :aria-label="t('settings.common.dismiss')" @click="dismissToast(x.id)">×</button>
    </div>
  </div>
</template>
