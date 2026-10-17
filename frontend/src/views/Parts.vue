<script setup>
// The shared building blocks on one page (address /app/parts), so the look can be checked in both languages.
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { setLang } from "../i18n.js";
import BaseButton from "../components/BaseButton.vue";
import BaseCard from "../components/BaseCard.vue";
import ListRow from "../components/ListRow.vue";
import BaseDialog from "../components/BaseDialog.vue";
import BaseTabs from "../components/BaseTabs.vue";
import BaseChip from "../components/BaseChip.vue";
import BaseBadge from "../components/BaseBadge.vue";
import BaseInput from "../components/BaseInput.vue";
import BaseSelect from "../components/BaseSelect.vue";
import BaseToggle from "../components/BaseToggle.vue";
import EmptyState from "../components/EmptyState.vue";
import MoneyAmount from "../components/MoneyAmount.vue";
import ProgressBar from "../components/ProgressBar.vue";
import HelpIcon from "../components/HelpIcon.vue";
const { t, locale } = useI18n();
const help = ref(false);
const period = ref("this");
const periods = computed(() => [{ value: "this", label: t("demo.thisMonth") }, { value: "last", label: t("demo.lastMonth") }]);
const amount = ref(1500);
const kind = ref("food");
const kinds = computed(() => [{ value: "food", label: t("demo.food") }, { value: "home", label: t("demo.home") }]);
const remind = ref(true);
</script>

<template>
  <div class="parts">
    <h1>{{ t("app.title") }}</h1>
    <p class="muted">{{ t("app.intro") }}</p>
    <BaseTabs v-model="period" :options="periods" :label="t('demo.period')" />
    <BaseCard hero>
      <template #head><span>{{ t("demo.leftToSpend") }}<HelpIcon :text="t('demo.leftToSpendHelp')" :label="t('common.whatIsThis')" /></span></template>
      <MoneyAmount :value="3420" size="big" />
      <ProgressBar :value="1580" :max="5000" :label="t('demo.budgetUsed')" />
    </BaseCard>
    <BaseCard :title="t('demo.cardTitle')">
      <ListRow :title="t('demo.rowTitle')" :subtitle="t('demo.rowSub')" clickable @click="help = true">
        <template #end><MoneyAmount :value="1250" /></template>
      </ListRow>
      <ListRow :title="t('demo.rowSpent')" :subtitle="t('demo.rowSpentSub')">
        <template #end><MoneyAmount :value="-80" tone="auto" /></template>
      </ListRow>
    </BaseCard>
    <BaseCard :title="t('demo.formTitle')">
      <div class="form">
        <BaseInput v-model="amount" money :label="t('demo.amount')" :hint="t('demo.amountHint')" />
        <BaseSelect v-model="kind" :options="kinds" :label="t('demo.kind')" />
        <BaseToggle v-model="remind" :label="t('demo.remind')" :hint="t('demo.remindHint')" />
        <div class="chips"><BaseChip>{{ t("demo.chip") }}</BaseChip><BaseChip kind="tint">{{ t("demo.food") }}</BaseChip><BaseChip kind="good">{{ t("demo.good") }}</BaseChip><BaseChip kind="bad">{{ t("demo.bad") }}</BaseChip><BaseBadge :count="3" :label="t('demo.needsLook', { n: 3 })" /></div>
      </div>
    </BaseCard>
    <BaseCard><EmptyState :title="t('demo.emptyTitle')" :text="t('demo.emptyText')"><template #action><BaseButton variant="tonal">{{ t("demo.emptyAction") }}</BaseButton></template></EmptyState></BaseCard>
    <BaseDialog v-model:open="help" :title="t('demo.rowHelpTitle')">{{ t("demo.rowHelp") }}</BaseDialog>
    <div class="chips">
      <BaseButton variant="outline" @click="setLang(locale === 'he' ? 'en' : 'he')">{{ t("app.otherLanguage") }}</BaseButton>
    </div>
  </div>
</template>

<style scoped>
.parts { max-width: 40rem; margin: 0 auto; display: flex; flex-direction: column; gap: var(--sp4); align-items: stretch; }
.parts > .seg { align-self: flex-start; }
.form { display: grid; gap: var(--sp3); }
.chips { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp2); }

</style>
