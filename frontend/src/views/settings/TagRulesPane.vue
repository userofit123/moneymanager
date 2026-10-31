<script setup>
// Settings → Automatic sorting → Tag rules: if a description contains a text, it gets one or more tags.
// After a rule is added or changed it offers to tag the transactions you already have.
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { goActivity } from "../../core/shell.js";
import { fm } from "../../format.js";
import { dstr } from "../../dates.js";
import { displayName } from "../../lib/activity.js";
import * as C from "../../lib/categories.js";
import BaseSheet from "../../components/BaseSheet.vue";
import TagEditor from "../../components/TagEditor.vue";
import RuleList from "./RuleList.vue";
import { save, err, ok, newRuleTags } from "./sorting.js";

const { t } = useI18n();
const tk = (k, ...a) => t("settings.sorting." + k, ...a);
const S = computed(() => data.state.value);
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
  <RuleList v-if="S" id="setTagrules" icon="tag" :title="tk('tr.title')" :desc="tk('tr.desc')" :count="S.tagRules.length" search="tagrules" :search-ph="tk('search.tagrules')" :empty="tk('tr.none')" @add="trAdd">
    <template #add><input id="trk" v-model="trk" :placeholder="tk('ifDescPh')" :aria-label="tk('text')" @keydown.enter.prevent="trAdd"><div class="rltags"><TagEditor ref="newEd" :tags="newRuleTags" :commit-on-blur="false" @add="newTagsAdd" @remove="newRuleTags.splice($event, 1)" @go="goTag" /></div></template>
    <div v-for="(r, i) in S.tagRules" :key="i + '|' + r.k" class="rule"><span>{{ tk("ifDesc") }}</span><input data-c="trk" :data-i="i" :value="r.k" :aria-label="tk('text')" @change="trText(i, $event)"><span class="rarr">→</span><TagEditor :tags="C.ruleTags(r)" @add="trTagsAdd(i, $event)" @remove="trTagRemove(i, $event)" @go="goTag" /><button type="button" class="btn o s rdel" @click="trDel(i)">{{ tk("del") }}</button></div>
    <template #foot>{{ tk("tr.foot") }}</template>

    <!-- Tag your earlier transactions too? -->
    <template #after>
      <BaseSheet :open="!!ask" @close="ask = null">
        <template v-if="ask">
          <h3>{{ tk("tr.askTitle") }}</h3>
          <div class="sm trq">{{ ask.isNew ? tk("tr.saved") : "" }}{{ tk("tr.from", { k: ask.k }) }} <template v-for="(g, j) in ask.tags" :key="g"><b>#{{ g }}</b>{{ j < ask.tags.length - 1 ? " " : "" }}</template>. <b>{{ ask.n }}</b> {{ tk("tr.have", ask.n) }}</div>
          <div class="trex">
            <div v-for="x in ask.rows" :key="x.id"><span>{{ dstr(x.d) }}</span><b>{{ displayName(S, x) }}</b><span class="num">{{ fm(Math.abs(x.a)) }}</span></div>
            <div v-if="ask.n > 4" class="sm">{{ tk("tr.more", { n: ask.n - 4 }) }}</div>
          </div>
          <div class="cend"><button type="button" class="btn o" @click="ask = null">{{ tk("tr.onlyNew") }}</button><button type="button" class="btn" @click="trApply">{{ tk("tr.tagN", { n: ask.n }) }}</button></div>
        </template>
      </BaseSheet>
    </template>
  </RuleList>
</template>
