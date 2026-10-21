<script setup>
// Settings → Backup and restore. A copy of the current app's section (web/js/07-periods-rules.js renderBackup, bkRun, bkRestoreGo, bkDel,
// bkPut, bkInspect, bkAskPw; the bk* cases and the bkFile handler in 08-jars.js): the daily copy, its password, and restoring a copy.
import { ref, onMounted, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { getJson, request, sendJson } from "../../core/http.js";
import { toast } from "../../core/toast.js";
import { tx } from "../../core/heText.js";
import BaseSheet from "../../components/BaseSheet.vue";
import SetHead from "./SetHead.vue";
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
const ROWS = ["transactions", "accounts", "categories", "rules", "budgets", "jars"];
const KEEP = [[3, "d3"], [7, "w1"], [14, "w2"], [30, "d30"], [60, "d60"], [90, "d90"], [365, "y1"]];
</script>

<template>
  <div id="setBackup">
    <div v-if="!BK || !BK.files" class="card sm">{{ tk("loading") }}</div>
    <template v-else>
      <div class="card ss">
        <SetHead icon="data" :title="tk('auto.t')" :desc="tk('auto.d')" />
        <div class="ssb">
          <div class="tg"><span>{{ tk("daily") }}</span><input type="checkbox" data-c="bkset" data-k="on" :checked="BK.on" @change="put({ on: $event.target.checked })"></div>
          <SetRow v-if="BK.on" :title="tk('time.t')" :desc="tk('time.d')"><input type="time" data-c="bkset" data-k="at" :value="BK.at" :aria-label="tk('time.aria')" @change="put({ at: $event.target.value })"></SetRow>
          <SetRow :title="tk('keep.t')" :desc="tk('keep.d')"><select data-c="bkset" data-k="keep" :aria-label="tk('keep.aria')" :value="String(BK.keep)" @change="put({ keep: +$event.target.value })"><option v-for="[v, l] in KEEP" :key="v" :value="String(v)">{{ tk("keep." + l) }}</option></select></SetRow>
          <SetRow :title="tk('folder.t')">
            <template #desc><b style="word-break:break-all">{{ BK.dir }}</b><div v-if="!desk" style="margin-top:4px"><span>{{ tk("folder.tip") }}</span></div></template>
            <div v-if="desk" class="flex" style="gap:8px;flex-wrap:wrap;justify-content:flex-end"><button type="button" class="btn o s" data-a="bkChoose" @click="choose">{{ tk("folder.change") }}</button><button type="button" class="btn o s" data-a="bkOpen" @click="openDir">{{ tk("folder.open") }}</button><button v-if="BK.custom" type="button" class="btn o s" data-a="bkDirDefault" @click="put({ dir: '' })">{{ tk("folder.default") }}</button></div>
            <div v-else class="flex" style="gap:8px;flex-wrap:wrap;justify-content:flex-end"><input type="text" data-c="bkset" data-k="dir" :value="BK.custom ? BK.dir : ''" :placeholder="BK.defaultDir" :aria-label="tk('folder.aria')" style="min-width:220px" @change="put({ dir: $event.target.value })"><button v-if="BK.custom" type="button" class="btn o s" data-a="bkDirDefault" @click="put({ dir: '' })">{{ tk("folder.default") }}</button></div>
          </SetRow>
          <SetRow :title="tk('pw.t')" :desc="BK.hasPassword ? tk('pw.on') : tk('pw.off')">
            <div class="flex" style="gap:8px;flex-wrap:wrap;justify-content:flex-end"><button type="button" class="btn o s" data-a="bkPw" @click="pw1 = ''; pw2 = ''; win = 'pw'">{{ BK.hasPassword ? tk("pw.change") : tk("pw.set") }}</button><button v-if="BK.hasPassword" type="button" class="btn o s" data-a="bkPwOff" @click="pwOff">{{ tk("pw.turnOff") }}</button></div>
          </SetRow>
          <div class="tg"><span>{{ tk("docs") }}</span><input type="checkbox" data-c="bkset" data-k="withDocs" :checked="BK.withDocs" @change="put({ withDocs: $event.target.checked })"></div>
          <div class="sinfo">
            <span v-if="BK.last && BK.last.ok">{{ tk("last.ok") }} <b>{{ bkWhen(BK.last.at) }}</b>.</span>
            <span v-else-if="BK.last"><b>{{ tk("last.fail") }}</b> {{ tx(BK.last.error || "") }}</span>
            <span v-else><b>{{ tk("last.none") }}</b></span>
          </div>
        </div>
      </div>
      <div class="card ss">
        <SetHead icon="data" :title="tk('contains.t')" />
        <div class="ssb"><div class="sm" style="padding:2px 0 8px;line-height:1.55"><span>{{ tk("contains.inc") }}</span></div><div class="sm" style="padding:0 0 4px;line-height:1.55"><span>{{ tk("contains.never") }}</span></div></div>
      </div>
      <div class="card ss">
        <SetHead icon="data" :title="tk('list.t')" :desc="tk('list.d')" :count="BK.files.length" />
        <div class="ssb">
          <div class="sr"><div class="srt"><b>{{ tk("list.now") }}</b></div><div class="src"><div class="flex" style="gap:8px;flex-wrap:wrap;justify-content:flex-end"><button type="button" class="btn s" data-a="bkRun" @click="run">{{ tk("list.now") }}</button><button type="button" class="btn o s" data-a="bkFind" @click="file.click()">{{ tk("list.find") }}</button></div></div></div>
          <div v-for="f in BK.files" :key="f.name" class="sr">
            <div class="srt"><b>{{ bkWhen(f.at) }}</b><div class="sm">{{ fmtSize(f.size) }}<template v-if="f.encrypted"> · <span>{{ tk("file.enc") }}</span></template><template v-if="f.safety"> · <span>{{ tk("file.safety") }}</span></template><template v-if="f.imported"> · <span>{{ tk("file.imported") }}</span></template></div></div>
            <div class="src"><div class="flex" style="gap:8px;flex-wrap:wrap;justify-content:flex-end"><button type="button" class="btn s" data-a="bkRestore" :data-n="f.name" @click="restore(f)">{{ tk("file.restore") }}</button><a class="btn o s" :href="'/api/backup/file/' + encodeURIComponent(f.name)" :download="f.name" @click="toast(tk('toast.downloading'))">{{ tk("file.download") }}</a><button type="button" class="btn o s" data-a="bkDel" :data-n="f.name" :aria-label="tk('file.del')" @click="del(f.name)">×</button></div></div>
          </div>
          <div v-if="!BK.files.length" class="sm" style="padding:10px 0"><span>{{ tk("list.empty") }}</span></div>
          <input id="bkFile" ref="file" type="file" accept=".mmbackup" style="display:none" @change="upload">
        </div>
      </div>
    </template>

    <BaseSheet :open="win == 'pw'" @close="close">
      <h3>{{ tk("setpw.t") }}</h3>
      <div class="sm" style="margin-bottom:12px;line-height:1.5"><span>{{ tk("setpw.text") }}</span></div>
      <div class="fld"><label for="bkPw1">{{ tk("setpw.p1") }}</label><input id="bkPw1" v-model="pw1" type="password" autocomplete="new-password"></div>
      <div class="fld"><label for="bkPw2">{{ tk("setpw.p2") }}</label><input id="bkPw2" v-model="pw2" type="password" autocomplete="new-password"></div>
      <div class="flex" style="justify-content:flex-end;gap:10px"><button type="button" class="btn o" @click="close">{{ tk("setpw.cancel") }}</button><button type="button" class="btn" data-a="bkPwGo" @click="pwGo">{{ tk("setpw.save") }}</button></div>
    </BaseSheet>
    <BaseSheet :open="win == 'ask'" @close="close">
      <h3>{{ tk("ask.t") }}</h3>
      <div class="fld"><label for="bkAskIn">{{ tk("ask.label") }}</label><input id="bkAskIn" ref="askIn" v-model="ask.pw" type="password" autocomplete="off" @keydown.enter="askGo"><div v-if="ask.err" class="sm" style="color:var(--bad);margin-top:6px">{{ ask.err }}</div></div>
      <div class="flex" style="justify-content:flex-end;gap:10px"><button type="button" class="btn o" @click="close">{{ tk("ask.cancel") }}</button><button type="button" class="btn" data-a="bkAskGo" @click="askGo">{{ tk("ask.go") }}</button></div>
    </BaseSheet>
    <BaseSheet :open="win == 'restore'" @close="close">
      <template v-if="info">
        <h3>{{ tk("rs.t") }}</h3>
        <div class="sm" style="margin-bottom:10px"><span>{{ tk("rs.made") }}</span> <b>{{ bkWhen(info.j.created) }}</b></div>
        <template v-for="k in ROWS" :key="k">
          <div class="row"><b class="num" style="min-width:56px">{{ info.j[k] }}</b><div class="grow"><span>{{ tk("rs." + k) }}</span></div></div>
          <div v-if="k == 'transactions' && info.j.from" class="sm" style="margin-block:-4px 6px;margin-inline-start:68px"><span>{{ tk("rs.from") }}</span> {{ info.j.from }} <span>{{ tk("rs.to") }}</span> {{ info.j.to }}</div>
        </template>
        <div v-if="info.j.newerApp" class="sm" style="margin-top:10px;color:var(--bad)"><span>{{ tk("rs.newer") }}</span></div>
        <div v-else class="sm" style="margin:12px 0;line-height:1.55"><span>{{ tk("rs.text") }}</span></div>
        <div class="flex" style="justify-content:flex-end;gap:10px"><button type="button" class="btn o" @click="close">{{ tk("rs.cancel") }}</button><button v-if="!info.j.newerApp" type="button" class="btn" data-a="bkRestoreGo" @click="restoreGo">{{ tk("rs.go") }}</button></div>
      </template>
    </BaseSheet>
  </div>
</template>
