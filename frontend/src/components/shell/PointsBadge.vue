<script setup>
// The points badge: the level in a ring that fills toward the next level (top of the side column on a computer), or the level
// with a thin bar (the phone's top bar). A click opens "Points and levels", in blocks: the level and the ring to the next one,
// this month (earned so far and coming at month end, with what it is made of on demand), points by month (a click opens that
// month in Activity), what earned points lately, and how to earn them (folded; numbers from POINTS, never written twice).
// Hidden when points are turned off (core/points.js).
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { fmtDay } from "../../core/sources.js";
import { points } from "../../core/points.js";
import { POINTS, COUNT_FROM_DAY } from "../../lib/points.js";
import { f0, fm, clampPercent } from "../../format.js";
import { dshort } from "../../dates.js";
import { categoryName } from "../../catnames.js";
import { goActivity } from "../../core/shell.js";
import BaseDialog from "../BaseDialog.vue";
import SlideOpen from "../SlideOpen.vue";

defineProps({ phone: Boolean }); // phone: the one-line look for the phone's top bar
const { t, te, locale } = useI18n();
const tk = (k, p) => t("points." + k, p || {});
const open = ref(false);
const showParts = ref(false); // "What it is made of" under the month tiles
// once a fold has slid open, bring all of it into view, gently
const showOpened = (e) => { const d = e.target; if (d.open) setTimeout(() => d.scrollIntoView({ behavior: "smooth", block: "nearest" }), 280); };

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
    long: mname(x.month, { month: "long", year: "numeric" }),
    tip: tk("monthTip", { m: mname(x.month, { month: "long", year: "numeric" }), a: plus(x.actions), r: plus(x.results) }),
  }));
});
// a month row opens Activity on that month (the same whole-month span as the Categories page uses)
function openMonth(m) {
  open.value = false;
  goActivity({ from: m + "-01", to: m + "-31" });
}

// what an earned or coming item was for, in plain words
function label(x) {
  const d = x.d ?? x.detail;
  if (x.kind === "setup") return te("points.kind.setup." + d) ? tk("kind.setup." + d) : tk("kind.other");
  if (!te("points.kind." + x.kind)) return tk("kind.other");
  return tk("kind." + x.kind, { d: ["cat", "catLess", "budget"].includes(x.kind) ? categoryName(d, locale.value) : d });
}

// month points (this month on the way, or last month waiting to be added), with the categories that spent less and the
// budgets kept each as one line, so the list stays short
function parts(l) {
  const out = [], many = {};
  (l || []).forEach((x) => {
    if (!["catLess", "budget"].includes(x.kind)) return out.push({ kind: x.kind, label: label(x), pts: x.pts });
    (many[x.kind] = many[x.kind] || []).push(x);
  });
  Object.entries(many).forEach(([k, l]) => out.push({ kind: k, label: l.length > 1 ? tk("many." + k, { n: l.length }) : label(l[0]), pts: l.reduce((s, x) => s + x.pts, 0) }));
  return out;
}
const monthParts = computed(() => parts(points.value?.monthPreview.parts));
const waitParts = computed(() => (points.value?.waiting?.total ? parts(points.value.waiting.parts) : []));

// a small line picture for each way to earn points (also used in the lists of what the points are made of)
const ICON = {
  visit: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
  alert: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"/>',
  review: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6M12 17h.01"/>',
  cat: '<path d="M3 12V4h8l10 10-8 8z"/><path d="M7.5 8h.01"/>',
  tag: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
  rule: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
  setupBank: '<path d="M3 10l9-6 9 6M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18"/>',
  setupMore: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  kept: '<path d="M7 3h10v3H7zM6 6h12v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M9 14h6"/>',
  better: '<path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/>',
  catLess: '<path d="M3 7l6 6 4-4 8 9"/><path d="M15 18h6v-6"/>',
  budget: '<circle cx="12" cy="12" r="9"/><path d="M12 3v9l6 4"/>',
  allCat: '<path d="M4 12l5 5L20 6"/>',
  setup: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  other: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
};
const icon = (k) => ICON[k] || ICON.other;


