<script setup>
// Categories and tags: two tabs (categories, tags), each with a search bar.
// The rules that sort entries automatically are in Settings → Automatic sorting.
// The data changes and their history lines come from lib/categories.js.
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { toast } from "../core/toast.js";
import { goActivity } from "../core/shell.js";
import { go } from "../router.js";
import { catNames, catColor, catLabel } from "../core/cats.js";
import { searches, useRowSearch } from "../core/rowSearch.js";
import PageHeader from "../components/PageHeader.vue";
import BaseSheet from "../components/BaseSheet.vue";
import SetHead from "./settings/SetHead.vue";
import { openSettingsTab } from "./settings/tab.js";
import { catTab } from "./categories/state.js";
import * as C from "../lib/categories.js";
import { ask as askYes } from "../core/ask.js";
import "../styles/pages/categories.css"; // this page's own styles

const { t } = useI18n();
const S = computed(() => data.state.value);
onMounted(() => { data.start(); });

// Every change goes through the data store; true when something changed.
const save = (edit) => data.change(edit).length > 0;
const err = (m) => toast(m, { kind: "err" });
const ok = (m, o = {}) => toast(m, { kind: "ok", ...o });

const setTab = (k) => { catTab.value = k; };
const TABS = [
  ["cats", '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'],
  ["tags", '<path d="M3 12V4h8l10 10-8 8z"/><path d="M7.5 8h.01"/>'],
];
// Opens a section of Settings → Automatic sorting (crules: category rules, trules: tag rules).
const goRules = (id) => { openSettingsTab(id); go("/settings"); };

// ---- the search bars: hide the tiles whose words do not contain the search ----
const catBox = ref(null), tagBox = ref(null);
const noneCats = useRowSearch(catBox, "cats"), noneTags = useRowSearch(tagBox, "tags");

// ---- Categories ----
const tiles = computed(() => (S.value ? C.catTiles(S.value) : []));
const names = computed(() => (S.value ? catNames(S.value) : []));
const newCat = ref("");
function catAdd() { if (save((n) => C.addCategory(n, newCat.value))) newCat.value = ""; }
const goCat = (k) => goActivity({ cat: k });
const ren = ref(null), renName = ref(""), renIn = ref(null);
function renOpen(kind, k) { ren.value = { kind, k }; renName.value = kind == "tag" ? k : catLabel(k); setTimeout(() => { renIn.value?.focus(); renIn.value?.select(); }, 60); }
function renGo() {
  const { kind, k } = ren.value;
  if (kind == "tag") return tagRenameGo(k);
  // the box shows the name in the page's language: a name typed the way a category is shown means that category
  const v = renName.value.trim(), shown = names.value.find((x) => catLabel(x).toLowerCase() == v.toLowerCase());
  const c = C.renameCheck(S.value, k, shown || v);
  if (c.err) return err(c.err == "empty" ? t("cats.typeName") : t("cats.c.reserved"));
  if (c.same) { ren.value = null; return; }
  const doIt = () => { save((n) => C.renameCategory(n, k, c.tg)); ren.value = null; ok(t("cats.c.renamed", { n: catLabel(c.tg) })); };
  if (c.ex) askYes(t("cats.c.mergeQ", { ex: catLabel(c.ex), k: catLabel(k) }), "", doIt); else doIt();
}
function catDel(k) { askYes(t("cats.c.delQ", { k: catLabel(k) }), "", () => save((n) => C.deleteCategory(n, k)), { danger: true }); }
// ---- Tags ----
const tagRows = computed(() => (S.value ? C.tagTiles(S.value) : []));
const goTag = (g) => goActivity({ tag: g });
function tagRenameGo(g) {
  const n = C.normTag(S.value, renName.value);
  if (!n) return err(t("cats.typeName"));
  if (n == g) { ren.value = null; return; }
  save((x) => C.renameTag(x, g, n));
  ren.value = null;
  ok(t("cats.g.renamed", { n }));
}
function tagDel(g) { const n = C.tagUses(S.value, g); askYes(t("cats.g.delQ", { g, n }, n), "", () => save((x) => C.deleteTag(x, g)), { danger: true }); }
</script>

