<script setup>
// Key numbers in the phone app: the computer's Key numbers panel (help/HelpPanel.vue) in a sheet, with its markup and look:
// each group (Known now, Your plans, This month so far, the likely ones) a titled card of lines adding up to its last line,
// the same amounts (keyNums in core/derived.js). A tap on a line, or on its (i), opens how it is worked out.
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { keyNums } from "../../core/derived.js";
import { paydayWords } from "../../pagelogic/payday.js";
import { formatMoney } from "../../format.js";
import { explain } from "../../core/tooltip.js";
import { helpShown } from "../help.js";
import PhoneSheet from "../components/PhoneSheet.vue";
import EmptyState from "../components/EmptyState.vue";
import { ICONS } from "../icons.js";

const { t, locale } = useI18n();
const open = computed({ get: () => helpShown.value === "nums", set: (v) => { if (!v) helpShown.value = ""; } });
const loc = computed(() => (locale.value === "he" ? "he-IL" : "en-GB"));
const monthOf = (key) => new Date(+key.slice(0, 4), +key.slice(5, 7) - 1, 1).toLocaleDateString(loc.value, { month: "long" });
const numName = (x) => t(x.name, x.mk ? { month: monthOf(x.mk) } : {});
// Free to use below zero before payday (lib/payday.js): covered by the income still to come, it reads Free to use, not in red;
// the line under it says what it will likely be after payday
const pay = computed(() => paydayWords(t, keyNums.value?.payday, locale.value === "he"));
const calm = (x) => x.id === "free" && pay.value?.covered;
const tipOf = (x) => (x.pay ? pay.value?.tip : t(x.tip));
// a line's name: Free to use below zero reads "Short by" (its amount stays below zero, so the lines still add up)
const rowName = (x) => (x.id === "free" && x.a < 0 && !pay.value?.covered ? t("num.shortBy") : x.from && x.short ? t(x.short, x.mk ? { month: monthOf(x.mk) } : {}) : numName(x));

// how a line is worked out, in a sheet over this one
const explainNum = (x) => explain(tipOf(x));
</script>

<template>
  <PhoneSheet v-model:open="open" :title="t('num.title')" size="large" cls="ph-nums">
    <template v-if="keyNums">
      <section v-for="(g, gi) in keyNums.groups" :key="g.id" class="hs ph-nums-g" :style="{ '--i': gi }">
        <h4>{{ t(g.name) }}</h4>
        <div class="knl" :class="{ guess: g.id.startsWith('likely') }">
          <div v-for="x in g.items" :key="x.id" class="knr" :class="{ from: x.from, res: x.op === '=', part: x.part }" :data-tip="tipOf(x)" role="button" tabindex="0" @click="explainNum(x)" @keydown.enter="explainNum(x)"><span><i v-if="x.op && x.op !== '='" class="kno">{{ x.op }}</i>{{ rowName(x) }}</span><b class="num" :class="{ neg: x.a < 0 && !calm(x) }" dir="ltr">{{ formatMoney(x.a) }}</b></div>
        </div>
      </section>
    </template>
    <EmptyState v-else :icon="ICONS.numbers" :text="t('num.none')" />
  </PhoneSheet>
</template>
