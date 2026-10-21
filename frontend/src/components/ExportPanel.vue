<script setup>
// Activity → Export: choose exactly what leaves the app, see it, and download it as a file on this device (buildExport/exSync/exPrev/exGo).
// Opened from Activity it starts from Activity's filters; from Settings it starts empty.
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { now, dayOf } from "../core/clock.js";
import { toast } from "../core/toast.js";
import { catNames, catColor, catLabel } from "../core/cats.js";
import { RANGES } from "../lib/activity.js";
import { EXWHAT, COLKEYS, exDef, exFromActivity, exData, exBuild, exExt, exFile } from "../lib/exporting.js";
import { fm } from "../format.js";

const props = defineProps({ from: { type: String, default: "activity" }, filters: { type: Object, default: null } });
const { t } = useI18n();
const tk = (k, ...a) => t(k, ...a);
const S = computed(() => data.state.value);
const today = computed(() => dayOf(now.value));
const start = () => (props.from !== "settings" && props.filters ? exFromActivity(props.filters) : exDef());
const E = ref(start());
const reset = () => { E.value = exDef(); toast(t("exp.resetDone")); };
watch(() => props.from, () => { E.value = start(); });

const d = computed(() => (S.value ? exData(S.value, E.value, today.value, now.value) : { head: [], rows: [], n: 0 }));
const inc = computed(() => (d.value.L || []).filter((x) => x.a > 0).reduce((s, x) => s + x.a, 0));
const out = computed(() => (d.value.L || []).filter((x) => x.a < 0).reduce((s, x) => s + x.a, 0));
const tx = computed(() => E.value.what == "tx"), cat = computed(() => E.value.what == "cat");
const canGo = computed(() => d.value.all || (d.value.rows.length && !(tx.value && !E.value.cols.length)));
const nMore = computed(() => [E.value.q, E.value.tag, E.value.cats, E.value.accts].filter(Boolean).length);
const allCats = computed(() => catNames(S.value));
const allAccts = computed(() => (S.value?.accounts || []).map((a) => a.n));
const catQ = ref("");
const catList = computed(() => allCats.value.filter((c) => c.toLowerCase().includes(catQ.value.toLowerCase()) || catLabel(c).toLowerCase().includes(catQ.value.toLowerCase())));
// a checkbox list where "all" is kept as null (so new categories are in by default)
const has = (set, v) => !set || set.has(v);
function tick(key, all, v, on) { let s = E.value[key] ? new Set(E.value[key]) : new Set(all); on ? s.add(v) : s.delete(v); E.value[key] = s.size == all.length ? null : s; }
const setAll = (key, v) => { E.value[key] = v == "all" ? null : new Set(); };
const setCol = (c, on) => { E.value.cols = COLKEYS.filter((k) => (k == c ? on : E.value.cols.includes(k))); };
const colsAll = (v) => { E.value.cols = v == "all" ? [...COLKEYS] : []; };

function go() {
  const f = exBuild(S.value, E.value, d.value, today.value);
  const l = document.createElement("a"); l.href = URL.createObjectURL(new Blob([f.body], { type: f.mime })); l.download = f.name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(l.href), 4000);
  data.change(() => [["Exported data", `${E.value.what} · ${d.value.all ? "all data" : d.value.n + " rows"} · ${f.name}`]]);
  toast(t("exp.done", { name: f.name }));
}
</script>