// How to earn points: { k, pts, per (how often or how far), sub (a one-line explanation, when needed) }, the numbers straight from POINTS
const how = (k, pts, per, sub) => ({ k, pts: plus(pts), per, sub });
const howNow = computed(() => [
  how("visit", POINTS.visit, tk("per.day")),
  how("alert", POINTS.alert, tk("per.eachAlert")),
  how("review", POINTS.review, tk("per.eachQuestion"), tk("how.reviewWhat")),
  how("cat", POINTS.cat, tk("per.eachMax", { max: POINTS.catDay })),
  how("tag", POINTS.tag, tk("per.eachMax", { max: POINTS.tagDay })),
  how("rule", POINTS.rule, tk("per.eachRule")),
  how("setupBank", POINTS.setupBank, tk("per.once")),
  how("setupMore", POINTS.setupBudget, tk("per.onceEach")),
]);
const howMonth = computed(() => [
  how("kept", POINTS.keptPerPct, tk("per.pct", { max: f0(POINTS.keptPerPct * POINTS.keptMaxPct) }), tk("how.keptWhat")),
  how("better", POINTS.betterPerPct, tk("per.pctMore", { max: f0(POINTS.betterPerPct * POINTS.betterMaxPct) }), tk("how.betterWhat")),
  how("catLess", POINTS.catLessPerPct, tk("per.pctLess", { max: POINTS.catLessMax }), tk("how.catLessWhat", { min: fm(POINTS.catLessMin) })),
  how("budget", POINTS.budgetKept, tk("per.eachBudget")),
  how("allCat", POINTS.allCat, tk("per.month")),
]);
const howGroups = computed(() => [
  { k: "month", title: tk("howMonth"), sub: tk("howMonthWhen", { d: COUNT_FROM_DAY }), rows: howMonth.value },
  { k: "now", title: tk("howNow"), sub: tk("howNowWhen"), rows: howNow.value },
]);
</script>

