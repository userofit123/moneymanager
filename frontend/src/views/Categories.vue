<script setup>
// Categories and tags: two tabs (categories, tags). Each lists what went out and came in over the last 3, 6 or 12 full months,
// against the months before, with the latest transactions and a small month-by-month chart when a row is opened.
// The numbers come from lib/catStats.js (counted like Reports); renaming, merging and deleting from lib/categories.js.
// The rules that sort transactions automatically are in Settings → Automatic sorting.
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { home } from "../core/derived.js";
import { now } from "../core/clock.js";
import { usePref } from "../core/prefs.js";
import { toast } from "../core/toast.js";
import { goActivity } from "../core/shell.js";
import { openTx } from "../core/txwin.js";
import { go } from "../router.js";
import { catNames, catColor, catLabel } from "../core/cats.js";
import { searches, useRowSearch } from "../core/rowSearch.js";
import { fm } from "../format.js";
import { dcell } from "../dates.js";
import { displayName } from "../lib/activity.js";
import { catStats } from "../lib/catStats.js";
import PageHeader from "../components/PageHeader.vue";
import BaseSheet from "../components/BaseSheet.vue";
import PopMenu from "../components/PopMenu.vue";
import SetHead from "./settings/SetHead.vue";
import { openSettingsTab } from "./settings/tab.js";
import { catTab } from "./categories/state.js";
import * as C from "../lib/categories.js";
import { ask as askYes } from "../core/ask.js";
import { vTip } from "../core/tooltip.js";
import "../styles/pages/categories.css"; // this page's own styles

const { t, locale } = useI18n();
const S = computed(() => data.state.value);
onMounted(() => { data.start(); });

// Every change goes through the data store; true when something changed.
const save = (edit) => data.change(edit).length > 0;
const err = (m) => toast(m, { kind: "err" });
const ok = (m, o = {}) => toast(m, { kind: "ok", ...o });

const setTab = (k) => { catTab.value = k; open.value = null; };
const TABS = [
  ["cats", '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'],
  ["tags", '<path d="M3 12V4h8l10 10-8 8z"/><path d="M7.5 8h.01"/>'],
];
// Opens a section of Settings → Automatic sorting (crules: category rules, trules: tag rules, ai: set up with an AI).
const goRules = (id) => { openSettingsTab(id); go("/settings"); };

// ---- the time looked at: the last 3, 6 or 12 full months (remembered in this browser) ----
const months = usePref("moneyCatMonths", "6");
const MONTHS = [3, 6, 12], MLABEL = { 3: "cats.period.m3", 6: "cats.period.m6", 12: "cats.period.m12" };
const nM = computed(() => (MONTHS.includes(+months.value) ? +months.value : 6));
const ST = computed(() => (S.value && home.value ? catStats(S.value, home.value.rows, now.value, nM.value) : null));
const loc = computed(() => (locale.value === "he" ? "he-IL" : "en-GB"));
const monthName = (m, o) => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(loc.value, o);
const rangeText = computed(() => (ST.value ? t("cats.period.range", { n: nM.value, from: monthName(ST.value.from, { month: "short", year: "numeric" }), to: monthName(ST.value.to, { month: "short", year: "numeric" }) }) : ""));

// ---- one row ----
// The change against the months before, in plain words; more spending (or less income) shows in red.
function change(r) {
  if (!ST.value.hasPrev) return { text: t("cats.chg.none"), cls: "" };
  const before = r.main == "in" ? r.prevIn : r.prevOut, nowV = before + r.change;
  if (!before && !nowV) return { text: "", cls: "" };
  if (Math.abs(r.change) < Math.max(1, before * 0.02)) return { text: t("cats.chg.same", { n: nM.value }), cls: "same" };
  const good = r.main == "in" ? r.change > 0 : r.change < 0;
  return { text: t(r.change > 0 ? "cats.chg.more" : "cats.chg.less", { amt: fm(Math.abs(r.change)), n: nM.value }), cls: good ? "good" : "bad", up: r.change > 0 };
}
const meta = (r) => [r.n ? t("cats.row.n", { n: r.n }, r.n) : t("cats.row.nothing"), r.last ? t("cats.row.last", { d: "⁦" + dcell(r.last) + "⁩" }) : ""].filter(Boolean).join(" · ");
// The month-by-month bars of the open row: the money out (for income, the money in), the tallest bar full height.
function bars(r) {
  const v = r.main == "in" ? r.inM : r.outM, mx = Math.max(...v, 1);
  return ST.value.months.map((m, i) => ({ m, h: (v[i] / mx) * 100, label: monthName(m, { month: "short" }), tip: t("cats.open.monthTip", { m: monthName(m, { month: "long", year: "numeric" }), out: fm(r.outM[i]), in: fm(r.inM[i]) }) }));
}
const txName = (x) => displayName(S.value, x);
const openEntry = (x) => { if (!x.virtual) openTx(x.id); };

