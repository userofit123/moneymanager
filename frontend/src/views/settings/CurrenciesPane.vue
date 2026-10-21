<script setup>
// Settings → Currencies. A copy of the current app's Currencies section (web/js/06-trend-forecast-sync.js renderSet;
// web/js/08-jars.js curAdd and curDel): the currencies in use, remove the ones no account holds, add another and load its rates.
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import SetHead from "./SetHead.vue";
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
  try { await api("/api/fx/refresh", sendJson("POST")); toast(tk("loaded", { c })); } catch (e) { toastErr(tk("ratesFail", { e: e.message })); }
}
async function remove(c) {
  try { await changeState((s) => { s.currencies = withRemoved(s, c); return [["Removed currency", c]]; }); } catch (e) { toastErr(e); }
}
</script>

<template>
  <div v-if="S" id="setCur">
    <div class="card ss">
      <SetHead icon="cur" :title="tk('title')" :desc="tk('desc')" />
      <div class="ssb p">
        <div style="margin-bottom:12px"><span v-for="c in listOf(S)" :key="c" class="chip" style="margin:3px">{{ symOf(c) ? symOf(c) + " " : "" }}{{ c }}<template v-if="!isUsed(S, c)"> <button type="button" class="tag" style="border:0;background:none;cursor:pointer" data-a="curDel" :data-c="c" :aria-label="tk('remove', { c })" @click="remove(c)">×</button></template></span></div>
        <div class="tools"><select id="curSel" v-model="pick"><option value="">{{ tk("pick") }}</option><option v-for="c in addable(S)" :key="c" :value="c">{{ c }} · {{ t("settings.cur.names." + c) }}</option></select><button type="button" class="btn o s" data-a="curAdd" @click="add">{{ tk("add") }}</button></div>
      </div>
    </div>
  </div>
</template>
