<script setup>
// Settings → Automatic sorting → Display names: give entries a clearer name to show (the bank's text stays as it is).
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import * as C from "../../lib/categories.js";
import SetHead from "./SetHead.vue";
import { save, err, ok } from "./sorting.js";

const { t } = useI18n();
const tk = (k, ...a) => t("settings.sorting." + k, ...a);
const S = computed(() => data.state.value);
const nameRules = computed(() => S.value?.cfg?.nameRules || []);
const nr = ref({ f: "any", m: "in", k: "", n: "" });
function nameAdd() {
  const x = nr.value;
  if (!x.k.trim() || !x.n.trim()) return err(tk("n.needBoth"));
  save((n) => C.addNameRule(n, x));
  nr.value = { f: "any", m: "in", k: "", n: "" };
  ok(tk("n.added"));
}
function nameEdit(i, f, ev) {
  if (!save((n) => C.setNameRule(n, i, f, ev.target.value))) return;
  const r = nameRules.value[i];
  if (f == "k" || f == "n") ev.target.value = r[f];
  if (!r.k || !r.n) err(tk("n.needBothEdit"));
}
const nameDel = (i) => save((n) => C.deleteNameRule(n, i));
</script>

<template>
  <!-- no search bar here -->
  <div id="setNames">
    <div v-if="S" class="card ss">
      <SetHead icon="rules" :title="tk('n.title')" :desc="tk('n.desc')" :count="nameRules.length" />
      <div class="tools ssb">
        <select id="nrf" v-model="nr.f" :aria-label="tk('n.field')"><option v-for="f in C.NFIELDS" :key="f" :value="f">{{ tk("n.f." + f) }}</option></select>
        <select id="nrm" v-model="nr.m" :aria-label="tk('n.how')"><option value="in">{{ tk("n.in") }}</option><option value="eq">{{ tk("n.eq") }}</option></select>
        <input id="nrk" v-model="nr.k" @keydown.enter.prevent="nameAdd" :placeholder="tk('n.textPh')"><input id="nrn" v-model="nr.n" @keydown.enter.prevent="nameAdd" :placeholder="tk('n.namePh')"><button type="button" class="btn" @click="nameAdd">{{ tk("addRule") }}</button>
      </div>
      <div class="ssb p">
        <div v-for="(r, i) in nameRules" :key="i" class="rule"><span>{{ tk("n.if") }}</span>
          <select data-c="nrf" :data-i="i" :value="r.f || 'any'" :aria-label="tk('n.field')" @change="nameEdit(i, 'f', $event)"><option v-for="f in C.NFIELDS" :key="f" :value="f">{{ tk("n.f." + f) }}</option></select>
          <select data-c="nrm" :data-i="i" :value="r.m == 'eq' ? 'eq' : 'in'" :aria-label="tk('n.how')" @change="nameEdit(i, 'm', $event)"><option value="in">{{ tk("n.in") }}</option><option value="eq">{{ tk("n.eq") }}</option></select>
          <input data-c="nrk" :data-i="i" :value="r.k" :aria-label="tk('text')" @change="nameEdit(i, 'k', $event)"><span>→</span><input data-c="nrn" :data-i="i" :value="r.n" :aria-label="tk('n.name')" @change="nameEdit(i, 'n', $event)"><button type="button" class="btn o s" style="margin-inline-start:auto" @click="nameDel(i)">{{ tk("del") }}</button></div>
        <div v-if="!nameRules.length" class="sm" style="padding:4px 2px 10px">{{ tk("n.none") }}</div>
      </div>
    </div>
  </div>
</template>
