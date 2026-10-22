<script setup>
// Settings → Version and updates: the installed version, new versions, and installing the app.
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { UP, upWeb } from "../../core/updates.js";
import { installPrompt, install } from "../../core/pwa.js";
import SetHead from "./SetHead.vue";
import SetRow from "./SetRow.vue";
import { openSettingsTab } from "./tab.js";
import { ask } from "../../core/ask.js";

const { t } = useI18n();
const tk = (k, a) => t("settings.app." + k, a || {});
const D = typeof window !== "undefined" ? window.desktop : null, desk = !!D;
// The desktop app lets you choose which server it shows: this computer's own database or Money Manager servers elsewhere (the desktop shell does the work).
const SV = typeof window !== "undefined" ? window.desktopServers : null;
const srv = ref({ active: null, list: [] }), nm = ref(""), ad = ref(""), busy = ref(false), err = ref("");
async function loadSrv() { if (SV) { try { srv.value = await SV.state(); } catch { /* the list stays empty */ } } }
onMounted(loadSrv);
const srvRows = computed(() => [{ id: "local", name: tk("srvLocal"), desc: tk("srvLocalD"), now: srv.value.active === "local" }, ...srv.value.list.map((s) => ({ id: s.id, name: s.name, desc: s.url, now: srv.value.active === s.id }))]);
const srvUse = (id) => SV.use(id);
const srvRemove = (r) => ask(tk("srvRemoveAsk", { name: r.name }), tk("srvRemoveText"), async () => { srv.value = await SV.remove(r.id); }, { danger: true });
async function srvAdd() {
  if (busy.value) return;
  busy.value = true; err.value = "";
  try {
    const r = await SV.add(nm.value, ad.value);
    if (r.error) err.value = tk("srvErr_" + r.error); else { srv.value = r.state; nm.value = ""; ad.value = ""; SV.use(r.id); }
  } catch { err.value = tk("srvErr_unreachable"); }
  busy.value = false;
}
const standalone = typeof matchMedia !== "undefined" && matchMedia("(display-mode: standalone)").matches;
const v = () => (UP.latest ? "⁦" + UP.latest + "⁩" : "");
const changelog = () => openSettingsTab("rel");
// The desktop app reports how far it got through onUpdate (core/updates.js), so these only start it.
function check() { if (D) { UP.status = "checking"; D.check(); } else upWeb(true); }
const download = () => D && D.download();
function installNow() { if (!D) return; UP.status = "installing"; setTimeout(() => D.install(), 150); }
function setAuto(on) { if (!D) return; UP.auto = on; D.setAuto(on); }
</script>

