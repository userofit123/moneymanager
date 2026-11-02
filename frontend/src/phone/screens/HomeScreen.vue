<script setup>
// Home (tab): how the month is going at a glance. It opens with one sentence (what is free to use until the month ends),
// then what needs a look, the month's four totals, accounts, cards, the money flow, spending by category, budgets,
// upcoming bills, recent activity, your goal (when one is saved), jars and exchange rates. Every number comes from pagelogic/home.js, the same as the
// computer's Home page. The bell opens Alerts, + opens "Add or update". A block with nothing to show is hidden.
import { ref, computed, onMounted } from "vue";
import { data } from "../../stores/data.js";
import { goActivity, quickOpen } from "../../core/shell.js";
import { openForm } from "../../core/forms.js";
import { suggestions, suggestOpen } from "../../core/suggest.js";
import { vTip, explain } from "../../core/tooltip.js";
import { amtText } from "../../lib/txrows.js";
import { billKey } from "../../lib/bills.js";
import { brandIcon } from "../../brands.js";
import { currencySymbol } from "../../format.js";
import { dcell, dstr, titleCase } from "../../dates.js";
import { useHome } from "../../pagelogic/home.js";
import { useGoalCard, openYearsNext } from "../../pagelogic/yearsAhead.js";
import AvailWhy from "../../views/AvailWhy.vue";
import { usePhoneNav } from "../navigation.js";
import { ICONS } from "../icons.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import IconButton from "../components/IconButton.vue";
import SyncLine from "../components/SyncLine.vue";
import HeroSentence from "../components/HeroSentence.vue";
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
import StatTile from "../components/StatTile.vue";
import Segmented from "../components/Segmented.vue";
import ProgressBar from "../components/ProgressBar.vue";
import ProgressRing from "../components/ProgressRing.vue";
import EmptyState from "../components/EmptyState.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import PIcon from "../components/PIcon.vue";
import LoadError from "../components/LoadError.vue";
defineProps({ id: { type: String, default: null } });

const {
  t, fm, n0, an, pair, fx, S, M, monthName, catName, catColor, nm, accLbl, alertList, alerts3, openTxId, openAlert, accGo,
  kpis, accSub, cardRows, flowMode, flowOpts, W, cols, colTip, leftOf, donut, fxCur, fxKeys, fxView, fxOpts,
} = useHome();
const nav = usePhoneNav();
// an upcoming bill opens its own screen
const openBill = (b) => { const bl = M.value.billsAll[b.idx]; if (bl) nav.push("bill", billKey(bl)); };
onMounted(() => data.start());
const iso = (s) => "\u2066" + s + "\u2069"; // a date keeps its order inside a Hebrew sentence
const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
const P = (k, o, n) => t("phone.home." + k, o || {}, n);

// the sentence at the top: what is free to use (the same number as "Free to use" on the computer and in Jars)
const hero = computed(() => {
  const F = M.value.flow, short = F.over > 0;
  const text = P(short ? "short" : "free", { amount: "\u0000" }), [a, b = ""] = text.split("\u0000");
  return [{ text: a }, { amount: fm(short ? F.over : F.free) }, { text: b }];
});
const avail = ref(false);

// a tooltip's text, opened by a tap (the computer shows it on hover)

// the four totals: in your accounts and saved first (the month's answer), then money in and out
const ORDER = ["worth", "net", "income", "expense"];
const tiles = computed(() => ORDER.map((k) => kpis.value.find((c) => c.key === k)).filter(Boolean));
const tileVal = (c) => (c.key === "net" && c.v < 0 ? "−" : "") + "₪" + n0(c.v);

// accounts: an account's own screen (by the first account of that bank or wallet), else the Accounts screen
const accOpen = (n) => { const a = (S.value?.accounts || []).find((x) => x.n == n); if (a?.id != null) nav.push("account", String(a.id)); else accGo(n); };
const ACC_N = 4;
const accounts = computed(() => [...M.value.groups].sort((a, b) => b.total - a.total).slice(0, ACC_N));
// (an account's own line may already say "Manual": then it is not said twice)
const accLine = (g) => { const s = accSub(g); if (s.lines) return s.chips; const has = s.chips && s.text.toLowerCase().includes(s.chips.toLowerCase()); return [s.text, has ? "" : s.chips].filter(Boolean).join(", "); };

// spending by category: the five biggest, the rest in one row
const spendTop = computed(() => donut.value.parts.slice(0, 5));
const spendRest = computed(() => donut.value.parts.slice(5).reduce((s, p) => s + p.v, 0));

// your goal (saved in Forecast → Years ahead): tapping it opens the Forecast there
const goal = useGoalCard();
const openGoal = () => { openYearsNext(); nav.push("forecast"); };

