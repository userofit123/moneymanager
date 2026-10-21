<script setup>
// The messages at the bottom of the page (toasts). Shown on every page (App.vue).
import { useI18n } from "vue-i18n";
import { toasts, dismissToast } from "../core/toast.js";
const { t } = useI18n();
const ICON = {
  ok: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  err: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  sugg: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  alert: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"/>',
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
          <button v-if="x.undo" type="button" class="tu" @click="act({ run: x.undo }, x.id)">{{ t("save.undo") }}</button>
          <button v-for="(a, i) in x.actions" :key="i" type="button" class="tu" @click="act(a, x.id)">{{ a.label }}</button>
        </div>
      </div>
      <button type="button" class="tx" :aria-label="t('save.dismiss')" @click="dismissToast(x.id)">×</button>
    </div>
  </div>
</template>
