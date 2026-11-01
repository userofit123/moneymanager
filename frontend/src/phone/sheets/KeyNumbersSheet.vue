<script setup>
// Key numbers in the phone app: the main sums of the month in their groups (Known now, Your plans, This month so far,
// the likely ones), each group adding up to its last line, the same list and amounts as the computer's panel
// (keyNums in core/derived.js). A tap on a line opens how it is worked out (the computer's tooltip text).
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { keyNums } from "../../core/derived.js";
import { formatMoney } from "../../format.js";
import { explain } from "../../core/tooltip.js";
import { helpShown } from "../help.js";
import PhoneSheet from "../components/PhoneSheet.vue";
import ListGroup from "../components/ListGroup.vue";
import EmptyState from "../components/EmptyState.vue";
import { ICONS } from "../icons.js";

const { t, locale } = useI18n();
const open = computed({ get: () => helpShown.value === "nums", set: (v) => { if (!v) helpShown.value = ""; } });
const loc = computed(() => (locale.value === "he" ? "he-IL" : "en-GB"));
const monthOf = (key) => new Date(+key.slice(0, 4), +key.slice(5, 7) - 1, 1).toLocaleDateString(loc.value, { month: "long" });
const numName = (x) => t(x.name, x.mk ? { month: monthOf(x.mk) } : {});
// a line's name: Free to use below zero reads "Short by" (its amount stays below zero, so the lines still add up)
const rowName = (x) => (x.id === "free" && x.a < 0 ? t("num.shortBy") : x.from && x.short ? t(x.short, x.mk ? { month: monthOf(x.mk) } : {}) : numName(x));

// how a line is worked out, in a sheet over this one
const explainNum = (x) => explain(t(x.tip));
</script>

<template>
  <PhoneSheet v-model:open="open" :title="t('num.title')" size="large" cls="ph-nums">
    <template v-if="keyNums">
      <p class="ph-nums-lead">{{ t("phone.sheets.numsIntro") }}</p>
      <ListGroup v-for="g in keyNums.groups" :key="g.id" :title="t(g.name)" :class="{ guess: g.id.startsWith('likely') }">
        <button v-for="x in g.items" :key="x.id" type="button" class="ph-row ph-num" :class="{ from: x.from, res: x.op === '=' }" @click="explainNum(x)">
          <span class="ph-num-op" aria-hidden="true">{{ x.op && x.op !== "=" ? x.op : "" }}</span>
          <span class="ph-row-main"><span class="ph-num-t">{{ rowName(x) }}</span></span>
          <span class="ph-row-end"><b class="ph-amt num" :class="{ neg: x.a < 0 }" dir="ltr">{{ formatMoney(x.a) }}</b></span>
        </button>
      </ListGroup>
    </template>
    <EmptyState v-else :icon="ICONS.numbers" :text="t('num.none')" />
  </PhoneSheet>
</template>
