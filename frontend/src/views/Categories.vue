<script setup>
// Categories and tags: two tabs (categories, tags). Each lists what went out and came in over the last 3, 6 or 12 full months,
// against the months before, with the latest transactions and a small month-by-month chart when a row is opened.
// What it knows and does lives in pagelogic/categories.js (shared with the phone's Categories and tags screens).
// The rules that sort transactions automatically are in Settings → Automatic sorting.
import PageHeader from "../components/PageHeader.vue";
import BaseSheet from "../components/BaseSheet.vue";
import PopMenu from "../components/PopMenu.vue";
import SetHead from "./settings/SetHead.vue";
import { vTip } from "../core/tooltip.js";
import { useCategories } from "../pagelogic/categories.js";
import "../styles/pages/categories.css"; // this page's own styles

const {
  t, S, setTab, TABS, goRules, months, MONTHS, MLABEL, nM, periodWords, signed, change, bars, txName, openEntry, isOpen, toggle,
  menu, toggleMenu, menuRename, menuDel, catBox, tagBox, noneCats, noneTags, cols, colMenu, flipCol, colsOf, grid, colHead, colTip,
  sorts, sortBy, sorted, sortIs, setBudget, noCats, newCat, catAdd, ren, renName, renIn, renGo, newTag, tagAdd, LISTS,
  catTab, searches, go, fm, dcell, ariaSort, moneyCell, totalCell, CAT_COLS,
} = useCategories();
</script>