<template>
  <PageHeader :title="t('nav.categories')" />
  <section id="cats" class="view on">
    <div id="catTabs" class="seg"><button v-for="[k, ic] in TABS" :key="k" type="button" :data-t="k" :class="{ on: catTab == k }" @click="setTab(k)"><svg viewBox="0 0 24 24" v-html="ic" />{{ t("cats.tabs." + k) }}</button></div>
    <template v-if="S">
      <!-- Categories -->
      <div v-show="catTab == 'cats'" id="setCats" ref="catBox">
        <div class="rtool"><input v-model="searches.cats" class="rsearch" type="search" :placeholder="t('cats.search.cats')" :aria-label="t('cats.search.label')" autocomplete="off"><input id="nc" v-model="newCat" @keydown.enter.prevent="catAdd" class="rnew" :placeholder="t('cats.search.newCat')" maxlength="60" autocomplete="off"><button type="button" class="btn s" @click="catAdd">{{ t("cats.search.addCat") }}</button></div>
        <div v-if="noneCats" class="rsnone sm">{{ t("cats.search.none", { q: noneCats }) }}</div>
        <div class="card ss">
          <SetHead icon="tag" :title="t('cats.c.title')" :desc="t('cats.c.desc')" :count="Object.keys(S.cats).length" />
          <div class="ssb p"><div class="mgrid" style="margin:0 0 18px">
            <div v-for="x in tiles" :key="x.k" class="mrow" :style="{ '--mc': catColor(S, x.k) }"><span class="mic">{{ x.letter }}</span><div class="mt"><span class="catl" @click="goCat(x.k)">{{ catLabel(x.k) }}</span><small>{{ t("cats.c.count", { n: x.n }, x.n) }}</small></div>
              <div v-if="x.k != 'Uncategorized'" class="mx"><button type="button" class="mb" :aria-label="t('cats.c.renameAria', { k: catLabel(x.k) })" :data-tip="t('cats.c.renameTip')" @click="renOpen('cat', x.k)">✎</button><button type="button" class="mb" :aria-label="t('cats.c.delAria', { k: catLabel(x.k) })" :data-tip="t('cats.c.delTip')" @click="catDel(x.k)">×</button></div></div>
          </div>
          <div class="rulesat"><span class="sm">{{ t("cats.rulesAt") }}</span><button type="button" class="btn o s" @click="goRules('crules')">{{ t("cats.c.goRules") }}</button></div></div>
        </div>
      </div>

      <!-- Tags -->
      <div v-show="catTab == 'tags'" id="setTags" ref="tagBox">
        <div class="rtool"><input v-model="searches.tags" class="rsearch" type="search" :placeholder="t('cats.search.tags')" :aria-label="t('cats.search.label')" autocomplete="off"></div>
        <div v-if="noneTags" class="rsnone sm">{{ t("cats.search.none", { q: noneTags }) }}</div>
        <div class="card ss">
          <SetHead icon="tag" :title="t('cats.g.title')" :desc="t('cats.g.desc')" :count="tagRows.length" />
          <div class="ssb p">
            <div v-if="tagRows.length" class="mgrid">
              <div v-for="x in tagRows" :key="x.g" class="mrow" style="--mc:var(--acc)"><span class="mic">#</span><div class="mt"><span class="catl" @click="goTag(x.g)">{{ x.g }}</span><small>{{ x.rule ? t("cats.g.byRule", { n: x.n }, x.n) : t("cats.c.count", { n: x.n }, x.n) }}</small></div>
                <div class="mx"><button type="button" class="mb" :aria-label="t('cats.c.renameAria', { k: x.g })" :data-tip="t('cats.g.renameTip')" @click="renOpen('tag', x.g)">✎</button><button type="button" class="mb" :aria-label="t('cats.c.delAria', { k: x.g })" :data-tip="t('cats.g.delTip')" @click="tagDel(x.g)">×</button></div></div>
            </div>
            <div v-else class="sm" style="padding:2px 2px 8px">{{ t("cats.g.none") }}</div>
            <div class="sm" style="margin-top:10px">{{ t("cats.g.appear") }}</div>
            <div class="rulesat" style="margin-top:12px"><span class="sm">{{ t("cats.rulesAt") }}</span><button type="button" class="btn o s" @click="goRules('trules')">{{ t("cats.g.goRules") }}</button></div>
          </div>
        </div>
      </div>
    </template>
  </section>

  <!-- Rename a category or a tag -->
  <BaseSheet :open="!!ren" @close="ren = null">
    <template v-if="ren">
      <h3>{{ ren.kind == "tag" ? t("cats.g.renTitle") : t("cats.c.renTitle") }}</h3>
      <div class="sm" :style="ren.kind == 'tag' ? 'margin-bottom:12px' : 'margin-bottom:12px;line-height:1.5'">{{ ren.kind == "tag" ? t("cats.g.renText") : t("cats.c.renText") }}</div>
      <div class="fld"><label>{{ t("cats.newName") }}</label><input ref="renIn" v-model="renName" @keydown.enter.prevent="renGo" :maxlength="ren.kind == 'tag' ? null : 60" autocomplete="off"></div>
      <div class="flex" style="justify-content:flex-end;gap:10px"><button type="button" class="btn o" @click="ren = null">{{ t("cats.cancel") }}</button><button type="button" class="btn" @click="renGo">{{ t("cats.rename") }}</button></div>
    </template>
  </BaseSheet>
</template>