// Only one row is open at a time ("cats:Food", "tags:trip").
const open = ref(null);
const toggle = (id) => { open.value = open.value == id ? null : id; };

// The ⋯ menu of a row: { kind: "cat" | "tag", k, btn }.
const menu = ref(null);
const toggleMenu = (kind, k, ev) => { menu.value = menu.value && menu.value.k == k && menu.value.kind == kind ? null : { kind, k, btn: ev.currentTarget }; };
const menuRename = () => { const m = menu.value; menu.value = null; renOpen(m.kind, m.k); };
const menuDel = () => { const m = menu.value; menu.value = null; if (m.kind == "tag") tagDel(m.k); else catDel(m.k); };

// ---- the search bars: hide the rows whose words do not contain the search ----
const catBox = ref(null), tagBox = ref(null);
const noneCats = useRowSearch(catBox, "cats"), noneTags = useRowSearch(tagBox, "tags");

// ---- Categories ----
const names = computed(() => (S.value ? catNames(S.value) : []));
const noCats = computed(() => !S.value || !Object.keys(S.value.cats || {}).some((k) => k != "Uncategorized"));
const newCat = ref("");
function catAdd() { if (save((n) => C.addCategory(n, newCat.value))) newCat.value = ""; }
// the category or tag in Activity; with a month ("2026-09"), only that month
const span = (m) => (m ? { from: m + "-01", to: m + "-31" } : {});
const goCat = (k, m) => goActivity({ cat: k, ...span(m) });
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
const goTag = (g, m) => goActivity({ tag: g, ...span(m) });
function tagRenameGo(g) {
  const n = C.normTag(S.value, renName.value);
  if (!n) return err(t("cats.typeName"));
  if (n == g) { ren.value = null; return; }
  save((x) => C.renameTag(x, g, n));
  ren.value = null;
  ok(t("cats.g.renamed", { n }));
}
function tagDel(g) { const n = C.tagUses(S.value, g); askYes(t("cats.g.delQ", { g, n }, n), "", () => save((x) => C.deleteTag(x, g)), { danger: true }); }

