<script setup>
// The points badge: level, points and a thin bar to the next level (top of the side column on a computer, the top bar on the phone).
// A click opens "Points and levels": the level, this month's points, the month points on the way, what earned points lately
// and how to earn them (from the POINTS table, so no number is written twice). Hidden when points are turned off (core/points.js).
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { points } from "../../core/points.js";
import { POINTS, COUNT_FROM_DAY } from "../../lib/points.js";
import { f0, clampPercent } from "../../format.js";
import { dshort } from "../../dates.js";
import { categoryName } from "../../catnames.js";
import BaseDialog from "../BaseDialog.vue";

defineProps({ phone: Boolean }); // phone: the one-line look for the phone's top bar
const { t, te, locale } = useI18n();
const tk = (k, p) => t("points." + k, p || {});
const open = ref(false);

const lv = computed(() => points.value?.level);
const pct = computed(() => (lv.value ? clampPercent(lv.value.into, lv.value.next - lv.value.start) : 0));
const total = computed(() => f0(points.value?.total || 0));
const head = computed(() => (lv.value ? { level: lv.value.level, total: total.value, need: f0(lv.value.need), next: lv.value.level + 1 } : {}));
// points given since the first of this month
const monthSoFar = computed(() => points.value?.month || 0);

// what an earned or coming item was for, in plain words
function label(x) {
  const d = x.d ?? x.detail;
  if (x.kind === "setup") return te("points.kind.setup." + d) ? tk("kind.setup." + d) : tk("kind.other");
  if (!te("points.kind." + x.kind)) return tk("kind.other");
  return tk("kind." + x.kind, { d: ["cat", "catLess", "budget"].includes(x.kind) ? categoryName(d, locale.value) : d });
}

// the month points on the way, with the categories that spent less and the budgets kept each as one line, so the list stays short
const monthParts = computed(() => {
  const out = [], many = {};
  (points.value?.monthPreview.parts || []).forEach((x) => {
    if (!["catLess", "budget"].includes(x.kind)) return out.push({ label: label(x), pts: x.pts });
    (many[x.kind] = many[x.kind] || []).push(x);
  });
  Object.entries(many).forEach(([k, l]) => out.push({ label: l.length > 1 ? tk("many." + k, { n: l.length }) : label(l[0]), pts: l.reduce((s, x) => s + x.pts, 0) }));
  return out;
});

// How to earn points: [what, how many], the numbers straight from POINTS
const howNow = computed(() => [
  ["visit", tk("eachDay", { n: POINTS.visit })],
  ["alert", tk("each", { n: POINTS.alert })],
  ["review", tk("each", { n: POINTS.review })],
  ["cat", tk("eachMax", { n: POINTS.cat, max: POINTS.catDay })],
  ["tag", tk("eachMax", { n: POINTS.tag, max: POINTS.tagDay })],
  ["rule", tk("each", { n: POINTS.rule })],
  ["setupBank", tk("each", { n: POINTS.setupBank })],
  ["setupMore", tk("setupEach", { n: POINTS.setupBudget })],
]);
const howMonth = computed(() => [
  ["kept", tk("perPct", { n: POINTS.keptPerPct, max: POINTS.keptPerPct * POINTS.keptMaxPct })],
  ["better", tk("perPctMore", { n: POINTS.betterPerPct, max: POINTS.betterPerPct * POINTS.betterMaxPct })],
  ["catLess", tk("perPctLess", { n: POINTS.catLessPerPct, max: POINTS.catLessMax })],
  ["budget", tk("each", { n: POINTS.budgetKept })],
  ["allCat", tk("each", { n: POINTS.allCat })],
]);
</script>

<template>
  <template v-if="points && lv">
    <button type="button" class="ptb" :class="{ phb: phone }" :data-tip="phone ? null : tk('badgeTip', head)" :aria-label="tk('badgeLabel', head)" @click="open = true">
      <span v-if="phone" class="ptl">{{ tk("badge", head) }}</span>
      <template v-else><span class="ptl">{{ tk("level", head) }}</span><span class="ptn">{{ total }}</span></template>
      <span class="ptbar" aria-hidden="true"><i :style="{ inlineSize: pct + '%' }" /></span>
    </button>
    <BaseDialog v-model:open="open" :title="tk('title')" cls="ptw">
      <div class="pth">
        <b>{{ tk("level", head) }}</b><span>{{ tk("pts", { n: total }) }}</span>
      </div>
      <div class="bar" role="progressbar" :aria-label="tk('toNext', head)" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round(pct)"><i :style="{ inlineSize: pct + '%' }" /></div>
      <div class="sm">{{ tk("toNext", head) }}</div>

      <div class="ptg">
        <div class="row"><span class="grow">{{ tk("monthSoFar") }}</span><b class="ptv"><bdi dir="ltr">+{{ f0(monthSoFar) }}</bdi></b></div>
        <div class="row ptm">
          <span class="grow">{{ tk("onTheWay") }}<span class="sm">{{ tk("onTheWayNote") }}</span></span>
          <b class="ptv"><bdi dir="ltr">+{{ f0(points.monthPreview.total) }}</bdi></b>
        </div>
        <ul v-if="monthParts.length" class="ptl2">
          <li v-for="(x, i) in monthParts" :key="i"><span>{{ x.label }}</span><b class="ptv"><bdi dir="ltr">+{{ f0(x.pts) }}</bdi></b></li>
        </ul>
        <div v-else class="sm ptem">{{ tk("nothingYet") }}</div>
        <div v-if="points.waiting && points.waiting.total" class="row"><span class="grow">{{ tk("waiting", { day: COUNT_FROM_DAY }) }}</span><b class="ptv"><bdi dir="ltr">+{{ f0(points.waiting.total) }}</bdi></b></div>
      </div>

      <h4 class="pts">{{ tk("recent") }}</h4>
      <ul v-if="points.recent.length" class="ptl2">
        <li v-for="x in points.recent.slice(0, 6)" :key="x.key"><span><b class="ptv"><bdi dir="ltr">+{{ f0(x.pts) }}</bdi></b> {{ label(x) }}</span><span class="sm">{{ dshort(x.day) }}</span></li>
      </ul>
      <div v-else class="sm">{{ tk("noRecent") }}</div>

      <h4 class="pts">{{ tk("howTitle") }}</h4>
      <div class="ptk">{{ tk("howNow") }}</div>
      <ul class="ptl2">
        <li v-for="[k, n] in howNow" :key="k"><span>{{ tk("how." + k) }}</span><span class="ptv">{{ n }}</span></li>
      </ul>
      <div class="ptk">{{ tk("howMonth") }}</div>
      <ul class="ptl2">
        <li v-for="[k, n] in howMonth" :key="k"><span>{{ tk("how." + k) }}</span><span class="ptv">{{ n }}</span></li>
      </ul>
      <div class="sm ptem">{{ tk("howNote") }}</div>
    </BaseDialog>
  </template>
</template>
