<script setup>
// Categories and tags: six tabs (categories, tags, category rules, tag rules, name rules, card and salary rules).
// Each tab has a search bar. The data changes and their history lines come from lib/categories.js.
import { ref, computed, watch, onMounted, onUpdated, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { toast } from "../core/toast.js";
import { tx } from "../core/heText.js";
import { goActivity } from "../core/shell.js";
import { catNames, catColor, catLabel } from "../core/cats.js";
import { fm } from "../format.js";
import { dstr } from "../dates.js";
import { displayName } from "../lib/activity.js";
import PageHeader from "../components/PageHeader.vue";
import BaseSheet from "../components/BaseSheet.vue";
import TagEditor from "../components/TagEditor.vue";
import SetHead from "./settings/SetHead.vue";
import { catTab, searches, newRuleTags } from "./categories/state.js";
import * as C from "../lib/categories.js";
import { ask as askYes } from "../core/ask.js";

const { t, locale } = useI18n();
const S = computed(() => data.state.value);
onMounted(() => { data.start(); });

// Every change goes through the data store; true when something changed.
const save = (edit) => data.change(edit).length > 0;
const err = (m) => toast(m, { kind: "err" });
const ok = (m, o = {}) => toast(m, { kind: "ok", ...o });
const tags = (L) => L.map((g) => "#" + g).join(" ");

const setTab = (k) => { catTab.value = k; };
const TABS = [
  ["cats", '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'],
  ["tags", '<path d="M3 12V4h8l10 10-8 8z"/><path d="M7.5 8h.01"/>'],
  ["rules", '<path d="M4 6h16M4 12h10M4 18h6"/><path d="M17 15l3 3-3 3"/>'],
  ["tagrules", '<path d="M3 12V5a1 1 0 0 1 1-1h7l9 9-7 7z"/><path d="M7.5 8.5h.01M17 3v4M15 5h4"/>'],
  ["names", '<path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/>'],
  ["gen", '<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'],
];
// The panes in page order (the help dots find them by these ids).
const PANES = [["cats", "setCats"], ["rules", "setRules"], ["tags", "setTags"], ["tagrules", "setTagrules"], ["names", "setNames"], ["gen", "setGen"]];

// ---- the search bars (rsApply): hide the rows whose words do not contain the search, case ignored ----
const root = ref(null), none = ref({});
function rsApply() {
  const el = root.value; if (!el) return;
  const out = {};
  for (const [tab, id] of PANES) {
    if (tab == "names") continue;
    const box = el.querySelector("#" + id); if (!box) continue;
    const q = (searches[tab] || "").trim().toLowerCase(); let n = 0, tot = 0;
    box.querySelectorAll(".rule,.mrow").forEach((r) => {
      tot++;
      const skip = [...r.querySelectorAll(".tsug")].map((s) => s.textContent).join("");
      const words = r.textContent.replace(skip, "") + " " + [...r.querySelectorAll("input,select")].map((i) => (i.tagName == "SELECT" ? (i.options[i.selectedIndex] ? i.options[i.selectedIndex].text : "") : i.value)).join(" ");
      const hit = !q || words.toLowerCase().includes(q);
      r.hidden = !hit; if (hit) n++;
    });
    if (q && tot && !n) out[tab] = (searches[tab] || "").trim();
  }
  if (JSON.stringify(out) !== JSON.stringify(none.value)) none.value = out;
}
onMounted(() => nextTick(rsApply));
onUpdated(rsApply);
watch(searches, () => nextTick(rsApply));

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
async function catSuggest() {
  try {
    const r = await data.api("/api/categories/suggested", { method: "POST" });
    await data.load();
    if (r.categories || r.rules || r.applied) ok(r.applied ? t("cats.c.addedSorted", { c: r.categories, r: r.rules, n: r.applied }, r.applied) : t("cats.c.added", { c: r.categories, r: r.rules }));
    else toast(t("cats.c.haveAll"), { kind: "info" }); // nothing went wrong, so not red
  } catch (e) { err(tx(e.message)); }
}

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

// ---- Category rules ----
const rk = ref(""), rc = ref("");
const newRuleCat = computed(() => (names.value.includes(rc.value) ? rc.value : names.value[0] || ""));
const ruleOpts = (c) => (names.value.includes(c) ? names.value : [c, ...names.value]);
function ruleAdd() {
  const k = rk.value.trim(); if (!k) return;
  if (C.ruleExists(S.value, k)) return err(t("cats.r.dup"));
  const c = newRuleCat.value, before = C.uncategorized(S.value);
  save((n) => C.addRule(n, k, c));
  rk.value = "";
  const n = before - C.uncategorized(S.value); // the upkeep after the change sorted these
  ok(n ? t("cats.r.added", { n, c: catLabel(c) }, n) : t("cats.r.addedNew"));
}
const ruleDel = (i) => save((n) => C.deleteRule(n, i));
function ruleText(i, ev) { const r = S.value.rules[i], v = ev.target.value.trim(); if (!v) { ev.target.value = r.k; return; } save((n) => C.setRuleText(n, i, v)); }
function ruleCat(i, ev) {
  const r = S.value.rules[i], old = r.c, c = ev.target.value;
  if (!save((n) => C.setRuleCat(n, i, c))) return;
  const n = C.ruleMoveCount(S.value, r.k, old);
  ok(t("cats.r.newGo", { k: r.k, c: catLabel(c) }), { title: t("cats.r.updated"), ms: 14000, actions: n ? [{ label: t("cats.r.move", { n }, n), run: () => rulePast(i, old) }, { label: t("cats.r.leave") }] : [] });
}
function rulePast(i, old) { const out = {}; if (save((n) => C.applyRulePast(n, i, old, out))) ok(t("cats.r.moved", { n: out.n, c: catLabel(out.c) })); }

// ---- Tag rules ----
const trk = ref(""), newEd = ref(null), ask = ref(null);
// After a tag rule is added or changed: offer to tag the transactions you already have (tagRuleAsk).
function tagRuleAsk(i, isNew) {
  const r = S.value.tagRules[i]; if (!r) return;
  const L = C.tagRuleMatches(S.value, r), tg = C.ruleTags(r);
  if (!L.length) { ok(isNew ? t("cats.tr.addedNew", { k: r.k, tags: tags(tg) }) : t("cats.tr.updatedNone")); return; }
  ask.value = { i, isNew, k: r.k, tags: tg, n: L.length, rows: L.slice(0, 4) };
}
function trApply() { const out = {}, i = ask.value.i; ask.value = null; if (save((n) => C.applyTagRulePast(n, i, out))) ok(t("cats.tr.tagged", { n: out.n }, out.n)); }
function trText(i, ev) { const r = S.value.tagRules[i], v = ev.target.value.trim(); if (!v) { ev.target.value = r.k; return; } if (save((n) => C.setTagRuleText(n, i, v))) tagRuleAsk(i); }
function trTagsAdd(i, L) { if (save((n) => C.addTagRuleTags(n, i, L))) tagRuleAsk(i); }
function trTagRemove(i, at) { if (C.ruleTags(S.value.tagRules[i]).length <= 1) return err(t("cats.tr.last")); save((n) => C.removeTagRuleTag(n, i, at)); }
const trDel = (i) => save((n) => C.deleteTagRule(n, i));
function newTagsAdd(L) { for (const g of L) if (!newRuleTags.value.includes(g)) newRuleTags.value.push(g); }
function trAdd() {
  const k = trk.value.trim(); if (!k) return;
  newTagsAdd(newEd.value?.take() || []); // tags typed but not added yet count too
  if (!newRuleTags.value.length) return err(t("cats.tr.needTag"));
  save((n) => C.addTagRule(n, k, newRuleTags.value));
  newRuleTags.value = []; trk.value = "";
  tagRuleAsk(S.value.tagRules.length - 1, true);
}

// ---- Name rules ----
const nameRules = computed(() => S.value?.cfg?.nameRules || []);
const nr = ref({ f: "any", m: "in", k: "", n: "" });
function nameAdd() {
  const x = nr.value;
  if (!x.k.trim() || !x.n.trim()) return err(t("cats.n.needBoth"));
  save((n) => C.addNameRule(n, x));
  nr.value = { f: "any", m: "in", k: "", n: "" };
  ok(t("cats.n.added"));
}
function nameEdit(i, f, ev) {
  if (!save((n) => C.setNameRule(n, i, f, ev.target.value))) return;
  const r = nameRules.value[i];
  if (f == "k" || f == "n") ev.target.value = r[f];
  if (!r.k || !r.n) err(t("cats.n.needBothEdit"));
}
const nameDel = (i) => save((n) => C.deleteNameRule(n, i));

// ---- Card and salary rules ----
const ccr = ref(""), slr = ref("");
function ccAdd() {
  const why = C.genCheck(S.value.cardRules, ccr.value);
  if (why) return err(why == "short" ? t("cats.gen.cardShort") : t("cats.gen.exists"));
  save((n) => C.addCardRule(n, ccr.value)); ccr.value = "";
  ok(t("cats.gen.added"));
}
function salAdd() {
  const why = C.genCheck(S.value.salaryRules, slr.value);
  if (why) return err(why == "short" ? t("cats.gen.salShort") : t("cats.gen.exists"));
  const out = {};
  save((n) => C.addSalaryRule(n, slr.value, out)); slr.value = "";
  ok(out.n ? t("cats.gen.salAdded", { n: out.n }, out.n) : t("cats.gen.salAddedNew"));
}
const ccDel = (i) => save((n) => C.deleteCardRule(n, i));
const salDel = (i) => save((n) => C.deleteSalaryRule(n, i));
</script>

<template>
  <PageHeader :title="t('nav.categories')" />
  <section id="cats" ref="root" class="view on">
    <div id="catTabs" class="seg"><button v-for="[k, ic] in TABS" :key="k" type="button" :data-t="k" :class="{ on: catTab == k }" @click="setTab(k)"><svg viewBox="0 0 24 24" v-html="ic" />{{ t("cats.tabs." + k) }}</button></div>
    <template v-if="S">
      <!-- Categories -->
      <div v-show="catTab == 'cats'" id="setCats">
        <div class="rtool"><input v-model="searches.cats" class="rsearch" type="search" :placeholder="t('cats.search.cats')" :aria-label="t('cats.search.label')" autocomplete="off"><input id="nc" v-model="newCat" @keydown.enter.prevent="catAdd" class="rnew" :placeholder="t('cats.search.newCat')" maxlength="60" autocomplete="off"><button type="button" class="btn s" @click="catAdd">{{ t("cats.search.addCat") }}</button></div>
        <div v-if="none.cats" class="rsnone sm">{{ t("cats.search.none", { q: none.cats }) }}</div>
        <div class="card ss">
          <SetHead icon="tag" :title="t('cats.c.title')" :desc="t('cats.c.desc')" :count="Object.keys(S.cats).length" />
          <div class="ssb p"><div class="mgrid" style="margin:0 0 18px">
            <div v-for="x in tiles" :key="x.k" class="mrow" :style="{ '--mc': catColor(S, x.k) }"><span class="mic">{{ x.letter }}</span><div class="mt"><span class="catl" @click="goCat(x.k)">{{ catLabel(x.k) }}</span><small>{{ t("cats.c.count", { n: x.n }, x.n) }}</small></div>
              <div v-if="x.k != 'Uncategorized'" class="mx"><button type="button" class="mb" :aria-label="t('cats.c.renameAria', { k: catLabel(x.k) })" :data-tip="t('cats.c.renameTip')" @click="renOpen('cat', x.k)">✎</button><button type="button" class="mb" :aria-label="t('cats.c.delAria', { k: catLabel(x.k) })" :data-tip="t('cats.c.delTip')" @click="catDel(x.k)">×</button></div></div>
          </div></div>
          <div class="sfoot" style="display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap"><span style="flex:1 1 320px">{{ t("cats.c.starter") }}</span><button type="button" class="btn o s" @click="catSuggest">{{ t("cats.c.suggest") }}</button></div>
        </div>
      </div>

      <!-- Category rules -->
      <div v-show="catTab == 'rules'" id="setRules">
        <div class="rtool"><input v-model="searches.rules" class="rsearch" type="search" :placeholder="t('cats.search.rules')" :aria-label="t('cats.search.label')" autocomplete="off"></div>
        <div v-if="none.rules" class="rsnone sm">{{ t("cats.search.none", { q: none.rules }) }}</div>
        <div class="card ss">
          <SetHead icon="rules" :title="t('cats.r.title')" :desc="t('cats.r.desc')" :count="S.rules.length" />
          <div class="ssb p">
            <div v-for="(r, i) in S.rules" :key="i + '|' + r.k" class="rule"><span>{{ t("cats.ifDesc") }}</span><input data-c="rulek" :data-i="i" :value="r.k" :aria-label="t('cats.text')" @change="ruleText(i, $event)"><span>→</span><select data-c="rulec" :data-i="i" :value="r.c" :aria-label="t('cats.r.cat')" @change="ruleCat(i, $event)"><option v-for="c in ruleOpts(r.c)" :key="c" :value="c">{{ catLabel(c) }}</option></select><button type="button" class="btn o s" style="margin-inline-start:auto" @click="ruleDel(i)">{{ t("cats.del") }}</button></div>
            <div v-if="!S.rules.length" class="sm" style="padding:4px 2px 10px">{{ t("cats.r.none") }}</div>
          </div>
          <div class="tools ssb" style="padding-top:0;margin-top:-6px"><input id="rk" v-model="rk" @keydown.enter.prevent="ruleAdd" :placeholder="t('cats.ifDescPh')"><select id="rc" :value="newRuleCat" @change="rc = $event.target.value"><option v-for="c in names" :key="c" :value="c">{{ catLabel(c) }}</option></select><button type="button" class="btn" @click="ruleAdd">{{ t("cats.addRule") }}</button></div>
        </div>
      </div>

      <!-- Tags -->
      <div v-show="catTab == 'tags'" id="setTags">
        <div class="rtool"><input v-model="searches.tags" class="rsearch" type="search" :placeholder="t('cats.search.tags')" :aria-label="t('cats.search.label')" autocomplete="off"></div>
        <div v-if="none.tags" class="rsnone sm">{{ t("cats.search.none", { q: none.tags }) }}</div>
        <div class="card ss">
          <SetHead icon="tag" :title="t('cats.g.title')" :desc="t('cats.g.desc')" :count="tagRows.length" />
          <div class="ssb p">
            <div v-if="tagRows.length" class="mgrid">
              <div v-for="x in tagRows" :key="x.g" class="mrow" style="--mc:var(--acc)"><span class="mic">#</span><div class="mt"><span class="catl" @click="goTag(x.g)">{{ x.g }}</span><small>{{ x.rule ? t("cats.g.byRule", { n: x.n }, x.n) : t("cats.c.count", { n: x.n }, x.n) }}</small></div>
                <div class="mx"><button type="button" class="mb" :aria-label="t('cats.c.renameAria', { k: x.g })" :data-tip="t('cats.g.renameTip')" @click="renOpen('tag', x.g)">✎</button><button type="button" class="mb" :aria-label="t('cats.c.delAria', { k: x.g })" :data-tip="t('cats.g.delTip')" @click="tagDel(x.g)">×</button></div></div>
            </div>
            <div v-else class="sm" style="padding:2px 2px 8px">{{ t("cats.g.none") }}</div>
            <div class="sm" style="margin-top:10px">{{ t("cats.g.appear") }}</div>
            <div class="flex" style="margin-top:12px"><button type="button" class="btn o s" @click="setTab('tagrules')">{{ t("cats.g.goRules") }}</button></div>
          </div>
        </div>
      </div>

      <!-- Tag rules -->
      <div v-show="catTab == 'tagrules'" id="setTagrules">
        <div class="rtool"><input v-model="searches.tagrules" class="rsearch" type="search" :placeholder="t('cats.search.tagrules')" :aria-label="t('cats.search.label')" autocomplete="off"></div>
        <div v-if="none.tagrules" class="rsnone sm">{{ t("cats.search.none", { q: none.tagrules }) }}</div>
        <div class="card ss">
          <SetHead icon="tag" :title="t('cats.tr.title')" :desc="t('cats.tr.desc')" :count="S.tagRules.length" />
          <div class="ssb p">
            <div v-for="(r, i) in S.tagRules" :key="i + '|' + r.k" class="rule"><span>{{ t("cats.ifDesc") }}</span><input data-c="trk" :data-i="i" :value="r.k" :aria-label="t('cats.text')" @change="trText(i, $event)"><span>→</span><TagEditor :tags="C.ruleTags(r)" @add="trTagsAdd(i, $event)" @remove="trTagRemove(i, $event)" @go="goTag" /><button type="button" class="btn o s" style="margin-inline-start:auto" @click="trDel(i)">{{ t("cats.del") }}</button></div>
            <div v-if="!S.tagRules.length" class="sm" style="padding:4px 2px 10px">{{ t("cats.tr.none") }}</div>
          </div>
          <div class="tools ssb" style="padding-top:0;margin-top:-6px"><input id="trk" v-model="trk" @keydown.enter.prevent="trAdd" :placeholder="t('cats.ifDescPh')"><div style="flex:1 1 240px;min-width:200px"><TagEditor ref="newEd" :tags="newRuleTags" :commit-on-blur="false" @add="newTagsAdd" @remove="newRuleTags.splice($event, 1)" @go="goTag" /></div><button type="button" class="btn" @click="trAdd">{{ t("cats.addRule") }}</button></div>
        </div>
      </div>

      <!-- Name rules (no search bar) -->
      <div v-show="catTab == 'names'" id="setNames">
        <div class="card ss">
          <SetHead icon="rules" :title="t('cats.n.title')" :desc="t('cats.n.desc')" :count="nameRules.length" />
          <div class="ssb p">
            <div v-for="(r, i) in nameRules" :key="i" class="rule"><span>{{ t("cats.n.if") }}</span>
              <select data-c="nrf" :data-i="i" :value="r.f || 'any'" :aria-label="t('cats.n.field')" @change="nameEdit(i, 'f', $event)"><option v-for="f in C.NFIELDS" :key="f" :value="f">{{ t("cats.n.f." + f) }}</option></select>
              <select data-c="nrm" :data-i="i" :value="r.m == 'eq' ? 'eq' : 'in'" :aria-label="t('cats.n.how')" @change="nameEdit(i, 'm', $event)"><option value="in">{{ t("cats.n.in") }}</option><option value="eq">{{ t("cats.n.eq") }}</option></select>
              <input data-c="nrk" :data-i="i" :value="r.k" :aria-label="t('cats.text')" @change="nameEdit(i, 'k', $event)"><span>→</span><input data-c="nrn" :data-i="i" :value="r.n" :aria-label="t('cats.n.name')" @change="nameEdit(i, 'n', $event)"><button type="button" class="btn o s" style="margin-inline-start:auto" @click="nameDel(i)">{{ t("cats.del") }}</button></div>
            <div v-if="!nameRules.length" class="sm" style="padding:4px 2px 10px">{{ t("cats.n.none") }}</div>
          </div>
          <div class="tools ssb" style="padding-top:0;margin-top:-6px">
            <select id="nrf" v-model="nr.f" :aria-label="t('cats.n.field')"><option v-for="f in C.NFIELDS" :key="f" :value="f">{{ t("cats.n.f." + f) }}</option></select>
            <select id="nrm" v-model="nr.m" :aria-label="t('cats.n.how')"><option value="in">{{ t("cats.n.in") }}</option><option value="eq">{{ t("cats.n.eq") }}</option></select>
            <input id="nrk" v-model="nr.k" @keydown.enter.prevent="nameAdd" :placeholder="t('cats.n.textPh')"><input id="nrn" v-model="nr.n" @keydown.enter.prevent="nameAdd" :placeholder="t('cats.n.namePh')"><button type="button" class="btn" @click="nameAdd">{{ t("cats.addRule") }}</button>
          </div>
        </div>
      </div>

      <!-- Card and salary rules -->
      <div v-show="catTab == 'gen'" id="setGen">
        <div class="rtool"><input v-model="searches.gen" class="rsearch" type="search" :placeholder="t('cats.search.gen')" :aria-label="t('cats.search.label')" autocomplete="off"></div>
        <div v-if="none.gen" class="rsnone sm">{{ t("cats.search.none", { q: none.gen }) }}</div>
        <div class="card ss">
          <SetHead icon="rules" :title="t('cats.gen.cardTitle')" :desc="t('cats.gen.cardDesc')" :count="(S.cardRules || []).length" />
          <div class="ssb p">
            <div v-for="(r, i) in S.cardRules || []" :key="i + r" class="rule"><span>{{ t("cats.gen.ifIn") }}</span><b class="gtxt">{{ r }}</b><span>→</span><b>{{ t("cats.gen.cardPay") }}</b><button type="button" class="btn o s" style="margin-inline-start:auto" @click="ccDel(i)">{{ t("cats.del") }}</button></div>
            <div v-if="!(S.cardRules || []).length" class="sm" style="padding:4px 2px 10px">{{ t("cats.gen.cardNone") }}</div>
          </div>
          <div class="tools ssb" style="padding-top:0;margin-top:-6px"><input id="ccr" v-model="ccr" @keydown.enter.prevent="ccAdd" :placeholder="t('cats.gen.cardPh')"><button type="button" class="btn" @click="ccAdd">{{ t("cats.addRule") }}</button></div>
          <div class="sm ssb" style="padding-top:0;line-height:1.55">{{ t("cats.gen.cardAuto", { list: C.CARD_NAMES.join(", ") }) }}</div>
        </div>
        <div class="card ss">
          <SetHead icon="rules" :title="t('cats.gen.salTitle')" :desc="t('cats.gen.salDesc')" :count="(S.salaryRules || []).length" />
          <div class="ssb p">
            <div v-for="(r, i) in S.salaryRules || []" :key="i + r" class="rule"><span>{{ t("cats.gen.ifIn") }}</span><b class="gtxt">{{ r }}</b><span>→</span><b>{{ t("cats.gen.salary") }}</b><button type="button" class="btn o s" style="margin-inline-start:auto" @click="salDel(i)">{{ t("cats.del") }}</button></div>
            <div v-if="!(S.salaryRules || []).length" class="sm" style="padding:4px 2px 10px">{{ t("cats.gen.salNone") }}</div>
          </div>
          <div class="tools ssb" style="padding-top:0;margin-top:-6px"><input id="slr" v-model="slr" @keydown.enter.prevent="salAdd" :placeholder="t('cats.gen.salPh')"><button type="button" class="btn" @click="salAdd">{{ t("cats.addRule") }}</button></div>
          <div class="sm ssb" style="padding-top:0;line-height:1.55">{{ t("cats.gen.salAuto") }}</div>
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

  <!-- Tag your earlier transactions too? -->
  <BaseSheet :open="!!ask" @close="ask = null">
    <template v-if="ask">
      <h3>{{ t("cats.tr.askTitle") }}</h3>
      <div class="sm" style="margin-bottom:12px;line-height:1.5">{{ ask.isNew ? t("cats.tr.saved") : "" }}{{ t("cats.tr.from", { k: ask.k }) }} <template v-for="(g, j) in ask.tags" :key="g"><b>#{{ g }}</b>{{ j < ask.tags.length - 1 ? " " : "" }}</template>. <b>{{ ask.n }}</b> {{ t("cats.tr.have", ask.n) }}</div>
      <div class="trex">
        <div v-for="x in ask.rows" :key="x.id"><span>{{ dstr(x.d) }}</span><b>{{ displayName(S, x) }}</b><span class="num">{{ fm(Math.abs(x.a)) }}</span></div>
        <div v-if="ask.n > 4" class="sm">{{ t("cats.tr.more", { n: ask.n - 4 }) }}</div>
      </div>
      <div class="flex" style="justify-content:flex-end;gap:10px;margin-top:14px"><button type="button" class="btn o" @click="ask = null">{{ t("cats.tr.onlyNew") }}</button><button type="button" class="btn" @click="trApply">{{ t("cats.tr.tagN", { n: ask.n }) }}</button></div>
    </template>
  </BaseSheet>
</template>
