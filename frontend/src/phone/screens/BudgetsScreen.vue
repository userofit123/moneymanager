<script setup>
// Budgets (in More): how much is planned for each category this month and how it is going. It opens with one sentence
// (what is left to spend, about how much a day), then the month's two totals, suggested budgets, every budget with its
// progress, and spending that has no budget yet. A budget opens a sheet with its details, its bills and jar, an idea to
// change it, its amount and Remove. Every number and change comes from pagelogic/budgets.js, the same as the computer page.
import { ref, computed, watch, onMounted } from "vue";
import { data } from "../../stores/data.js";
import { catLabel } from "../../core/cats.js";
import { fm } from "../../lib/bills.js";
import { tx } from "../../core/heText.js";
import { pages } from "../../routes.js";
import { useBudgets } from "../../pagelogic/budgets.js";
import MoneyInput from "../../components/MoneyInput.vue";
import PhoneScreen from "../components/PhoneScreen.vue";
import IconButton from "../components/IconButton.vue";
import HeroSentence from "../components/HeroSentence.vue";
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
import StatTile from "../components/StatTile.vue";
import ProgressBar from "../components/ProgressBar.vue";
import EmptyState from "../components/EmptyState.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import PhoneSheet from "../components/PhoneSheet.vue";
import PIcon from "../components/PIcon.vue";
defineProps({ id: { type: String, default: null } });

const {
  t, tk, S, M, cc, mlab, perDayLeft, kpis, billSt, rvOf, lastVals, propOf, typed, accept, acceptEvery, dismiss, later, resetNo, apply, edit, remove, openAdd, goCat, billOpen,
} = useBudgets();
onMounted(() => data.start());
const P = (k, o, n) => t("phone.budgets." + k, o || {}, n);
const icon = pages.find((p) => p.name === "budgets")?.icon || "";

// the sentence at the top: what is left of all budgets (the computer's "Left to spend" tile), or how far over they are
const hero = computed(() => {
  const left = kpis.value[2].v, over = left < 0;
  const text = over ? P("over", { amount: "\u0000" }) : P("left", { amount: "\u0000", perDay: fm(perDayLeft.value) }), [a, b = ""] = text.split("\u0000");
  return [{ text: a }, { amount: fm(Math.abs(left)) }, { text: b }];
});
const has = computed(() => M.value.info.length > 0);
const tileVal = (c) => (c.v < 0 ? "−" : "") + fm(Math.abs(c.v));

const tone = (b) => (b.st == "over" ? "neg" : b.st == "warn" || b.st == "pace" ? "warn" : "acc");
const status = (b) => (b.st == "over" ? t("budgets.st.overBy", { amount: fm(-b.left) }) : tk("budgets.st." + b.st));
const today = computed(() => (M.value.DAYN / M.value.DIM) * 100);
const months = computed(() => mlab.value.split(", "));

// one budget's sheet: follows the budget by its category, so it shows fresh numbers after a change and closes when it is removed
const sel = ref(""), open = ref(false);
const cur = computed(() => M.value?.info.find((b) => b.k === sel.value) || null);
const show = (b) => { sel.value = b.k; open.value = true; };
watch(cur, (b) => { if (!b) open.value = false; });
const details = (b) => [
  [t("budgets.tip.budget"), fm(b.lim)], [t("budgets.tip.spent"), fm(b.s)], [t("budgets.tip.left"), fm(Math.max(0, b.left))], [t("budgets.tip.pace"), fm(b.pace)],
];
const note = (b) => (b.st == "warn" ? t("budgets.note.warn", { pct: Math.round(b.pc) }) : tk("budgets.note." + b.st));
const review = (b) => rvOf.value[b.k];
const reviewText = (r) => (r.kind == "lower" ? t("budgets.low", { avg: fm(r.avg), prop: fm(r.prop) }) : t("budgets.raise", { over: r.over, n: M.value.budMonths.length, avg: fm(r.avg), prop: fm(r.prop) }));
const drop = (k) => { open.value = false; remove(k); };
const seeSpending = (k) => { open.value = false; goCat(k); };
</script>