const budgets = computed(() => M.value.budgets.slice(0, 3));
const budTone = (b) => (b.st == "over" ? "neg" : b.st == "warn" ? "warn" : "acc");
const flowName = (c) => c.name;
const isEnd = (c) => c.kind === "end";
</script>

<template>
  <PhoneScreen class="ph-home" refresh>
    <template #actions>
      <IconButton :label="t('shell.alerts')" icon-name="bell" :badge="alertList.length" @tap="nav.push('alerts')" />
      <IconButton :label="t('shell.add')" icon-name="add" @tap="quickOpen = true" />
    </template>
    <template #sub><SyncLine /></template>

    <LoadError v-if="data.error.value && !S" :text="t('home.loadError')" />
    <template v-else-if="!S">
      <div class="ph-home-skel" aria-hidden="true"><i /><i /></div>
      <SkeletonRows :rows="4" />
    </template>

    <EmptyState v-else-if="!M.any" :icon="ICONS.more4" :title="t('home.emptyTitle')" :text="t('home.emptyText')" :action="t('home.connect')" @action="nav.push('settingsSection', 'conn')">
      <button type="button" class="ph-btn tonal" @click="openForm('tx')">{{ t("home.addTx") }}</button>
    </EmptyState>

    <template v-else>
      <HeroSentence v-if="M.has.flow" :class="{ short: M.flow.over > 0 }" :parts="hero" :link="P('how')" @link="avail = true" />

      <button v-if="suggestions.length" type="button" class="ph-home-ideas" @click="suggestOpen = true">
        <PIcon name="idea" /><span>{{ P("ideas", { n: suggestions.length }, suggestions.length) }}</span><PIcon name="chevron" dir class="ph-chev" />
      </button>

      <ListGroup v-if="alerts3.length" :title="P('attention')" :more="alertList.length > 2 ? P('seeAllN', { n: alertList.length }) : ''" @more="nav.push('alerts')">
        <ListRow v-for="x in alerts3.slice(0, 2)" :key="x.id" class="ph-home-al" :class="x.sev" :title="x.title" :sub="x.text" icon-name="bell" :tone="x.sev === 'high' ? 'neg' : x.sev === 'med' ? 'warn' : 'acc'" link @tap="openAlert(x)" />
      </ListGroup>

      <section class="ph-group" :aria-label="P('totals')">
        <div class="ph-home-tiles">
          <StatTile v-for="c in tiles" :key="c.key" :class="'k-' + c.key" :label="cap(c.label)" :value="tileVal(c)" :note="c.sub" :tone="c.key === 'net' && c.v < 0 ? 'neg' : ''" @tap="explain(c.tip)" />
        </div>
      </section>

      <ListGroup v-if="M.has.accts" :title="t('home.accounts')" :more="P('seeAll')" @more="nav.push('accounts')">
        <ListRow v-for="g in accounts" :key="g.n" :title="an(g.n)" :sub="accLine(g)" link @tap="accOpen(g.n)">
          <template #lead><span class="ph-home-logo" v-html="brandIcon(g.n, g.L[0].src, g.L[0].kind, g.L[0].ck)" /></template>
          <template #end><span class="ph-amt">₪{{ n0(g.total) }}</span></template>
        </ListRow>
      </ListGroup>

      <ListGroup v-if="M.has.cards" :title="P('cards')" :more="P('seeAll')" @more="nav.push('accounts')">
        <ListRow v-for="c in cardRows" :key="c.n" v-tip="c.tip" link @tap="accOpen(c.wise ? 'Wise' : c.n)">
          <template #lead><span class="ph-home-logo" v-html="brandIcon(c.n, c.acc?.src, c.acc?.kind || 'card', c.acc?.ck)" /></template>
          <template #title><span v-if="c.wise">{{ titleCase(c.nme) }}</span><span v-else v-html="accLbl(c.n)" /></template>
          <template #sub><span>{{ c.wise ? P("paidNow") : P("upcoming") }}</span><span>{{ t("home.lastMonthAmount", { amount: "₪" + n0(c.last) }) }}</span></template>
          <template #end>
            <span class="ph-home-endcol"><span class="ph-amt">₪{{ n0(c.now) }}</span><small v-if="c.last" class="ph-home-chg" dir="ltr" :class="c.d > 0 ? 'ph-up' : 'ph-dn'">{{ (c.d > 0 ? "+" : "−") + c.p }}%</small></span>
          </template>
        </ListRow>
      </ListGroup>

      <section v-if="M.has.flow" class="ph-group ph-home-flow">
        <div class="ph-group-h"><h3>{{ t("home.flowTitle") }}</h3><button type="button" class="ph-link" @click="avail = true">{{ P("fullBreakdown") }}</button></div>
        <Segmented v-model="flowMode" :options="flowOpts" :label="t('home.flowMode')" />
        <div class="ph-group-b">
          <ListRow v-for="(c, i) in cols" :key="i" class="ph-home-step" :class="[c.kind, { short: isEnd(c) && W.eOver > 0 }]" :title="flowName(c)" :sub="isEnd(c) ? '' : P('leftAfter', { amount: leftOf(c) })" @tap="explain(colTip(c))">
            <template #lead><span class="ph-home-dot" :style="{ '--d': c.kind === 'start' ? 'var(--acc)' : isEnd(c) ? (W.eOver > 0 ? 'var(--neg)' : 'var(--pos)') : catColor(c.k) }" /></template>
            <template #end>
              <span v-if="isEnd(c)" class="ph-amt" :class="{ neg: W.eOver > 0 }">{{ leftOf(c) }}</span>
              <span v-else class="ph-amt">{{ c.kind === "start" ? "" : "−" }}₪{{ n0(c.a) }}</span>
            </template>
          </ListRow>
        </div>
        <p class="ph-group-n">{{ P("flowNote") }}</p>
      </section>

      <ListGroup v-if="M.has.donut" :title="t('home.byCategory')" :more="P('seeAll')" @more="nav.push('reports')">
        <div class="ph-home-spend">
          <p class="ph-home-spend-t"><b class="ph-amt">₪{{ n0(donut.tot) }}</b><span>{{ t("home.spentThisMonth") }}, {{ monthName(M.MK) }}</span></p>
          <div class="ph-home-strip" aria-hidden="true"><i v-for="p in donut.parts" :key="p.n" :style="{ flexGrow: p.v, background: p.color }" /></div>
        </div>
        <ListRow v-for="p in spendTop" :key="p.n" :title="catName(p.n)" :sub="p.pc + '%'" link @tap="goActivity({ cat: p.n })">
          <template #lead><span class="ph-home-dot" :style="{ '--d': p.color }" /></template>
          <template #end><span class="ph-amt">₪{{ n0(p.v) }}</span></template>
        </ListRow>
        <ListRow v-if="spendRest > 0" :title="P('otherCats')" :sub="String(donut.parts.length - 5)" link @tap="nav.push('categories')">
          <template #lead><span class="ph-home-dot" :style="{ '--d': 'var(--tx2)' }" /></template>
          <template #end><span class="ph-amt">₪{{ n0(spendRest) }}</span></template>
        </ListRow>
      </ListGroup>

      <ListGroup v-if="M.has.budg" :title="t('home.budgets')" :more="P('seeAll')" @more="nav.push('budgets')">
        <button v-for="b in budgets" :key="b.k" type="button" class="ph-row ph-home-bud" @click="goActivity({ cat: b.k })">
          <span class="ph-home-bud-h"><span class="ph-row-t">{{ catName(b.k) }}</span><span class="ph-home-bud-v" :class="{ neg: b.st == 'over' }">{{ P("budgetOf", { spent: fm(b.s), limit: fm(b.lim) }) }}</span></span>
          <ProgressBar :value="b.s" :max="b.lim" :tone="budTone(b)" :label="catName(b.k)" />
        </button>
      </ListGroup>

      <ListGroup v-if="M.has.bills" :title="t('home.upcomingBills')" :more="P('seeAll')" @more="nav.tab('bills')">
        <ListRow v-for="b in M.upcoming" :key="b.idx" :title="an(b.n)" link :sub="b.status == 'overdue' ? t('home.overdueSince', { date: iso(dstr(b.pd)) }) : P('dueOn', { date: iso(dstr(b.nx)) })" @tap="openBill(b)">
          <template #lead><span class="ph-home-due" :class="{ late: b.status == 'overdue' }"><b>{{ b.status == "overdue" ? "!" : b.days }}</b></span></template>
          <template #end><span class="ph-amt">{{ b.vari ? "≈ " : "" }}{{ fm(b.pred) }}</span></template>
        </ListRow>
      </ListGroup>

      <ListGroup v-if="M.has.recent" :title="t('home.recent')" :more="P('seeAll')" @more="nav.tab('activity')">
        <p v-if="!M.recent.length" class="ph-home-none">{{ P("noneYet") }}</p>
        <ListRow v-for="x in M.recent" :key="x.id" :title="nm(x)" :sub="catName(x.c) + ', ' + iso(dcell(x.d))" @tap="openTxId(x.id)">
          <template #lead><span class="ph-home-av" :style="{ '--d': catColor(x.c || 'Uncategorized') }">{{ (nm(x) || "?")[0] }}</span></template>
          <template #end><span class="ph-amt" :class="{ pos: x.a > 0 }">{{ amtText(x) }}</span></template>
        </ListRow>
      </ListGroup>

      <ListGroup v-if="goal" :title="t('home.goal.title')" :more="t('home.goal.open')" @more="openGoal">
        <button type="button" class="ph-row ph-home-bud ph-home-goal" @click="openGoal">
          <span class="ph-home-bud-h"><span class="ph-row-t"><span :data-tip="goal.tip">{{ goal.name }}</span></span><span class="ph-home-bud-v">{{ goal.pc }}%</span></span>
          <ProgressBar :value="goal.pc" :max="100" :color="goal.on ? 'var(--pos)' : ''" :label="goal.name" />
          <span class="ph-home-goal-l">{{ goal.have }}</span>
          <span class="ph-home-goal-l"><b :class="goal.on ? 'pos' : 'neg'">{{ goal.lead }}</b> {{ goal.line }}</span>
        </button>
      </ListGroup>

      <ListGroup v-if="M.has.jars" :title="t('home.jars')" :more="P('seeAll')" @more="nav.tab('jars')">
        <ListRow v-for="j in M.jars" :key="j.id" :title="an(j.n)" :sub="j.open ? P('jarNoGoal', { amount: '₪' + n0(j.bal) }) : P('jarOf', { amount: '₪' + n0(j.bal), goal: '₪' + n0(j.need), pc: j.pc })" @tap="nav.push('jar', String(j.id))">
          <template #lead><ProgressRing :value="j.open ? 0 : j.bal" :max="j.open ? 0 : j.need" :size="36" :color="'var(--c' + ((j.p - 1) % 7) + ')'" /></template>
          <template #end><span v-if="j.got" class="ph-amt pos">+₪{{ n0(j.got) }}</span><span v-else-if="j.want > 0" class="ph-home-wait">{{ t("home.waiting") }}</span></template>
        </ListRow>
      </ListGroup>

    </template>

    <!-- exchange rates show even before there is any money data (a first look still has them) -->
    <section v-if="S && fxKeys.length && fxView" class="ph-group ph-home-fx">
      <div class="ph-group-h"><h3>{{ t("home.fx") }}</h3><button type="button" class="ph-link" @click="nav.push('settingsSection', 'cur')">{{ P("currencies") }}</button></div>
      <Segmented v-if="fxKeys.length > 1" v-model="fxCur" :options="fxOpts" :label="t('home.fx')" />
      <div class="ph-group-b ph-home-fxb">
        <div class="ph-home-fxh">
          <p class="ph-home-fxr" dir="ltr"><span>{{ currencySymbol(fxCur) }}1 =</span> <b>₪{{ fxView.last.toFixed(4) }}</b></p>
          <span class="ph-home-chg" dir="ltr" :class="Math.abs(fxView.ch) < .005 ? '' : fxView.ch > 0 ? 'ph-up' : 'ph-dn'">{{ P("change", { pc: (fxView.ch > 0 ? "+" : fxView.ch < 0 ? "−" : "") + Math.abs(fxView.ch).toFixed(2) }) }}</span>
        </div>
        <p v-if="fxKeys.length < 2" class="ph-home-fxp">{{ pair(fxCur) }}</p>
        <svg class="ph-home-fxl" :viewBox="`${fxView.P} 8 ${fxView.Wd - fxView.P - 12} ${fxView.H - 26}`" preserveAspectRatio="none" aria-hidden="true">
          <polygon :points="fxView.area" /><polyline :points="fxView.pts" vector-effect="non-scaling-stroke" />
        </svg>
        <div class="ph-home-fxs">
          <span><small>{{ t("home.low") }}</small><b>{{ fxView.mn.toFixed(3) }}</b></span>
          <span><small>{{ t("home.average") }}</small><b>{{ fxView.av.toFixed(3) }}</b></span>
          <span><small>{{ t("home.high") }}</small><b>{{ fxView.mx.toFixed(3) }}</b></span>
        </div>
        <div class="ph-home-range" :aria-label="P('rangeNote')" role="img"><i :style="{ insetInlineStart: fxView.pos.toFixed(1) + '%' }" /></div>
      </div>
      <p class="ph-group-n">{{ fx.stale ? t("home.fxStaleAt", { date: fx.asOf }) : t("home.fxSource", { date: fx.asOf }) }} {{ t("home.fxUse") }}</p>
    </section>

    <AvailWhy v-if="S" v-model:open="avail" :M="M" />
  </PhoneScreen>
</template>
