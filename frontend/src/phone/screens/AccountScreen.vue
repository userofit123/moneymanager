<script setup>
// One account (pushed on Accounts, /accounts?id=<id>): its balance large (a card: what it was charged this month), how it is
// read and when, Add a transaction and Update balance, the chart (tap or slide along it to see each month), the summary
// numbers, the account's details, the balance updates typed by hand, and its own activity with a search.
// ⋯ holds Update balance, Edit, Connection settings, Show in Activity and Remove (each only where the computer offers it).
// Everything comes from pagelogic/accounts.js, the same as the computer's account page.
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { data } from "../../stores/data.js";
import { now, dayOf } from "../../core/clock.js";
import { openForm } from "../../core/forms.js";
import { goActivity } from "../../core/shell.js";
import { ask } from "../../core/ask.js";
import { explain } from "../../core/tooltip.js";
import { openSettingsTab } from "../../views/settings/tab.js";
import { catColor, catLabel } from "../../core/cats.js";
import { tx } from "../../core/heText.js";
import { brandIcon } from "../../brands.js";
import { dcell } from "../../dates.js";
import { f0, fm } from "../../format.js";
import { kinds, displayName } from "../../lib/activity.js";
import { amtText, SYM } from "../../lib/txrows.js";
import { accByName } from "../../lib/accounts.js";
import { useAccounts } from "../../pagelogic/accounts.js";
import { usePhoneNav } from "../navigation.js";
import LineChart from "../../components/charts/LineChart.vue";
import PhoneScreen from "../components/PhoneScreen.vue";
import IconButton from "../components/IconButton.vue";
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
import StatTile from "../components/StatTile.vue";
import SearchField from "../components/SearchField.vue";
import EmptyState from "../components/EmptyState.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import ActionSheet from "../components/ActionSheet.vue";
import PIcon from "../components/PIcon.vue";

const props = defineProps({ id: { type: String, default: null } });
const nav = usePhoneNav();
// the account this screen shows: its name (accounts with several currencies share one), when it is not hidden
const raw = computed(() => (data.state.value?.accounts || []).find((x) => String(x.id) === props.id) || null);
const sel = computed(() => (raw.value && accByName(data.state.value, raw.value.n).length ? raw.value.n : null));
// a balance update row opens that account's screen
const openAcc = (n) => { const a = (data.state.value?.accounts || []).find((x) => x.n == n && !x.hide); if (a && String(a.id) !== props.id) nav.push("account", String(a.id)); };
const { t, tk, S, an, stLabel, whenT, D, all, vis, shown, q, openRow, addTx, delAsk, del } = useAccounts(sel, { openAcc });
onMounted(() => data.start());
const P = (k, o, n) => t("phone.accounts." + k, o || {}, n);
watch(sel, () => { shown.value = 50; q.value = ""; });
// removed while open: back to the list
watch(sel, (n, was) => { if (!n && was) nav.back(); });

const TONE = { green: "pos", yellow: "warn", red: "neg", gray: "" };
// the large amount: the first summary number (the balance, or a card's charges this month); the rest go in the tiles
const lead = computed(() => D.value.tiles[0]);
// the tiles come in pairs: "Latest transaction" (a date, not an amount) goes to the top of the details instead
const tiles = computed(() => D.value.tiles.slice(1).filter((x) => x[0] != "tLatest"));
const details = computed(() => [...D.value.tiles.filter((x) => x[0] == "tLatest").map((x) => [x[0], x[1]]), ...D.value.rows]);
// the account's own short description (like "Current account"), when it says more than its type
const desc = computed(() => { const d = an(D.value.a.s || ""); return d && d.toLowerCase() != String(D.value.lbl).toLowerCase() ? d : ""; });
// money in is green; money out is plain (spending is normal), red only for a total below zero; nothing (₪0) is plain
const tileTone = (x) => (/^[−-]?₪0$/.test(x[1]) ? "" : x[3] == "pos" ? "pos" : x[3] == "neg" && !/Out/.test(x[0]) ? "neg" : "");
const name = computed(() => an(D.value.a.n.replace(/\s*··\s*\S+$/, "")));

