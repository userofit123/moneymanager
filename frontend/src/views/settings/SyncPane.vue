<script>
import { ref } from "vue";
// how many log lines show; kept while you move between sections (SLOGN)
const N = ref(50);
</script>

<script setup>
// Settings → Sync: when the server syncs by itself, how far back it reads, and the log of every sync.
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { fmtWhen } from "../../core/sources.js";
import { tx } from "../../core/heText.js";
import { f0 } from "../../format.js";
import SetSection from "./SetSection.vue";
import SetRow from "./SetRow.vue";
import { SYNC_SET, loadConn, syncSet } from "./conn.js";

const { t, locale } = useI18n();
const tk = (k, a) => t("settings.sync." + k, a || {});
const loc = () => (locale.value === "he" ? "he-IL" : "en-GB");
const p2 = (n) => String(n).padStart(2, "0");
const ss = computed(() => SYNC_SET.value || { hours: 8, at: "06:00", firstDays: 365, routineDays: 30 });
// the times of day it syncs: the first one, then every N hours, round the clock
const times = computed(() => {
  const h = +ss.value.hours; if (!h) return [];
  const [a, b] = String(ss.value.at || "06:00").split(":").map(Number), o = [];
  for (let k = 0; k * h < 24; k++) o.push((a * 60 + b + k * h * 60) % 1440);
  return o.sort((x, y) => x - y).map((m) => p2(Math.floor(m / 60)) + ":" + p2(m % 60));
});
const nextTxt = computed(() => (ss.value.next ? new Date(ss.value.next).toLocaleString(loc(), { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: ss.value.tz || undefined }) : ""));
const HOURS = [24, 12, 8, 6, 4, 0], ROUTINE = [14, 30, 60, 90], FIRST = [90, 180, 365, 730, 1825];

// ---- the sync log ----
const L = ref(null), failed = ref(false);
async function loadLog() {
  try { L.value = await data.api("/api/sync/log"); failed.value = false; } catch { failed.value = true; }
}
onMounted(() => { data.start(); loadLog(); loadConn(); });
const dm = (x) => new Date(x + "T00:00:00").toLocaleDateString(loc(), { day: "numeric", month: "short", year: "numeric" });
const dur = (x) => { if (!x.finished_at) return tk("durRun"); const s = Math.round((new Date(x.finished_at) - new Date(x.started_at)) / 1000); return s < 60 ? s + "s" : Math.floor(s / 60) + "m " + (s % 60) + "s"; };
const asked = (x) => (x.days ? tk("askedV", { n: f0(x.days), d: dm(new Date(new Date(x.started_at).getTime() - x.days * 864e5).toISOString().slice(0, 10)) }) : "–");
const got = (x) => (x.ok && x.seen != null ? (x.seen ? tk("gotV", { n: f0(x.seen), d: dm(x.oldest) }) : tk("noTx")) : "–");
const msg = (x) => (!x.ok && x.message ? tx(x.message) : x.ok && x.message && /only returned/.test(x.message) ? tx(x.message.split(". ").slice(1).join(". ")) : "");
</script>

<template>
  <div id="setSyncP">
    <div id="setSyncCfg">
      <SetSection icon="sync" :title="tk('autoT')" :desc="tk('autoD')">
        <SetRow :title="tk('howT')" :desc="tk('howD')"><select data-c="syncset" data-k="hours" :aria-label="tk('howT')" :value="String(ss.hours)" @change="syncSet('hours', $event.target.value)"><option v-for="h in HOURS" :key="h" :value="String(h)">{{ tk("h" + h) }}</option></select></SetRow>
        <SetRow v-if="+ss.hours" :title="+ss.hours == 24 ? tk('timeT') : tk('firstT')">
          <template #desc><template v-if="+ss.hours == 24">{{ tk("timeD") }}</template><template v-else>{{ tk("syncsAt") }} <b>{{ times.join(", ") }}</b>{{ tk("everyDay") }}</template></template>
          <input type="time" data-c="syncset" data-k="at" :value="ss.at || '06:00'" :aria-label="tk('timeAria')" @change="syncSet('at', $event.target.value)">
        </SetRow>
        <SetRow v-if="+ss.hours" :title="tk('nextT')" :desc="ss.lastAuto ? tk('lastAuto', { when: fmtWhen(ss.lastAuto) }) : tk('notYet')"><b class="snext">{{ nextTxt }}</b></SetRow>
        <SetRow v-else :title="tk('off')" :desc="tk('offD')" :badge="false" />
        <SetRow :title="tk('routineT')" :desc="tk('routineD')"><select data-c="syncset" data-k="routineDays" :aria-label="tk('routineT')" :value="String(ss.routineDays)" @change="syncSet('routineDays', $event.target.value)"><option v-for="d in ROUTINE" :key="d" :value="String(d)">{{ tk("r" + d) }}</option></select></SetRow>
        <SetRow :title="tk('firstImpT')" :desc="tk('firstImpD')"><select data-c="syncset" data-k="firstDays" :aria-label="tk('firstImpT')" :value="String(ss.firstDays)" @change="syncSet('firstDays', $event.target.value)"><option v-for="d in FIRST" :key="d" :value="String(d)">{{ tk("f" + d) }}</option></select></SetRow>
      </SetSection>
    </div>
    <div id="setSync">
      <SetSection icon="clock" :title="tk('logT')" :desc="tk('logD')" :count="L && L.length ? L.length : null">
        <template #head><button type="button" class="btn o s" data-a="syncLogRef" @click="loadLog">{{ tk("refresh") }}</button></template>
        <div v-if="failed" class="sm slmsg">{{ tk("loadFail") }}</div>
        <div v-else-if="!L" class="sm slmsg">{{ tk("loading") }}</div>
        <template v-else-if="L.length">
          <div v-for="(x, i) in L.slice(0, N)" :key="i" class="al">
            <span class="sev" :class="x.finished_at ? (x.ok ? 'low' : 'high') : 'med'" />
            <div class="slw">
              <div class="slt"><b>{{ tx(x.label) }} · {{ x.finished_at ? (x.ok ? tk("ok") : tk("failed")) : tk("running") }}</b><span class="sm">{{ fmtWhen(x.started_at) }} · {{ x.origin == "auto" ? tk("auto") : tk("manual") }} · {{ dur(x) }}</span></div>
              <div class="sm slg"><span>{{ tk("asked") }}</span><span>{{ asked(x) }}</span><span>{{ tk("returned") }}</span><span>{{ got(x) }}</span><span>{{ tk("new") }}</span><span>{{ x.ok ? x.added : "–" }}</span></div>
              <div v-if="msg(x)" class="sm slm">{{ msg(x) }}</div>
            </div>
          </div>
        </template>
        <div v-else class="sm slmsg">{{ tk("empty") }}</div>
        <template v-if="L && L.length > N" #foot><button type="button" class="btn o s" data-a="syncLogMore" @click="N += 50; loadLog()">{{ tk("more") }}</button> <span class="slsh">{{ tk("shown", { n: N, total: L.length }) }}</span></template>
      </SetSection>
    </div>
  </div>
</template>
