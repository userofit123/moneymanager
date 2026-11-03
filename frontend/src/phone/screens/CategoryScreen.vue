<script setup>
// One category or tag (pushed on Categories and tags, /categories?cat=cats:Food or cat=tags:trip): the money of the months
// looked at set large, with its change against the months before; month by month (a tap picks a month, its transactions open
// in Activity); every number the computer's columns show; and the latest transactions. ⋯ holds Rename or merge, Merge into…
// (categories) and Delete. Everything comes from pagelogic/categories.js, the same as the computer's page.
import { ref, computed, watch, onMounted } from "vue";
import { useCategories } from "../../pagelogic/categories.js";
import { data } from "../../stores/data.js";
import { explain } from "../../core/tooltip.js";
import { usePhoneNav } from "../navigation.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import IconButton from "../components/IconButton.vue";
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
import Segmented from "../components/Segmented.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import EmptyState from "../components/EmptyState.vue";
import PhoneSheet from "../components/PhoneSheet.vue";
import PickerSheet from "../components/PickerSheet.vue";
import ActionSheet from "../components/ActionSheet.vue";

const props = defineProps({ id: { type: String, default: null } });
const {
  t, goRules, months, MONTHS, MLABEL, nM, ST, monthName, signed, change, bars, txName, openEntry, colHead, colTip, CAT_COLS,
  setBudget, names, ren, renName, renIn, renOpen, renGo, catDel, tagDel, LISTS, go, fm, dcell, moneyCell, catLabel,
} = useCategories();
const nav = usePhoneNav();
onMounted(() => data.start());
const P = (k, o, n) => t("phone.cats." + k, o || {}, n);

// which list and which name: "cats:Food". After a rename it follows the new name (the address keeps the old one).
const tab = computed(() => (String(props.id || "").startsWith("tags:") ? "tags" : "cats"));
const key = ref(String(props.id || "").replace(/^(cats|tags):/, ""));
const L = computed(() => LISTS.value?.[tab.value] || null);
const row = computed(() => L.value?.L.rows.find((r) => r.k === key.value) || null);

