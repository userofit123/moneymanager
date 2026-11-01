<script setup>
// Ideas in the phone app: what the app noticed and can do (a rule for a category, a tag, a card payment), from
// core/suggest.js, the same list as the computer's light bulb. Each idea has its actions and Dismiss; Clear all empties it.
import { watch } from "vue";
import { useI18n } from "vue-i18n";
import { suggestions, suggestOpen, runSuggestion, dropSuggestion, clearSuggestions } from "../../core/suggest.js";
import PhoneSheet from "../components/PhoneSheet.vue";
import PIcon from "../components/PIcon.vue";
import { ICONS } from "../icons.js";

const { t } = useI18n();
const run = (x, a) => { suggestOpen.value = false; runSuggestion(x, a); };
watch(() => suggestions.value.length, (n) => { if (!n) suggestOpen.value = false; });
</script>

<template>
  <PhoneSheet v-model:open="suggestOpen" :title="t('txw.suggTitle')" size="large" cls="ph-sugg">
    <p class="ph-sugg-lead">{{ t("txw.suggIntro") }}</p>
    <div class="ph-group-b">
      <div v-for="x in suggestions" :key="x.key" class="ph-sugg-i">
        <span class="ph-tile" style="--tile: var(--c2)"><PIcon :svg="ICONS.idea" /></span>
        <div class="ph-sugg-w">
          <b class="ph-sugg-t">{{ x.title }}</b>
          <p class="ph-sugg-x">{{ x.text }}</p>
          <div class="ph-sugg-a">
            <button v-for="a in x.actions" :key="a.label" type="button" class="ph-btn tonal" @click="run(x, a)">{{ a.label }}</button>
            <button type="button" class="ph-link" @click="dropSuggestion(x.key)">{{ t("txw.dismiss") }}</button>
          </div>
        </div>
      </div>
    </div>
    <template #foot>
      <button type="button" class="ph-btn tonal ph-sugg-clear" @click="clearSuggestions">{{ t("txw.clearAll") }}</button>
    </template>
  </PhoneSheet>
</template>
