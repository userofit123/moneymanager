<script setup>
// One category or tag (pushed on Categories and tags, /categories?cat=cats:Food or cat=tags:trip): the computer's open row
// on its own screen. On top the same row as in the list (letter tile, name, ⋯ and the numbers of the columns shown), then
// the latest transactions, month by month (a tap picks a month and says what went out and came in; the button opens it in
// Activity), and See all in Activity / Go to Budgets. ⋯ holds Rename or merge and Delete, as on the computer.
// Everything comes from pagelogic/categories.js, the same as the computer's page.
import { ref, computed, watch, onMounted } from "vue";
import { useCategories } from "../../pagelogic/categories.js";
import { data } from "../../stores/data.js";
import { usePhoneNav } from "../navigation.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import EmptyState from "../components/EmptyState.vue";
import PhoneSheet from "../components/PhoneSheet.vue";
import ActionSheet from "../components/ActionSheet.vue";
import CatRow from "./CatRow.vue";

const props = defineProps({ id: { type: String, default: null } });
const {
  t, goRules, nM, monthName, signed, change, bars, txName, openEntry, colHead, colsOf, setBudget,
  ren, renName, renIn, renOpen, renGo, catDel, tagDel, LISTS, go, fm, dcell, moneyCell, catLabel,
} = useCategories();
const nav = usePhoneNav();
onMounted(() => data.start());
const P = (k, o, n) => t("phone.cats." + k, o || {}, n);
const fx = { t, colHead, change, moneyCell, signed, fm, dcell };

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

// month by month: the month picked (the last one at first) and what went out and came in that month
const B = computed(() => (row.value ? bars(row.value) : []));
const pickedM = ref(-1);
const at = computed(() => (pickedM.value >= 0 && pickedM.value < B.value.length ? pickedM.value : B.value.length - 1));
watch(nM, () => { pickedM.value = -1; });
const atOut = computed(() => row.value?.outM[at.value] || 0), atIn = computed(() => row.value?.inM[at.value] || 0);

// ⋯: rename (a name that exists merges) and delete
const more = ref(false);
const ICON = { edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>', del: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>' };
const actions = computed(() => [
  { label: t("cats.menu.rename"), icon: ICON.edit, run: () => renOpen(L.value.kind, key.value) },
  { label: t("cats.menu.del"), icon: ICON.del, danger: true, run: () => (tab.value === "tags" ? tagDel(key.value) : catDel(key.value)) },
]);
const renOn = computed({ get: () => !!ren.value, set: (v) => { if (!v) ren.value = null; } });
const budget = (r) => (r.budget ? go("/budgets") : setBudget(r));
</script>

<template>
  <PhoneScreen :large="false" :title="tab === 'tags' ? P('tag') : ''" class="ph-cat">
    <SkeletonRows v-if="!L" :rows="5" />
    <EmptyState v-else-if="!row" icon-name="search" :title="P('gone')" :text="P('goneSub')" />

    <template v-else>
      <CatRow class="ph-cat-top" :r="row" :L="L" :cols="colsOf(tab)" :fx="fx" @more="more = true" @budget="budget(row)" @rules="goRules(L.rules)" />

      <!-- the latest transactions -->
      <ListGroup :title="t('cats.open.recent')">
        <ListRow v-for="x in row.recent" :key="x.id" class="ph-cat-tx" :title="txName(x)" :sub="dcell(x.d)" :link="!x.virtual" :disabled="x.virtual" @tap="openEntry(x)">
          <template #end><span class="ph-amt" :class="{ pos: x.a > 0 }" dir="ltr">{{ fm(x.a) }}</span></template>
        </ListRow>
        <p v-if="!row.recent.length" class="ph-cats-none">{{ t("cats.open.noTx") }}</p>
      </ListGroup>

      <!-- month by month -->
      <section class="ph-group ph-cat-months">
        <div class="ph-group-h"><h3>{{ t("cats.open.byMonth") }}</h3></div>
        <div class="ph-group-b pad ph-cat-card" :style="{ '--mc': L.color(row.k) }">
          <div class="ph-cat-read">
            <b>{{ monthName(B[at].m, { month: "long", year: "numeric" }) }}</b>
            <span><span class="ph-amt" dir="ltr">{{ P("monthOut", { amount: fm(atOut) }) }}</span><span v-if="atIn >= 1" class="ph-amt pos" dir="ltr">{{ P("monthIn", { amount: fm(atIn) }) }}</span></span>
          </div>
          <div class="ph-cat-bars" dir="ltr" role="radiogroup" :aria-label="t('cats.open.byMonth')">
            <button v-for="(b, i) in B" :key="b.m" type="button" class="ph-cat-bar" :class="{ on: i === at }" :style="{ '--j': i }" role="radio" :aria-checked="i === at" :aria-label="b.tip" @click="pickedM = i">
              <span class="ph-cat-bw"><i :style="{ blockSize: Math.max(b.h, 2) + '%' }" /></span><small>{{ b.label }}</small>
            </button>
          </div>
          <button type="button" class="ph-btn plain block ph-cat-go" @click="L.act(row.k, B[at].m)">{{ P("seeMonth", { month: monthName(B[at].m, { month: "long" }) }) }}</button>
        </div>
      </section>

      <!-- the ways on, as under the computer's open row -->
      <div class="ph-cat-acts">
        <button type="button" class="ph-btn plain" @click="L.act(row.k)">{{ t("cats.open.seeAll") }}</button>
        <button v-if="row.budget" type="button" class="ph-btn plain" @click="go('/budgets')">{{ t("cats.open.budgets") }}</button>
      </div>
    </template>

    <ActionSheet v-model:open="more" :title="row ? L.name(row.k) : ''" :actions="actions" />

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
