<script setup>
// One connection in Settings → Connections:
// its state, what was found, the login form (open while it is not working, or when "Edit connection" is pressed) and "Import more history".
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { job, tick, mmss } from "../../core/jobs.js";
import { fmtWhen, friendlyErr, srcName } from "../../core/sources.js";
import { f0 } from "../../format.js";
import JobButton from "../../components/JobButton.vue";
import { SI } from "./icons.js";
import { nameOf, fieldName, stateName, TONE, BAD, openCards, typed, connSave, connCancel, connTest, connUnlock, connDel, connSync, connHist, assistStart } from "./conn.js";

const props = defineProps({ c: { type: Object, required: true } });
const emit = defineEmits(["test", "shot"]);
const { t } = useI18n();
const tk = (k, a) => t("settings.conn." + k, a || {});
const c = computed(() => props.c), src = computed(() => c.value.source);
const ok = computed(() => ["connected", "stale"].includes(c.value.status.key));
const open = computed(() => openCards.has(src.value) || !ok.value);
const accs = computed(() => (data.state.value?.accounts || []).filter((a) => a.src == src.value && !a.hide));
const when = (w) => fmtWhen(w);
const hint = computed(() => {
  const s = c.value.status, k = s.key, w = s.since ? when(s.since) : "";
  if (k == "failed" || k == "otp") return friendlyErr(c.value.lastError);
  return ["none", "untested", "tested", "connected", "stale", "locked"].includes(k) ? tk("hint." + k, { when: w }) : "";
});
// the typed values of this card (kept while the page is open)
if (!typed[props.c.source]) typed[props.c.source] = { nick: props.c.nickname || "", f: {} };
const v = computed(() => typed[src.value] || { nick: "", f: {} });
const days = ref("1825");
const toggle = () => { if (openCards.has(src.value)) openCards.delete(src.value); else openCards.add(src.value); };
// while a sync or test runs: the badge and the note under the card follow it
const me = computed(() => !!job.value && (job.value.source == src.value || job.value.source == "all"));
const word = (k) => ({ test: t("sync.testing"), sync: t("sync.syncing"), assist: t("sync.verifying") })[k];
const note = computed(() => {
  tick.value; const J = job.value; if (!J) return "";
  return me.value ? tk("job.mine", { what: word(J.kind), src: srcName(src.value), time: mmss(Date.now() - J.since) }) : tk("job.busy", { src: srcName(J.source), what: word(J.kind).toLowerCase() });
});
</script>