<template>
  <div class="exp">
    <div class="exhead"><h3>{{ t("exp.title") }}</h3></div>
    <div class="exlay">
      <div class="excol">
        <div class="card exsec"><div class="exs"><div class="exh">{{ t("exp.what") }}</div><div class="fld" style="margin:0"><select v-model="E.what" :aria-label="t('exp.what')"><option v-for="w in EXWHAT" :key="w" :value="w">{{ tk("exp.w." + w) }}</option></select><div class="sm" style="margin-top:6px">{{ tk("exp.w." + E.what + "D") }}</div></div></div></div>
        <div v-show="tx || cat" id="exFilt" class="excol">
          <div class="card exsec"><div class="exs"><div class="exh">{{ t("exp.period") }}</div>
            <div class="two"><div class="fld"><label for="exP">{{ t("exp.periodL") }}</label><select id="exP" v-model="E.p"><option v-for="r in RANGES" :key="r" :value="r">{{ tk("activity.range." + r) }}</option><option value="custom">{{ t("activity.range.custom") }}</option></select></div>
              <div class="fld"><label for="exTy">{{ t("exp.type") }}</label><select id="exTy" v-model="E.ty"><option value="all">{{ t("exp.tyAll") }}</option><option value="income">{{ t("exp.tyInc") }}</option><option value="expense">{{ t("exp.tyExp") }}</option></select></div></div>
            <div v-if="E.p === 'custom'" class="fld"><label>{{ t("exp.fromTo") }}</label><div class="flex" style="gap:6px"><input v-model="E.from" type="date" :aria-label="t('exp.fromTo')"><input v-model="E.to" type="date" :aria-label="t('exp.fromTo')"></div></div>
          </div></div>
          <div class="card exsec"><div class="exs"><div class="exh">{{ t("exp.also") }}</div><div class="exbox exrows">
            <label class="tg" :data-tip="t('exp.xfTip')"><span>{{ t("exp.xf") }}</span><input v-model="E.xf" type="checkbox"></label>
            <label class="tg" :data-tip="t('exp.cpTip')"><span>{{ t("exp.cp") }}</span><input v-model="E.cp" type="checkbox"></label>
            <label class="tg" :data-tip="t('exp.futTip')"><span>{{ t("exp.fut") }}</span><input v-model="E.fut" type="checkbox"></label>
          </div></div></div>
          <details class="card exsec exd" open><summary><span>{{ t("exp.moreF") }}</span><span class="sm">{{ nMore ? t("exp.active", { n: nMore }) : "" }}</span></summary><div class="exdb">
            <div class="exgrp"><div class="two"><div class="fld"><label for="exQ">{{ t("exp.textC") }}</label><input id="exQ" v-model="E.q" :placeholder="t('exp.textPh')"></div><div class="fld"><label for="exTag">{{ t("exp.tag") }}</label><input id="exTag" v-model="E.tag" :placeholder="t('exp.tagPh')"></div></div></div>
            <div class="exgrp"><div class="exgh"><span class="exh">{{ t("exp.cats") }} <span>{{ E.cats ? t("exp.sel", { n: E.cats.size }) : t("exp.selAll") }}</span></span><span class="exgb"><button type="button" class="btn o s" @click="setAll('cats', 'all')">{{ t("exp.all") }}</button><button type="button" class="btn o s" @click="setAll('cats', 'none')">{{ t("exp.none") }}</button></span></div>
              <input v-model="catQ" class="exfind" :placeholder="t('exp.findCat')" :aria-label="t('exp.findCat')">
              <div class="exgrid exscroll"><label v-for="c in catList" :key="c" class="exo" style="display:flex;margin:0 0 4px"><input type="checkbox" :checked="has(E.cats, c)" @change="tick('cats', allCats, c, $event.target.checked)"><span class="dot" :style="{ background: catColor(S, c) }"></span> {{ catLabel(c) }}</label><div v-if="!catList.length" class="sm">{{ t("exp.noCat") }}</div></div></div>
            <div class="exgrp"><div class="exgh"><span class="exh">{{ t("exp.accts") }} <span>{{ E.accts ? t("exp.sel", { n: E.accts.size }) : t("exp.selAll") }}</span></span><span class="exgb"><button type="button" class="btn o s" @click="setAll('accts', 'all')">{{ t("exp.all") }}</button><button type="button" class="btn o s" @click="setAll('accts', 'none')">{{ t("exp.none") }}</button></span></div>
              <div class="exgrid"><label v-for="a in S.accounts" :key="a.n + a.cur" class="exo" style="display:flex;margin:0"><input type="checkbox" :checked="has(E.accts, a.n)" @change="tick('accts', allAccts, a.n, $event.target.checked)"> {{ a.n }} · {{ a.cur }}</label></div></div>
          </div></details>
          <details v-show="tx" class="card exsec exd" open><summary><span>{{ t("exp.cols") }}</span><span class="sm">{{ t("exp.colsN", { n: E.cols.length, total: COLKEYS.length }) }}</span></summary><div class="exdb"><div class="exgrp">
            <div class="exgh"><span class="exh">{{ t("exp.colsIn") }}</span><span class="exgb"><button type="button" class="btn o s" @click="colsAll('all')">{{ t("exp.all") }}</button><button type="button" class="btn o s" @click="colsAll('none')">{{ t("exp.none") }}</button></span></div>
            <div class="exgrid"><label v-for="c in COLKEYS" :key="c" class="exo" style="display:flex;margin:0"><input type="checkbox" :checked="E.cols.includes(c)" @change="setCol(c, $event.target.checked)"> {{ tk("exp.c." + c) }}</label></div>
          </div></div></details>
        </div>
      </div>
      <aside class="exside card">
        <div class="exs"><div class="exh">{{ t("exp.preview") }}</div><div class="exprev">
          <div v-if="d.all" class="sm">{{ t("exp.everything") }}</div>
          <div v-else-if="tx" class="exst"><div><b>{{ d.n }}</b><span>{{ t("exp.txN", d.n) }}</span></div><div><b class="pos">{{ fm(inc) }}</b><span>{{ t("exp.in") }}</span></div><div><b>{{ fm(-out) }}</b><span>{{ t("exp.out") }}</span></div></div>
          <div v-else class="exst"><div><b>{{ d.n }}</b><span>{{ t("exp.rowN", d.n) }}</span></div></div>
        </div></div>
        <div v-if="!d.all" class="exs"><div class="exh">{{ t("exp.first") }}</div>
          <template v-if="d.rows.length"><div class="exsamp"><table class="rt"><thead><tr><th v-for="h in d.head" :key="h">{{ h }}</th></tr></thead><tbody><tr v-for="(r, i) in d.rows.slice(0, 6)" :key="i"><td v-for="(v, j) in r" :key="j">{{ v }}</td></tr></tbody></table></div><div v-if="d.rows.length > 6" class="sm" style="margin-top:6px">{{ t("exp.more", { n: d.rows.length - 6 }) }}</div></template>
          <div v-else class="sm">{{ t("exp.nothing") }}</div>
        </div>
        <div class="exs"><div class="exh">{{ t("exp.file") }}</div><div class="two" style="margin:0">
          <div class="fld" style="margin:0"><label for="exName">{{ t("exp.fileName") }}</label><div class="exname"><input id="exName" v-model="E.name" maxlength="80" autocomplete="off" :placeholder="exFile(E, today)" :aria-label="t('exp.fileName')"><span class="sm">{{ exExt(E) }}</span></div></div>
          <div class="fld" style="margin:0"><label for="exFmt">{{ t("exp.fileType") }}</label><select id="exFmt" v-model="E.fmt"><option value="csv">{{ t("exp.csv") }}</option><option value="json">{{ t("exp.json") }}</option></select></div>
        </div></div>
        <div class="exfoot"><button type="button" class="btn o" @click="reset">{{ t("exp.reset") }}</button><button type="button" class="btn" :disabled="!canGo" @click="go">{{ t("exp.download") }}</button></div>
      </aside>
    </div>
  </div>
</template>
