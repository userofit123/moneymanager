<script setup>
// Categories and tags (in More), built from the computer's page: the Categories / Tags switch, the months to look at
// (3, 6 or 12), the search and the box to add one, then the card with its title, count and line, the money out, in and
// the difference, the sort by any column shown (and which columns), one row per category or tag with the computer's
// numbers (CatRow), and the way to the rules. A row opens its own screen (CategoryScreen), the computer's open row.
// Every number comes from pagelogic/categories.js, the same as the computer's Categories and tags page.
import { ref, computed, onMounted } from "vue";
import { useCategories } from "../../pagelogic/categories.js";
import { data } from "../../stores/data.js";
import { SI } from "../../views/settings/icons.js";
import { usePhoneNav } from "../navigation.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import Segmented from "../components/Segmented.vue";
import SearchField from "../components/SearchField.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import PhoneSheet from "../components/PhoneSheet.vue";
import ActionSheet from "../components/ActionSheet.vue";
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
import LoadError from "../components/LoadError.vue";
import CatRow from "./CatRow.vue";
defineProps({ id: { type: String, default: null } });

const C = useCategories();
const {
  t, S, setTab, TABS, goRules, months, MONTHS, MLABEL, nM, periodWords, signed, change, colHead, sortBy, sorted, sortIs,
  cols, flipCol, colsOf, CAT_COLS, setBudget, noCats, newCat, catAdd, newTag, tagAdd, LISTS, catTab, searches, go,
  moneyCell, totalCell, fm, dcell, renOpen, ren, renName, renIn, renGo, catDel, tagDel,
} = C;
const nav = usePhoneNav();
onMounted(() => data.start());
const P = (k, o, n) => t("phone.cats." + k, o || {}, n);
const fx = { t, colHead, change, moneyCell, signed, fm, dcell };

const tab = computed(() => catTab.value);
const L = computed(() => LISTS.value?.[tab.value] || null);
const periods = computed(() => MONTHS.map((n) => ({ value: String(n), label: t(MLABEL[n]) })));
const period = computed({ get: () => String(nM.value), set: (v) => { months.value = v; } });
const totals = computed(() => ["out", "in", "net"].map((c) => ({ c, label: t("cats.tot." + c), ...totalCell(L.value.L.totals, c) })));

// the search (kept with the computer's search boxes): rows whose name has the words typed
const q = computed({ get: () => searches[tab.value] || "", set: (v) => { searches[tab.value] = v; } });
const rows = computed(() => {
  const s = q.value.trim().toLowerCase(), all = sorted(tab.value);
  return s ? all.filter((r) => L.value.name(r.k).toLowerCase().includes(s) || String(r.k).toLowerCase().includes(s)) : all;
});
const empty = computed(() => (tab.value === "cats" ? noCats.value : !L.value.L.rows.length));

// add a category or a tag (the box empties when it was added)
const addName = computed({ get: () => (tab.value === "cats" ? newCat.value : newTag.value), set: (v) => { if (tab.value === "cats") newCat.value = v; else newTag.value = v; } });
const add = () => (tab.value === "cats" ? catAdd() : tagAdd());

// the column titles as sort buttons (small to large, large to small, the usual order) and which columns are shown
const sortKeys = computed(() => [{ k: "name", label: L.value.head }, ...colsOf(tab.value).map((c) => ({ k: c, label: colHead(c) }))]);
const colsOpen = ref(false);

// a row's ⋯: rename (a name that exists merges) and delete
const menuOf = ref(null);
const ICON = { edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>', del: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>' };
const actions = computed(() => (menuOf.value ? [
  { label: t("cats.menu.rename"), icon: ICON.edit, run: () => renOpen(L.value.kind, menuOf.value) },
  { label: t("cats.menu.del"), icon: ICON.del, danger: true, run: () => (tab.value === "tags" ? tagDel(menuOf.value) : catDel(menuOf.value)) },
] : []));
const moreOpen = computed({ get: () => !!menuOf.value, set: (v) => { if (!v) menuOf.value = null; } });
const renOn = computed({ get: () => !!ren.value, set: (v) => { if (!v) ren.value = null; } });

const open = (r) => nav.push("category", tab.value + ":" + r.k);
const budget = (r) => (r.budget ? go("/budgets") : setBudget(r));
</script>

