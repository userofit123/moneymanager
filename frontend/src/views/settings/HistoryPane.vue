<script>
import { ref } from "vue";
// how many lines show; kept while you move between sections
const N = ref(50);
</script>

<script setup>
// Settings → Change history: every change, newest first, with Undo where it can be undone.
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { tx } from "../../core/heText.js";
import { isolateNumbers } from "../../core/polish.js";
import SetHead from "./SetHead.vue";

const { t, locale } = useI18n();
const tk = (k, a) => t("settings.log." + k, a || {});
const S = computed(() => data.state.value);
onMounted(() => { data.start(); });
const audit = computed(() => S.value?.audit || []);
const when = (w) => new Date(w).toLocaleString(locale.value === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
// saved English shown in Hebrew; amounts in it keep their left-to-right order
const he = (s) => (locale.value === "he" ? isolateNumbers(tx(s)) : s);
const who = (w) => (w === "You" || w === "System" ? tk("who." + w) : w);
</script>

<template>
  <div v-if="S" id="setLog">
    <div class="card ss">
      <SetHead icon="log" :title="tk('t')" :desc="tk('d')" :count="audit.length" />
      <div class="ssb">
        <div v-for="(a, i) in audit.slice(0, N)" :key="a.id ?? a.t + i" class="al">
          <span class="sev" :class="a.who == 'System' ? 'low' : 'med'" />
          <div style="flex:1;min-width:0"><b style="font-size:14px">{{ he(a.action) }}</b><div class="sm" style="word-break:break-word">{{ he(a.detail) }}</div><div class="sm" style="opacity:.7"><bdi>{{ who(a.who) }}</bdi> · <bdi>{{ when(a.t) }}</bdi></div></div>
          <button v-if="a.undo" type="button" class="btn o s" data-a="undo" :data-i="i" @click="data.undo(a)">{{ tk("undo") }}</button>
        </div>
      </div>
      <div v-if="audit.length > N" class="txm"><button type="button" class="btn o" data-a="logMore" @click="N += 50">{{ tk("more") }} <span class="sm" style="margin-inline-start:6px">{{ tk("shown", { n: N, total: audit.length }) }}</span></button></div>
    </div>
  </div>
</template>
