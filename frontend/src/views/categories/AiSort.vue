<script setup>
// "Let an AI sort for you" on the Categories tab: download the transaction texts, copy the instructions for an AI chat,
// then upload (or paste) its answer, check what it adds and add it. The checks and the change come from lib/aiSort.js.
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { toast } from "../../core/toast.js";
import { copyText } from "../settings/errlog.js";
import { exportTexts, readAnswer, choose, wouldSort, addAnswer, answerExample } from "../../lib/aiSort.js";
import SetHead from "../settings/SetHead.vue";

const { t, locale } = useI18n();
const S = computed(() => data.state.value);
const file = ref(null), pasted = ref(""), found = ref(null), off = ref([]);

const prompt = computed(() => t("cats.ai.prompt") + "\n\n" + answerExample({ cat: t("cats.ai.exCat"), inc: t("cats.ai.exInc"), tag: t("cats.ai.exTag"), shop: t("cats.ai.exShop"), stay: t("cats.ai.exStay") }));
const nTexts = computed(() => (S.value ? exportTexts(S.value, locale.value).texts.length : 0));

function download() {
  const body = JSON.stringify(exportTexts(S.value, locale.value), null, 1);
  const l = document.createElement("a");
  l.href = URL.createObjectURL(new Blob([body], { type: "application/json" }));
  l.download = "transaction-texts.json"; l.click();
  setTimeout(() => URL.revokeObjectURL(l.href), 1000);
}
const copy = () => copyText(prompt.value, t("cats.ai.copied"));

function check(raw) {
  const r = readAnswer(S.value, raw);
  if (r.error) { found.value = null; toast(t("cats.ai.bad"), { kind: "err" }); return; }
  off.value = []; found.value = r;
  if (!r.plan.cats.length && !r.plan.rules.length && !r.plan.tagRules.length) { found.value = null; toast(t("cats.ai.none"), { kind: "info" }); }
}
async function upload(e) { const f = e.target.files?.[0]; e.target.value = ""; if (f) check(await f.text()); }

const plan = computed(() => (found.value ? choose(found.value.plan, off.value) : null));
const toggle = (name) => { off.value = off.value.includes(name) ? off.value.filter((x) => x != name) : [...off.value, name]; };
const rulesFor = (name) => found.value.plan.rules.filter((r) => r.c == name).length;
const sortN = computed(() => (plan.value ? wouldSort(S.value, plan.value) : 0));
function add() {
  const p = plan.value;
  if (!data.change((n) => addAnswer(n, p)).length) return;
  toast(t("cats.ai.done", { c: p.cats.length, r: p.rules.length, g: p.tagRules.length }), { kind: "ok" });
  found.value = null; pasted.value = "";
}
</script>

<template>
  <div id="aiSort" class="card ss">
    <SetHead icon="rules" :title="t('cats.ai.title')" :desc="t('cats.ai.desc')" />
    <div class="ssb p">
      <div class="sinfo aip">{{ t("cats.ai.privacy") }}</div>
      <ol class="aisteps">
        <li><span>{{ t("cats.ai.s1", { n: nTexts }, nTexts) }}</span><button type="button" class="btn o s" :disabled="!nTexts" @click="download">{{ t("cats.ai.s1b") }}</button></li>
        <li><span>{{ t("cats.ai.s2") }}</span><button type="button" class="btn o s" @click="copy">{{ t("cats.ai.s2b") }}</button></li>
        <li><span>{{ t("cats.ai.s3") }}</span><button type="button" class="btn s" @click="file.click()">{{ t("cats.ai.s3b") }}</button>
          <input ref="file" type="file" accept=".json,.txt,application/json,text/plain" style="display:none" @change="upload"></li>
      </ol>
      <details class="aimore"><summary>{{ t("cats.ai.see") }}</summary><pre dir="auto">{{ prompt }}</pre></details>
      <details class="aimore"><summary>{{ t("cats.ai.pasteQ") }}</summary>
        <label class="fld">{{ t("cats.ai.pasteL") }}<textarea v-model="pasted" rows="4" dir="ltr" /></label>
        <button type="button" class="btn o s" :disabled="!pasted.trim()" @click="check(pasted)">{{ t("cats.ai.pasteGo") }}</button>
      </details>

      <div v-if="plan" class="aiprev">
        <b>{{ t("cats.ai.prev") }}</b>
        <label v-for="x in found.plan.cats" :key="x.name" class="chk"><input type="checkbox" :checked="!off.includes(x.name)" @change="toggle(x.name)">
          <span>{{ x.name }}<small v-if="x.income"> · {{ t("cats.ai.income") }}</small><small> · {{ t("cats.ai.nRules", { n: rulesFor(x.name) }, rulesFor(x.name)) }}</small></span></label>
        <div class="sm">{{ [t("cats.ai.nCats", { n: plan.cats.length }, plan.cats.length), t("cats.ai.nRules", { n: plan.rules.length }, plan.rules.length), t("cats.ai.nTagRules", { n: plan.tagRules.length }, plan.tagRules.length)].join(" · ") }}</div>
        <div class="sm">{{ t("cats.ai.sorts", { n: sortN }, sortN) }}</div>
        <div v-if="found.skipped" class="sm">{{ t("cats.ai.skipped", { n: found.skipped }, found.skipped) }}</div>
        <div class="flex" style="gap:8px;margin-top:10px"><button type="button" class="btn s" :disabled="!plan.cats.length && !plan.rules.length && !plan.tagRules.length" @click="add">{{ t("cats.ai.add") }}</button><button type="button" class="btn o s" @click="found = null">{{ t("cats.ai.cancel") }}</button></div>
      </div>
    </div>
  </div>
</template>
