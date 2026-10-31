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
import SetSection from "./SetSection.vue";
import SetRow from "./SetRow.vue";

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
    <SetSection icon="log" :title="tk('t')" :desc="tk('d')" :count="audit.length">
      <SetRow v-for="(a, i) in audit.slice(0, N)" :key="a.id ?? a.t + i" cls="logr">
        <template #title>{{ he(a.action) }}</template>
        <template #desc><span v-if="a.detail" class="logd">{{ he(a.detail) }}</span><span class="logw"><bdi>{{ who(a.who) }}</bdi> · <bdi>{{ when(a.t) }}</bdi></span></template>
        <button v-if="a.undo" type="button" class="btn o s" data-a="undo" :data-i="i" @click="data.undo(a)">{{ tk("undo") }}</button>
      </SetRow>
      <div v-if="!audit.length" class="rlnone sm">{{ tk("empty") }}</div>
      <div v-if="audit.length > N" class="logmore"><button type="button" class="btn o s" data-a="logMore" @click="N += 50">{{ tk("more") }}</button><span class="sm">{{ tk("shown", { n: N, total: audit.length }) }}</span></div>
    </SetSection>
  </div>
</template>
