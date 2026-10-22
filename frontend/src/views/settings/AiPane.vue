<script setup>
// Settings → Automatic sorting → Set up with an AI: download the transaction texts, copy the instructions for an AI chat,
// then upload (or paste) its answer, check what it adds and add it. The checks and the change come from lib/aiSort.js.
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { toast } from "../../core/toast.js";
import { copyText } from "./errlog.js";
import { exportTexts, readAnswer, choose, wouldSort, addAnswer, answerExample, planSize, rowKey, rowState, flip } from "../../lib/aiSort.js";
import SetHead from "./SetHead.vue";

const { t, locale } = useI18n();
const S = computed(() => data.state.value);
const file = ref(null), pasted = ref(""), found = ref(null), off = ref({});

const prompt = computed(() => t("settings.sorting.ai.prompt") + "\n\n" + answerExample({
  cat: t("settings.sorting.ai.exCat"), inc: t("settings.sorting.ai.exInc"), tag: t("settings.sorting.ai.exTag"),
  shop: t("settings.sorting.ai.exShop"), stay: t("settings.sorting.ai.exStay"), messy: t("settings.sorting.ai.exMessy"), shown: t("settings.sorting.ai.exShown"),
  card: t("settings.sorting.ai.exCard"), pay: t("settings.sorting.ai.exPay"),
}));
const nTexts = computed(() => (S.value ? exportTexts(S.value, locale.value).texts.length : 0));

function download() {
  const body = JSON.stringify(exportTexts(S.value, locale.value), null, 1);
  const l = document.createElement("a");
  l.href = URL.createObjectURL(new Blob([body], { type: "application/json" }));
  l.download = "transaction-texts.json"; l.click();
  setTimeout(() => URL.revokeObjectURL(l.href), 1000);
}
const copy = () => copyText(prompt.value, t("settings.sorting.ai.copied"));

function check(raw) {
  const r = readAnswer(S.value, raw);
  if (r.error) { found.value = null; toast(t("settings.sorting.ai.bad"), { kind: "err" }); return; }
  off.value = {}; found.value = planSize(r.plan) ? r : null;
  if (!found.value) toast(t("settings.sorting.ai.none"), { kind: "info" });
}
async function upload(e) { const f = e.target.files?.[0]; e.target.value = ""; if (f) check(await f.text()); }

const plan = computed(() => (found.value ? choose(found.value.plan, off.value) : null));
// One table per kind that has rows: its title, the count text, an optional line saying what it does, and the column names.
const A = "settings.sorting.ai.";
const SECS = [
  { kind: "cats", title: "secCats", n: "nCats", cols: ["colName", "colKind", "colRules"] },
  { kind: "rules", title: "secRules", n: "nRules", cols: ["colText", "colCat"] },
  { kind: "tagRules", title: "secTags", n: "nTagRules", cols: ["colText", "colTags"] },
  { kind: "names", title: "secNames", n: "nNames", cols: ["colText", "colShown"] },
  { kind: "cards", title: "secCards", n: "nCards", d: "dCards", cols: ["colTextOnly"] },
  { kind: "salary", title: "secSalary", n: "nSalary", d: "dSalary", cols: ["colTextOnly"] },
];
const secs = computed(() => (found.value ? SECS.filter((x) => found.value.plan[x.kind].length) : []));
const rows = (kind) => found.value.plan[kind];
const st = (kind, x) => rowState(off.value, kind, x);
const toggle = (kind, x) => { off.value = flip(off.value, kind, [rowKey(kind, x)], !st(kind, x).on); };
const allOn = (kind) => rows(kind).every((x) => st(kind, x).on || st(kind, x).locked);
const setAll = (kind) => { off.value = flip(off.value, kind, rows(kind).map((x) => rowKey(kind, x)), !allOn(kind)); };
const rulesFor = (name) => found.value.plan.rules.filter((r) => r.c == name).length;
const count = (s) => t(A + s.n, { n: plan.value[s.kind].length }, plan.value[s.kind].length);
const total = computed(() => (plan.value ? planSize(plan.value) : 0));
const sortN = computed(() => (plan.value ? wouldSort(S.value, plan.value) : 0));
function add() {
  const p = plan.value, n = planSize(p);
  if (!data.change((d) => addAnswer(d, p)).length) return;
  toast(t(A + "done", { n }, n), { kind: "ok" });
  found.value = null; pasted.value = "";
}
</script>

