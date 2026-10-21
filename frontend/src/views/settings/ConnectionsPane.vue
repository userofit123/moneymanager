<script setup>
// Settings → Connections. A copy of the current app's Connections section (web/js/07-periods-rules.js renderConn, connCard,
// showShot, showTest; the conn* cases in web/js/08-jars.js): what is connected, adding a bank or card, and one card per login.
import { ref, onMounted, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { friendlyErr } from "../../core/sources.js";
import { f0 } from "../../format.js";
import { tx } from "../../core/heText.js";
import BaseSheet from "../../components/BaseSheet.vue";
import ConnCard from "./ConnCard.vue";
import { SI } from "./icons.js";
import { CONN, adding, avail, cards, formOpen, nConnected, nBad, provName, companyOf, labelOf, loadConn, connStart } from "./conn.js";

const { t } = useI18n();
const tk = (k, a) => t("settings.conn." + k, a || {});
onMounted(() => { data.start(); loadConn(); });
const KG = [["bank", "gBank"], ["card", "gCard"], ["wallet", "gWallet"]];
const pick = ref("");
const used = () => CONN.value.filter((c) => c.configured).map((c) => provName(c));

function add() {
  const v = pick.value; if (!v) return;
  formOpen.value = false; pick.value = "";
  // the new card comes into view with its first box ready to type in
  connStart(v, (id) => nextTick(() => setTimeout(() => { const c = document.getElementById("conn-" + id); if (c) { c.scrollIntoView({ behavior: "smooth", block: "center" }); c.querySelector("input")?.focus({ preventScroll: true }); } }, 60)));
}

// "Test connection" result and "See where it stopped" (showTest, showShot)
// (the last one stays filled while its window fades out)
const test = ref(null), testOpen = ref(false); // { src, label, r }
const shot = ref(null), shotOpen = ref(false); // { src, label, at, err }
const onTest = (src, r) => { test.value = { src, label: labelOf(src), r }; testOpen.value = true; };
const onShot = (src) => { testOpen.value = false; shot.value = { src, label: labelOf(src), at: Date.now(), err: false }; shotOpen.value = true; };
</script>

<template>
  <div id="setConn">
    <div class="card ss">
      <div class="ssh" style="flex-wrap:wrap;gap:10px 14px">
        <span class="ssi"><svg viewBox="0 0 24 24" v-html="SI.bank" /></span>
        <div style="flex:1 1 180px;min-width:0"><b>{{ tk("title") }}</b><div class="sm">{{ tk("sub") }}</div></div>
        <div class="flex" style="gap:12px;align-items:center;flex-wrap:nowrap;margin-inline-start:auto;white-space:nowrap;flex:0 0 auto">
          <span class="sm" style="display:flex;gap:8px;align-items:center;flex-wrap:nowrap"><span>{{ nConnected ? tk("nConnected", { n: nConnected }) : tk("nothing") }}</span><span v-if="nBad" class="bd up">{{ nBad == 1 ? tk("oneIssue") : tk("nIssues", { n: nBad }) }}</span><span v-else-if="nConnected" class="bd dn">{{ tk("allFine") }}</span></span>
          <button type="button" class="btn s" data-a="connForm" :aria-expanded="formOpen" @click="formOpen = !formOpen">{{ formOpen ? tk("close") : tk("addBtn") }}</button>
        </div>
      </div>
      <div v-if="formOpen" class="ssb p">
        <div class="sm" style="margin-bottom:10px">{{ tk("help") }}</div>
        <div v-if="avail.length" class="flex" style="gap:8px;flex-wrap:wrap">
          <select id="connPick" v-model="pick" :aria-label="tk('pickAria')" style="flex:1 1 220px">
            <option value="">{{ tk("pickPh") }}</option>
            <template v-for="[k, g] in KG" :key="k"><optgroup v-if="avail.some((c) => c.kind == k)" :label="tk(g)"><option v-for="c in avail.filter((x) => x.kind == k)" :key="c.source" :value="c.source">{{ companyOf(c) }}{{ c.configured || adding.includes(c.source) ? tk("another") : "" }}</option></optgroup></template>
          </select>
          <button type="button" class="btn" data-a="connAdd" @click="add">{{ tk("add") }}</button>
        </div>
        <div v-else class="sm">{{ tk("nothingToAdd") }}</div>
        <div v-if="used().length" class="sm" style="margin-top:12px">{{ tk("connectedLbl") }} <b>{{ used().join(", ") }}</b>.<span>{{ tk("twoLogins") }}</span></div>
        <div class="cnote"><span><svg viewBox="0 0 24 24" v-html="SI.lock" />{{ tk("note1") }}</span><span><svg viewBox="0 0 24 24" v-html="SI.eye" />{{ tk("note2") }}</span><span><svg viewBox="0 0 24 24" v-html="SI.shield" />{{ tk("note3") }}</span></div>
        <div class="sm" style="margin-top:10px">{{ tk("missing") }}</div>
      </div>
    </div>
    <ConnCard v-for="c in cards" :key="c.source" :c="c" @test="onTest" @shot="onShot" />
    <div class="sm" style="margin:4px 4px 0;line-height:1.5">{{ tk("otpNote") }}</div>

    <BaseSheet :open="testOpen" @close="testOpen = false">
      <template v-if="test">
        <h3>{{ tk("testT", { label: test.label }) }}</h3>
        <template v-if="test.r.ok">
          <div class="sm" style="margin-bottom:10px">{{ tk("testOk") }}</div>
          <template v-if="test.r.balances">
            <div v-for="(b, i) in test.r.balances" :key="i" class="row"><div class="grow">{{ tk("balance", { cur: b.currency }) }}</div><b>{{ b.value }}</b></div>
            <div class="sm" style="margin-top:8px">{{ tx(test.r.note || "") }}</div>
          </template>
          <template v-else>
            <div v-for="(a, i) in test.r.accounts || []" :key="i" class="row" style="display:block"><b>{{ a.balance == null ? tk("balNone") : tk("balShekel", { v: f0(a.balance) }) }}</b> · {{ tk("txLast30", { n: a.transactions }) }}<div v-for="(x, j) in a.first || []" :key="j" class="sm">{{ x.date }} · {{ x.description }} · {{ x.amount }}</div></div>
          </template>
        </template>
        <div v-else class="card warn"><b>{{ test.r.locked ? tk("testLocked") : tk("testFailed") }}</b><div class="sm">{{ friendlyErr(test.r.error || "") }}</div><div v-if="test.r.locked" class="sm" style="margin-top:6px">{{ tk("testLockedD") }}</div></div>
        <div class="flex" style="justify-content:flex-end;margin-top:12px">
          <button v-if="!test.r.ok && test.src && !test.r.busy" type="button" class="btn o" data-a="connShot" :data-s="test.src" style="margin-inline-end:8px" @click="onShot(test.src)">{{ tk("shot") }}</button>
          <button type="button" class="btn" data-a="close" @click="testOpen = false">{{ tk("done") }}</button>
        </div>
      </template>
    </BaseSheet>

    <BaseSheet :open="shotOpen" @close="shotOpen = false">
      <template v-if="shot">
        <h3>{{ tk("shotT", { label: shot.label }) }}</h3>
        <div class="sm" style="margin-bottom:10px;line-height:1.5">{{ tk("shotD") }}</div>
        <img v-show="!shot.err" id="shotImg" :alt="tk('shotAlt')" style="width:100%;border-radius:12px;border:1px solid var(--ol);min-height:80px" :src="'/api/connections/' + encodeURIComponent(shot.src) + '/shot?t=' + shot.at" @error="shot.err = true">
        <div v-show="shot.err" id="shotErr" class="sm" style="margin-top:8px">{{ tk("shotNone") }}</div>
        <div class="flex" style="justify-content:flex-end;margin-top:12px"><button type="button" class="btn" data-a="close" @click="shotOpen = false">{{ tk("done") }}</button></div>
      </template>
    </BaseSheet>
  </div>
</template>