<template>
  <div :id="'conn-' + c.source" class="card ss">
    <div class="ssh" style="gap:10px 12px;flex-wrap:wrap">
      <span class="ssi"><svg viewBox="0 0 24 24" v-html="SI[c.kind == 'card' ? 'card' : 'bank']" /></span>
      <div style="flex:1 1 160px;min-width:0"><b>{{ nameOf(c) }}</b><div class="sm" :style="c.status.tone == 'red' ? 'color:var(--neg)' : ''">{{ hint }}</div></div>
      <div v-if="c.configured" class="flex" style="gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-inline-start:auto;flex:0 0 auto">
        <JobButton class="btn s" kind="sync" :source="c.source" data-a="connSync" :data-s="c.source" @click="connSync(c.source)">{{ tk("sync") }}</JobButton>
        <button v-if="BAD.includes(c.status.key) && c.provider != 'wise'" type="button" class="btn o s" data-a="connShot" :data-s="c.source" :data-tip="tk('shotTip')" @click="emit('shot', c.source)">{{ tk("shot") }}</button>
        <button v-if="ok" type="button" class="btn o s" data-a="connEdit" :data-s="c.source" :aria-expanded="open" @click="toggle">{{ open ? tk("hide") : tk("edit") }}</button>
      </div>
      <span class="bd" style="margin-inline-start:0" :class="me ? 'fl' : TONE[c.status.tone]" :data-badge="c.source"><template v-if="me"><i class="spinner" />{{ word(job.kind) }}…</template><template v-else>{{ stateName(c.status) }}</template></span>
    </div>
    <div v-if="c.configured" class="ssb p">
      <div class="cdg">
        <div class="cdt"><span>{{ tk("lStatus") }}</span><b>{{ stateName(c.status) }}</b></div>
        <div class="cdt"><span>{{ tk("lLast") }}</span><b>{{ c.status.since ? when(c.status.since) : tk("never") }}</b></div>
        <div v-if="c.provider != 'wise'" class="cdt"><span>{{ tk("lVerified") }}</span><b>{{ c.assistedAt ? when(c.assistedAt) : tk("notYet") }}</b></div>
        <div class="cdt"><span>{{ tk("lFound") }}</span><b><span v-if="accs.length" class="accs"><span v-for="a in accs" :key="a.n">{{ a.n }}<br><span class="sm num">{{ a.cur == "ILS" ? "₪" : a.cur + " " }}{{ f0(a.v) }}</span></span></span><template v-else>{{ tk("noneYet") }}</template></b></div>
      </div>
    </div>
    <div v-if="open" class="ssb p">
      <div class="jobnote" :class="{ act: me }" :data-src="c.source">{{ note }}</div>
      <form autocomplete="off" @submit.prevent>
        <div class="fld"><label>{{ c.extra ? tk("nickReq") : tk("nickOpt") }}</label><input v-model="v.nick" type="text" autocomplete="off" maxlength="30" :data-cn="c.source" :placeholder="tk('nickPh')"></div>
        <div v-for="f in c.fields" :key="f.k" class="fld"><label>{{ fieldName(f) }}</label><input v-model="v.f[f.k]" type="password" autocomplete="off" :data-cf="c.source + ':' + f.k" :placeholder="c.configured ? tk('savedPh') : ''"></div>
      </form>
      <div class="flex" style="gap:8px;flex-wrap:wrap">
        <button type="button" class="btn s" data-a="connSave" :data-s="c.source" @click="connSave(c.source)">{{ tk("save") }}</button>
        <button v-if="!c.configured" type="button" class="btn o s" data-a="connCancel" :data-s="c.source" @click="connCancel(c.source)">{{ tk("cancel") }}</button>
        <JobButton v-if="c.configured && c.provider != 'wise'" :class="['btn', c.status.key == 'otp' ? '' : 'o', 's']" kind="assist" :source="c.source" data-a="connAssist" :data-s="c.source" @click="assistStart(c.source)">{{ tk("verify") }}</JobButton>
        <JobButton v-if="c.configured" class="btn o s" kind="test" :source="c.source" data-a="connTest" :data-s="c.source" @click="connTest(c.source).then((r) => r && emit('test', c.source, r))">{{ tk("test") }}</JobButton>
        <button v-if="c.locked" type="button" class="btn o s" data-a="connUnlock" :data-s="c.source" @click="connUnlock(c.source)">{{ tk("unlock") }}</button>
        <button v-if="c.configured" type="button" class="btn r s" data-a="connDel" :data-s="c.source" style="margin-inline-start:auto" @click="connDel(c.source)">{{ tk("remove") }}</button>
      </div>
    </div>
    <div v-if="c.configured" class="sfoot">
      <div class="flex" style="gap:10px;flex-wrap:wrap;justify-content:space-between">
        <span><b style="color:var(--tx)">{{ tk("histT") }}</b><br>{{ tk("histD") }}</span>
        <span class="flex" style="gap:6px"><select v-model="days" :data-hist="c.source" :aria-label="tk('histAria')" style="min-height:36px;padding:6px 10px"><option value="365">{{ tk("h365") }}</option><option value="730">{{ tk("h730") }}</option><option value="1825">{{ tk("h1825") }}</option></select><JobButton class="btn o s" kind="sync" :source="c.source" data-a="connHist" :data-s="c.source" @click="connHist(c.source, +days)">{{ tk("histBtn") }}</JobButton></span>
      </div>
    </div>
  </div>
</template>
