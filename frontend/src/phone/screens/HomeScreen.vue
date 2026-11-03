<script setup>
// Home (tab): the computer's Home page for a phone, block by block in the same order: what needs a look, the four totals,
// accounts, cards this month vs last, the money flow, spending by category, budgets, upcoming bills, recent activity,
// your goal (when one is saved), jars and exchange rates. Every number comes from pagelogic/home.js, the same as the
// computer. What the computer shows on hover opens in a sheet on a tap. A block with nothing to show is hidden.
// + opens "Add or update", the bulb (when there are ideas) the ideas to tidy up the data.
import { ref, computed, onMounted } from "vue";
import { data } from "../../stores/data.js";
import { goActivity, quickOpen } from "../../core/shell.js";
import { openForm } from "../../core/forms.js";
import { suggestions, suggestOpen } from "../../core/suggest.js";
import { explain } from "../../core/tooltip.js";
import { amtText } from "../../lib/txrows.js";
import { billKey } from "../../lib/bills.js";
import { brandIcon, glyphIcon } from "../../brands.js";
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
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
import AmountCard from "../components/AmountCard.vue";
import SwipeCards from "../components/SwipeCards.vue";
import DonutChart from "../components/DonutChart.vue";
import Segmented from "../components/Segmented.vue";
import EmptyState from "../components/EmptyState.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import PIcon from "../components/PIcon.vue";
import LoadError from "../components/LoadError.vue";
defineProps({ id: { type: String, default: null } });

const {
  t, fm, n0, an, pair, fx, S, M, monthName, catName, catColor, nm, accLbl, alertList, alerts3, openTxId, openAlert, accGo,
  kpis, money2, accSub, cardRows, flowMode, flowOpts, W, pay, calm, cols, startTip, cardsTip, upTip, endTip, colTip, asideTip, tileTip, leftOf,
  donut, fxCur, fxKeys, fxView, fxOpts,
} = useHome();
const nav = usePhoneNav();
const P = (k, o, n) => t("phone.home." + k, o || {}, n);
onMounted(() => data.start());
const avail = ref(false);
const iso = (s) => "⁦" + s + "⁩"; // a date keeps its order inside a Hebrew sentence

// the four totals, as on the computer: the same icons and colours; tapping one explains it
const KPI_COL = { worth: "var(--acc)", income: "var(--pos)", expense: "var(--neg)", net: "var(--acc)" };
const kpiVal = (c) => (c.key === "net" && c.v < 0 ? "−" : "") + n0(c.v);

// accounts: an account's own screen (by the first account of that bank or wallet), else the Accounts screen
const accOpen = (n) => { const a = (S.value?.accounts || []).find((x) => x.n == n); if (a?.id != null) nav.push("account", String(a.id)); else accGo(n); };

// the money flow's steps, as on the computer: what is in the accounts, minus each part, equals what is free
const isShort = computed(() => W.value.eOver > 0 && !calm.value);
const steps = computed(() => {
  const w = W.value, F = M.value.flow, L = [{ k: "start", label: t("num.inAccounts"), v: fm(w.start), tip: startTip(true) }];
  if (F.cards >= 1) L.push({ k: "cards", label: t("num.cardsUnpaid"), v: fm(F.cards), tip: cardsTip.value });
  if (w.upTot >= 1) L.push({ k: "up", label: t("num.upcoming"), v: fm(w.upTot), tip: upTip.value });
  if (!w.ACT) L.push({ k: "left", label: t("num.leftBudgets"), v: fm(w.leftTot), tip: tileTip.value });
  if (!w.ACT) L.push({ k: "aside", label: t("num.putAside"), v: fm(w.jarsA + F.buffer), tip: asideTip.value });
  return L;
});
const endLabel = computed(() => (isShort.value ? t("home.shortBy") : W.value.ACT ? t("num.afterKnown") : t("num.free")));
const endVal = computed(() => (W.value.eOver > 0 ? "−₪" + n0(W.value.eOver) : fm(W.value.eFree)));
const colTone = (c) => (c.kind === "end" ? "end " + c.tone : c.kind === "item" ? "" : c.kind);

// spending by category: the computer's ring chart and its legend
const donutParts = computed(() => donut.value.parts.map((p) => ({ ...p, label: catName(p.n), amount: "₪" + n0(p.v) })));

