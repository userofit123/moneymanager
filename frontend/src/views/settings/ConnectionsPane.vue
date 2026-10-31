<script setup>
// Settings → Connections: what is connected, adding a bank or card, and one card per login.
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { friendlyErr } from "../../core/sources.js";
import { f0 } from "../../format.js";
import { tx } from "../../core/heText.js";
import BaseSheet from "../../components/BaseSheet.vue";
import ConnCard from "./ConnCard.vue";
import SetSection from "./SetSection.vue";
import SetRow from "./SetRow.vue";
import { SI } from "./icons.js";
import { CONN, adding, avail, cards, formOpen, nConnected, nBad, provName, companyOf, labelOf, loadConn, connStartHere } from "./conn.js";

const { t } = useI18n();
const tk = (k, a) => t("settings.conn." + k, a || {});
onMounted(() => { data.start(); loadConn(); });
const KG = [["bank", "gBank"], ["card", "gCard"], ["wallet", "gWallet"]];
const pick = ref("");
const used = () => CONN.value.filter((c) => c.configured).map((c) => provName(c));

function add() {
  const v = pick.value; if (!v) return;
  formOpen.value = false; pick.value = "";
  connStartHere(v);
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
    <SetSection icon="link" :title="tk('title')" :desc="tk('sub')" :count="nConnected || null">
      <template #head>
        <span v-if="nBad" class="bd up">{{ nBad == 1 ? tk("oneIssue") : tk("nIssues", { n: nBad }) }}</span>
        <span v-else-if="nConnected" class="bd dn">{{ tk("allFine") }}</span>
        <button type="button" class="btn s" data-a="connForm" :aria-expanded="formOpen" @click="formOpen = !formOpen">{{ formOpen ? tk("close") : tk("addBtn") }}</button>
      </template>
      <template v-if="formOpen || !cards.length" #default>
      <div v-if="formOpen" class="cadd">
        <SetRow stack :title="tk('pickT')" :desc="tk('help')">
          <template v-if="avail.length">
            <select id="connPick" v-model="pick" :aria-label="tk('pickAria')">
              <option value="">{{ tk("pickPh") }}</option>
              <template v-for="[k, g] in KG" :key="k"><optgroup v-if="avail.some((c) => c.kind == k)" :label="tk(g)"><option v-for="c in avail.filter((x) => x.kind == k)" :key="c.source" :value="c.source">{{ companyOf(c) }}{{ c.configured || adding.includes(c.source) ? tk("another") : "" }}</option></optgroup></template>
            </select>
            <button type="button" class="btn s" data-a="connAdd" @click="add">{{ tk("add") }}</button>
          </template>
          <span v-else class="sm">{{ tk("nothingToAdd") }}</span>
        </SetRow>
        <div v-if="used().length" class="sm cused">{{ tk("connectedLbl") }} <b>{{ used().join(", ") }}</b>.<span>{{ tk("twoLogins") }}</span></div>
        <div class="cnote"><span><svg viewBox="0 0 24 24" v-html="SI.lock" />{{ tk("note1") }}</span><span><svg viewBox="0 0 24 24" v-html="SI.eye" />{{ tk("note2") }}</span><span><svg viewBox="0 0 24 24" v-html="SI.shield" />{{ tk("note3") }}</span></div>
        <div class="sm cused">{{ tk("missing") }}</div>
      </div>
      <div v-else class="cempty">
        <b>{{ tk("emptyT") }}</b>
        <div class="sm">{{ tk("emptyD") }}</div>
        <div class="cnote"><span><svg viewBox="0 0 24 24" v-html="SI.lock" />{{ tk("note1") }}</span><span><svg viewBox="0 0 24 24" v-html="SI.eye" />{{ tk("note2") }}</span><span><svg viewBox="0 0 24 24" v-html="SI.shield" />{{ tk("note3") }}</span></div>
      </div>
      </template>
      <template #foot>{{ tk("otpNote") }}</template>
    </SetSection>
    <ConnCard v-for="c in cards" :key="c.source" :c="c" @test="onTest" @shot="onShot" />

    <BaseSheet :open="testOpen" @close="testOpen = false">
      <template v-if="test">
        <h3>{{ tk("testT", { label: test.label }) }}</h3>
        <template v-if="test.r.ok">
          <div class="sm cgap">{{ tk("testOk") }}</div>
          <template v-if="test.r.balances">
            <div v-for="(b, i) in test.r.balances" :key="i" class="row"><div class="grow">{{ tk("balance", { cur: b.currency }) }}</div><b>{{ b.value }}</b></div>
            <div class="sm ctop">{{ tx(test.r.note || "") }}</div>
          </template>
          <template v-else>
            <div v-for="(a, i) in test.r.accounts || []" :key="i" class="row cblk"><b>{{ a.balance == null ? tk("balNone") : tk("balShekel", { v: f0(a.balance) }) }}</b> · {{ tk("txLast30", { n: a.transactions }) }}<div v-for="(x, j) in a.first || []" :key="j" class="sm">{{ x.date }} · {{ x.description }} · {{ x.amount }}</div></div>
          </template>
        </template>
        <div v-else class="card warn"><b>{{ test.r.locked ? tk("testLocked") : tk("testFailed") }}</b><div class="sm">{{ friendlyErr(test.r.error || "") }}</div><div v-if="test.r.locked" class="sm ctop">{{ tk("testLockedD") }}</div></div>
        <div class="cend">
          <button v-if="!test.r.ok && test.src && !test.r.busy" type="button" class="btn o" data-a="connShot" :data-s="test.src" @click="onShot(test.src)">{{ tk("shot") }}</button>
          <button type="button" class="btn" data-a="close" @click="testOpen = false">{{ tk("done") }}</button>
        </div>
      </template>
    </BaseSheet>

    <BaseSheet :open="shotOpen" @close="shotOpen = false">
      <template v-if="shot">
        <h3>{{ tk("shotT", { label: shot.label }) }}</h3>
        <div class="sm cgap">{{ tk("shotD") }}</div>
        <img v-show="!shot.err" id="shotImg" class="cshot" :alt="tk('shotAlt')" :src="'/api/connections/' + encodeURIComponent(shot.src) + '/shot?t=' + shot.at" @error="shot.err = true">
        <div v-show="shot.err" id="shotErr" class="sm ctop">{{ tk("shotNone") }}</div>
        <div class="cend"><button type="button" class="btn" data-a="close" @click="shotOpen = false">{{ tk("done") }}</button></div>
      </template>
    </BaseSheet>
  </div>
</template>
