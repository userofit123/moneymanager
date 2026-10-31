<script setup>
// Settings → Currencies: the currencies in use, remove the ones no account holds, add another and load its rates.
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { tx } from "../../core/heText.js";
import SetSection from "./SetSection.vue";
import SetRow from "./SetRow.vue";
import { api, sendJson, toast, toastErr, changeState } from "./shared.js";
import { symOf, listOf, isUsed, addable, withAdded, withRemoved } from "./currencies.js";

const { t } = useI18n();
const tk = (k, a) => t("settings.cur." + k, a || {});
const S = computed(() => data.state.value);
onMounted(() => { data.start(); });
const pick = ref("");

async function add() {
  const c = pick.value;
  if (!c) return;
  pick.value = "";
  try { await changeState((s) => { s.currencies = withAdded(s, c); return [["Added currency", c]]; }); } catch (e) { toastErr(e); return; }
  try { await api("/api/fx/refresh", sendJson("POST")); toast(tk("loaded", { c })); } catch (e) { toastErr(tk("ratesFail", { e: tx(e.message) })); }
  data.loadFx(); // the new rates count at once
}
async function remove(c) {
  try { await changeState((s) => { s.currencies = withRemoved(s, c); return [["Removed currency", c]]; }); } catch (e) { toastErr(e); return; }
  await data.flushNow(); data.loadFx(); // save first, then load the rates
}
</script>

<template>
  <div v-if="S" id="setCur">
    <SetSection icon="cur" :title="tk('title')" :desc="tk('desc')">
      <SetRow :title="tk('inUse')" :desc="tk('inUseDesc')" stack>
        <div class="curl"><span v-for="c in listOf(S)" :key="c" class="chip">{{ symOf(c) ? symOf(c) + " " : "" }}{{ c }}<button v-if="!isUsed(S, c)" type="button" class="curx" data-a="curDel" :data-c="c" :aria-label="tk('remove', { c })" @click="remove(c)">×</button></span></div>
      </SetRow>
      <SetRow :title="tk('addTitle')" :desc="tk('addDesc')">
        <select id="curSel" v-model="pick" :aria-label="tk('addTitle')"><option value="">{{ tk("pick") }}</option><option v-for="c in addable(S)" :key="c" :value="c">{{ c }} · {{ t("settings.cur.names." + c) }}</option></select><button type="button" class="btn o s" data-a="curAdd" @click="add">{{ tk("add") }}</button>
      </SetRow>
      <template #foot>{{ tk("foot") }}</template>
    </SetSection>
  </div>
</template>