<template>
  <div id="setApp">
    <div v-if="SV" id="srvCard" class="card ss">
      <SetHead icon="link" :title="tk('srvT')" :desc="tk('srvD')" />
      <div class="ssb">
        <SetRow v-for="r in srvRows" :key="r.id" :title="r.name" :desc="r.desc">
          <span v-if="r.now" class="bd fl">{{ tk("srvNow") }}</span>
          <button v-else type="button" class="btn s" data-a="srvUse" @click="srvUse(r.id)">{{ tk("srvOpen") }}</button>
          <button v-if="r.id != 'local'" type="button" class="btn o s" data-a="srvRemove" style="margin-inline-start:6px" @click="srvRemove(r)">{{ tk("srvRemove") }}</button>
        </SetRow>
        <SetRow :title="tk('srvAddT')" :desc="tk('srvAddD')" />
        <div class="tools" style="margin-top:6px">
          <input v-model="nm" :placeholder="tk('srvName')" :aria-label="tk('srvName')" autocomplete="off">
          <input v-model="ad" dir="ltr" :placeholder="tk('srvAddr')" :aria-label="tk('srvAddrL')" autocomplete="off" spellcheck="false" @keydown.enter.prevent="srvAdd">
          <button type="button" class="btn" data-a="srvAdd" :disabled="busy" @click="srvAdd">{{ busy ? tk("srvChecking") : tk("srvAdd") }}</button>
        </div>
        <div class="sm" style="color:var(--neg);min-height:18px" role="alert">{{ err }}</div>
      </div>
    </div>
    <div id="updCard" class="card ss">
      <SetHead icon="install" :title="tk('title')" :desc="desk ? tk('descDesk') : tk('descServer')" />
      <div class="ssb">
        <SetRow :title="tk('installed')" :desc="UP.cur ? '⁦v' + UP.cur + '⁩' : ''"><button type="button" class="btn o s" data-a="updNotes" @click="changelog">{{ tk("whatsNew") }}</button></SetRow>
        <div v-if="['uptodate', 'checking', 'available', 'downloading', 'installing', 'ready', 'error', 'dev'].includes(UP.status)" class="sinfo"><span>
          <template v-if="UP.status == 'uptodate'">{{ UP.none ? tk("latestNone") : tk("latest") }}</template>
          <template v-else-if="UP.status == 'checking'">{{ tk("checking") }}</template>
          <template v-else-if="UP.status == 'available'">{{ desk ? tk("availDesk", { v: v() }) : tk("availServer", { v: v() }) }}<div v-if="!desk" class="sm" style="margin-top:6px">{{ tk("serverHow1") }} <b>Update</b> {{ tk("or") }} <b>Pull and redeploy</b> {{ tk("serverHow2") }} <code>docker compose pull</code> <code>docker compose up -d</code>. {{ tk("serverHow3") }}</div></template>
          <template v-else-if="UP.status == 'downloading'">{{ tk("downloading", { v: v(), p: UP.percent }) }}<div class="bar" style="margin:8px 0 0"><i :style="{ width: UP.percent + '%' }" /></div></template>
          <template v-else-if="UP.status == 'installing'"><i class="spinner" /> {{ tk("installing", { v: v() }) }}</template>
          <template v-else-if="UP.status == 'ready'">{{ tk("ready", { v: v() }) }}</template>
          <template v-else-if="UP.status == 'error'">{{ tk("error") }} {{ UP.err || "" }} {{ tk("errorNeed") }}</template>
          <template v-else>{{ tk("dev") }}</template>
        </span></div>
        <div class="flex" style="gap:8px;flex-wrap:wrap;margin:0 0 6px">
          <template v-if="desk">
            <button v-if="UP.status == 'available'" type="button" class="btn s" data-a="updDownload" @click="download">{{ tk("downloadUpdate") }}</button>
            <button v-if="UP.status == 'ready'" type="button" class="btn s" data-a="updInstall" @click="installNow">{{ tk("restartUpdate") }}</button>
            <button v-if="UP.status == 'installing'" type="button" class="btn s" disabled><i class="spinner" /> {{ tk("closingToUpdate") }}</button>
            <button v-if="!['downloading', 'checking', 'ready', 'dev', 'installing'].includes(UP.status)" type="button" class="btn o s" data-a="updCheck" @click="check">{{ tk("checkBtn") }}</button>
            <button v-if="['available', 'ready'].includes(UP.status)" type="button" class="btn o s" data-a="goChangelog" @click="changelog">{{ tk("seeChanged") }}</button>
          </template>
          <template v-else>
            <button v-if="UP.url && UP.status == 'available'" type="button" class="btn s" data-a="goChangelog" @click="changelog">{{ tk("seeChanged") }}</button>
            <button v-if="UP.status != 'checking'" type="button" class="btn o s" data-a="updCheck" @click="check">{{ tk("checkBtn") }}</button>
          </template>
        </div>
        <label v-if="desk && UP.status != 'dev'" class="tg"><span><b style="font-weight:600">{{ tk("auto") }}</b><div class="sm">{{ tk("autoD") }}</div></span><input type="checkbox" data-upd="auto" :checked="UP.auto" @change="setAuto($event.target.checked)"></label>
      </div>
    </div>
    <div v-if="!desk && !standalone" class="card ss">
      <SetHead icon="install" :title="tk('instT')" :desc="tk('instD')" />
      <div class="ssb"><SetRow :title="tk('install')" :desc="installPrompt ? tk('instHint') : tk('instHow')"><button v-if="installPrompt" type="button" class="btn s" data-a="install" @click="install">{{ tk("installBtn") }}</button></SetRow></div>
    </div>
  </div>
</template>
