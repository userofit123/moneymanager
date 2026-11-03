<script setup>
// Budgets (in More): the computer's Budgets page, adapted for a phone. The same blocks in the same order:
// the summary card (left to spend; spent so far with its bar and today's mark, budgeted this month, how many budgets),
// suggested budgets (each with its amount box, Accept and Not this one), By category (one card per budget: name, status
// badge, ⋯ menu, spent of the limit, the trend with its small month bars, the bar with today's mark, the pace line, an idea
// to change it, its bills and its jar), and spending with no budget. Hover texts open with a tap (explain).
// Every number and change comes from pagelogic/budgets.js, the same as the computer page.
import { ref, computed, onMounted } from "vue";
import { data } from "../../stores/data.js";
import { catLabel } from "../../core/cats.js";
import { explain } from "../../core/tooltip.js";
import { f0, fm } from "../../lib/bills.js";
import { tx } from "../../core/heText.js";
import { titleCase } from "../../dates.js";
import { pages } from "../../routes.js";
import { useBudgets } from "../../pagelogic/budgets.js";
import MoneyInput from "../../components/MoneyInput.vue";
import PhoneScreen from "../components/PhoneScreen.vue";
import IconButton from "../components/IconButton.vue";
import ListGroup from "../components/ListGroup.vue";
import EmptyState from "../components/EmptyState.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import PhoneSheet from "../components/PhoneSheet.vue";
import ActionSheet from "../components/ActionSheet.vue";
import LoadError from "../components/LoadError.vue";
defineProps({ id: { type: String, default: null } });

const {
  t, tk, S, M, cc, mlab, kpis, stClass, stTip, fillColor, billSt, rvOf, trendTag, trendTip, typed, propOf, accept, acceptEvery, dismiss, later, resetNo, apply, setAmount, askRemove, openAdd, goCat, billOpen,
} = useBudgets();
onMounted(() => data.start());
const P = (k, o, n) => t("phone.budgets." + k, o || {}, n);
const icon = pages.find((p) => p.name === "budgets")?.icon || "";

const today = computed(() => (M.value.DAYN / M.value.DIM) * 100); // the today mark on every bar
const markTip = computed(() => t("budgets.markTip", { day: M.value.DAYN, days: M.value.DIM }));
const totPc = computed(() => (M.value.totL ? (M.value.totS / M.value.totL) * 100 : 0));
const totFill = computed(() => (M.value.totS > M.value.totL ? "var(--neg)" : ""));
// the small month bars: the biggest month is full height; a month over the budget is red
const scale = (b) => Math.max(...b.trend.vals) || 1;
const TI = { up: "M12 19V5M6 11l6-6 6 6", down: "M12 5v14M6 13l6 6 6-6", steady: "M5 12h14" };
const status = (b) => (b.st == "over" ? t("budgets.st.overBy", { amount: fm(-b.left) }) : tk("budgets.st." + b.st));
const reviewText = (r) => (r.kind == "lower" ? t("budgets.low", { avg: fm(r.avg), prop: fm(r.prop) }) : t("budgets.raise", { over: r.over, n: M.value.budMonths.length, avg: fm(r.avg), prop: fm(r.prop) }));

// the bills inside a budget fold open with the chevron
const billsOpen = ref({});

// the ⋯ menu of a budget (the computer's menu), and the sheet that changes its amount
const ICON = {
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
  act: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  del: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
};
const menuK = ref(""), menuOpen = ref(false);
const openMenu = (k) => { menuK.value = k; menuOpen.value = true; };
const actions = computed(() => {
  const k = menuK.value;
  return [
    { label: t("budgets.menu.change"), icon: ICON.edit, run: () => openChange(k) },
    { label: t("budgets.menu.inAct"), icon: ICON.act, run: () => goCat(k) },
    { label: t("budgets.menu.remove"), icon: ICON.del, danger: true, run: () => askRemove(k, catLabel(k)) },
  ];
});
const editing = ref(""), editOpen = ref(false), amount = ref("");
const openChange = (k) => { amount.value = M.value.budgets[k]; editing.value = k; editOpen.value = true; };
const saveChange = () => { if (setAmount(editing.value, amount.value)) editOpen.value = false; };
</script>