<template>
  <div id="aiSort" class="card ss">
    <SetHead icon="rules" :title="t('settings.sorting.ai.title')" :desc="t('settings.sorting.ai.desc')" />
    <div class="ssb p">
      <div class="sinfo aip">{{ t("settings.sorting.ai.privacy") }}</div>
      <ol class="aisteps">
        <li><span>{{ t("settings.sorting.ai.s1", { n: nTexts }, nTexts) }}</span><button type="button" class="btn o s" :disabled="!nTexts" @click="download">{{ t("settings.sorting.ai.s1b") }}</button></li>
        <li><span>{{ t("settings.sorting.ai.s2") }}</span><button type="button" class="btn o s" @click="copy">{{ t("settings.sorting.ai.s2b") }}</button></li>
        <li><span>{{ t("settings.sorting.ai.s3") }}</span><button type="button" class="btn s" @click="file.click()">{{ t("settings.sorting.ai.s3b") }}</button>
          <input ref="file" type="file" accept=".json,.txt,application/json,text/plain" style="display:none" @change="upload"></li>
      </ol>
      <details class="aimore"><summary>{{ t("settings.sorting.ai.see") }}</summary><pre dir="auto">{{ prompt }}</pre></details>
      <details class="aimore"><summary>{{ t("settings.sorting.ai.pasteQ") }}</summary>
        <label class="fld">{{ t("settings.sorting.ai.pasteL") }}<textarea v-model="pasted" rows="4" dir="ltr" /></label>
        <button type="button" class="btn o s" :disabled="!pasted.trim()" @click="check(pasted)">{{ t("settings.sorting.ai.pasteGo") }}</button>
      </details>

      <div v-if="plan" class="aiprev">
        <b>{{ t(A + "prev") }}</b>
        <section v-for="s in secs" :key="s.kind" class="aisec">
          <div class="aish"><b>{{ t(A + s.title) }}</b><small>{{ count(s) }}</small>
            <button type="button" class="btn o s" @click="setAll(s.kind)">{{ t(A + (allOn(s.kind) ? "noneSel" : "all")) }}</button></div>
          <div v-if="s.d" class="sm">{{ t(A + s.d) }}</div>
          <div class="aitbl"><table>
            <thead><tr><th class="ck" /><th v-for="c in s.cols" :key="c">{{ t(A + c) }}</th></tr></thead>
            <tbody>
              <tr v-for="x in rows(s.kind)" :key="rowKey(s.kind, x)" :class="{ off: !st(s.kind, x).on }" :data-tip="st(s.kind, x).locked ? t(A + 'catOff') : null">
                <td class="ck"><input type="checkbox" :checked="st(s.kind, x).on" :disabled="st(s.kind, x).locked" :aria-label="String(s.kind == 'cats' ? x.name : rowKey(s.kind, x))" @change="toggle(s.kind, x)"></td>
                <template v-if="s.kind == 'cats'"><td>{{ x.name }}</td><td>{{ t(A + (x.income ? "income" : "spend")) }}</td><td class="num">{{ rulesFor(x.name) }}</td></template>
                <template v-else-if="s.kind == 'rules'"><td>{{ x.k }}</td><td>{{ x.c }}</td></template>
                <template v-else-if="s.kind == 'tagRules'"><td>{{ x.k }}</td><td><template v-for="g in x.tags" :key="g"><bdi>#{{ g }}</bdi>{{ " " }}</template></td></template>
                <template v-else-if="s.kind == 'names'"><td>{{ x.k }}</td><td>{{ x.n }}</td></template>
                <td v-else>{{ x }}</td>
              </tr>
            </tbody>
          </table></div>
        </section>
        <div class="sm">{{ t(A + "sorts", { n: sortN }, sortN) }}</div>
        <div v-if="found.skipped" class="sm">{{ t(A + "skipped", { n: found.skipped }, found.skipped) }}</div>
        <div class="flex" style="gap:8px;margin-top:10px"><button type="button" class="btn s" :disabled="!total" @click="add">{{ t(A + "add") }}</button><button type="button" class="btn o s" @click="found = null">{{ t(A + "cancel") }}</button></div>
      </div>
    </div>
  </div>
</template>
