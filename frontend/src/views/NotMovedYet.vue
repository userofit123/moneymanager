<script setup>
// Shown for pages that are not in the new app yet: a short note and a link to the same page in the current app.
import { useI18n } from "vue-i18n";
import BaseCard from "../components/BaseCard.vue";
import EmptyState from "../components/EmptyState.vue";
defineProps({ page: { type: Object, required: true } });
const { t } = useI18n();
const tk = (k) => t(k);
</script>

<template>
  <div class="page">
    <h1>{{ tk("nav." + page.name) }}</h1>
    <BaseCard>
      <EmptyState :title="t('shell.notYetTitle')" :text="t('shell.notYetText')">
        <template #action><a class="open" :href="page.old">{{ t("shell.openInApp") }}</a></template>
      </EmptyState>
    </BaseCard>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: var(--sp4); }
.open { display: inline-flex; align-items: center; min-height: 40px; padding: 0 var(--sp5); border-radius: var(--pill); background: var(--accc); color: var(--onc); font-weight: 600; text-decoration: none; }
.open:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px; }
</style>
