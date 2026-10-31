<script setup>
// One rule list in Settings → Automatic sorting (category, tag, name, card payment and money coming in rules):
// a card with the title, the form for a new rule, a search box, the rules and a short text when there are none.
// The "add" slot holds the boxes of the new rule (the Add button is here); the default slot holds the rules (.rule rows);
// the "foot" slot is a short grey note at the bottom; anything in "after" sits outside the card (a window).
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { searches, useRowSearch } from "../../core/rowSearch.js";
import SetSection from "./SetSection.vue";

const props = defineProps({
  id: { type: String, required: true },
  icon: { type: String, required: true },
  title: { type: String, required: true },
  desc: { type: String, default: "" },
  count: { type: Number, default: 0 },
  search: { type: String, required: true },
  searchPh: { type: String, required: true },
  empty: { type: String, required: true },
});
defineEmits(["add"]);
const { t } = useI18n();
const root = ref(null), none = useRowSearch(root, props.search);
</script>

<template>
  <div :id="id" ref="root" class="rl" data-hq="end">
    <SetSection :icon="icon" :title="title" :desc="desc" :count="count">
      <div class="rladd"><slot name="add" /><button type="button" class="btn s" @click="$emit('add')">{{ t("settings.sorting.addRule") }}</button></div>
      <div v-if="count" class="rlfind"><input v-model="searches[search]" class="rsearch" type="search" :placeholder="searchPh" :aria-label="t('cats.search.label')" autocomplete="off"></div>
      <div v-if="count" class="rlrows"><slot /></div>
      <div v-if="none" class="rlnone sm">{{ t("cats.search.none", { q: none }) }}</div>
      <div v-if="!count" class="rlnone sm">{{ empty }}</div>
      <template v-if="$slots.foot" #foot><slot name="foot" /></template>
    </SetSection>
    <slot name="after" />
  </div>
</template>