// what each action does, as on the computer: custom accounts are updated, edited and removed by hand, a pension's balance
// is updated in its own window, a connected account is set up in Settings → Connections
const updBal = computed(() => (D.value.a.custom ? () => openForm("balance", { id: D.value.a.id }) : D.value.a.kind == "pension" ? () => openForm("pension") : null));
const askDel = () => ask(t("acc.remove"), t("acc.f.delQ"), () => { delAsk.value = D.value.a.id; del(); }, { danger: true });
const ICON = {
  bal: '<path d="M4 19h16M7 15V9M12 15V5M17 15v-3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
  conn: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  act: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  del: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
};
const more = ref(false);
const actions = computed(() => {
  const d = D.value; if (!d) return [];
  return [
    ...(updBal.value ? [{ label: t("acc.updBal"), icon: ICON.bal, run: updBal.value }] : []),
    ...(d.a.custom ? [{ label: t("acc.edit"), icon: ICON.edit, run: () => openForm("account", { id: d.a.id }) }] : []),
    ...(d.conn && d.conn.configured ? [{ label: P("connSettings"), icon: ICON.conn, run: () => openSettingsTab("conn") }] : []),
    { label: P("showAct"), icon: ICON.act, run: () => goActivity({ src: d.name }) },
    ...(d.a.custom ? [{ label: t("acc.remove"), icon: ICON.del, danger: true, run: askDel }] : []),
  ];
});

// the chart fills its group: LineChart takes away 48px for the computer's card padding, so it is given them back
const chartBox = ref(null), cw = ref(0);
let ro = null;
const measure = () => { cw.value = chartBox.value?.clientWidth || 0; };
watch(chartBox, (el) => { ro?.disconnect(); if (el && typeof ResizeObserver != "undefined") { ro = new ResizeObserver(measure); ro.observe(el); } measure(); });
onBeforeUnmount(() => ro?.disconnect());

// a tooltip's text (a detail's explanation), opened by a tap

// the account's activity rows: the first letter in the category's colour, the name, the date and category, the amount
const K = computed(() => kinds(S.value, dayOf(now.value)));
const rowName = (x) => (x.virtual ? tx(displayName(S.value, x)) : displayName(S.value, x));
const avStyle = (x) => { const c = catColor(S.value, x.c || "Uncategorized"); return { background: `color-mix(in srgb,${c} 22%,transparent)`, color: c }; };
const isPos = (x) => x.a > 0 && !K.value.isXf(x);
const iso = (s) => "⁦" + s + "⁩"; // a date keeps its order inside a Hebrew sentence
</script>