<template>
  <PageHeader :title="t('nav.categories')" />
  <section id="cats" class="view on">
    <div class="cstop">
      <div id="catTabs" class="seg"><button v-for="[k, ic] in TABS" :key="k" type="button" :data-t="k" :class="{ on: catTab == k }" @click="setTab(k)"><svg viewBox="0 0 24 24" v-html="ic" />{{ t("cats.tabs." + k) }}</button></div>
      <div class="csper"><div id="catMonths" class="seg" role="group" :aria-label="t('cats.period.label')"><button v-for="n in MONTHS" :key="n" type="button" :class="{ on: nM == n }" @click="months = String(n)">{{ t(MLABEL[n]) }}</button></div></div>
    </div>
    <template v-if="S && LISTS">
      <template v-for="tab in ['cats', 'tags']" :key="tab">
        <div v-show="catTab == tab" class="tabfade" :id="tab == 'cats' ? 'setCats' : 'setTags'" :ref="(e) => (tab == 'cats' ? (catBox = e) : (tagBox = e))">
          <div v-if="tab == 'cats'" class="rtool"><input v-model="searches.cats" class="rsearch" type="search" :placeholder="t('cats.search.cats')" :aria-label="t('cats.search.label')" autocomplete="off"><input id="nc" v-model="newCat" @keydown.enter.prevent="catAdd" class="rnew" :placeholder="t('cats.search.newCat')" maxlength="60" autocomplete="off"><button type="button" class="btn s" @click="catAdd">{{ t("cats.search.addCat") }}</button></div>
          <div v-else class="rtool"><input v-model="searches.tags" class="rsearch" type="search" :placeholder="t('cats.search.tags')" :aria-label="t('cats.search.label')" autocomplete="off"><input id="ntg" v-model="newTag" @keydown.enter.prevent="tagAdd" class="rnew" :placeholder="t('cats.search.newTag')" maxlength="60" autocomplete="off"><button type="button" class="btn s" @click="tagAdd">{{ t("cats.search.addTag") }}</button></div>
          <div v-if="tab == 'cats' ? noneCats : noneTags" class="rsnone sm">{{ t("cats.search.none", { q: tab == "cats" ? noneCats : noneTags }) }}</div>
          <div class="card ss">
            <SetHead class="cshd" icon="tag" :title="t(tab == 'cats' ? 'cats.c.title' : 'cats.g.title')" :desc="t(tab == 'cats' ? 'cats.c.desc' : 'cats.g.desc', periodWords)" :count="LISTS[tab].L.rows.length">
              <!-- the totals for the time looked at -->
              <div class="cstn"><div v-for="c in ['out', 'in', 'net']" :key="c"><span>{{ t("cats.tot." + c) }}</span><b class="num" :class="totalCell(LISTS[tab].L.totals, c).cls">{{ signed(totalCell(LISTS[tab].L.totals, c).v) }}</b></div></div>
            </SetHead>
            <div class="ssb p">

              <div v-if="tab == 'cats' ? noCats : !LISTS.tags.L.rows.length" class="csempty"><div class="sm">{{ tab == "cats" ? t("cats.c.none") : t("cats.g.none") }}</div><div v-if="tab == 'tags'" class="sm">{{ t("cats.g.appear") }}</div><div class="sm">{{ t("cats.ai.text") }}</div><button type="button" class="btn o s" @click="goRules('ai')">{{ t("cats.ai.go") }}</button></div>

              <div v-if="LISTS[tab].L.rows.length" class="csl" :style="{ '--csg': grid(tab) }">
                <!-- the column titles: a click sorts by that column (small to large, large to small, the usual order) -->
                <div role="table" class="cshw" :aria-label="t(tab == 'cats' ? 'cats.c.title' : 'cats.g.title')"><div role="row" class="csh">
                  <span role="columnheader" class="c-name" :aria-sort="ariaSort(sorts[tab], 'name')"><button type="button" class="cssort" :class="sortIs(tab, 'name')" :data-tip="colTip(tab == 'cats' ? 'cat' : 'tag')" @click="sortBy(tab, 'name')">{{ LISTS[tab].head }}<svg viewBox="0 0 24 24" aria-hidden="true"><path class="su" d="M8 9.5l4-4 4 4" /><path class="sd" d="M8 14.5l4 4 4-4" /></svg></button></span>
                  <span v-for="c in colsOf(tab)" :key="c" role="columnheader" :aria-sort="ariaSort(sorts[tab], c)" :class="'c-' + c"><button type="button" class="cssort" :class="sortIs(tab, c)" :data-tip="colTip(c)" @click="sortBy(tab, c)">{{ colHead(c) }}<svg viewBox="0 0 24 24" aria-hidden="true"><path class="su" d="M8 9.5l4-4 4 4" /><path class="sd" d="M8 14.5l4 4 4-4" /></svg></button></span>
                  <span><button type="button" class="ib jmore cscols" :aria-label="t('cats.cols.aria')" :data-tip="t('cats.cols.aria')" aria-haspopup="menu" @click="colMenu = colMenu ? null : $event.currentTarget"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M10 5v14M15 5v14" /></svg></button></span>
                </div></div>
                <div v-for="r in sorted(tab)" :key="r.k" class="mrow csr" :class="{ open: isOpen(tab + ':' + r.k), zero: !r.n }" :style="{ '--mc': LISTS[tab].color(r.k) }">
                  <div class="csm" role="button" tabindex="0" :aria-expanded="isOpen(tab + ':' + r.k)" @click="toggle(tab + ':' + r.k)" @keydown.enter.self.prevent="toggle(tab + ':' + r.k)" @keydown.space.self.prevent="toggle(tab + ':' + r.k)">
                    <span class="mic">{{ LISTS[tab].letter(r.k) }}</span>
                    <div class="mt"><b class="csn"><bdi>{{ LISTS[tab].name(r.k) }}</bdi></b></div>
                    <div class="csnums">
                      <div v-for="c in colsOf(tab)" :key="c" :class="c == 'change' ? ['csc', change(r).cls] : ['csv', 'c-' + c]">
                        <template v-if="c == 'change'"><svg v-if="change(r).cls == 'good' || change(r).cls == 'bad'" viewBox="0 0 24 24" aria-hidden="true" :class="{ dn: !change(r).up }"><path d="M12 19V5M6 11l6-6 6 6" /></svg><span>{{ change(r).text }}</span></template>
                        <template v-else>
                          <span class="cl">{{ colHead(c) }}</span>
                          <template v-if="c == 'budget'">
                            <template v-if="r.budget"><button type="button" class="cslink" v-tip="t('cats.bud.tip')" @click.stop="go('/budgets')">{{ t("cats.bud.amt", { amt: fm(r.budget) }) }}</button><small class="csbu">{{ t("cats.bud.used", { amt: fm(r.thisOut) }) }}</small></template>
                            <button v-else-if="r.canBudget" type="button" class="cslink" @click.stop="setBudget(r)">{{ t("cats.bud.set") }}</button>
                          </template>
                          <template v-else-if="c == 'rules'"><button v-if="r.rules" type="button" class="cslink" v-tip="t('cats.row.rulesTip')" @click.stop="goRules(LISTS[tab].rules)">{{ r.rules }}</button><b v-else class="num">0</b></template>
                          <b v-else-if="c == 'last'" class="num">{{ r.last ? dcell(r.last) : "" }}</b>
                          <b v-else-if="c == 'n'" class="num">{{ r.n }}</b>
                          <b v-else class="num" :class="moneyCell(r, c).cls">{{ signed(moneyCell(r, c).v) }}</b>
                        </template>
                      </div>
                    </div>
                    <button v-if="LISTS[tab].edit(r.k)" type="button" class="ib jmore" :aria-label="t('cats.menu.aria', { k: LISTS[tab].name(r.k) })" aria-haspopup="menu" @click.stop="toggleMenu(LISTS[tab].kind, r.k, $event)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg></button>
                    <span v-else></span>
                  </div>

                  <!-- the open row: latest transactions, month by month, and the way to Activity -->
                  <div v-if="isOpen(tab + ':' + r.k)" class="csx">
                    <div class="csrec"><div class="lbl">{{ t("cats.open.recent") }}</div>
                      <button v-for="x in r.recent" :key="x.id" type="button" class="csre" :disabled="x.virtual" @click="openEntry(x)"><span class="sm num">{{ dcell(x.d) }}</span><span class="csen">{{ txName(x) }}</span><b class="num" :class="{ pos: x.a > 0 }">{{ fm(x.a) }}</b></button>
                      <div v-if="!r.recent.length" class="sm">{{ t("cats.open.noTx") }}</div></div>
                    <div class="csch"><div class="lbl">{{ t("cats.open.byMonth") }}</div>
                      <div class="csbars"><button v-for="b in bars(r)" :key="b.m" type="button" class="csb" v-tip="b.tip" :aria-label="b.tip" @click="LISTS[tab].act(r.k, b.m)"><span class="csbw"><i :style="{ height: b.h + '%' }" /></span><small>{{ b.label }}</small></button></div></div>
                    <div class="csgo"><button type="button" class="btn o s" @click="LISTS[tab].act(r.k)">{{ t("cats.open.seeAll") }}</button><button v-if="r.budget" type="button" class="btn o s" @click="go('/budgets')">{{ t("cats.open.budgets") }}</button></div>
                  </div>
                </div>
              </div>

              <div class="rulesat"><span class="sm">{{ t("cats.rulesAt") }}</span><button type="button" class="btn o s" @click="goRules(LISTS[tab].rules)">{{ t(tab == "cats" ? "cats.c.goRules" : "cats.g.goRules") }}</button></div>
            </div>
          </div>
        </div>
      </template>
    </template>
  </section>

  <!-- the ⋯ menu of a row -->
  <PopMenu :at="menu?.btn" @close="menu = null">
    <template v-if="menu">
      <button role="menuitem" @click="menuRename"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" /></svg>{{ t("cats.menu.rename") }}</button>
      <button role="menuitem" class="dz" @click="menuDel"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>{{ t("cats.menu.del") }}</button>
    </template>
  </PopMenu>

  <!-- which columns the list shows -->
  <PopMenu :at="colMenu" @close="colMenu = null">
    <button v-for="c in CAT_COLS" :key="c" role="menuitemcheckbox" :aria-checked="cols.includes(c)" class="cscol" @click="flipCol(c)"><svg viewBox="0 0 24 24" aria-hidden="true"><path v-if="cols.includes(c)" d="M5 12l5 5 9-10" /></svg>{{ colHead(c) }}</button>
  </PopMenu>

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
