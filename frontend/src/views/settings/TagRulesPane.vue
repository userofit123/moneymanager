<script setup>
// Settings → Automatic sorting → Tag rules: if a description contains a text, it gets one or more tags.
// After a rule is added or changed it offers to tag the transactions you already have.
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { goActivity } from "../../core/shell.js";
import { searches, useRowSearch } from "../../core/rowSearch.js";
import { fm } from "../../format.js";
import { dstr } from "../../dates.js";
import { displayName } from "../../lib/activity.js";
import * as C from "../../lib/categories.js";
import BaseSheet from "../../components/BaseSheet.vue";
import TagEditor from "../../components/TagEditor.vue";
import SetHead from "./SetHead.vue";
import { save, err, ok, newRuleTags } from "./sorting.js";

const { t } = useI18n();
const tk = (k, ...a) => t("settings.sorting." + k, ...a);
const S = computed(() => data.state.value);
const root = ref(null), none = useRowSearch(root, "tagrules");
const tags = (L) => L.map((g) => "#" + g).join(" ");
const goTag = (g) => goActivity({ tag: g });

const trk = ref(""), newEd = ref(null), ask = ref(null);
// After a tag rule is added or changed: offer to tag the transactions you already have (tagRuleAsk).
function tagRuleAsk(i, isNew) {
  const r = S.value.tagRules[i]; if (!r) return;
  const L = C.tagRuleMatches(S.value, r), tg = C.ruleTags(r);
  if (!L.length) { ok(isNew ? tk("tr.addedNew", { k: r.k, tags: tags(tg) }) : tk("tr.updatedNone")); return; }
  ask.value = { i, isNew, k: r.k, tags: tg, n: L.length, rows: L.slice(0, 4) };
}
function trApply() { const out = {}, i = ask.value.i; ask.value = null; if (save((n) => C.applyTagRulePast(n, i, out))) ok(tk("tr.tagged", { n: out.n }, out.n)); }
function trText(i, ev) { const r = S.value.tagRules[i], v = ev.target.value.trim(); if (!v) { ev.target.value = r.k; return; } if (save((n) => C.setTagRuleText(n, i, v))) tagRuleAsk(i); }
function trTagsAdd(i, L) { if (save((n) => C.addTagRuleTags(n, i, L))) tagRuleAsk(i); }
function trTagRemove(i, at) { if (C.ruleTags(S.value.tagRules[i]).length <= 1) return err(tk("tr.last")); save((n) => C.removeTagRuleTag(n, i, at)); }
const trDel = (i) => save((n) => C.deleteTagRule(n, i));
function newTagsAdd(L) { for (const g of L) if (!newRuleTags.value.includes(g)) newRuleTags.value.push(g); }
function trAdd() {
  const k = trk.value.trim(); if (!k) return;
  newTagsAdd(newEd.value?.take() || []); // tags typed but not added yet count too
  if (!newRuleTags.value.length) return err(tk("tr.needTag"));
  save((n) => C.addTagRule(n, k, newRuleTags.value));
  newRuleTags.value = []; trk.value = "";
  tagRuleAsk(S.value.tagRules.length - 1, true);
}
</script>

<template>
  <div id="setTagrules" ref="root">
    <template v-if="S">
      <div class="rtool"><input v-model="searches.tagrules" class="rsearch" type="search" :placeholder="tk('search.tagrules')" :aria-label="t('cats.search.label')" autocomplete="off"></div>
      <div v-if="none" class="rsnone sm">{{ t("cats.search.none", { q: none }) }}</div>
      <div class="card ss">
        <SetHead icon="tag" :title="tk('tr.title')" :desc="tk('tr.desc')" :count="S.tagRules.length" />
        <div class="ssb p">
          <div v-for="(r, i) in S.tagRules" :key="i + '|' + r.k" class="rule"><span>{{ tk("ifDesc") }}</span><input data-c="trk" :data-i="i" :value="r.k" :aria-label="tk('text')" @change="trText(i, $event)"><span>→</span><TagEditor :tags="C.ruleTags(r)" @add="trTagsAdd(i, $event)" @remove="trTagRemove(i, $event)" @go="goTag" /><button type="button" class="btn o s" style="margin-inline-start:auto" @click="trDel(i)">{{ tk("del") }}</button></div>
          <div v-if="!S.tagRules.length" class="sm" style="padding:4px 2px 10px">{{ tk("tr.none") }}</div>
        </div>
        <div class="tools ssb" style="padding-top:0;margin-top:-6px"><input id="trk" v-model="trk" @keydown.enter.prevent="trAdd" :placeholder="tk('ifDescPh')"><div style="flex:1 1 240px;min-width:200px"><TagEditor ref="newEd" :tags="newRuleTags" :commit-on-blur="false" @add="newTagsAdd" @remove="newRuleTags.splice($event, 1)" @go="goTag" /></div><button type="button" class="btn" @click="trAdd">{{ tk("addRule") }}</button></div>
      </div>
    </template>

    <!-- Tag your earlier transactions too? -->
    <BaseSheet :open="!!ask" @close="ask = null">
      <template v-if="ask">
        <h3>{{ tk("tr.askTitle") }}</h3>
        <div class="sm" style="margin-bottom:12px;line-height:1.5">{{ ask.isNew ? tk("tr.saved") : "" }}{{ tk("tr.from", { k: ask.k }) }} <template v-for="(g, j) in ask.tags" :key="g"><b>#{{ g }}</b>{{ j < ask.tags.length - 1 ? " " : "" }}</template>. <b>{{ ask.n }}</b> {{ tk("tr.have", ask.n) }}</div>
        <div class="trex">
          <div v-for="x in ask.rows" :key="x.id"><span>{{ dstr(x.d) }}</span><b>{{ displayName(S, x) }}</b><span class="num">{{ fm(Math.abs(x.a)) }}</span></div>
          <div v-if="ask.n > 4" class="sm">{{ tk("tr.more", { n: ask.n - 4 }) }}</div>
        </div>
        <div class="flex" style="justify-content:flex-end;gap:10px;margin-top:14px"><button type="button" class="btn o" @click="ask = null">{{ tk("tr.onlyNew") }}</button><button type="button" class="btn" @click="trApply">{{ tk("tr.tagN", { n: ask.n }) }}</button></div>
      </template>
    </BaseSheet>
  </div>
</template>
