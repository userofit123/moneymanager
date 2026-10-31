<script>
import { ref } from "vue";
// the log, read when the section opens
const ERRS = ref({ rows: [], system: null, loaded: false });
</script>

<script setup>
// Settings → Problems and support: what the server knows about this system, and every error recorded.
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { getJson, request } from "../../core/http.js";
import { toast } from "../../core/toast.js";
import { tx } from "../../core/heText.js";
import SetSection from "./SetSection.vue";
import SetRow from "./SetRow.vue";
import { errTime, errSysText, errText, hasMore, copyText, SEP } from "./errlog.js";

const { t, locale } = useI18n();
const when = (a) => (locale.value === "he" ? new Date(a).toLocaleString("he-IL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : errTime(a));
const tk = (k, a) => t("settings.err." + k, a || {});
async function load() { try { const j = await getJson("/api/errors?limit=500"); ERRS.value = { rows: j.rows || [], system: j.system, loaded: true }; } catch { ERRS.value = { ...ERRS.value, loaded: true }; } }
onMounted(load);
const R = computed(() => ERRS.value.rows), y = computed(() => ERRS.value.system || {});
// the facts shown in "System information" (an empty one is left out)
const kv = computed(() => {
  const s = y.value;
  return [[tk("kApp"), s.app], [tk("kMode"), s.mode ? tx(s.mode) : ""], [tk("kSys"), (s.os || "") + " · " + (s.platform || "") + " " + (s.arch || "")], [tk("kMem"), s.memoryMB ? tk("memV", { free: s.freeMB, total: s.memoryMB }) : ""], [tk("kNode"), (s.node || "") + (s.electron ? " / " + s.electron : "")], [tk("kTz"), (s.timezone || "") + " " + (s.utcOffset || "")], [tk("kData"), s.data ? tk("dataV", { a: s.data.accounts, t: s.data.transactions }) : ""], [tk("kWin"), navigator.userAgent]].filter(([, v]) => v !== "" && v != null);
});
const sys = () => errSysText(y.value);
const copyOne = (x) => copyText(sys() + SEP + errText(x), tk("tOne"));
const copyAll = () => copyText(sys() + SEP + R.value.map(errText).join(SEP), R.value.length == 1 ? tk("tAllOne") : tk("tAllMany", { n: R.value.length }));
async function clear() { try { await request("/api/errors", { method: "DELETE" }); ERRS.value = { ...ERRS.value, rows: [] }; toast(tk("tCleared")); } catch { /* stays as it was */ } }
</script>

<template>
  <div id="setErr">
    <div v-if="!ERRS.loaded" class="card sm">{{ tk("loading") }}</div>
    <template v-else>
      <SetSection icon="log" :title="tk('sysT')" :desc="tk('sysD')" pad>
        <div class="kv"><div v-for="[k, v] in kv" :key="k" class="kvr"><span class="k">{{ k }}</span><span class="v">{{ String(v) }}</span></div></div>
        <div class="errsys"><button type="button" class="btn o s" data-a="errCopySys" @click="copyText(sys(), tk('tSys'))">{{ tk("copySys") }}</button></div>
      </SetSection>
      <SetSection icon="log" :title="tk('title')" :desc="tk('desc')" :count="R.length">
        <template #head><button type="button" class="btn o s" data-a="errRefresh" @click="load">{{ tk("refresh") }}</button></template>
        <SetRow :title="tk('sendT')" :desc="tk('sendD')">
          <button type="button" class="btn s" data-a="errCopyAll" :disabled="!R.length" @click="copyAll">{{ tk("copyAll") }}</button>
          <button type="button" class="btn r s" data-a="errClear" :disabled="!R.length" @click="clear">{{ tk("clear") }}</button>
        </SetRow>
        <div v-for="x in R" :key="x.id" class="al">
          <span class="sev" :class="x.source == 'sync' || x.source == 'test' ? 'med' : 'high'" />
          <div class="errw">
            <b>{{ tx(x.action || x.source) }}</b>
            <div class="sm errm">{{ tx(x.message) }}</div>
            <div class="sm errt">{{ when(x.at) }} · {{ x.source }} · #{{ x.id }}</div>
            <details v-if="hasMore(x)" class="kvd errd"><summary>{{ tk("details") }}</summary><pre>{{ errText(x) }}</pre></details>
          </div>
          <button type="button" class="btn o s" data-a="errCopy" :data-id="x.id" @click="copyOne(x)">{{ tk("copy") }}</button>
        </div>
        <div v-if="!R.length" class="sm rlnone">{{ tk("none") }}</div>
      </SetSection>
    </template>
  </div>
</template>