// renamed or merged: follow it to its new name; deleted: back to the list
let renamedTo = "";
watch(row, (x, was) => {
  if (x || !was) return;
  const n = renamedTo.trim().replace(/^#/, "").toLowerCase(), to = n && L.value.L.rows.find((r) => (tab.value === "tags" ? r.k : catLabel(r.k)).toLowerCase() === n || r.k.toLowerCase() === n);
  renamedTo = "";
  if (to) key.value = to.k; else nav.back();
});
const doRename = () => { renamedTo = renName.value; renGo(); };

// the tile shows the first letter of the name as it reads (in Hebrew too); tags show #
const letter = (k) => (tab.value === "tags" ? "#" : (Array.from(L.value.name(k))[0] || "?").toUpperCase());
const periods = computed(() => MONTHS.map((n) => ({ value: String(n), label: t(MLABEL[n]) })));
const period = computed({ get: () => String(nM.value), set: (v) => { months.value = v; } });
const main = computed(() => (row.value ? moneyCell(row.value, row.value.main === "in" ? "in" : "out") : null));
const chg = computed(() => (row.value ? change(row.value) : null));
// the change said in full under the amount: "₪882 less than the 6 months before"
const chgText = computed(() => {
  const c = chg.value;
  if (c.cls === "good" || c.cls === "bad") return P(c.up ? "chgMore" : "chgLess", { amount: c.text, n: nM.value });
  return c.cls === "same" ? P("chgSame", { n: nM.value }) : c.text;
});

// month by month: the month picked (the last one at first), what went out and came in, and the way to its transactions
const B = computed(() => (row.value ? bars(row.value) : []));
const pickedM = ref(-1);
const at = computed(() => (pickedM.value >= 0 && pickedM.value < B.value.length ? pickedM.value : B.value.length - 1));
watch(nM, () => { pickedM.value = -1; });
const atOut = computed(() => row.value?.outM[at.value] || 0), atIn = computed(() => row.value?.inM[at.value] || 0);

// the numbers the computer's columns show (tags have no budget); a tap explains one
const cols = computed(() => CAT_COLS.filter((c) => !(tab.value === "tags" && c === "budget")));
// split in two: the amounts, then the other facts (how many, the latest, its budget and rules)
const FACTS = ["n", "last", "budget", "rules"];
const groups = computed(() => [
  { key: "money", title: P("numbers"), cols: cols.value.filter((c) => !FACTS.includes(c)), note: P("inPeriod", { n: nM.value }) + ": " + P("period", { from: monthName(ST.value.from, { month: "short", year: "numeric" }), to: monthName(ST.value.to, { month: "short", year: "numeric" }) }) },
  { key: "facts", title: P(tab.value === "tags" ? "aboutTag" : "aboutCat"), cols: cols.value.filter((c) => FACTS.includes(c)), note: "" },
]);
const tapCol = (c) => {
  const r = row.value;
  if (c === "budget") return r.budget ? go("/budgets") : r.canBudget ? setBudget(r) : explain(colTip(c));
  if (c === "rules" && r.rules) return goRules(L.value.rules);
  explain(colTip(c));
};

// ⋯: rename (a name that exists merges), merge into another category, delete
// (merging asks first; the question keeps what it merges, so the rename sheet stays shut)
const more = ref(false), mergeOpen = ref(false);
const editable = computed(() => !!row.value && L.value.edit(row.value.k));
const ICON = { edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>', merge: '<path d="M6 4v5a6 6 0 0 0 6 6h6"/><path d="M15 12l3 3-3 3"/><path d="M6 20v-5"/>', del: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>' };
const actions = computed(() => [
  { label: t("cats.menu.rename"), icon: ICON.edit, run: () => renOpen(L.value.kind, key.value) },
  ...(tab.value === "cats" ? [{ label: P("mergeInto"), icon: ICON.merge, run: () => { mergeOpen.value = true; } }] : []),
  { label: t("cats.menu.del"), icon: ICON.del, danger: true, run: () => (tab.value === "tags" ? tagDel(key.value) : catDel(key.value)) },
]);
const mergeOpts = computed(() => names.value.filter((k) => k !== key.value && k !== "Uncategorized").map((k) => ({ value: k, label: catLabel(k) })));
const mergeTo = (k) => { if (!k) return; ren.value = { kind: "cat", k: key.value }; renName.value = catLabel(k); doRename(); ren.value = null; };
const renOn = computed({ get: () => !!ren.value, set: (v) => { if (!v) ren.value = null; } });
</script>

<template>
  <PhoneScreen :large="false" :title="tab === 'tags' ? P('tag') : ''" class="ph-cat">
    <template #actions>
      <IconButton v-if="editable" :label="P('more')" icon-name="more" @tap="more = true" />
    </template>

    <SkeletonRows v-if="!L" :rows="5" />
    <EmptyState v-else-if="!row" icon-name="search" :title="P('gone')" :text="P('goneSub')" />

    <template v-else>
      <header class="ph-cat-hero">
        <span class="ph-cats-mic big" :style="{ '--mc': L.color(row.k) }" aria-hidden="true">{{ letter(row.k) }}</span>
        <h1 class="ph-cat-name"><bdi>{{ L.name(row.k) }}</bdi></h1>
        <b class="ph-cat-amt" :class="main.cls" dir="ltr">{{ signed(main.v) }}</b>
        <p class="ph-cat-sub">{{ colHead(row.main === "in" ? "in" : "out") }}</p>
        <p v-if="chg.text" class="ph-cats-chg ph-cat-chg" :class="chg.cls">
          <svg v-if="chg.cls === 'good' || chg.cls === 'bad'" viewBox="0 0 24 24" aria-hidden="true" :class="{ dn: !chg.up }"><path d="M12 19V5M6 11l6-6 6 6" /></svg>{{ chgText }}
        </p>
      </header>

      <Segmented v-model="period" :options="periods" :label="t('cats.period.label')" />

      <!-- month by month -->
      <section class="ph-group ph-cat-months">
        <div class="ph-group-h"><h3>{{ P("months") }}</h3></div>
        <div class="ph-group-b ph-cat-card" :style="{ '--mc': L.color(row.k) }">
          <div class="ph-cat-read">
            <b>{{ monthName(B[at].m, { month: "long", year: "numeric" }) }}</b>
            <span><span class="ph-amt" dir="ltr">{{ P("monthOut", { amount: fm(atOut) }) }}</span><span v-if="atIn >= 1" class="ph-amt pos" dir="ltr">{{ P("monthIn", { amount: fm(atIn) }) }}</span></span>
          </div>
          <div class="ph-cat-bars" dir="ltr" role="radiogroup" :aria-label="P('months')">
            <button v-for="(b, i) in B" :key="b.m" type="button" class="ph-cat-bar" :class="{ on: i === at }" role="radio" :aria-checked="i === at" :aria-label="b.tip" @click="pickedM = i">
              <span class="ph-cat-bw"><i :style="{ blockSize: Math.max(b.h, 2) + '%' }" /></span><small>{{ b.label }}</small>
            </button>
          </div>
          <button type="button" class="ph-btn plain block ph-cat-go" @click="L.act(row.k, B[at].m)">{{ P("seeMonth", { month: monthName(B[at].m, { month: "long" }) }) }}</button>
        </div>
      </section>

      <!-- every number the computer's columns show: the amounts, then the other facts -->
      <ListGroup v-for="g in groups" :key="g.key" :title="g.title" :note="g.note">
        <ListRow v-for="c in g.cols" :key="c" :title="colHead(c)" :link="(c === 'budget' && (row.budget || row.canBudget)) || (c === 'rules' && !!row.rules)" @tap="tapCol(c)">
          <template v-if="c === 'budget' && row.budget" #sub>{{ t("cats.bud.used", { amt: fm(row.thisOut) }) }}</template>
          <template #end>
            <span v-if="c === 'change'" class="ph-cats-chg" :class="change(row).cls">
              <svg v-if="change(row).cls === 'good' || change(row).cls === 'bad'" viewBox="0 0 24 24" aria-hidden="true" :class="{ dn: !change(row).up }"><path d="M12 19V5M6 11l6-6 6 6" /></svg>{{ change(row).text }}
            </span>
            <span v-else-if="c === 'budget'" class="ph-row-v">{{ row.budget ? t("cats.bud.amt", { amt: fm(row.budget) }) : row.canBudget ? t("cats.bud.set") : "" }}</span>
            <span v-else-if="c === 'rules'" class="ph-row-v ph-amt">{{ row.rules }}</span>
            <span v-else-if="c === 'last'" class="ph-row-v">{{ row.last ? dcell(row.last) : "" }}</span>
            <span v-else-if="c === 'n'" class="ph-row-v ph-amt">{{ row.n }}</span>
            <span v-else class="ph-amt" :class="moneyCell(row, c).cls" dir="ltr">{{ signed(moneyCell(row, c).v) }}</span>
          </template>
        </ListRow>
      </ListGroup>

      <!-- the latest transactions -->
      <ListGroup :title="t('cats.open.recent')">
        <ListRow v-for="x in row.recent" :key="x.id" class="ph-cat-tx" :title="txName(x)" :sub="dcell(x.d)" :link="!x.virtual" :disabled="x.virtual" @tap="openEntry(x)">
          <template #end><span class="ph-amt" :class="{ pos: x.a > 0 }" dir="ltr">{{ fm(x.a) }}</span></template>
        </ListRow>
        <p v-if="!row.recent.length" class="ph-cats-none">{{ t("cats.open.noTx") }}</p>
        <ListRow :title="t('cats.open.seeAll')" icon-name="search" link @tap="L.act(row.k)" />
        <ListRow v-if="row.budget" :title="t('cats.open.budgets')" icon-name="numbers" link @tap="go('/budgets')" />
      </ListGroup>
    </template>

    <ActionSheet v-model:open="more" :title="row ? L.name(row.k) : ''" :actions="actions" />
    <PickerSheet v-if="tab === 'cats'" v-model:open="mergeOpen" :title="P('mergeTitle', { k: row ? L.name(row.k) : '' })" :options="mergeOpts" :model-value="null" @update:model-value="mergeTo" />

    <!-- rename (a name that already exists merges the two) -->
    <PhoneSheet v-model:open="renOn" :title="ren?.kind === 'tag' ? t('cats.g.renTitle') : t('cats.c.renTitle')">
      <template v-if="ren">
        <p class="ph-cats-p">{{ ren.kind === "tag" ? t("cats.g.renText") : t("cats.c.renText") }}</p>
        <div class="fld">
          <label for="ph-cat-ren">{{ t("cats.newName") }}</label>
          <input id="ph-cat-ren" ref="renIn" v-model="renName" :maxlength="ren.kind === 'tag' ? null : 60" autocomplete="off" enterkeyhint="done" @keydown.enter.prevent="doRename">
        </div>
      </template>
      <template #foot><button type="button" class="ph-btn" @click="doRename">{{ t("cats.rename") }}</button></template>
    </PhoneSheet>

  </PhoneScreen>
</template>
