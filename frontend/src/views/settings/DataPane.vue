<script setup>
// Settings → Import and export. A copy of the current app's section (web/js/06-trend-forecast-sync.js renderSet, the setData part;
// the importCsv, bankCsv, pensionSet, exOpen (Activity's Export tab) and exportJson cases and the csvFile/bankCsvFile handlers in web/js/08-jars.js).
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { toast } from "../../core/toast.js";
import { tx } from "../../core/heText.js";
import { openForm } from "../../core/forms.js";
import { goActivity } from "../../core/shell.js";
import SetHead from "./SetHead.vue";
import SetRow from "./SetRow.vue";
import { openSettingsTab } from "./tab.js";

const { t } = useI18n();
const tk = (k, a) => t("settings.data." + k, a || {});
const S = computed(() => data.state.value);
onMounted(() => { data.start(); });
const acc = ref(""), pos = ref(false), wiseF = ref(null), bankF = ref(null);
// the accounts a bank or card file can go to: banks and cards, and the companies that are connected
const accNames = computed(() => [...new Set([...(S.value?.accounts || []).filter((a) => a.kind == "bank" || a.kind == "card").map((a) => a.n), ...(S.value?.companies || []).map((c) => c.label)])]);

// A file is sent to the server as it is; the server reads it and adds the rows. Then the data is loaded again.
async function upload(e, url, done) {
  const fl = e.target.files[0]; if (!fl) return;
  try { const r = await data.api(url, { method: "POST", headers: { "content-type": "text/csv" }, body: await fl.text() }); await data.load(); toast(done(r)); }
  catch (x) { toast(tk("toast.failed", { msg: tx(x.message) }), { kind: "err" }); }
  e.target.value = "";
}
const wise = (e) => upload(e, "/api/import/wise-csv", (r) => { const v = Object.values(r); return tk("toast.wiseDone", { added: v.reduce((s, x) => s + x.added, 0), merged: v.reduce((s, x) => s + x.merged, 0) }); });
const bank = (e) => upload(e, `/api/import/bank-csv?account=${encodeURIComponent(acc.value)}&positiveIsExpense=${pos.value ? 1 : 0}`, (r) => tk("toast.bankDone", { rows: r.rows, added: r.added, merged: r.merged }));
function bankPick() { if (!acc.value) { toast(tk("toast.pickAcct"), { kind: "err" }); return; } bankF.value.click(); }

// "Download export": the whole data as one JSON file
function exportJson() {
  const l = document.createElement("a");
  l.href = URL.createObjectURL(new Blob([JSON.stringify(S.value, null, 1)], { type: "application/json" }));
  l.download = "money-export.json"; l.click();
  toast(tk("toast.downloaded"));
}
</script>

<template>
  <div v-if="S" id="setData">
    <div class="card ss">
      <SetHead icon="imp" :title="tk('imp.t')" :desc="tk('imp.d')" />
      <div class="ssb">
        <SetRow :title="tk('wise.t')" :desc="tk('wise.d')"><button type="button" class="btn o s" data-a="importCsv" @click="wiseF.click()">{{ tk("wise.btn") }}</button></SetRow>
        <SetRow :title="tk('bank.t')" :desc="tk('bank.d')">
          <div class="flex" style="gap:8px;flex-wrap:wrap;justify-content:flex-end"><select id="bankAcc" v-model="acc" :aria-label="tk('bank.acctAria')"><option value="">{{ tk("bank.acct") }}</option><option v-for="n in accNames" :key="n" :value="n">{{ n }}</option></select><button type="button" class="btn o s" data-a="bankCsv" @click="bankPick">{{ tk("bank.btn") }}</button></div>
        </SetRow>
        <label class="sm" style="display:flex;gap:8px;align-items:center;padding:0 0 4px"><input id="bankPos" v-model="pos" type="checkbox"> {{ tk("pos") }}</label>
        <SetRow :title="tk('pension.t')" :desc="tk('pension.d')"><button type="button" class="btn o s" data-a="pensionSet" @click="openForm('pension')">{{ tk("pension.btn") }}</button></SetRow>
        <input id="csvFile" ref="wiseF" type="file" accept=".csv,text/csv" style="display:none" @change="wise">
        <input id="bankCsvFile" ref="bankF" type="file" accept=".csv,text/csv" style="display:none" @change="bank">
      </div>
    </div>
    <div class="card ss">
      <SetHead icon="data" :title="tk('your.t')" :desc="tk('your.d')" />
      <div class="ssb">
        <SetRow :title="tk('export.t')" :desc="tk('export.d')"><button type="button" class="btn s" data-a="exOpen" @click="goActivity({ tab: 'exp', from: 'settings' })">{{ tk("export.btn") }}</button></SetRow>
        <SetRow :title="tk('full.t')" :desc="tk('full.d')"><button type="button" class="btn o s" data-a="exportJson" @click="exportJson">{{ tk("full.btn") }}</button></SetRow>
        <SetRow :title="tk('restore.t')" :desc="tk('restore.d')"><button type="button" class="btn o s" data-a="setTab" data-t="backup" @click="openSettingsTab('backup')">{{ tk("restore.btn") }}</button></SetRow>
      </div>
    </div>
  </div>
</template>
