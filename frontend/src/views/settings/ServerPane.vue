<script setup>
// Settings → Server (the desktop app only): which Money Manager the window shows. "This computer" is the app's own private database;
// the others are Money Manager servers elsewhere. The desktop shell does the work (desktop/main.js); this page only asks it.
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import SetHead from "./SetHead.vue";
import SetRow from "./SetRow.vue";
import { ask } from "../../core/ask.js";

const { t } = useI18n();
const tk = (k, a) => t("settings.server." + k, a || {});
const SV = typeof window !== "undefined" ? window.desktopServers : null;
const srv = ref({ active: null, list: [] }), nm = ref(""), ad = ref(""), busy = ref(false), err = ref("");
async function load() { if (SV) { try { srv.value = await SV.state(); } catch { /* the list stays empty */ } } }
onMounted(load);
const rows = computed(() => [{ id: "local", name: tk("local"), desc: tk("localD"), now: srv.value.active === "local" }, ...srv.value.list.map((s) => ({ id: s.id, name: s.name, desc: s.url, now: srv.value.active === s.id }))]);
const use = (id) => SV.use(id);
const remove = (r) => ask(tk("removeAsk", { name: r.name }), tk("removeText"), async () => { srv.value = await SV.remove(r.id); }, { danger: true });
async function add() {
  if (busy.value) return;
  busy.value = true; err.value = "";
  try {
    const r = await SV.add(nm.value, ad.value);
    if (r.error) err.value = tk("err_" + r.error); else { srv.value = r.state; nm.value = ""; ad.value = ""; SV.use(r.id); }
  } catch { err.value = tk("err_unreachable"); }
  busy.value = false;
}
</script>

<template>
  <div id="setServer">
    <div class="card ss">
      <SetHead icon="link" :title="tk('title')" :desc="tk('desc')" />
      <div class="ssb">
        <SetRow v-for="r in rows" :key="r.id" :title="r.name" :desc="r.desc">
          <span v-if="r.now" class="bd fl">{{ tk("now") }}</span>
          <button v-else type="button" class="btn s" data-a="srvUse" @click="use(r.id)">{{ tk("open") }}</button>
          <button v-if="r.id != 'local'" type="button" class="btn o s" data-a="srvRemove" style="margin-inline-start:6px" @click="remove(r)">{{ tk("remove") }}</button>
        </SetRow>
        <SetRow :title="tk('addT')" :desc="tk('addD')" />
        <div class="tools" style="margin-top:6px">
          <input v-model="nm" :placeholder="tk('name')" :aria-label="tk('name')" autocomplete="off">
          <input v-model="ad" dir="ltr" :placeholder="tk('addr')" :aria-label="tk('addrL')" autocomplete="off" spellcheck="false" @keydown.enter.prevent="add">
          <button type="button" class="btn" data-a="srvAdd" :disabled="busy" @click="add">{{ busy ? tk("checking") : tk("add") }}</button>
        </div>
        <div class="sm" style="color:var(--neg);min-height:18px" role="alert">{{ err }}</div>
      </div>
    </div>
  </div>
</template>
