<script setup>
// The points badge: level, points and a thin bar to the next level (top of the side column on a computer, the top bar on the phone).
// A click opens "Points and levels", in blocks: the level and the ring to the next one, this month (earned so far and coming at
// month end), points by month, what earned points lately, and how to earn them (folded; numbers from POINTS, never written twice). Hidden when points are turned off (core/points.js).
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { fmtDay } from "../../core/sources.js";
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
// the ring always shows a sliver, so a level just reached doesn't look empty
const ring = computed(() => Math.max(pct.value, 4));
const total = computed(() => f0(points.value?.total || 0));
const head = computed(() => (lv.value ? { level: lv.value.level, total: total.value, need: f0(lv.value.need), next: lv.value.level + 1 } : {}));
// points given since the first of this month
const monthSoFar = computed(() => points.value?.month || 0);
const plus = (n) => "+" + f0(n);

// last month's results while not added yet: the day they are added (day COUNT_FROM_DAY of this month)
const waitDay = computed(() => (points.value ? fmtDay(points.value.monthPreview.month + "-" + String(COUNT_FROM_DAY).padStart(2, "0") + "T12:00:00") : ""));

// Points by month: the last 6, older ones folded; each bar's two parts scaled to the biggest month
const SHOWN = 6;
const mname = (m, o) => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(locale.value === "he" ? "he-IL" : "en-GB", o);
const months = computed(() => {
  const l = points.value?.months || [], top = Math.max(1, ...l.map((x) => x.total));
  return l.map((x) => ({
    ...x,
    name: mname(x.month, { month: "short", year: "numeric" }),
    a: (x.actions / top) * 100,
    r: (x.results / top) * 100,
    tip: tk("monthTip", { m: mname(x.month, { month: "long", year: "numeric" }), a: plus(x.actions), r: plus(x.results) }),
  }));
});

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
      <span v-if="phone" class="ptbar" aria-hidden="true"><i :style="{ inlineSize: pct + '%' }" /></span>
      <template v-else>
        <span class="ptring" :style="{ '--p': ring }" aria-hidden="true"><small>{{ tk("levelWord") }}</small><b>{{ lv.level }}</b></span>
        <span class="ptn">{{ tk("pts", { n: total }) }}</span>
      </template>
    </button>
    <BaseDialog v-model:open="open" :title="tk('title')" cls="ptw">
      <!-- the level: a big ring that fills toward the next level -->
      <section class="pthd">
        <span class="ptring big" :style="{ '--p': ring }" role="progressbar" :aria-label="tk('toNext', head)" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round(pct)">
          <small>{{ tk("levelWord") }}</small><b>{{ lv.level }}</b>
        </span>
        <div class="pthdt">
          <b>{{ tk("toNext", head) }}</b>
          <span>{{ tk("totalAll", { n: total }) }}</span>
        </div>
      </section>

      <!-- this month -->
      <h4 class="pts">{{ tk("monthTitle") }}</h4>
      <div class="pttiles">
        <div class="ptt">
          <span class="ptlbl">{{ tk("monthSoFar") }}</span>
          <b class="ptv"><bdi dir="ltr">{{ plus(monthSoFar) }}</bdi></b>
        </div>
        <div class="ptt" :data-tip="tk('monthEndTip')">
          <span class="ptlbl">{{ tk("monthEnd") }}</span>
          <b class="ptv"><bdi dir="ltr">{{ plus(points.monthPreview.total) }}</bdi></b>
        </div>
      </div>
      <details class="fold ptf">
        <summary>{{ tk("partsTitle") }}</summary>
        <ul v-if="monthParts.length" class="ptl2">
          <li v-for="(x, i) in monthParts" :key="i"><span>{{ x.label }}</span><b class="ptv"><bdi dir="ltr">{{ plus(x.pts) }}</bdi></b></li>
        </ul>
        <div v-else class="sm ptem">{{ tk("nothingYet") }}</div>
      </details>
      <div v-if="points.waiting && points.waiting.total" class="ptwait">
        {{ tk("waiting", { date: waitDay }) }} <b class="ptv"><bdi dir="ltr">{{ plus(points.waiting.total) }}</bdi></b>
      </div>

      <!-- points by month -->
      <template v-if="months.length">
        <h4 class="pts">{{ tk("byMonth") }}</h4>
        <div class="ptkey sm"><span><i class="pta" />{{ tk("partActs") }}</span><span><i class="ptr" />{{ tk("partResults") }}</span></div>
        <ul class="ptmo">
          <li v-for="x in months.slice(0, SHOWN)" :key="x.month">
            <span class="ptmn">{{ x.name }}<svg v-if="x.best" class="ptstar" viewBox="0 0 24 24" role="img" :aria-label="tk('bestTip')" :data-tip="tk('bestTip')"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" /></svg></span>
            <i class="ptmb" :data-tip="x.tip"><i v-if="x.actions" class="pta" :style="{ inlineSize: x.a + '%' }" /><i v-if="x.results" class="ptr" :style="{ inlineSize: x.r + '%' }" /></i>
            <b class="ptv"><bdi dir="ltr">{{ plus(x.total) }}</bdi></b>
          </li>
        </ul>
        <details v-if="months.length > SHOWN" class="fold ptf">
          <summary>{{ tk("olderMonths", { n: months.length - SHOWN }) }}</summary>
          <ul class="ptmo">
            <li v-for="x in months.slice(SHOWN)" :key="x.month">
              <span class="ptmn">{{ x.name }}<svg v-if="x.best" class="ptstar" viewBox="0 0 24 24" role="img" :aria-label="tk('bestTip')" :data-tip="tk('bestTip')"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" /></svg></span>
              <i class="ptmb" :data-tip="x.tip"><i v-if="x.actions" class="pta" :style="{ inlineSize: x.a + '%' }" /><i v-if="x.results" class="ptr" :style="{ inlineSize: x.r + '%' }" /></i>
              <b class="ptv"><bdi dir="ltr">{{ plus(x.total) }}</bdi></b>
            </li>
          </ul>
        </details>
      </template>

      <!-- lately -->
      <h4 class="pts">{{ tk("recent") }}</h4>
      <ul v-if="points.recent.length" class="ptl2 ptrc">
        <li v-for="x in points.recent.slice(0, 5)" :key="x.key"><span>{{ label(x) }}</span><span class="ptd sm">{{ dshort(x.day) }}</span><b class="ptv"><bdi dir="ltr">{{ plus(x.pts) }}</bdi></b></li>
      </ul>
      <div v-else class="sm">{{ tk("noRecent") }}</div>

      <!-- how to earn, folded -->
      <details class="fold ptf pthow">
        <summary>{{ tk("howTitle") }}</summary>
        <div class="ptk">{{ tk("howNow") }}</div>
        <ul class="ptl2">
          <li v-for="[k, n] in howNow" :key="k"><span>{{ tk("how." + k) }}<small v-if="k === 'review'" class="sm">{{ tk("how.reviewWhat") }}</small></span><span class="ptv">{{ n }}</span></li>
        </ul>
        <div class="ptk">{{ tk("howMonth") }}</div>
        <ul class="ptl2">
          <li v-for="[k, n] in howMonth" :key="k"><span>{{ tk("how." + k) }}</span><span class="ptv">{{ n }}</span></li>
        </ul>
        <div class="sm ptem">{{ tk("howNote") }}</div>
      </details>
    </BaseDialog>
  </template>
</template>