<template>
  <PhoneScreen class="ph-cats">
    <template #head>
      <!-- Categories / Tags, with the computer's icons -->
      <div class="ph-cats-head">
        <div class="ph-segwrap"><div class="seg ph-seg ph-cats-tabs" role="tablist" :aria-label="t('nav.categories')">
          <button v-for="[k, ic] in TABS" :key="k" type="button" role="tab" :aria-selected="tab === k" :class="{ on: tab === k }" @click="setTab(k)"><svg viewBox="0 0 24 24" aria-hidden="true" v-html="ic" />{{ t("cats.tabs." + k) }}</button>
        </div></div>
      </div>
    </template>

    <LoadError v-if="data.error.value && !S" :text="t('home.loadError')" />
    <SkeletonRows v-else-if="!L" :rows="6" />

    <template v-else>
      <Segmented v-model="period" :options="periods" :label="t('cats.period.label')" />

      <!-- the search, and the box to add a category (a tag) -->
      <div :key="'tools-' + tab" class="ph-cats-tools">
        <SearchField v-model="q" :placeholder="t(tab === 'cats' ? 'cats.search.cats' : 'cats.search.tags')" />
        <div class="ph-cats-add">
          <input v-model="addName" class="ph-cats-new" :placeholder="t(tab === 'cats' ? 'cats.search.newCat' : 'cats.search.newTag')" :aria-label="t(tab === 'cats' ? 'cats.search.newCat' : 'cats.search.newTag')" maxlength="60" autocomplete="off" enterkeyhint="done" @keydown.enter.prevent="add">
          <button type="button" class="ph-btn ph-cats-addb" @click="add">{{ t(tab === "cats" ? "cats.search.addCat" : "cats.search.addTag") }}</button>
        </div>
      </div>

      <!-- the card: title, count, line and totals, then the rows -->
      <section :key="'card-' + tab" class="ph-card ph-cats-card">
        <div class="ph-cats-ch">
          <span class="ph-cats-ci"><svg viewBox="0 0 24 24" aria-hidden="true" v-html="SI.tag" /></span>
          <div class="ph-cats-ct">
            <b>{{ t(tab === "cats" ? "cats.c.title" : "cats.g.title") }}<span class="ph-cats-cnt">{{ L.L.rows.length }}</span></b>
            <p>{{ P(tab === "cats" ? "descCats" : "descTags", periodWords) }}</p>
          </div>
        </div>
        <div class="ph-cats-tot">
          <div v-for="x in totals" :key="x.c"><span>{{ x.label }}</span><b class="ph-amt" :class="x.cls" dir="ltr">{{ signed(x.v) }}</b></div>
        </div>

        <div v-if="empty" class="ph-cats-empty">
          <p>{{ tab === "cats" ? t("cats.c.none") : t("cats.g.none") }}</p>
          <p v-if="tab === 'tags'">{{ t("cats.g.appear") }}</p>
          <p>{{ t("cats.ai.text") }}</p>
          <button type="button" class="ph-btn plain" @click="goRules('ai')">{{ t("cats.ai.go") }}</button>
        </div>

        <template v-if="L.L.rows.length">
          <!-- sort by a column (the computer's column titles), and which columns are shown -->
          <div class="ph-cats-sorts" role="group" :aria-label="P('sortBy')">
            <div class="ph-cats-sl"><button v-for="s in sortKeys" :key="s.k" type="button" class="ph-cats-sb" :class="sortIs(tab, s.k)" @click="sortBy(tab, s.k)">{{ s.label }}<svg viewBox="0 0 24 24" aria-hidden="true"><path class="su" d="M8 9.5l4-4 4 4" /><path class="sd" d="M8 14.5l4 4 4-4" /></svg></button></div>
            <button type="button" class="ph-cats-cols" :aria-label="t('cats.cols.aria')" @click="colsOpen = true"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M10 5v14M15 5v14" /></svg></button>
          </div>
          <div class="ph-cats-list">
            <CatRow v-for="(r, i) in rows" :key="r.k" :r="r" :L="L" :cols="colsOf(tab)" :fx="fx" :i="i" tap @open="open(r)" @more="menuOf = r.k" @budget="budget(r)" @rules="goRules(L.rules)" />
          </div>
          <p v-if="!rows.length" class="ph-cats-none">{{ t("cats.search.none", { q }) }}</p>
        </template>

        <div class="ph-cats-rules"><p>{{ t("cats.rulesAt") }}</p><button type="button" class="ph-btn plain" @click="goRules(L.rules)">{{ t(tab === "cats" ? "cats.c.goRules" : "cats.g.goRules") }}</button></div>
      </section>
    </template>

    <ActionSheet v-model:open="moreOpen" :title="menuOf && L ? L.name(menuOf) : ''" :actions="actions" />

    <!-- which columns the list shows -->
    <PhoneSheet v-model:open="colsOpen" :title="t('cats.cols.aria')">
      <ListGroup>
        <ListRow v-for="c in CAT_COLS" :key="c" :title="colHead(c)" :toggle="cols.includes(c)" @update:toggle="flipCol(c)" />
      </ListGroup>
    </PhoneSheet>

    <!-- rename (a name that already exists merges the two) -->
    <PhoneSheet v-model:open="renOn" :title="ren?.kind === 'tag' ? t('cats.g.renTitle') : t('cats.c.renTitle')">
      <template v-if="ren">
        <p class="ph-cats-p">{{ ren.kind === "tag" ? t("cats.g.renText") : t("cats.c.renText") }}</p>
        <div class="fld">
          <label for="ph-cats-ren">{{ t("cats.newName") }}</label>
          <input id="ph-cats-ren" ref="renIn" v-model="renName" :maxlength="ren.kind === 'tag' ? null : 60" autocomplete="off" enterkeyhint="done" @keydown.enter.prevent="renGo">
        </div>
      </template>
      <template #foot><button type="button" class="ph-btn" @click="renGo">{{ t("cats.rename") }}</button></template>
    </PhoneSheet>
  </PhoneScreen>
</template>