<template>
  <template v-if="points && lv">
    <button type="button" class="ptb" :class="{ phb: phone }" :data-tip="phone ? null : tk('badgeTip', head)" :aria-label="tk('badgeLabel', head)" @click="open = true">
      <template v-if="phone">
        <span class="ptl">{{ tk("level", head) }}</span>
        <span class="ptbar" aria-hidden="true"><i :style="{ inlineSize: pct + '%' }" /></span>
      </template>
      <span v-else class="ptring" :style="{ '--p': ring }" aria-hidden="true"><small>{{ tk("levelWord") }}</small><b>{{ lv.level }}</b></span>
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

      <!-- this month, with what the coming points are made of on demand -->
      <div class="pthrow">
        <h4 class="pts">{{ tk("monthTitle") }}</h4>
        <button type="button" class="ptlink" :class="{ on: showParts }" :aria-expanded="showParts" :data-tip="tk('partsTip')" @click="showParts = !showParts">
          {{ tk("partsTitle") }}<svg class="ptchev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </button>
      </div>
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
      <SlideOpen :open="showParts"><div class="ptparts">
        <div class="ptgrp">
          <div class="ptgh"><b>{{ tk("partsNow") }}</b><b class="ptv"><bdi dir="ltr">{{ plus(points.monthPreview.total) }}</bdi></b></div>
          <ul v-if="monthParts.length" class="ptits">
            <li v-for="(x, i) in monthParts" :key="i"><svg class="ptic" viewBox="0 0 24 24" aria-hidden="true" v-html="icon(x.kind)" /><span class="ptitl">{{ x.label }}</span><b class="ptv"><bdi dir="ltr">{{ plus(x.pts) }}</bdi></b></li>
          </ul>
          <div v-else class="sm ptem">{{ tk("nothingYet") }}</div>
        </div>
        <div v-if="waitParts.length" class="ptgrp">
          <div class="ptgh"><b>{{ tk("partsLast", { date: waitDay }) }}</b><b class="ptv"><bdi dir="ltr">{{ plus(points.waiting.total) }}</bdi></b></div>
          <ul class="ptits">
            <li v-for="(x, i) in waitParts" :key="i"><svg class="ptic" viewBox="0 0 24 24" aria-hidden="true" v-html="icon(x.kind)" /><span class="ptitl">{{ x.label }}</span><b class="ptv"><bdi dir="ltr">{{ plus(x.pts) }}</bdi></b></li>
          </ul>
        </div>
      </div></SlideOpen>

      <!-- points by month: a click on a month opens it in Activity -->
      <template v-if="months.length">
        <h4 class="pts">{{ tk("byMonth") }}</h4>
        <div class="ptkey sm"><span><i class="pta" />{{ tk("partActs") }}</span><span><i class="ptr" />{{ tk("partResults") }}</span></div>
        <ul class="ptmo">
          <li v-for="x in months.slice(0, SHOWN)" :key="x.month">
            <button type="button" class="ptmr" :aria-label="tk('openMonth', { m: x.long })" @click="openMonth(x.month)">
              <span class="ptmn">{{ x.name }}<svg v-if="x.best" class="ptstar" viewBox="0 0 24 24" role="img" :aria-label="tk('bestTip')" :data-tip="tk('bestTip')"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" /></svg></span>
              <i class="ptmb" :data-tip="x.tip"><i v-if="x.actions" class="pta" :style="{ inlineSize: x.a + '%' }" /><i v-if="x.results" class="ptr" :style="{ inlineSize: x.r + '%' }" /></i>
              <b class="ptv"><bdi dir="ltr">{{ plus(x.total) }}</bdi></b>
              <svg class="ptgo" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </li>
        </ul>
        <details v-if="months.length > SHOWN" class="fold ptf">
          <summary>{{ tk("olderMonths", { n: months.length - SHOWN }) }}</summary>
          <ul class="ptmo">
            <li v-for="x in months.slice(SHOWN)" :key="x.month">
              <button type="button" class="ptmr" :aria-label="tk('openMonth', { m: x.long })" @click="openMonth(x.month)">
                <span class="ptmn">{{ x.name }}<svg v-if="x.best" class="ptstar" viewBox="0 0 24 24" role="img" :aria-label="tk('bestTip')" :data-tip="tk('bestTip')"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" /></svg></span>
                <i class="ptmb" :data-tip="x.tip"><i v-if="x.actions" class="pta" :style="{ inlineSize: x.a + '%' }" /><i v-if="x.results" class="ptr" :style="{ inlineSize: x.r + '%' }" /></i>
                <b class="ptv"><bdi dir="ltr">{{ plus(x.total) }}</bdi></b>
                <svg class="ptgo" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
              </button>
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

      <!-- how to earn, folded: the idea in one block, then the month results and the actions, each with its points -->
      <details class="fold ptf pthow" @toggle="showOpened">
        <summary>{{ tk("howTitle") }}</summary>
        <div class="ptintro">
          <svg class="ptic" viewBox="0 0 24 24" aria-hidden="true" v-html="icon('better')" />
          <div><b>{{ tk("introTitle") }}</b><span>{{ tk("introText") }}</span></div>
        </div>
        <section v-for="g in howGroups" :key="g.k" class="ptgrp">
          <div class="ptgh"><b>{{ g.title }}</b><span class="sm">{{ g.sub }}</span></div>
          <ul class="ptits">
            <li v-for="x in g.rows" :key="x.k">
              <svg class="ptic" viewBox="0 0 24 24" aria-hidden="true" v-html="icon(x.k)" />
              <span class="ptitl">{{ tk("how." + x.k) }}<small v-if="x.sub">{{ x.sub }}</small></span>
              <span class="ptpts"><b class="ptv"><bdi dir="ltr">{{ x.pts }}</bdi></b><small>{{ x.per }}</small></span>
            </li>
          </ul>
        </section>
        <div class="sm ptem">{{ tk("howNote") }}</div>
      </details>
    </BaseDialog>
  </template>
</template>
