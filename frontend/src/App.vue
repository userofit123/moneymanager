<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { setLang } from "./i18n.js";
import BaseButton from "./components/BaseButton.vue";
import BaseCard from "./components/BaseCard.vue";
import ListRow from "./components/ListRow.vue";
import BaseDialog from "./components/BaseDialog.vue";
const { t, locale } = useI18n();
const help = ref(false);
</script>

<template>
  <main class="shell">
    <h1>{{ t("app.title") }}</h1>
    <p>{{ t("app.intro") }}</p>
    <BaseCard :title="t('demo.cardTitle')">
      <ListRow :title="t('demo.rowTitle')" :subtitle="t('demo.rowSub')" clickable @click="help = true">
        <template #end>₪ 1,250</template>
      </ListRow>
    </BaseCard>
    <BaseDialog v-model:open="help" :title="t('demo.rowHelpTitle')">{{ t("demo.rowHelp") }}</BaseDialog>
    <a class="back" href="/">{{ t("app.backToApp") }}</a>
    <BaseButton variant="tonal" @click="setLang(locale === 'he' ? 'en' : 'he')">{{ t("app.otherLanguage") }}</BaseButton>
  </main>
</template>

<style>
.shell { max-width: 36rem; margin: 0 auto; padding: 2rem 1rem; display: flex; flex-direction: column; gap: 1rem; align-items: stretch; }
.shell > .back, .shell > .btn { align-self: flex-start; }
.back { color: var(--accent); }
</style>