<template>
  <PhoneScreen :large="false" class="ph-acc">
    <template #actions>
      <IconButton v-if="D" :label="P('more')" icon-name="more" @tap="more = true" />
    </template>

    <SkeletonRows v-if="!S" :rows="4" />
    <EmptyState v-else-if="!D" icon-name="search" :title="P('gone')" :text="P('goneSub')" />

    <template v-else>
      <header class="ph-acc-hero">
        <span class="ph-acc-logo big" v-html="brandIcon(D.name, D.a.src, D.a.kind, D.a.ck)" />
        <h1 class="ph-acc-name">{{ name }}</h1>
        <p class="ph-acc-type">{{ D.lbl }}</p>
        <p v-if="desc" class="ph-acc-type">{{ desc }}</p>
        <b class="ph-acc-amt" :class="lead[3] == 'neg' ? 'neg' : ''" dir="ltr">{{ lead[1] }}</b>
        <p class="ph-acc-under">{{ D.card ? t("acc.chargedMonth") : tk("acc." + lead[0]) }}</p>
        <p v-if="lead[2]" class="ph-acc-under small">{{ lead[2] }}</p>
        <span class="ph-acc-st pill" :class="TONE[D.st.tone]">{{ stLabel(D.st) }}</span>
        <div class="ph-acc-btns">
          <button type="button" class="ph-btn" @click="addTx">{{ P("addTx") }}</button>
          <button v-if="updBal" type="button" class="ph-btn tonal" @click="updBal()">{{ t("acc.updBal") }}</button>
        </div>
      </header>

      <section v-if="D.chart" class="ph-group ph-acc-chart">
        <div class="ph-group-h"><h3>{{ tk("acc." + D.chart.t) }}</h3><span class="ph-acc-gsub">{{ tk("acc." + D.chart.sub, { n: D.chart.n }) }}</span></div>
        <div ref="chartBox" class="ph-group-b ph-acc-cb">
          <p v-if="D.chart.note" class="ph-acc-cnote">{{ tk("acc." + D.chart.note) }}</p>
          <LineChart v-if="cw" :key="D.name + D.chart.t" :vals="D.chart.vals" :labels="D.chart.labels" :full="D.chart.full" :color="D.chart.color" :box="cw - 24 + 48" gid="phaccg" scrub />
        </div>
        <p class="ph-group-n">{{ D.chart.full ? P("chartHint") : P("chartHintUpd") }}</p>
      </section>

      <section class="ph-group">
        <div class="ph-group-h"><h3>{{ P("summary") }}</h3></div>
        <div class="ph-stats ph-acc-tiles">
          <StatTile v-for="x in tiles" :key="x[0]" :label="tk('acc.' + x[0])" :value="x[1]" :note="x[2]" :tone="tileTone(x)" />
        </div>
      </section>

      <ListGroup :title="t('acc.details')" :note="t('acc.detailsX')">
        <ListRow v-for="r in details" :key="r[0] + r[1]" :class="{ 'ph-acc-tipr': r[2] }" @tap="r[2] && explain(r[2])">
          <template #title>{{ tk("acc." + r[0]) }}<PIcon v-if="r[2]" class="ph-acc-i" name="info" /></template>
          <template #end><span class="ph-row-v ph-acc-v">{{ r[1] }}</span></template>
        </ListRow>
      </ListGroup>

      <ListGroup v-if="D.upd.length" :title="t('acc.balHist')" :note="t('acc.histX')">
        <ListRow v-for="u in D.upd" :key="u.id" :title="u.old == null ? t('acc.setTo', { amount: fm(u.nu) }) : t('acc.changed', { a: fm(u.old), b: fm(u.nu) })" :sub="[u.note, whenT(u.at)].filter(Boolean).join(', ')" />
      </ListGroup>

      <section class="ph-group ph-acc-act">
        <div class="ph-group-h"><h3>{{ t("acc.activity") }}</h3><button type="button" class="ph-link" @click="goActivity({ src: D.name })">{{ P("showAct") }}</button></div>
        <SearchField v-model="q" :placeholder="t('acc.search')" />
        <div class="ph-group-b">
          <button v-for="x in vis" :key="x.id" type="button" class="ph-row ph-two ph-acc-tx" :class="{ fut: K.isFut(x) }" :disabled="x.virtual" @click="openRow(x)">
            <span class="ph-row-lead"><span class="ph-acc-av" :style="avStyle(x)" aria-hidden="true">{{ (rowName(x) || "?")[0] }}</span></span>
            <span class="ph-row-main">
              <span class="ph-row-t">{{ rowName(x) }}</span>
              <span class="ph-row-s"><span>{{ iso(dcell(x.d)) }}</span><span>{{ catLabel(x.c) }}</span></span>
            </span>
            <span class="ph-row-end ph-acc-txe">
              <span class="ph-amt" :class="{ pos: isPos(x) }" dir="ltr">{{ amtText(x) }}</span>
              <small v-if="x.orig" dir="ltr">{{ SYM[x.orig.cur] }}{{ f0(x.orig.amt) }} {{ x.orig.cur }}</small>
            </span>
          </button>
          <p v-if="!vis.length" class="ph-acc-none">{{ t(q ? "acc.noMatch" : "acc.noTx") }}</p>
        </div>
        <div v-if="all.length > shown" class="ph-acc-morebox">
          <button type="button" class="ph-btn tonal" @click="shown += 50">{{ t("acc.more", { n: Math.min(50, all.length - shown) }) }}</button>
          <span>{{ t("acc.shown", { a: shown, b: all.length }) }}</span>
        </div>
      </section>
    </template>

    <ActionSheet v-model:open="more" :title="D ? name : ''" :actions="actions" />
  </PhoneScreen>
</template>