<template>
  <PhoneScreen class="ph-bud">
    <template #actions>
      <IconButton :label="t('phone.shell.open.budgets')" icon-name="add" @tap="openAdd('')" />
    </template>

    <LoadError v-if="data.error.value && !S" :text="t('budgets.loadError')" />
    <template v-else-if="!S">
      <div class="ph-bud-skel" aria-hidden="true"><i /></div>
      <SkeletonRows :rows="4" />
    </template>

    <template v-else>
      <!-- the summary: left to spend, then spent so far with its bar, budgeted this month and how many budgets -->
      <div class="ph-acard hero ph-bud-top ph-bud-in" style="--d: 0">
        <div class="ph-bud-l">
          <div class="ph-acard-l"><span class="ph-acard-n">{{ titleCase(kpis[2].l) }}</span></div>
          <div class="ph-acard-v big" :class="{ neg: kpis[2].v < 0 }"><bdi dir="ltr"><small>₪</small>{{ kpis[2].v < 0 ? "−" : "" }}{{ f0(Math.abs(kpis[2].v)) }}</bdi></div>
          <div class="ph-acard-s">{{ kpis[2].v < 0 ? t("budgets.overLine") : kpis[2].s }}</div>
        </div>
        <div class="ph-bud-r">
          <div class="ph-acard-l"><span class="ph-acard-n">{{ titleCase(kpis[1].l) }}</span></div>
          <div class="ph-acard-v"><bdi dir="ltr"><small>₪</small>{{ f0(M.totS) }}</bdi><span class="ph-bud-of">{{ " " + t("budgets.of", { amount: fm(M.totL) }) }}</span></div>
          <button type="button" class="ph-bud-barb" :aria-label="markTip" @click="explain(markTip)">
            <span class="bar ph-bud-bar"><i :style="{ width: Math.min(100, totPc) + '%', background: totFill }" /><u :style="{ insetInlineStart: today + '%' }" /></span>
          </button>
          <div class="ph-acard-s">{{ kpis[1].s }}</div>
          <div class="ph-bud-stats">
            <div><span>{{ kpis[0].l }}</span><b class="ph-amt">{{ fm(kpis[0].v) }}</b></div>
            <button type="button" @click="explain(t('budgets.k.countTip'))"><span>{{ t("budgets.k.count") }}</span><b class="ph-amt">{{ M.info.length }}</b></button>
          </div>
        </div>
      </div>

      <!-- suggested budgets: the amount (it can be changed first), Accept, Not this one -->
      <ListGroup v-if="M.fresh.length" class="ph-bud-in" style="--d: 1" :title="t('budgets.sugTitle')" pad>
        <template #head><button type="button" class="ph-bud-hbtn" @click="acceptEvery">{{ t("budgets.acceptAll") }}</button></template>
        <p class="ph-bud-sugn">{{ t("budgets.sugText", { months: mlab }) }}</p>
        <div v-for="x in M.fresh.slice(0, 8)" :key="x.k" class="ph-bud-sr">
          <div class="ph-bud-srh">
            <span class="dot" :style="{ background: cc(x.k) }" />
            <div class="ph-bud-srt">
              <button type="button" class="ph-bud-cat" @click="goCat(x.k)">{{ catLabel(x.k) }}</button>
              <span class="ph-bud-meta">{{ t("budgets.typically", { amount: fm(x.avg), list: x.vals.map((v) => fm(v)).join(" · ") }) }}</span>
            </div>
          </div>
          <div class="ph-bud-sra">
            <label class="ph-bud-amt"><span>₪</span><MoneyInput :model-value="propOf(x)" :aria-label="t('budgets.budgetFor', { name: catLabel(x.k) })" @update:model-value="(v) => (typed[x.k] = v)" /></label>
            <button type="button" class="ph-btn ph-bud-sbtn" @click="accept(x)">{{ t("budgets.accept") }}</button>
            <button type="button" class="ph-btn plain ph-bud-sbtn" @click="dismiss(x.k)">{{ t("budgets.notThis") }}</button>
          </div>
        </div>
        <p v-if="M.fresh.length > 8" class="ph-bud-meta ph-bud-sugmore">{{ t("budgets.more", { n: M.fresh.length - 8 }) }}</p>
      </ListGroup>
      <template v-else>
        <ListGroup v-if="!Object.keys(M.budgets).length && M.budMonths.length < 2" class="ph-bud-in" style="--d: 1" :title="t('budgets.sugTitle')" pad>
          <p class="ph-bud-sugn">{{ t("budgets.needTwo") }}</p>
        </ListGroup>
        <button v-if="M.budgetNo.length" type="button" class="ph-link ph-bud-again" @click="resetNo">{{ t("budgets.showAgain") }}</button>
      </template>

      <!-- by category: one card per budget, as on the computer -->
      <ListGroup class="ph-bud-in" style="--d: 2" :title="t('budgets.byCat')" bare>
        <template #head><button type="button" class="ph-bud-hbtn" @click="openAdd('')">{{ t("budgets.addBudget") }}</button></template>
        <EmptyState v-if="!M.info.length" :icon="icon" :title="P('emptyTitle')" :text="P('emptyText')" :action="t('phone.shell.open.budgets')" @action="openAdd('')" />
        <div v-else class="ph-bud-list">
          <article v-for="(b, i) in M.info" :key="b.k" class="ph-card ph-bud-card" :class="{ warn: b.st == 'over' }" :style="{ '--i': i }">
            <div class="ph-bud-head">
              <button type="button" class="ph-bud-name" @click="goCat(b.k)"><span class="dot" :style="{ background: cc(b.k) }" /><span>{{ catLabel(b.k) }}</span></button>
              <button type="button" class="bd ph-bud-bd" :class="stClass(b)" @click="explain(stTip(b))">{{ status(b) }}</button>
              <IconButton class="ph-bud-more" :label="t('budgets.options')" icon-name="more" @tap="openMenu(b.k)" />
            </div>
            <div class="ph-bud-mid">
              <div class="ph-bud-val"><bdi dir="ltr"><small>₪</small>{{ f0(b.s) }}</bdi><span class="ph-bud-of">{{ " " + t("budgets.of", { amount: fm(b.lim) }) }}</span></div>
              <button v-if="b.trend" type="button" class="ph-bud-trend" :class="'tr-' + b.trend.change" @click="explain(trendTip(b))">
                <span class="ph-bud-mini" aria-hidden="true"><i v-for="(v, j) in b.trend.vals" :key="j" :class="{ over: v > b.lim }" :style="{ blockSize: Math.max(4, (v / scale(b)) * 100) + '%', '--j': j }" /></span>
                <span class="ph-bud-tag"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="TI[b.trend.change]" /></svg>{{ trendTag(b) }}</span>
              </button>
            </div>
            <button type="button" class="ph-bud-barb" :aria-label="markTip" @click="explain(markTip)">
              <span class="bar ph-bud-bar"><i :style="{ width: Math.min(100, b.pc) + '%', background: fillColor(b) }" /><u :style="{ insetInlineStart: today + '%' }" /></span>
            </button>
            <p class="ph-bud-meta">{{ b.left >= 0 ? t("budgets.leftLine", { rest: fm(b.left), perDay: fm(b.perDay) }) : t("budgets.overLine") }} · {{ t("budgets.paceLine", { amount: fm(b.pace) }) }}</p>
            <div v-if="rvOf[b.k]" class="sugg ph-bud-sugg">
              <!-- eslint-disable-next-line vue/no-v-html -- the app's own text with <b>, no user input -->
              <p v-html="reviewText(rvOf[b.k])" />
              <div class="ph-bud-sugga">
                <button type="button" class="ph-btn ph-bud-sbtn" @click="apply(rvOf[b.k])">{{ t("budgets.use", { amount: fm(rvOf[b.k].prop) }) }}</button>
                <button type="button" class="ph-btn plain ph-bud-sbtn" @click="later(b.k)">{{ t("budgets.notNow") }}</button>
              </div>
            </div>
            <div v-if="M.billsIn(b.k).length || M.catJars[b.k]" class="ph-bud-extra">
              <template v-if="M.billsIn(b.k).length">
                <button type="button" class="ph-bud-xt" :aria-expanded="!!billsOpen[b.k]" @click="billsOpen[b.k] = !billsOpen[b.k]"><span>{{ t("budgets.inc", { n: M.billsIn(b.k).length }, M.billsIn(b.k).length) }}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></button>
                <div v-if="billsOpen[b.k]" class="ph-bud-bin">
                  <button v-for="x in M.billsIn(b.k)" :key="x.idx" type="button" class="ph-bud-bill" @click="billOpen(x)"><span>{{ tx(x.n) }} <small>{{ billSt(x) }}</small></span><b class="ph-amt">{{ x.irregular ? "≈ " : "" }}{{ fm(x.pred) }}</b></button>
                </div>
              </template>
              <p v-if="M.catJars[b.k]" class="ph-bud-meta ph-bud-jar"><b>{{ t("budgets.jarT") }}:</b> <b class="ph-bud-jn">{{ M.catJars[b.k].j.n }}</b>{{ t("budgets.jarPays", { amount: fm(M.catJars[b.k].j.bal) }) }}</p>
            </div>
          </article>
        </div>
      </ListGroup>

      <!-- spending with no budget: see it in Activity, or set a budget for it -->
      <ListGroup v-if="M.un.length" class="ph-bud-in" style="--d: 3" :title="t('budgets.unTitle')">
        <div v-for="[k, v] in M.un" :key="k" class="ph-bud-un">
          <button type="button" class="ph-bud-unn" @click="goCat(k)"><span class="dot" :style="{ background: cc(k) }" /><span class="ph-bud-unt">{{ catLabel(k) }}</span><b class="ph-amt">{{ fm(v) }}</b></button>
          <button type="button" class="ph-btn plain ph-bud-sbtn" @click="openAdd(k)">{{ t("budgets.setBudget") }}</button>
        </div>
      </ListGroup>
    </template>

    <!-- a budget's ⋯ menu -->
    <ActionSheet v-model:open="menuOpen" :title="menuK ? catLabel(menuK) : ''" :actions="actions" />

    <!-- change a budget's amount -->
    <PhoneSheet v-model:open="editOpen" :title="editing ? t('budgets.change.title', { name: catLabel(editing) }) : ''" size="fit" cls="ph-bud-sheet">
      <section class="ph-group">
        <div class="ph-group-h"><h3>{{ t("budgets.add.limit") }}</h3></div>
        <label class="ph-bud-amt big"><span>₪</span><MoneyInput v-model="amount" :aria-label="t('budgets.add.limit')" @keydown.enter="saveChange" /></label>
      </section>
      <template #foot>
        <button type="button" class="ph-btn" @click="saveChange">{{ t("budgets.save") }}</button>
        <button type="button" class="ph-btn plain" @click="editOpen = false">{{ t("budgets.cancel") }}</button>
      </template>
    </PhoneSheet>
  </PhoneScreen>
</template>