<template>
  <PhoneScreen class="ph-bud">
    <template #actions>
      <IconButton :label="t('phone.shell.open.budgets')" icon-name="add" @tap="openAdd('')" />
    </template>

    <p v-if="data.error.value && !S" class="ph-bud-err">{{ t("budgets.loadError") }}</p>
    <template v-else-if="!S">
      <div class="ph-bud-skel" aria-hidden="true"><i /><i /></div>
      <SkeletonRows :rows="4" />
    </template>

    <template v-else>
      <template v-if="has">
        <HeroSentence :class="{ over: kpis[2].v < 0 }" :parts="hero" />
        <section class="ph-group" :aria-label="t('budgets.k.budgeted')">
          <div class="ph-bud-tiles">
            <StatTile v-for="c in kpis.slice(0, 2)" :key="c.l" :label="c.l" :value="tileVal(c)" :note="c.s" />
          </div>
        </section>
      </template>
      <EmptyState v-else-if="!M.fresh.length" :icon="icon" :title="P('emptyTitle')" :text="P('emptyText')" :action="t('phone.shell.open.budgets')" @action="openAdd('')" />

      <!-- suggested budgets: an amount to accept (it can be changed first), or "Not this one" -->
      <section v-if="M.fresh.length" class="ph-group ph-bud-sug">
        <div class="ph-group-h"><h3>{{ t("budgets.sugTitle") }}</h3><button type="button" class="ph-link" @click="acceptEvery">{{ t("budgets.acceptAll") }}</button></div>
        <div class="ph-group-b">
          <div v-for="x in M.fresh.slice(0, 8)" :key="x.k" class="ph-bud-s">
            <button type="button" class="ph-bud-s-h" @click="goCat(x.k)">
              <span class="ph-bud-dot" :style="{ '--d': cc(x.k) }" />
              <span class="ph-row-main"><span class="ph-row-t">{{ catLabel(x.k) }}</span><span class="ph-row-s ph-bud-wrap">{{ t("budgets.typically", { amount: fm(x.avg), list: x.vals.map((v) => fm(v)).join(" · ") }) }}</span></span>
            </button>
            <div class="ph-bud-s-a">
              <label class="ph-bud-in"><span>₪</span><MoneyInput :model-value="propOf(x)" :aria-label="t('budgets.budgetFor', { name: catLabel(x.k) })" @update:model-value="(v) => (typed[x.k] = v)" /></label>
              <button type="button" class="ph-btn ph-bud-sb" @click="accept(x)">{{ t("budgets.accept") }}</button>
              <button type="button" class="ph-btn tonal ph-bud-sb" @click="dismiss(x.k)">{{ t("budgets.notThis") }}</button>
            </div>
          </div>
        </div>
        <p class="ph-group-n">{{ M.fresh.length > 8 ? t("budgets.more", { n: M.fresh.length - 8 }) + " " : "" }}{{ t("budgets.sugText", { months: mlab }) }}</p>
      </section>
      <ListGroup v-else-if="!has && M.budMonths.length < 2" :title="t('budgets.sugTitle')">
        <p class="ph-bud-none">{{ t("budgets.needTwo") }}</p>
      </ListGroup>
      <button v-if="!M.fresh.length && M.budgetNo.length" type="button" class="ph-link ph-bud-again" @click="resetNo">{{ t("budgets.showAgain") }}</button>

      <!-- every budget: how much is spent of it, and how it is going -->
      <section v-if="has" class="ph-group">
        <div class="ph-group-h"><h3>{{ t("budgets.byCat") }}</h3></div>
        <div class="ph-group-b">
          <button v-for="b in M.info" :key="b.k" type="button" class="ph-row ph-bud-row" @click="show(b)">
            <span class="ph-bud-row-h">
              <span class="ph-bud-dot" :style="{ '--d': cc(b.k) }" />
              <span class="ph-row-t">{{ catLabel(b.k) }}</span>
              <span class="ph-amt ph-bud-v">{{ P("spentOf", { spent: fm(b.s), limit: fm(b.lim) }) }}</span>
              <PIcon name="chevron" dir class="ph-chev" />
            </span>
            <ProgressBar class="ph-bud-bar" :value="b.s" :max="b.lim" :tone="tone(b)" :mark="today" :label="catLabel(b.k)" />
            <span class="ph-bud-row-s"><span class="ph-bud-st" :class="tone(b)">{{ status(b) }}</span><span v-if="review(b)" class="ph-bud-idea"><PIcon name="idea" />{{ P("idea") }}</span></span>
          </button>
        </div>
        <p class="ph-group-n">{{ t("budgets.markTip", { day: M.DAYN, days: M.DIM }) }}</p>
      </section>

      <!-- spending with no budget: see it in Activity, or set a budget for it; the amount sits under the name so the name keeps its room beside the button -->
      <ListGroup v-if="M.un.length" :title="t('budgets.unTitle')" :note="P('tapNote')">
        <div v-for="[k, v] in M.un" :key="k" class="ph-bud-un">
          <ListRow :title="catLabel(k)" @tap="goCat(k)">
            <template #lead><span class="ph-bud-dot" :style="{ '--d': cc(k) }" /></template>
            <template #sub><span class="ph-amt">{{ fm(v) }}</span></template>
          </ListRow>
          <button type="button" class="ph-btn tonal ph-bud-set" @click="openAdd(k)">{{ t("budgets.setBudget") }}</button>
        </div>
      </ListGroup>
    </template>

    <!-- one budget -->
    <PhoneSheet v-model:open="open" :title="cur ? catLabel(cur.k) : ''" cls="ph-bud-sheet">
      <template v-if="cur">
        <div class="ph-bud-big">
          <p><b class="ph-amt" :class="{ neg: cur.st == 'over' }">{{ fm(cur.s) }}</b> <span>{{ t("budgets.of", { amount: fm(cur.lim) }) }}</span></p>
          <span class="ph-bud-st" :class="tone(cur)">{{ status(cur) }}</span>
        </div>
        <ProgressBar class="ph-bud-bar big" :value="cur.s" :max="cur.lim" :tone="tone(cur)" :mark="today" :label="catLabel(cur.k)" />
        <p class="ph-bud-line">{{ cur.left >= 0 ? t("budgets.leftLine", { rest: fm(cur.left), perDay: fm(cur.perDay) }) : t("budgets.overLine") }}</p>

        <ListGroup :title="P('howGoing')" :note="note(cur)">
          <ListRow v-for="[l, v] in details(cur)" :key="l" :title="l" :value="v" />
        </ListGroup>

        <section v-if="review(cur)" class="ph-group ph-bud-rv">
          <div class="ph-group-h"><h3>{{ P("idea") }}</h3></div>
          <div class="ph-group-b">
            <!-- eslint-disable-next-line vue/no-v-html -- the app's own text with <b>, no user input -->
            <p class="ph-bud-rv-t" v-html="reviewText(review(cur))" />
            <div class="ph-bud-rv-a">
              <button type="button" class="ph-btn" @click="apply(review(cur))">{{ t("budgets.use", { amount: fm(review(cur).prop) }) }}</button>
              <button type="button" class="ph-btn tonal" @click="later(cur.k)">{{ t("budgets.notNow") }}</button>
            </div>
          </div>
        </section>

        <ListGroup v-if="M.billsIn(cur.k).length" :title="t('budgets.inc', { n: M.billsIn(cur.k).length }, M.billsIn(cur.k).length)">
          <ListRow v-for="x in M.billsIn(cur.k)" :key="x.idx" :title="tx(x.n)" :sub="billSt(x)" link @tap="billOpen(x)">
            <template #end><span class="ph-amt">{{ x.irregular ? "≈ " : "" }}{{ fm(x.pred) }}</span></template>
          </ListRow>
        </ListGroup>

        <ListGroup v-if="M.catJars[cur.k]" :title="t('budgets.jarT')">
          <p class="ph-bud-none"><b>{{ M.catJars[cur.k].j.n }}</b>{{ t("budgets.jarPays", { amount: fm(M.catJars[cur.k].j.bal) }) }}</p>
        </ListGroup>

        <ListGroup :title="P('lastMonths')">
          <p v-if="!M.budMonths.length" class="ph-bud-none">{{ t("budgets.noHist") }}</p>
          <div v-else class="ph-bud-months">
            <span v-for="(v, i) in lastVals(cur)" :key="i"><small>{{ months[i] }}</small><b class="ph-amt" :class="{ neg: v > cur.lim }">{{ fm(v) }}</b></span>
          </div>
        </ListGroup>

        <section class="ph-group">
          <div class="ph-group-h"><h3>{{ t("budgets.add.limit") }}</h3></div>
          <label class="ph-bud-in wide"><span>₪</span><MoneyInput :key="cur.k + cur.lim" :model-value="cur.lim" :aria-label="t('budgets.budgetFor', { name: catLabel(cur.k) })" @change="edit(cur.k, $event)" /></label>
        </section>
      </template>
      <template v-if="cur" #foot>
        <button type="button" class="ph-btn tonal" @click="seeSpending(cur.k)">{{ P("seeSpending") }}</button>
        <button type="button" class="ph-btn ph-bud-del" @click="drop(cur.k)">{{ t("budgets.remove") }}</button>
      </template>
    </PhoneSheet>
  </PhoneScreen>
</template>
