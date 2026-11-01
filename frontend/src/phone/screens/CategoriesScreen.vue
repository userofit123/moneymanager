<script setup>
// Categories and tags (in More): what the money went on, per category and per tag. It opens with one sentence (how much
// went out in the months looked at), then the money out, in and the difference, the months to look at (3, 6 or 12), a search
// and the order, and the list. A row opens its own screen (CategoryScreen). + adds a category or a tag.
// Every number comes from pagelogic/categories.js, the same as the computer's Categories and tags page.
import { ref, computed, onMounted } from "vue";
import { useCategories } from "../../pagelogic/categories.js";
import { data } from "../../stores/data.js";
import { usePhoneNav } from "../navigation.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import IconButton from "../components/IconButton.vue";
import HeroSentence from "../components/HeroSentence.vue";
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
import Segmented from "../components/Segmented.vue";
import SearchField from "../components/SearchField.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import EmptyState from "../components/EmptyState.vue";
import PhoneSheet from "../components/PhoneSheet.vue";
import PickerSheet from "../components/PickerSheet.vue";
import PIcon from "../components/PIcon.vue";
import LoadError from "../components/LoadError.vue";
defineProps({ id: { type: String, default: null } });

const {
  t, S, setTab, goRules, months, MONTHS, MLABEL, nM, periodWords, signed, change, colHead, sorts, sorted, CAT_COLS,
  noCats, newCat, catAdd, newTag, tagAdd, LISTS, catTab, searches, moneyCell, totalCell, fm,
} = useCategories();
const nav = usePhoneNav();
onMounted(() => data.start());
const P = (k, o, n) => t("phone.cats." + k, o || {}, n);

const tabs = computed(() => ["cats", "tags"].map((k) => ({ value: k, label: t("cats.tabs." + k) })));
const tab = computed({ get: () => catTab.value, set: setTab });
const L = computed(() => LISTS.value?.[tab.value] || null);
const periods = computed(() => MONTHS.map((n) => ({ value: String(n), label: t(MLABEL[n]) })));
const period = computed({ get: () => String(nM.value), set: (v) => { months.value = v; } });

// the sentence at the top: the money out in the months looked at (for a list with only money in: the money in)
const hero = computed(() => {
  const T = L.value.L.totals, key = T.out >= 1 ? (tab.value === "tags" ? "heroTags" : "heroOut") : T.in >= 1 ? "heroIn" : "heroNone";
  const [a, b = ""] = P(key, { amount: "\u0000", n: nM.value }).split("\u0000");
  return key === "heroNone" ? [{ text: a }] : [{ text: a }, { amount: fm(T.out >= 1 ? T.out : T.in) }, { text: b }];
});
const totals = computed(() => ["out", "in", "net"].map((c) => ({ c, label: t("cats.tot." + c), ...totalCell(L.value.L.totals, c) })));

// the search (kept with the computer's search boxes) and the order
const q = computed({ get: () => searches[tab.value] || "", set: (v) => { searches[tab.value] = v; } });
const rows = computed(() => {
  const s = q.value.trim().toLowerCase(), all = sorted(tab.value, true);
  return s ? all.filter((r) => L.value.name(r.k).toLowerCase().includes(s) || String(r.k).toLowerCase().includes(s)) : all;
});
const empty = computed(() => (tab.value === "cats" ? noCats.value : !L.value.L.rows.length));
const sortOpen = ref(false);
// the order: the list's own, by name, or the largest (the newest date) first by any of the numbers a category shows
// (the computer picks which columns its table shows; the phone shows them all on the category's screen, so it can sort by each)
const sortOpts = computed(() => [{ value: "", label: P("sortUsual") }, { value: "name", label: L.value.head }, ...CAT_COLS.filter((c) => !(tab.value === "tags" && c === "budget")).map((c) => ({ value: c, label: colHead(c) }))]);
const sortNow = computed(() => sorts.value[tab.value]?.key || "");
const sortName = computed(() => sortOpts.value.find((o) => o.value === sortNow.value)?.label || P("sortUsual"));
const pickSort = (v) => { sorts.value[tab.value] = v ? { key: v, ord: v === "name" ? "asc" : "desc" } : null; };

// one row: the amount of the months looked at, and its change against the months before
const mainCell = (r) => moneyCell(r, r.main === "in" ? "in" : "out");
// the tile shows the first letter of the name as it reads (in Hebrew too); tags show #
const letter = (k) => (tab.value === "tags" ? "#" : (Array.from(L.value.name(k))[0] || "?").toUpperCase());
const open = (r) => nav.push("category", tab.value + ":" + r.k);

// add a category or a tag
const addOpen = ref(false), addIn = ref(null);
const addName = computed({ get: () => (tab.value === "cats" ? newCat.value : newTag.value), set: (v) => { if (tab.value === "cats") newCat.value = v; else newTag.value = v; } });
const startAdd = () => { addOpen.value = true; setTimeout(() => addIn.value?.focus(), 320); };
function add() {
  if (tab.value === "cats") catAdd(); else tagAdd();
  if (!addName.value) addOpen.value = false; // added: the box was emptied
}