// upcoming bills open their own screen
const openBill = (b) => { const bl = M.value.billsAll[b.idx]; if (bl) nav.push("bill", billKey(bl)); };

// your goal (saved in Forecast → Years ahead): tapping it opens the Forecast there
const goal = useGoalCard();
const openGoal = () => { openYearsNext(); nav.push("forecast"); };

// exchange rates: a tap on the chart shows that day's rate (the computer shows it on hover)
const fxPick = ref(null), fxSvg = ref(null);
function fxAt(e) {
  const F = fxView.value, svg = fxSvg.value; if (!F || !svg) return;
  const r = svg.getBoundingClientRect(); if (!r.width) return;
  const vx = ((e.clientX - r.left) * F.Wd) / r.width; let i = 0, best = 1e9;
  F.xs.forEach((x, j) => { const d = Math.abs(x - vx); if (d < best) { best = d; i = j; } });
  fxPick.value = i;
}
const fxBadge = computed(() => { const ch = fxView.value?.ch || 0; return Math.abs(ch) < .005 ? "" : ch > 0 ? "dn" : "up"; });
</script>

<template>
  <PhoneScreen class="ph-home" refresh>
    <template #actions>
      <IconButton v-if="suggestions.length" :label="t('txw.suggA')" icon-name="idea" :badge="suggestions.length" @tap="suggestOpen = true" />
      <IconButton :label="t('shell.add')" icon-name="add" @tap="quickOpen = true" />
    </template>
    <template #sub><SyncLine /></template>

    <LoadError v-if="data.error.value && !S" :text="t('home.loadError')" />
    <template v-else-if="!S">
      <div class="ph-home-skel" aria-hidden="true"><i /><i /></div>
      <SkeletonRows :rows="4" />
    </template>

    <template v-else>
      <!-- what needs a look: the computer's warning card with the first three alerts -->
      <section v-if="alerts3.length" class="ph-card ph-home-al" :aria-label="t('shell.alerts')">
        <button v-for="x in alerts3" :key="x.id" type="button" class="ph-home-alr" @click="openAlert(x)">
          <i class="sev" :class="x.sev" />
          <span class="ph-home-alt"><b>{{ x.title }}</b><span>{{ x.text }}</span></span>
          <PIcon name="chevron" dir class="ph-chev" />
        </button>
        <button type="button" class="ph-link ph-home-all" @click="nav.push('alerts')">{{ P("allAlerts", { n: alertList.length }) }}<PIcon name="chevron" dir /></button>
      </section>

      <EmptyState v-if="!M.any && !fxKeys.length" :icon="ICONS.more4" :title="t('home.emptyTitle')" :text="t('home.emptyText')" :action="t('home.connect')" @action="nav.push('settingsSection', 'conn')">
        <button type="button" class="ph-btn tonal" @click="openForm('tx')">{{ t("home.addTx") }}</button>
      </EmptyState>

      <template v-else-if="M.any">
        <!-- the four totals -->
        <div class="ph-home-kpis">
          <AmountCard v-for="c in kpis" :key="c.key" :class="'k-' + c.key" :hero="c.hero" :icon="glyphIcon(c.key, KPI_COL[c.key])" :label="titleCase(c.label)" :value="kpiVal(c)" :sub="c.sub" :spark="c.spark" :spark-color="c.col" @tap="explain(c.tip)">
            <template v-if="c.lasts" #foot><button type="button" class="ph-home-lasts" @click.stop="explain(c.lasts.tip)">{{ c.lasts.text }}</button></template>
          </AmountCard>
        </div>

        <ListGroup v-if="M.has.accts" :title="t('home.accounts')" :more="P('all')" bare @more="nav.push('accounts')">
          <SwipeCards :count="M.groups.length">
            <AmountCard v-for="g in M.groups" :key="g.n" :icon="brandIcon(g.n, g.L[0].src, g.L[0].kind, g.L[0].ck)" :label="an(g.n)" :chip="accSub(g).chips" :value="n0(g.total)" @tap="accOpen(g.n)">
              <template #sub>
                <template v-if="accSub(g).lines">
                  <span v-for="x in accSub(g).lines" :key="x.cur" class="ph-home-cur"><span><template v-if="x.none">ILS · <i>{{ t("home.noShekel") }}</i></template><template v-else><bdi>{{ x.cur }} · {{ money2(x) }}</bdi><span v-if="x.cur != 'ILS'" class="ph-home-rate" dir="ltr"> × {{ (fx.fx[x.cur] || 1).toFixed(4) }}</span></template></span><b class="ph-amt">₪{{ n0(x.none ? 0 : x.v * M.rate(x.cur)) }}</b></span>
                  <span v-if="accSub(g).stale" class="ph-home-stale">{{ fx.live ? t("home.fxStale") : t("home.fxNone") }}</span>
                </template>
                <template v-else>{{ accSub(g).text }}</template>
              </template>
            </AmountCard>
          </SwipeCards>
        </ListGroup>

        <ListGroup v-if="M.has.cards" :title="t('home.cards')" :more="P('all')" bare @more="nav.push('accounts')">
          <SwipeCards :count="cardRows.length">
            <AmountCard v-for="c in cardRows" :key="c.n" :icon="brandIcon(c.n, c.acc?.src, c.acc?.kind || 'card', c.acc?.ck)" :value="n0(c.now)" @tap="explain(c.tip)">
              <template #label><template v-if="c.wise">{{ titleCase(c.nme) }} · {{ titleCase(t("home.paidNow")) }}</template><template v-else><span v-html="accLbl(c.n)" /> · {{ titleCase(t("home.upcomingCharge")) }}</template></template>
              <template #sub><span>{{ t("home.lastMonthAmount", { amount: "₪" + n0(c.last) }) }} <span v-if="c.last" class="ph-home-bd" dir="ltr" :class="c.d > 0 ? 'up' : 'dn'"><PIcon name="chevron" class="ph-home-bdi" :class="c.d > 0 ? 'u' : 'd'" />{{ c.p }}%</span></span></template>
              <template #foot><span class="bar ph-home-bar"><i :style="{ width: Math.min(100, c.now / Math.max(c.now, c.last, 1) * 100) + '%', background: c.d > 0 ? 'var(--neg)' : 'var(--pos)' }" /></span></template>
            </AmountCard>
          </SwipeCards>
        </ListGroup>

        <!-- the money flow: the steps (In your accounts − … = Free to use), then the same steps as bars -->
        <ListGroup v-if="M.has.flow" :title="t('home.flowTitle')" :more="P('fullBreakdown')" pad @more="avail = true">
          <template #top><Segmented v-model="flowMode" :options="flowOpts" :label="t('home.flowMode')" /></template>
          <div :key="flowMode" class="ph-home-steps">
            <button v-for="(s, i) in steps" :key="s.k" type="button" class="ph-home-st" @click="explain(s.tip)"><span><i v-if="i" class="ph-home-op">−</i>{{ s.label }}</span><b class="ph-amt">{{ s.v }}</b></button>
            <button type="button" class="ph-home-st key" :class="{ neg: isShort }" @click="explain(endTip)"><span><i class="ph-home-op">=</i>{{ endLabel }}</span><b class="ph-amt">{{ endVal }}</b><small v-if="pay">{{ pay.after }}</small></button>
          </div>
          <div class="ph-home-wf">
            <p class="ph-home-wfk"><span><i class="lk s" />{{ t("home.whatsLeft") }}</span><span><i class="lk g" />{{ t("home.stepAmount") }}</span></p>
            <button v-for="(c, i) in cols" :key="i" type="button" class="ph-home-wr" :class="colTone(c)" @click="explain(colTip(c))">
              <span class="ph-home-wn">{{ c.name }}</span>
              <span class="ph-home-wa ph-amt"><template v-if="c.kind === 'end'">–</template><template v-else>₪{{ n0(c.a) }}</template></span>
              <span class="ph-home-wb"><i class="g" :style="{ '--b': c.b, '--h': c.h }" /><i class="s" :class="colTone(c)" :style="{ '--h': c.s }" /></span>
              <span class="ph-home-wl ph-amt"><template v-if="c.kind === 'end' && W.eOver > 0"><span :class="{ neg: !calm }">−{{ fm(W.eOver) }}</span></template><template v-else>{{ leftOf(c) }}</template><small v-if="c.k === W.remain">{{ t("num.afterKnownS") }}</small></span>
            </button>
          </div>
        </ListGroup>

        <ListGroup v-if="M.has.donut" :title="t('home.byCategory') + ' · ' + monthName(M.MK)" :more="P('all')" pad @more="nav.push('reports')">
          <DonutChart :parts="donutParts" :total="'₪' + n0(donut.tot)" :caption="t('home.spentThisMonth')" @pick="(n) => goActivity({ cat: n })" />
        </ListGroup>

        <ListGroup v-if="M.has.budg" :title="t('home.budgets') + ' · ' + monthName(M.MK)" :more="P('all')" pad @more="nav.push('budgets')">
          <button v-for="b in M.budgets.slice(0, 8)" :key="b.k" type="button" class="ph-home-line" @click="goActivity({ cat: b.k })">
            <span class="ph-home-lh"><b>{{ catName(b.k) }}</b><span class="ph-amt">{{ fm(b.s) }} / {{ fm(b.lim) }}</span></span>
            <span class="bar"><i :style="{ width: Math.min(100, b.pc) + '%', background: b.st == 'over' ? 'var(--neg)' : b.st == 'warn' ? '#e68a00' : '' }" /><u :style="{ insetInlineStart: (M.DAYN / M.DIM) * 100 + '%' }" /></span>
          </button>
          <button v-if="M.budgets.length > 8" type="button" class="ph-link" @click="nav.push('budgets')">{{ P("moreBudgets", { n: M.budgets.length - 8 }) }}<PIcon name="chevron" dir /></button>
        </ListGroup>

        <ListGroup v-if="M.has.bills" :title="t('home.upcomingBills')" :more="P('all')" @more="nav.tab('bills')">
          <ListRow v-for="b in M.upcoming" :key="b.idx" :title="an(b.n)" link :sub="b.status == 'overdue' ? t('home.overdueSince', { date: iso(dstr(b.pd)) }) : t('home.dueIn', { date: iso(dstr(b.nx)), n: b.days })" @tap="openBill(b)">
            <template #end><span class="ph-amt">{{ b.vari ? "≈ " : "" }}{{ fm(b.pred) }}</span></template>
          </ListRow>
        </ListGroup>

        <ListGroup v-if="M.has.recent" :title="t('home.recent')" :more="P('all')" @more="nav.tab('activity')">
          <ListRow v-for="x in M.recent" :key="x.id" :title="nm(x)" :sub="catName(x.c) + ' · ' + iso(dcell(x.d))" @tap="openTxId(x.id)">
            <template #lead><span class="ph-home-av" :style="{ '--d': catColor(x.c || 'Uncategorized') }">{{ (nm(x) || "?")[0] }}</span></template>
            <template #end><span class="ph-amt" :class="{ pos: x.a > 0 }">{{ amtText(x) }}</span></template>
          </ListRow>
        </ListGroup>

        <ListGroup v-if="goal" :title="t('home.goal.title')" :more="P('goalOpen')" pad @more="openGoal">
          <button type="button" class="ph-home-line ph-home-goal" @click="openGoal">
            <span class="ph-home-lh"><b>{{ goal.name }}</b><span class="ph-amt">{{ goal.pc }}%</span></span>
            <span class="bar"><i :style="{ width: goal.pc + '%', background: goal.on ? 'var(--pos)' : '' }" /></span>
            <span class="ph-home-lm ph-amt">{{ goal.have }}</span>
            <span class="ph-home-gst"><b :class="goal.on ? 'pos' : 'neg'">{{ goal.lead }}</b> {{ goal.line }}</span>
          </button>
        </ListGroup>

        <ListGroup v-if="M.has.jars" :title="t('home.jars')" :more="P('all')" pad @more="nav.tab('jars')">
          <button v-for="j in M.jars" :key="j.id" type="button" class="ph-home-line" @click="nav.push('jar', String(j.id))">
            <span class="ph-home-lh"><b>{{ an(j.n) }}</b><span :class="{ pos: j.got }">{{ j.got ? t("home.gotThisMonth", { amount: "+₪" + n0(j.got) }) : j.want > 0 ? t("home.waiting") : "" }}</span></span>
            <span v-if="!j.open" class="bar"><i :style="{ width: j.pc + '%', background: 'var(--c' + ((j.p - 1) % 7) + ')' }" /></span>
            <span class="ph-home-lm ph-amt">{{ j.open ? t("home.savedNoGoal", { amount: "₪" + n0(j.bal) }) : t("home.ofGoal", { amount: "₪" + n0(j.bal), goal: "₪" + n0(j.need), pc: j.pc }) }}</span>
          </button>
          <div class="ph-home-free"><span>{{ t("num.free") }}</span><b class="ph-amt">₪{{ n0(M.flow.free) }}</b></div>
        </ListGroup>
      </template>

      <!-- exchange rates show even before there is any money data (a first look still has them) -->
      <ListGroup v-if="fxKeys.length && fxView" :title="t('home.fx')" :more="P('currencies')" pad @more="nav.push('settingsSection', 'cur')">
        <div class="ph-home-fxh">
          <Segmented v-if="fxKeys.length > 1" v-model="fxCur" :options="fxOpts" :label="t('home.fx')" />
          <span v-else class="ph-home-fxp">{{ pair(fxCur) }}</span>
          <span class="ph-home-bd" :class="fxBadge"><bdi dir="ltr"><PIcon v-if="fxBadge" name="chevron" class="ph-home-bdi" :class="fxView.ch > 0 ? 'u' : 'd'" />{{ Math.abs(fxView.ch).toFixed(2) }}%</bdi>&nbsp;· {{ t("home.days30") }}</span>
        </div>
        <p class="ph-home-fxr" dir="ltr"><span>{{ currencySymbol(fxCur) }}1</span><span>=</span><b>₪{{ (fxPick != null ? fxView.ser[fxPick][1] : fxView.last).toFixed(4) }}</b><small v-if="fxPick != null">{{ fxView.ser[fxPick][0] }}</small></p>
        <svg ref="fxSvg" class="ph-home-fxc" :viewBox="`0 0 ${fxView.Wd} ${fxView.H}`" dir="ltr" @pointerdown="fxAt" @pointermove="fxAt">
          <g v-for="(g, i) in fxView.grid" :key="i"><line class="gl" :x1="fxView.P" :x2="fxView.Wd - 12" :y1="g.y" :y2="g.y" stroke-dasharray="3 5" /><text :x="fxView.P - 6" :y="g.y + 4" text-anchor="end">{{ g.label }}</text></g>
          <defs><linearGradient id="phfxg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".35" /><stop offset="1" stop-color="var(--acc)" stop-opacity="0" /></linearGradient></defs>
          <polygon fill="url(#phfxg)" :points="fxView.area" /><polyline fill="none" stroke="var(--acc)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" :points="fxView.pts" />
          <template v-if="fxPick != null"><line :x1="fxView.xs[fxPick]" :x2="fxView.xs[fxPick]" :y1="fxView.y0" :y2="fxView.y1" stroke="var(--tx)" stroke-opacity=".35" stroke-dasharray="3 3" /><circle :cx="fxView.xs[fxPick]" :cy="fxView.ys[fxPick]" r="5" fill="var(--acc)" stroke="var(--bg)" stroke-width="2" /></template>
          <circle :cx="fxView.lastX" :cy="fxView.lastY" r="5" fill="var(--bg)" stroke="var(--acc)" stroke-width="2.5" />
          <text :x="fxView.P" :y="fxView.H - 5">{{ fxView.first }}</text><text :x="fxView.Wd - 12" :y="fxView.H - 5" text-anchor="end">{{ fxView.end }}</text>
        </svg>
        <div class="ph-home-fxs">
          <span><small>{{ t("home.low") }}</small><b class="ph-amt">{{ fxView.mn.toFixed(3) }}</b></span>
          <span><small>{{ t("home.average") }}</small><b class="ph-amt">{{ fxView.av.toFixed(3) }}</b></span>
          <span><small>{{ t("home.high") }}</small><b class="ph-amt">{{ fxView.mx.toFixed(3) }}</b></span>
          <span><small>{{ t("home.vsRange") }}</small><b class="ph-amt">{{ fxView.last.toFixed(3) }}</b><i class="ph-home-range"><i :style="{ insetInlineStart: fxView.pos.toFixed(1) + '%' }" /></i></span>
        </div>
        <p class="ph-home-fxf">{{ fx.stale ? t("home.fxStaleAt", { date: fx.asOf }) : t("home.fxSource", { date: fx.asOf }) }} {{ t("home.fxUse") }}</p>
      </ListGroup>
    </template>

    <AvailWhy v-if="S" v-model:open="avail" :M="M" />
  </PhoneScreen>
</template>
