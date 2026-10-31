<script setup>
// Settings → Backup and restore: the daily copy, its password, and restoring a copy.
import { ref, computed, onMounted, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { getJson, request, sendJson } from "../../core/http.js";
import { toast } from "../../core/toast.js";
import { tx } from "../../core/heText.js";
import BaseSheet from "../../components/BaseSheet.vue";
import SetSection from "./SetSection.vue";
import SetRow from "./SetRow.vue";
import { ask as askYes } from "../../core/ask.js";

const { t, locale } = useI18n();
const tk = (k, a) => t("settings.backup." + k, a || {});
const BK = ref(null);
const desk = typeof window !== "undefined" && !!(window.desktop && window.desktop.chooseFolder);
const fmtSize = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1e3)) + " KB");
const bkWhen = (w) => new Date(w).toLocaleString(locale.value === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const err = (x) => toast(tx(x.message), { kind: "err" });

async function load() { try { BK.value = await getJson("/api/backup"); } catch { /* shows Loading… */ } }
onMounted(load);
async function put(body) { try { BK.value = await data.api("/api/backup/settings", sendJson("PUT", body)); toast(tk("toast.saved")); } catch (x) { err(x); } }
async function run() { toast(tk("toast.running"), { kind: "info" }); try { BK.value = await data.api("/api/backup/run", { method: "POST" }); toast(tk("toast.done")); } catch (x) { err(x); } }
const del = (name) => askYes(tk("toast.delConfirm"), "", () => delGo(name), { danger: true });
async function delGo(name) { try { BK.value = await data.api("/api/backup/file/" + encodeURIComponent(name), { method: "DELETE" }); } catch (x) { err(x); } }
const pwOff = () => askYes(tk("toast.pwOffConfirm"), "", () => put({ password: null }), { danger: true });
const openDir = () => window.desktop.openFolder(BK.value.dir);
async function choose() { const r = await window.desktop.chooseFolder(BK.value.dir); if (r) put({ dir: r }); }

// ---- the windows: set a password, ask for a backup's password, "Restore this backup?" ----
const win = ref(""), pw1 = ref(""), pw2 = ref(""), ask = ref({ name: "", err: "", pw: "" }), info = ref(null), askIn = ref(null);
const close = () => { win.value = ""; };
function pwGo() {
  if (pw1.value.length < 6) { toast(tk("toast.pwShort"), { kind: "err" }); return; }
  if (pw1.value !== pw2.value) { toast(tk("toast.pwMismatch"), { kind: "err" }); return; }
  close(); put({ password: pw1.value });
}
function askPw(name, e) { ask.value = { name, err: e || "", pw: "" }; win.value = "ask"; nextTick(() => setTimeout(() => askIn.value?.focus(), 60)); }
function askGo() { if (!ask.value.pw) { toast(tk("toast.enterPw"), { kind: "err" }); return; } inspect(ask.value.name, ask.value.pw); }
// Opens a backup to show what is in it. A wrong or missing password asks again.
async function inspect(name, pw) {
  try {
    const r = await request("/api/backup/inspect", sendJson("POST", { name, password: pw || undefined })), j = await r.json().catch(() => ({}));
    // the server answers 401 with needPassword when the password is missing or wrong
    if (r.status == 401 && j.needPassword) { askPw(name, pw ? tx(j.error || "") : ""); return; }
    if (!r.ok) { toast(j.error ? tx(j.error) : tk("toast.cantOpen"), { kind: "err" }); return; }
    info.value = { name, pw: pw || "", j }; win.value = "restore";
  } catch (x) { err(x); }
}
const restore = (f) => (f.encrypted ? askPw(f.name, "") : inspect(f.name));
async function restoreGo() {
  toast(tk("toast.restoring"), { kind: "info" });
  try { await data.api("/api/backup/restore", sendJson("POST", { name: info.value.name, password: info.value.pw || undefined })); close(); toast(tk("toast.restored")); setTimeout(() => location.reload(), 900); } catch (x) { err(x); }
}
// "Find a backup file…": the file is copied to the backups, then opened like the others
const file = ref(null);
async function upload(e) {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  toast(tk("toast.reading"), { kind: "info" });
  try {
    const j = await data.api("/api/backup/upload?name=" + encodeURIComponent(f.name), { method: "POST", headers: { "content-type": "application/octet-stream" }, body: f });
    BK.value = j;
    const x = (j.files || []).find((y) => y.name == j.name);
    if (x && x.encrypted) askPw(j.name, ""); else inspect(j.name);
  } catch (x) { err(x); }
}
// the first line of "Your backups": when the last one was made, or why it failed
const lastText = computed(() => { const l = BK.value?.last; if (!l) return tk("last.none"); return l.ok ? bkWhen(l.at) : tk("last.fail") + " " + tx(l.error || ""); });
const fileDesc = (f) => [fmtSize(f.size), f.encrypted && tk("file.enc"), f.safety && tk("file.safety"), f.imported && tk("file.imported")].filter(Boolean).join(" · ");
const ROWS = ["transactions", "accounts", "categories", "rules", "budgets", "jars"];
const KEEP = [[3, "d3"], [7, "w1"], [14, "w2"], [30, "d30"], [60, "d60"], [90, "d90"], [365, "y1"]];
</script>

<template>
  <div id="setBackup">
    <div v-if="!BK || !BK.files" class="card sm">{{ tk("loading") }}</div>
    <template v-else>
      <SetSection icon="backup" :title="tk('auto.t')" :desc="tk('auto.d')">
        <SetRow toggle data-c="bkset" data-k="on" :title="tk('daily')" :model-value="BK.on" @update:model-value="put({ on: $event })" />
        <SetRow v-if="BK.on" :title="tk('time.t')" :desc="tk('time.d')"><input type="time" data-c="bkset" data-k="at" :value="BK.at" :aria-label="tk('time.aria')" @change="put({ at: $event.target.value })"></SetRow>
        <SetRow :title="tk('keep.t')" :desc="tk('keep.d')"><select data-c="bkset" data-k="keep" :aria-label="tk('keep.aria')" :value="String(BK.keep)" @change="put({ keep: +$event.target.value })"><option v-for="[v, l] in KEEP" :key="v" :value="String(v)">{{ tk("keep." + l) }}</option></select></SetRow>
        <SetRow v-if="desk" stack :title="tk('folder.t')">
          <template #desc><bdi class="bkdir" dir="ltr">{{ BK.dir }}</bdi></template>
          <button type="button" class="btn o s" data-a="bkChoose" @click="choose">{{ tk("folder.change") }}</button><button type="button" class="btn o s" data-a="bkOpen" @click="openDir">{{ tk("folder.open") }}</button><button v-if="BK.custom" type="button" class="btn o s" data-a="bkDirDefault" @click="put({ dir: '' })">{{ tk("folder.default") }}</button>
        </SetRow>
        <SetRow v-else stack :title="tk('folder.t')" :desc="tk('folder.tip')">
          <input type="text" dir="ltr" data-c="bkset" data-k="dir" :value="BK.custom ? BK.dir : ''" :placeholder="BK.defaultDir" :aria-label="tk('folder.aria')" @change="put({ dir: $event.target.value })"><button v-if="BK.custom" type="button" class="btn o s" data-a="bkDirDefault" @click="put({ dir: '' })">{{ tk("folder.default") }}</button>
        </SetRow>
        <SetRow :title="tk('pw.t')" :desc="BK.hasPassword ? tk('pw.on') : tk('pw.off')" :badge="BK.hasPassword">
          <button type="button" class="btn o s" data-a="bkPw" @click="pw1 = ''; pw2 = ''; win = 'pw'">{{ BK.hasPassword ? tk("pw.change") : tk("pw.set") }}</button><button v-if="BK.hasPassword" type="button" class="btn o s" data-a="bkPwOff" @click="pwOff">{{ tk("pw.turnOff") }}</button>
        </SetRow>
        <SetRow toggle data-c="bkset" data-k="withDocs" :title="tk('docs')" :model-value="BK.withDocs" @update:model-value="put({ withDocs: $event })" />
        <template #foot><p class="bkfoot">{{ tk("contains.inc") }}</p><p class="bkfoot">{{ tk("contains.never") }}</p></template>
      </SetSection>
      <SetSection icon="file" :title="tk('list.t')" :desc="tk('list.d')" :count="BK.files.length">
        <SetRow :title="tk('last.t')" :desc="lastText" :cls="BK.last && !BK.last.ok ? 'bkfail' : ''">
          <button type="button" class="btn s" data-a="bkRun" @click="run">{{ tk("list.now") }}</button><button type="button" class="btn o s" data-a="bkFind" @click="file.click()">{{ tk("list.find") }}</button>
        </SetRow>
        <SetRow v-for="f in BK.files" :key="f.name" :title="bkWhen(f.at)" :desc="fileDesc(f)">
          <button type="button" class="btn s" data-a="bkRestore" :data-n="f.name" @click="restore(f)">{{ tk("file.restore") }}</button><a class="btn o s" :href="'/api/backup/file/' + encodeURIComponent(f.name)" :download="f.name" @click="toast(tk('toast.downloading'))">{{ tk("file.download") }}</a><button type="button" class="btn o s" data-a="bkDel" :data-n="f.name" :aria-label="tk('file.del')" :data-tip="tk('file.del')" @click="del(f.name)">×</button>
        </SetRow>
        <div v-if="!BK.files.length" class="rlnone sm">{{ tk("list.empty") }}</div>
        <input id="bkFile" ref="file" type="file" accept=".mmbackup" hidden @change="upload">
      </SetSection>
    </template>

    <BaseSheet :open="win == 'pw'" @close="close">
      <h3>{{ tk("setpw.t") }}</h3>
      <p class="sm bktext">{{ tk("setpw.text") }}</p>
      <div class="fld"><label for="bkPw1">{{ tk("setpw.p1") }}</label><input id="bkPw1" v-model="pw1" type="password" autocomplete="new-password"></div>
      <div class="fld"><label for="bkPw2">{{ tk("setpw.p2") }}</label><input id="bkPw2" v-model="pw2" type="password" autocomplete="new-password"></div>
      <div class="cend"><button type="button" class="btn o" @click="close">{{ tk("setpw.cancel") }}</button><button type="button" class="btn" data-a="bkPwGo" @click="pwGo">{{ tk("setpw.save") }}</button></div>
    </BaseSheet>
    <BaseSheet :open="win == 'ask'" @close="close">
      <h3>{{ tk("ask.t") }}</h3>
      <div class="fld"><label for="bkAskIn">{{ tk("ask.label") }}</label><input id="bkAskIn" ref="askIn" v-model="ask.pw" type="password" autocomplete="off" @keydown.enter="askGo"><div v-if="ask.err" class="sm bkerr">{{ ask.err }}</div></div>
      <div class="cend"><button type="button" class="btn o" @click="close">{{ tk("ask.cancel") }}</button><button type="button" class="btn" data-a="bkAskGo" @click="askGo">{{ tk("ask.go") }}</button></div>
    </BaseSheet>
    <BaseSheet :open="win == 'restore'" @close="close">
      <template v-if="info">
        <h3>{{ tk("rs.t") }}</h3>
        <div class="sm bkmade"><span>{{ tk("rs.made") }}</span> <b>{{ bkWhen(info.j.created) }}</b></div>
        <template v-for="k in ROWS" :key="k">
          <div class="row"><b class="num bkn">{{ info.j[k] }}</b><div class="grow"><span>{{ tk("rs." + k) }}</span></div></div>
          <div v-if="k == 'transactions' && info.j.from" class="sm bkrange"><span>{{ tk("rs.from") }}</span> {{ info.j.from }} <span>{{ tk("rs.to") }}</span> {{ info.j.to }}</div>
        </template>
        <p v-if="info.j.newerApp" class="sm bkerr">{{ tk("rs.newer") }}</p>
        <p v-else class="sm bktext">{{ tk("rs.text") }}</p>
        <div class="cend"><button type="button" class="btn o" @click="close">{{ tk("rs.cancel") }}</button><button v-if="!info.j.newerApp" type="button" class="btn" data-a="bkRestoreGo" @click="restoreGo">{{ tk("rs.go") }}</button></div>
      </template>
    </BaseSheet>
  </div>
</template>