const TAG = '<path d="M3 12V4h8l10 10-8 8z"/><path d="M7.5 8h.01"/>';
const RULES = '<path d="M4 6h16M4 12h10M4 18h6"/><path d="M17 15l3 3-3 3"/>';
const AI = '<path d="M12 3l1.8 4.6L18.5 9.5l-4.7 1.9L12 16l-1.8-4.6L5.5 9.5l4.7-1.9z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>';
</script>

<template>
  <PhoneScreen class="ph-cats">
    <template #actions>
      <IconButton :label="tab === 'cats' ? P('addCat') : P('addTag')" icon-name="add" @tap="startAdd" />
    </template>
    <template #head>
      <div class="ph-cats-head"><Segmented v-model="tab" :options="tabs" :label="t('nav.categories')" /></div>
    </template>

    <LoadError v-if="data.error.value && !S" :text="t('home.loadError')" />
    <SkeletonRows v-else-if="!L" :rows="6" />

    <template v-else>
      <EmptyState v-if="empty" :icon="TAG" :title="tab === 'cats' ? t('cats.c.none') : t('cats.g.none')" :text="tab === 'tags' ? t('cats.g.appear') : t('cats.ai.text')" :action="tab === 'cats' ? P('addCat') : P('addTag')" @action="startAdd" />

      <template v-else>
        <HeroSentence :parts="hero" />
        <p class="ph-cats-when">{{ P("period", periodWords) }}</p>

        <ListGroup>
          <ListRow v-for="x in totals" :key="x.c" :title="x.label">
            <template #end><span class="ph-amt" :class="x.cls" dir="ltr">{{ signed(x.v) }}</span></template>
          </ListRow>
        </ListGroup>

        <Segmented v-model="period" :options="periods" :label="t('cats.period.label')" />

        <div class="ph-cats-tools">
          <SearchField v-model="q" :placeholder="t(tab === 'cats' ? 'cats.search.cats' : 'cats.search.tags')" />
          <div class="ph-chips">
            <span class="ph-chip" :class="{ on: !!sortNow }"><button type="button" class="ph-chip-b" :aria-label="P('sortTitle') + ': ' + sortName" @click="sortOpen = true"><PIcon name="filter" />{{ sortName }}<PIcon name="chevron" class="ph-cats-down" /></button></span>
          </div>
        </div>

        <ListGroup>
          <ListRow v-for="r in rows" :key="r.k" class="ph-cats-row" :class="{ zero: !r.n }" link @tap="open(r)">
            <template #title><bdi>{{ L.name(r.k) }}</bdi></template>
            <template #lead><span class="ph-cats-mic" :style="{ '--mc': L.color(r.k) }" aria-hidden="true">{{ letter(r.k) }}</span></template>
            <template #sub>
              <span v-if="change(r).text" class="ph-cats-chg" :class="change(r).cls">
                <svg v-if="change(r).cls === 'good' || change(r).cls === 'bad'" viewBox="0 0 24 24" aria-hidden="true" :class="{ dn: !change(r).up }"><path d="M12 19V5M6 11l6-6 6 6" /></svg>{{ change(r).text }}
              </span>
              <span>{{ t("activity.count", { n: r.n }, r.n) }}</span>
            </template>
            <template #end><span class="ph-amt" :class="mainCell(r).cls" dir="ltr">{{ signed(mainCell(r).v) }}</span></template>
          </ListRow>
          <p v-if="!rows.length" class="ph-cats-none">{{ t("cats.search.none", { q }) }}</p>
        </ListGroup>
      </template>

      <ListGroup :title="P('sorting')" :note="P('sortingNote')">
        <ListRow :title="t(tab === 'cats' ? 'cats.c.goRules' : 'cats.g.goRules')" :icon="RULES" link @tap="goRules(L.rules)" />
        <ListRow :title="P('aiTitle')" :sub="t('cats.ai.text')" :icon="AI" link @tap="goRules('ai')" />
      </ListGroup>
    </template>

    <PickerSheet v-if="L" v-model:open="sortOpen" required :title="P('sortTitle')" :options="sortOpts" :model-value="sortNow" @update:model-value="pickSort" />

    <PhoneSheet v-model:open="addOpen" :title="tab === 'cats' ? P('addCat') : P('addTag')">
      <p class="ph-cats-p">{{ tab === "cats" ? P("addCatText") : P("addTagText") }}</p>
      <div class="fld">
        <label for="ph-cats-new">{{ tab === "cats" ? t("cats.search.newCat") : t("cats.search.newTag") }}</label>
        <input id="ph-cats-new" ref="addIn" v-model="addName" maxlength="60" autocomplete="off" enterkeyhint="done" @keydown.enter.prevent="add">
      </div>
      <template #foot><button type="button" class="ph-btn" @click="add">{{ P("add") }}</button></template>
    </PhoneSheet>
  </PhoneScreen>
</template>
