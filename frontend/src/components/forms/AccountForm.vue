<script setup>
// "Add an account" and "Edit account" (accChoose, accConnectList, accConnectGo and accFormOpen in web/js/05-accounts-charts-help.js,
// case accSave in 08-jars.js). One window whose content changes, like the current app's one sheet:
// step "choose" (bank or card, or one you keep yourself) → "connect" (the list of banks and cards) or "manual" (the form).
// id: the account to edit (then the form opens at once). Saving calls the server, loads the data again and opens the account's page.
import { ref, computed, onMounted, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { toast } from "../../core/toast.js";
import { tx } from "../../core/heText.js";
import { getJson, sendJson } from "../../core/http.js";
import { go, current } from "../../router.js";
import { openSettingsTab } from "../../views/settings/tab.js";
import { CK, curOpts, accSel } from "../../lib/accounts.js";
import { loadConn, connStartHere } from "../../views/settings/conn.js";
import { useFormSheet } from "../../core/useFormSheet.js";
import BaseSheet from "../BaseSheet.vue";

const props = defineProps({ step: { type: String, default: "choose" }, id: { type: Number, default: 0 } });
const emit = defineEmits(["close"]);
const { open, close } = useFormSheet(emit);
const { t } = useI18n();
const tk = (k, ...a) => t(k, ...a);
const S = computed(() => data.state.value);
const acc = computed(() => (props.id ? (S.value?.accounts || []).find((x) => x.id == props.id) : null));
const step = ref(props.id ? "manual" : props.step);
const QI = { plus: '<path d="M12 5v14M5 12h14"/>', bank: '<path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>' };

// the banks and cards that can be connected (GET /api/connections)
const conns = ref(null);
const KG = [["bank", "banks"], ["card", "cards"], ["wallet", "wallets"]];
async function toConnect() {
  step.value = "connect"; conns.value = null;
  try { conns.value = await getJson("/api/connections"); } catch { toast(t("acc.f.loadErr"), { kind: "err" }); close(); }
}
const groups = computed(() => KG.map(([k, l]) => [l, (conns.value || []).filter((c) => !c.extra && c.kind == k)]).filter(([, L]) => L.length));
// Settings → Connections, adding that login (connStart: a second login of a bank already set up gets its own new source)
async function pick(c) {
  close(); openSettingsTab("conn"); go("/settings");
  await loadConn(); connStartHere(c.source);
}

// the form
const a0 = acc.value;
const f = ref({ name: a0 ? a0.n : "", ck: a0 && CK.includes(a0.ck) ? a0.ck : "cash", cur: "ILS", bal: "", nw: !a0 || !!a0.inNW, rep: !a0 || a0.inR !== false });
const curs = computed(() => curOpts((c) => (c == "ILS" ? t("acc.f.ils") : tk("settings.cur.names." + c))));
const newCur = computed(() => !a0 && f.value.cur != "ILS" && !(S.value?.currencies || []).includes(f.value.cur));
const curTouched = ref(false);
const nameEl = ref(null);
onMounted(() => { if (step.value == "manual") nextTick(() => nameEl.value?.focus()); });
const toManual = () => { step.value = "manual"; nextTick(() => nameEl.value?.focus()); };

async function save() {
  const x = f.value, id = a0?.id, body = { name: x.name, kind: x.ck, countNW: x.nw, countReports: x.rep };
  if (!id) { body.currency = x.cur; body.balance = String(x.bal); }
  // a balance in a currency the app does not follow yet needs its rate: the currency is added to Settings → Currencies
  const cur = body.currency, added = newCur.value;
  if (added) data.change((n) => { n.currencies = [...new Set([...(n.currencies || ["ILS"]), cur])]; return [["Added currency", cur + " (with a new account)"]]; });
  try {
    await data.api(id ? "/api/accounts/" + id : "/api/accounts", sendJson(id ? "PUT" : "POST", body));
    await data.load();
    accSel.value = body.name.trim() || accSel.value;
    close();
    // added from somewhere else (Home's quick add): say where it is, with a button that opens it
    const name = body.name.trim();
    if (!id && current.value.name !== "accounts") toast(t("acc.f.addedWhere"), { title: t("acc.f.added"), actions: [{ label: t("acc.f.addedOpen"), run: () => go("/accounts?n=" + encodeURIComponent(name)) }], ms: 6500 });
    else toast(t(id ? "acc.f.saved" : "acc.f.added"));
  } catch (e) { toast(tx(e.message), { kind: "err" }); return; }
  if (added) {
    try { await data.api("/api/fx/refresh", { method: "POST" }); await data.loadFx(); toast(t("acc.f.curOk", { cur })); }
    catch (e) { toast(t("acc.f.curFail", { cur, e: tx(e.message) }), { kind: "err" }); }
  }
}
</script>

<template>
  <BaseSheet :open="open" @close="close">
    <template v-if="step == 'choose'">
      <h3>{{ t("acc.f.addT") }}</h3>
      <div class="sm" style="margin-bottom:12px;line-height:1.5">{{ t("acc.f.what") }}</div>
      <div class="qa">
        <button type="button" @click="toConnect"><span class="qi"><svg viewBox="0 0 24 24" v-html="QI.bank" /></span><span><b>{{ t("acc.f.bankT") }}</b><span class="sm">{{ t("acc.f.bankX") }}</span></span></button>
        <button type="button" @click="toManual"><span class="qi"><svg viewBox="0 0 24 24" v-html="QI.plus" /></span><span><b>{{ t("acc.f.ownT") }}</b><span class="sm">{{ t("acc.f.ownX") }}</span></span></button>
      </div>
      <div class="flex" style="justify-content:flex-end;margin-top:12px"><button type="button" class="btn o" @click="close">{{ t("acc.f.cancel") }}</button></div>
    </template>
    <template v-else-if="step == 'connect'">
      <h3>{{ t("acc.f.connT") }}</h3>
      <div v-if="!conns" class="sm" style="margin:6px 0 14px"><i class="spinner" /> {{ t("acc.f.loading") }}</div>
      <template v-else>
        <div class="sm" style="margin-bottom:12px;line-height:1.5">{{ t("acc.f.choose") }}</div>
        <template v-for="[l, L] in groups" :key="l"><div class="pl" style="margin:12px 0 6px">{{ tk("acc.f." + l) }}</div><div class="kchips"><button v-for="c in L" :key="c.source" type="button" @click="pick(c)">{{ tx(c.providerLabel || c.label) }}{{ c.configured ? t("acc.f.another") : "" }}</button></div></template>
        <div class="sm" style="margin-top:12px;line-height:1.5">{{ t("acc.f.notListed") }}</div>
        <div class="flex" style="justify-content:space-between;margin-top:14px"><button type="button" class="btn o" @click="step = 'choose'">{{ t("acc.f.back") }}</button><button type="button" class="btn o" @click="close">{{ t("acc.f.cancel") }}</button></div>
      </template>
    </template>
    <template v-else>
      <h3>{{ t(a0 ? "acc.f.editT" : "acc.f.addT") }}</h3>
      <div class="sm" style="margin-bottom:14px;line-height:1.5">{{ t(a0 ? "acc.f.editX" : "acc.f.addX") }}</div>
      <div class="fld"><label for="acN">{{ t("acc.f.name") }}</label><input id="acN" ref="nameEl" v-model="f.name" maxlength="60" :placeholder="t('acc.f.nameEx')" autocomplete="off"></div>
      <div class="two">
        <div class="fld"><label for="acK">{{ t("acc.f.type") }}</label><select id="acK" v-model="f.ck"><option v-for="k in CK" :key="k" :value="k">{{ tk("acc.ck." + k) }}</option></select></div>
        <div v-if="!a0" class="fld"><label for="acC">{{ t("acc.f.cur") }}</label><select id="acC" v-model="f.cur" @change="curTouched = true"><option v-for="[c, n] in curs" :key="c" :value="c">{{ n }}</option></select><div v-show="curTouched && newCur" id="acCH" class="sm">{{ t("acc.f.curHint") }}</div></div>
      </div>
      <div v-if="!a0" class="fld"><label for="acB">{{ t("acc.f.balNow") }}</label><input id="acB" v-model="f.bal" type="number" inputmode="decimal" step="any" placeholder="0"><div class="sm" style="margin-top:4px">{{ t("acc.f.loanHint") }}</div></div>
      <label class="chk" style="display:flex;gap:8px;align-items:flex-start;margin:6px 0 10px;font-size:13.5px"><input id="acNW" v-model="f.nw" type="checkbox" style="margin-top:3px"><span><b>{{ t("acc.f.nwT") }}</b><br><span class="sm">{{ t("acc.f.nwX") }}</span></span></label>
      <label class="chk" style="display:flex;gap:8px;align-items:flex-start;margin:0 0 14px;font-size:13.5px"><input id="acR" v-model="f.rep" type="checkbox" style="margin-top:3px"><span><b>{{ t("acc.f.repT") }}</b><br><span class="sm">{{ t("acc.f.repX") }}</span></span></label>
      <div class="flex" style="justify-content:flex-end;gap:10px"><button type="button" class="btn o" @click="close">{{ t("acc.f.cancel") }}</button><button type="button" class="btn" @click="save">{{ t(a0 ? "acc.f.save" : "acc.f.addBtn") }}</button></div>
    </template>
  </BaseSheet>
</template>
