<script setup>
// The smaller windows the entry window opens, with the current app's words and layout: count in another month (moOpen), name rule
// (nameRuleFrom), payment history (payHist), mark as a bill (billMark), attach to a jar (jarAttachOpen), a category rule (roOpen),
// a tag rule (taOpen), and "this jar is empty" after a payment emptied it. One at a time, opened with openPop() (core/txwin.js).
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { txPop, closePop, openTx, openPop } from "../../core/txwin.js";
import { run } from "../../core/txact.js";
import { toast } from "../../core/toast.js";
import { goActivity } from "../../core/shell.js";
import { catNames, catLabel } from "../../core/cats.js";
import * as A from "../../lib/txactions.js";
import { displayName, rmOf, NFIELDS, nameField, guessKw, cardInfo, tagSimilar } from "../../views/activity.js";
import { catJarsOf, markDone } from "../../views/jars.js";
import { fm } from "../../format.js";
import { now, dayOf } from "../../core/clock.js";
import { dstr, dcell } from "../../dates.js";
import BaseSheet from "../BaseSheet.vue";
import MoneyInput from "../MoneyInput.vue";

const { t, locale } = useI18n();
const tk = (k, ...a) => t(k, ...a);
const S = computed(() => data.state.value);
const P = computed(() => txPop.value);
const kind = (k) => P.value?.kind === k;
const x = computed(() => (P.value?.id != null ? (S.value?.tx || []).find((y) => y.id == P.value.id) || null : null));
const name = (y) => displayName(S.value, y);
const loc = () => (locale.value === "he" ? "he-IL" : "en-GB");
const mk = (m) => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(loc(), { month: "long" }) + " " + m.slice(0, 4);
const addMonth = (m, n) => { const d = new Date(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };
// what each window is filling in, set when it opens
const f = ref({});
watch(P, (p) => {
  if (!p) return; const y = x.value;
  if (p.kind == "month") f.value = { pick: rmOf(y) || String(y.d).slice(0, 7) };
  else if (p.kind == "nameRule") { const f0 = y.memo ? "memo" : "desc"; f.value = { f: f0, m: "in", k: nameField(y, f0) || "", n: S.value?.cfg?.renames?.[y.id] || "" }; }
  else if (p.kind == "bill") f.value = { scope: "once", every: "auto" };
  else if (p.kind == "jar") { const L = openJars.value; if (!L.length) { toast(t("txw.w.jaNone"), { kind: "err" }); closePop(); return; } f.value = { jar: p.jar || (y.jar && y.jar.id) || (A.jarSuggest(S.value, y, catJarsOf(S.value)) || {}).id || L[0].id, amt: y.jar ? y.jar.amt : Math.abs(y.a) }; }
  else if (p.kind == "ruleOffer") f.value = { k: guessKw(y, cardInfo(S.value)), c: p.cat };
  else if (p.kind == "tagRule") f.value = { k: guessKw(y, cardInfo(S.value)), all: true };
}, { immediate: true });
// a name rule's text follows the field it looks in
watch(() => f.value.f, (v) => { if (P.value?.kind === "nameRule" && v !== "any" && x.value) f.value.k = nameField(x.value, v) || ""; });

// ---- count in another month ----
function monthSet(m) {
  const r = run(A.moSet, x.value.id, m);
  if (r.err == "month") { toast(t("activity.w.mPickFirst"), { kind: "err" }); return; }
  closePop(); if (!r.err) toast(r.v ? t("activity.w.mNow", { m: mk(r.v) }) : t("activity.w.mBack"));
}
const monthReset = () => { const r = run(A.moReset, x.value.id); closePop(); if (!r.err) toast(t("activity.w.mBack")); };
const monthBase = computed(() => (x.value ? rmOf(x.value) || String(x.value.d).slice(0, 7) : ""));

// ---- name rule ----
function nameRuleSave() {
  const r = run(A.nameRuleSave, f.value);
  if (r.err) { toast(t("activity.w.nrNeed"), { kind: "err" }); return; }
  closePop();
  toast(t("txw.nrToast", { field: tk("activity.w.f." + f.value.f).toLowerCase(), how: f.value.m == "eq" ? t("txw.nrIs") : t("txw.nrContains"), k: f.value.k.trim(), name: f.value.n.trim(), c: r.n }, r.n), { title: t("activity.w.nrAdded") });
}

// ---- payment history ----
const hist = computed(() => {
  const p = P.value; if (p?.kind !== "hist") return null;
  const L = [...p.rows].sort((a, b) => b.d.localeCompare(a.d) || String(b.id).localeCompare(String(a.id)));
  if (!L.length) return null;
  const abs = L.map((y) => Math.abs(y.a)), tot = abs.reduce((a, b) => a + b, 0), mx = Math.max(...abs), mn = Math.min(...abs);
  let lastY = "";
  return { L, tot, avg: tot / L.length, mx, mn, items: L.map((y, i) => { const yr = y.d.slice(0, 4), head = yr !== lastY ? yr : ""; lastY = yr; const nx = L[i + 1], d = nx ? abs[i] - abs[i + 1] : 0; return { y, head, d: Math.abs(d) > 0.5 ? d : 0 }; }) };
});
watch(P, (p) => { if (p?.kind === "hist" && !p.rows.length) { toast(t("activity.w.hNone"), { kind: "err" }); closePop(); } });
const monShort = (d) => new Date(d + "T12:00:00").toLocaleDateString(loc(), { month: "short" });
// "Show in Activity" searches for the name, keeping the time frame (goSearch)
const histShow = () => { const q = P.value.q; closePop(); goActivity({ q, keepRange: true }); };

// ---- mark as a bill ----
function billSave() {
  const r = run(A.billMark, x.value.id, f.value.scope, f.value.every);
  if (r.err == "already") { toast(t("txw.w.bmAlready"), { kind: "err" }); return; }
  if (r.err == "alreadyStore") { toast(t("txw.w.bmAlreadyS"), { kind: "err" }); return; }
  closePop();
}

// ---- attach to a jar ----
const openJars = computed(() => (S.value?.jars || []).filter((j) => !j.done).sort((a, b) => a.p - b.p));
const jaHint = computed(() => {
  if (!kind("jar") || !x.value) return "";
  const j = (S.value.jars || []).find((y) => y.id == f.value.jar); if (!j) return "";
  const a = Math.min(Math.abs(x.value.a), +f.value.amt || 0), own = x.value.jar && x.value.jar.id == j.id ? x.value.jar.amt : 0, have = j.bal + own;
  return a > 0 ? (a >= have - 0.5 ? t("txw.w.jaHEmpty", { have: fm(have), rest: a > have ? t("txw.w.jaHRest") : "" }) : t("txw.w.jaHGo", { have: fm(have), left: fm(have - a) })) : t("txw.w.jaHNeed");
});
function jarSave() {
  const r = run(A.jarAttach, x.value.id, f.value.jar, f.value.amt);
  if (r.err) { toast(t({ amount: "txw.w.jaNeed", emptyJar: "txw.w.jaEmpty", nothing: "txw.w.jaNothing" }[r.err] || "txw.w.jaNothing"), { kind: "err" }); return; }
  closePop();
  if (r.empty) setTimeout(() => openPop("jarEmpty", { jar: r.jar }), 260);
}
const emptyJar = computed(() => (kind("jarEmpty") ? (S.value.jars || []).find((j) => j.id == P.value.jar) : null));
function jarDoneYes() {
  const j = emptyJar.value; closePop(); if (!j) return;
  data.change((next) => markDone(next, j.id, dayOf(now.value), { fm }));
}

// ---- a category rule (roOpen / roSave) ----
const roSim = computed(() => {
  if (!kind("ruleOffer") || !x.value) return "";
  const kw = String(f.value.k || "").trim().toLowerCase(), L = A.simList(S.value, kw, x.value.id, f.value.c), n = L.length;
  return kw.length < 2 ? t("txw.roMin") : n ? t("txw.roSim", { n, kw, cat: catLabel(f.value.c), list: L.slice(0, 3).map(name).join(", ") + (n > 3 ? ", …" : "") }, n) : t("txw.roNone", { kw });
});
function roSave() {
  const r = run(A.roSave, x.value.id, f.value.k, f.value.c);
  if (r.err) { toast(t("txw.needKw"), { kind: "err" }); return; }
  closePop();
}
// ---- a tag rule (taOpen / taSave) ----
const taMatches = computed(() => (kind("tagRule") && x.value ? tagSimilar(S.value, String(f.value.k || "").trim().toLowerCase(), x.value.id, P.value.tags) : []));
function taSave() {
  const r = run(A.saveTagRule, x.value.id, f.value.k, P.value.tags, f.value.all && taMatches.value.length > 0);
  if (r.err) { toast(t("txw.needKw"), { kind: "err" }); return; }
  closePop(); toast(r.n ? t("txw.tagRuleDone", { n: r.n }, r.n) : t("txw.tagRuleDone0"));
}
const tagsText = computed(() => (P.value?.tags || []).map((g) => "#" + g).join(" "));
</script>

<template>
  <BaseSheet :open="kind('month') && !!x" @close="closePop">
    <h3>{{ t("activity.w.mTitle") }}</h3>
    <div class="sm" style="margin-bottom:12px;line-height:1.55"><b>{{ name(x) }}</b> · {{ dstr(x.d) }}<br><span>{{ t("activity.w.mText") }}</span></div>
    <div class="stk" style="gap:8px"><button type="button" class="btn o" @click="monthSet(addMonth(monthBase, -1))"><span>{{ t("activity.w.mPrev") }}</span> · {{ mk(addMonth(monthBase, -1)) }}</button><button type="button" class="btn o" @click="monthSet(addMonth(monthBase, 1))"><span>{{ t("activity.w.mNext") }}</span> · {{ mk(addMonth(monthBase, 1)) }}</button></div>
    <div class="fld" style="margin-top:14px"><label>{{ t("activity.w.mOr") }}</label><div class="flex" style="gap:8px"><input v-model="f.pick" type="month" style="flex:1" /><button type="button" class="btn s" @click="monthSet(f.pick)">{{ t("activity.w.mUse") }}</button></div></div>
    <div class="flex" style="justify-content:space-between;margin-top:14px;gap:8px"><button v-if="rmOf(x)" type="button" class="btn o s" @click="monthReset">{{ t("activity.w.mReset", { m: mk(String(x.d).slice(0, 7)) }) }}</button><span v-else></span><button type="button" class="btn" @click="closePop">{{ t("activity.d.cancel") }}</button></div>
  </BaseSheet>

  <BaseSheet :open="kind('nameRule') && !!x" @close="closePop">
    <h3>{{ t("activity.w.nrTitle") }}</h3>
    <div class="sm" style="margin-bottom:12px;line-height:1.5">{{ t("activity.w.nrText") }}</div>
    <div class="fld"><label for="nrF">{{ t("activity.w.nrLook") }}</label><select id="nrF" v-model="f.f"><option v-for="n in NFIELDS" :key="n" :value="n">{{ tk("activity.w.f." + n) }}</option></select></div>
    <div class="fld"><label for="nrM">{{ t("activity.w.nrMatch") }}</label><select id="nrM" v-model="f.m"><option value="in">{{ t("activity.w.nrContains") }}</option><option value="eq">{{ t("activity.w.nrEq") }}</option></select></div>
    <div class="fld"><label for="nrK">{{ t("activity.w.nrTxt") }}</label><input id="nrK" v-model="f.k" /></div>
    <div class="fld"><label for="nrN">{{ t("activity.w.nrCall") }}</label><input id="nrN" v-model="f.n" maxlength="80" :placeholder="t('activity.w.nrPh')" /></div>
    <div class="flex" style="gap:8px;margin-top:14px"><button type="button" class="btn" @click="nameRuleSave">{{ t("activity.w.nrAdd") }}</button><button type="button" class="btn o" @click="closePop">{{ t("activity.d.cancel") }}</button></div>
  </BaseSheet>

  <BaseSheet :open="!!hist" @close="closePop">
    <div class="txh"><h3>{{ P.title }}</h3><div class="sm">{{ P.sub }}{{ P.sub ? " · " : "" }}{{ t("activity.w.hTo", { a: dstr(hist.L[hist.L.length - 1].d), b: dstr(hist.L[0].d) }) }}</div></div>
    <div class="phs"><div><span>{{ t("activity.w.hPayments") }}</span><b>{{ hist.L.length }}</b></div><div><span>{{ t("activity.w.hTotal") }}</span><b>{{ fm(hist.tot) }}</b></div><div><span>{{ t("activity.w.hAvg") }}</span><b>{{ fm(hist.avg) }}</b></div></div>
    <div v-if="hist.L.length > 2" class="phb" aria-hidden="true"><i v-for="y in [...hist.L].reverse().slice(-40)" :key="y.id" :style="{ height: Math.max(8, (Math.abs(y.a) / hist.mx) * 100) + '%' }" :title="dstr(y.d) + ': ' + fm(Math.abs(y.a))"></i></div>
    <div v-if="hist.mx - hist.mn > 0.5" class="phr"><span>{{ t("activity.w.hLow") }} <b>{{ fm(hist.mn) }}</b></span><span>{{ t("activity.w.hHigh") }} <b>{{ fm(hist.mx) }}</b></span></div>
    <div class="phl"><template v-for="it in hist.items" :key="it.y.id"><div v-if="it.head" class="phy">{{ it.head }}</div>
      <div class="phi" @click="openTx(it.y.id)"><div class="phd"><span>{{ monShort(it.y.d) }}</span><b>{{ +it.y.d.slice(8, 10) }}</b></div><div class="phm"><div class="pht">{{ name(it.y) || P.title }}</div><div class="sm">{{ it.y.from || "" }}{{ it.y.c ? " · " + catLabel(it.y.c) : "" }}</div></div><div class="pha"><b class="num" :class="{ pos: it.y.a > 0 }" dir="ltr">{{ it.y.a < 0 ? "" : "+" }}{{ fm(Math.abs(it.y.a)) }}</b><span v-if="it.d" class="bd" :class="it.d > 0 ? 'up' : 'dn'">{{ it.d > 0 ? "▲" : "▼" }} {{ fm(Math.abs(it.d)) }}</span></div></div></template></div>
    <div class="flex" style="justify-content:flex-end;gap:10px;margin-top:14px"><button type="button" class="btn o" @click="histShow">{{ t("activity.w.hShow") }}</button><button type="button" class="btn" @click="closePop">{{ t("activity.d.done") }}</button></div>
  </BaseSheet>

  <BaseSheet :open="kind('bill') && !!x" @close="closePop">
    <h3>{{ t("txw.w.bmTitle") }}</h3>
    <div class="sm" style="margin-bottom:12px">{{ name(x) }} · {{ fm(x.a) }} · {{ dstr(x.d) }}</div>
    <label class="opt"><input v-model="f.scope" type="radio" name="bmScope" value="once"><span><b>{{ t("txw.w.bmOnce") }}</b><span class="sm">{{ t("txw.w.bmOnceS") }}</span></span></label>
    <label class="opt"><input v-model="f.scope" type="radio" name="bmScope" value="rule"><span><b>{{ t("txw.w.bmRule", { s: x.to || x.desc }) }}</b><span class="sm">{{ t("txw.w.bmRuleS") }}</span></span></label>
    <div v-if="f.scope === 'rule'" class="fld" style="margin-top:10px"><label for="bmEvery">{{ t("txw.w.bmHow") }}</label><select id="bmEvery" v-model="f.every"><option value="auto">{{ t("txw.w.bmAuto") }}</option><option value="1">{{ t("txw.w.bm1") }}</option><option value="2">{{ t("txw.w.bm2") }}</option><option value="12">{{ t("txw.w.bm12") }}</option><option value="0">{{ t("txw.w.bm0") }}</option></select></div>
    <div class="flex" style="justify-content:flex-end;gap:10px;margin-top:8px"><button type="button" class="btn o" @click="closePop">{{ t("activity.d.cancel") }}</button><button type="button" class="btn" @click="billSave">{{ t("txw.w.bmGo") }}</button></div>
  </BaseSheet>

  <BaseSheet :open="kind('jar') && !!x && openJars.length > 0" @close="closePop">
    <h3>{{ t("txw.w.jaTitle") }}</h3>
    <div class="sm" style="margin-bottom:14px">{{ name(x) }} · {{ fm(Math.abs(x.a)) }} · {{ dstr(x.d) }}</div>
    <div class="fld"><label for="jaJ">{{ t("txw.w.jaFrom") }}</label><select id="jaJ" v-model="f.jar"><option v-for="j in openJars" :key="j.id" :value="j.id">{{ t("txw.w.jaSaved", { n: j.n, amt: fm(j.bal) }) }}</option></select></div>
    <div class="fld"><label for="jaA">{{ t("txw.w.jaAmt") }}</label><MoneyInput id="jaA" v-model="f.amt" /></div>
    <div class="jhint">{{ jaHint }}</div>
    <div class="flex" style="justify-content:flex-end;gap:10px"><button type="button" class="btn o" @click="closePop">{{ t("activity.d.cancel") }}</button><button type="button" class="btn" @click="jarSave">{{ t("txw.w.jaGo") }}</button></div>
  </BaseSheet>

  <BaseSheet :open="!!emptyJar" @close="closePop">
    <h3>{{ t("txw.w.jeTitle", { n: emptyJar.n }) }}</h3>
    <div class="sm" style="margin-bottom:14px;line-height:1.5">{{ t("txw.w.jeText") }}</div>
    <div class="flex" style="justify-content:flex-end;gap:10px"><button type="button" class="btn o" @click="closePop">{{ t("txw.w.jeNo") }}</button><button type="button" class="btn" @click="jarDoneYes">{{ t("txw.w.jeYes") }}</button></div>
  </BaseSheet>

  <BaseSheet :open="kind('ruleOffer') && !!x" @close="closePop">
    <h3>{{ t("txw.roTitle") }}</h3>
    <div class="sm" style="margin-bottom:12px">{{ t("txw.roText", { name: name(x), cat: catLabel(P.cat) }) }}</div>
    <div class="fld"><label for="roK">{{ t("txw.roIf") }}</label><input id="roK" v-model="f.k" autocomplete="off"></div>
    <div class="fld"><label for="roC">{{ t("txw.roCat") }}</label><select id="roC" v-model="f.c"><option v-for="c in catNames(S)" :key="c" :value="c">{{ catLabel(c) }}</option></select></div>
    <div class="sm" style="margin:-2px 0 14px;line-height:1.5">{{ roSim }}</div>
    <div class="flex" style="justify-content:flex-end;gap:10px"><button type="button" class="btn o" @click="closePop">{{ t("activity.d.cancel") }}</button><button type="button" class="btn" @click="roSave">{{ t("txw.roCreate") }}</button></div>
  </BaseSheet>

  <BaseSheet :open="kind('tagRule') && !!x" @close="closePop">
    <h3>{{ t("activity.offer.ruleTitle") }}</h3>
    <div class="sm" style="margin-bottom:12px;line-height:1.5">{{ t("txw.tagRuleText", { name: name(x), tags: tagsText }) }}</div>
    <div class="fld"><label for="taK">{{ t("activity.offer.contains") }}</label><input id="taK" v-model="f.k" autocomplete="off"></div>
    <label class="chk" style="display:flex;gap:8px;align-items:flex-start;font-size:13px;margin:4px 0 6px"><input v-model="f.all" type="checkbox" :disabled="!taMatches.length" style="margin-top:2px"><span>{{ taMatches.length ? t("activity.offer.alsoTag", { n: taMatches.length }, taMatches.length) : t("activity.offer.noMatches") }}</span></label>
    <div class="sm" style="margin-bottom:12px">{{ taMatches.length ? taMatches.slice(0, 3).map(name).join(", ") + (taMatches.length > 3 ? ", …" : "") : "" }}</div>
    <div class="flex" style="justify-content:flex-end;gap:10px"><button type="button" class="btn o" @click="closePop">{{ t("activity.d.cancel") }}</button><button type="button" class="btn" @click="taSave">{{ t("activity.offer.create") }}</button></div>
  </BaseSheet>
</template>