// What each tab lists: its rows, how a row is named and coloured, and where its rules and its activity are.
const LISTS = computed(() => (ST.value ? {
  cats: { L: ST.value.cats, kind: "cat", head: t("cats.col.cat"), name: catLabel, color: (k) => catColor(S.value, k), letter: (k) => (Array.from(k)[0] || "?").toUpperCase(), rules: "crules", act: goCat, edit: (k) => k != "Uncategorized" },
  tags: { L: ST.value.tags, kind: "tag", head: t("cats.col.tag"), name: (g) => "#" + g, color: () => "var(--acc)", letter: () => "#", rules: "trules", act: goTag, edit: () => true },
} : null));
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
        <div v-show="catTab == tab" :id="tab == 'cats' ? 'setCats' : 'setTags'" :ref="(e) => (tab == 'cats' ? (catBox = e) : (tagBox = e))">
          <div v-if="tab == 'cats'" class="rtool"><input v-model="searches.cats" class="rsearch" type="search" :placeholder="t('cats.search.cats')" :aria-label="t('cats.search.label')" autocomplete="off"><input id="nc" v-model="newCat" @keydown.enter.prevent="catAdd" class="rnew" :placeholder="t('cats.search.newCat')" maxlength="60" autocomplete="off"><button type="button" class="btn s" @click="catAdd">{{ t("cats.search.addCat") }}</button></div>
          <div v-else class="rtool"><input v-model="searches.tags" class="rsearch" type="search" :placeholder="t('cats.search.tags')" :aria-label="t('cats.search.label')" autocomplete="off"></div>
          <div v-if="tab == 'cats' ? noneCats : noneTags" class="rsnone sm">{{ t("cats.search.none", { q: tab == "cats" ? noneCats : noneTags }) }}</div>
          <div class="card ss">
            <SetHead icon="tag" :title="t(tab == 'cats' ? 'cats.c.title' : 'cats.g.title')" :desc="t(tab == 'cats' ? 'cats.c.desc' : 'cats.g.desc')" :count="LISTS[tab].L.rows.length" />
            <div class="ssb p">
              <!-- the totals for the time looked at -->
              <div class="cstot">
                <div class="sm csrange">{{ rangeText }}</div>
                <div class="cstn"><div><span>{{ t("cats.tot.out") }}</span><b class="num">{{ fm(LISTS[tab].L.totals.out) }}</b></div><div><span>{{ t("cats.tot.in") }}</span><b class="num">{{ fm(LISTS[tab].L.totals.in) }}</b></div><div><span>{{ t("cats.tot.net") }}</span><b class="num" :class="{ neg: LISTS[tab].L.totals.net < 0 }">{{ fm(LISTS[tab].L.totals.net) }}</b></div></div>
              </div>

              <div v-if="tab == 'cats' ? noCats : !LISTS.tags.L.rows.length" class="csempty"><div class="sm">{{ tab == "cats" ? t("cats.c.none") : t("cats.g.none") }}</div><div v-if="tab == 'tags'" class="sm">{{ t("cats.g.appear") }}</div><div class="sm">{{ t("cats.ai.text") }}</div><button type="button" class="btn o s" @click="goRules('ai')">{{ t("cats.ai.go") }}</button></div>

              <div v-if="LISTS[tab].L.rows.length" class="csl">
                <div class="csh" aria-hidden="true"><span></span><span>{{ LISTS[tab].head }}</span><span>{{ t("cats.col.out") }}</span><span>{{ t("cats.col.in") }}</span><span>{{ t("cats.col.net") }}</span><span :data-tip="t('cats.row.avgTip')">{{ t("cats.col.avg") }}</span><span>{{ t("cats.col.change") }}</span><span></span></div>
                <div v-for="r in LISTS[tab].L.rows" :key="r.k" class="mrow csr" :class="{ open: open == tab + ':' + r.k, zero: !r.n }" :style="{ '--mc': LISTS[tab].color(r.k) }">
                  <div class="csm" role="button" tabindex="0" :aria-expanded="open == tab + ':' + r.k" @click="toggle(tab + ':' + r.k)" @keydown.enter.self.prevent="toggle(tab + ':' + r.k)" @keydown.space.self.prevent="toggle(tab + ':' + r.k)">
                    <span class="mic">{{ LISTS[tab].letter(r.k) }}</span>
                    <div class="mt"><b class="csn"><bdi>{{ LISTS[tab].name(r.k) }}</bdi></b><small>{{ meta(r) }}<template v-if="r.budget"> · <span class="nw">{{ t("cats.row.budget", { amt: fm(r.budget) }) }}</span></template><template v-if="r.rules"> · <button type="button" class="cslink" v-tip="t('cats.row.rulesTip')" @click.stop="goRules(LISTS[tab].rules)">{{ t("cats.row.rules", { n: r.rules }, r.rules) }}</button></template></small></div>
                    <div class="csnums">
                      <div class="csv"><span class="cl">{{ t("cats.col.out") }}</span><b class="num">{{ fm(r.out) }}</b></div>
                      <div class="csv"><span class="cl">{{ t("cats.col.in") }}</span><b class="num">{{ fm(r.in) }}</b></div>
                      <div class="csv"><span class="cl">{{ t("cats.col.net") }}</span><b class="num" :class="{ neg: r.net < 0 }">{{ fm(r.net) }}</b></div>
                      <div class="csv"><span class="cl" :data-tip="t('cats.row.avgTip')">{{ t("cats.col.avg") }}</span><b class="num">{{ fm(r.avg) }}</b></div>
                      <div class="csc" :class="change(r).cls"><svg v-if="change(r).cls == 'good' || change(r).cls == 'bad'" viewBox="0 0 24 24" aria-hidden="true" :class="{ dn: !change(r).up }"><path d="M12 19V5M6 11l6-6 6 6" /></svg><span>{{ change(r).text }}</span></div>
                    </div>
                    <button v-if="LISTS[tab].edit(r.k)" type="button" class="ib jmore" :aria-label="t('cats.menu.aria', { k: LISTS[tab].name(r.k) })" aria-haspopup="menu" @click.stop="toggleMenu(LISTS[tab].kind, r.k, $event)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg></button>
                    <span v-else></span>
                  </div>

                  <!-- the open row: latest transactions, month by month, and the way to Activity -->
                  <div v-if="open == tab + ':' + r.k" class="csx">
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
