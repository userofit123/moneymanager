<script>
import { ref } from "vue";
// the versions, read once
const REL = ref({ sections: [], loaded: false, raw: null });
</script>

<script setup>
// Settings → Change log:
// every version with what changed, newest first, in Hebrew where the Hebrew notes have it.
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { getJson } from "../../core/http.js";
import { UP, relPick, mdLite, vNewer } from "../../core/updates.js";
import SetHead from "./SetHead.vue";

const { t, locale } = useI18n();
const tk = (k, a) => t("settings.rel." + k, a || {});
onMounted(async () => { try { REL.value = { raw: await getJson("/api/version"), loaded: true }; } catch { REL.value = { ...REL.value, loaded: true }; } });
const L = computed(() => (REL.value.raw ? relPick(REL.value.raw, locale.value === "he") : []));
const cur = computed(() => UP.cur || (L.value[0] && L.value[0].v) || "");
const dt = (d) => (d ? new Date(d + "T12:00:00").toLocaleDateString(locale.value === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
const desc = computed(() => tk("desc") + (cur.value ? " " + tk("youOn", { v: "⁦" + cur.value + "⁩" }) : ""));
</script>

<template>
  <div id="setRel">
    <div class="card ss">
      <SetHead icon="log" :title="tk('title')" :desc="desc" :count="L.length" />
      <div v-if="!L.length" class="ssb"><div class="sm" style="padding:14px 2px">{{ REL.loaded ? tk("none") : tk("loading") }}</div></div>
    </div>
    <details v-for="(r, i) in L" :key="r.v" class="card ss relv" :open="i < 2 || (cur && vNewer(r.v, cur))">
      <summary class="ssh" style="cursor:pointer"><div style="flex:1;min-width:0"><b><span>{{ tk("version") }}</span> ⁦{{ r.v }}⁩<template v-if="r.v == cur">{{ " " }}<span class="bd pc p-jar">{{ tk("installed") }}</span></template><template v-else-if="cur && vNewer(r.v, cur)">{{ " " }}<span class="bd pc p-bill">{{ tk("newer") }}</span></template></b><div v-if="dt(r.date)" class="sm">{{ dt(r.date) }}</div></div></summary>
      <div class="ssb p" v-html="mdLite(r.body)" />
    </details>
  </div>
</template>
