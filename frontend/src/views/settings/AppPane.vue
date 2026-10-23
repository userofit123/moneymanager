<script setup>
// Settings → Version and updates: the installed version, new versions, and (in a browser) installing the app or getting the desktop app.
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { UP, upWeb } from "../../core/updates.js";
import { installPrompt, install } from "../../core/pwa.js";
import SetHead from "./SetHead.vue";
import SetRow from "./SetRow.vue";
import { openSettingsTab } from "./tab.js";
import { device } from "../../core/device.js";

const { t } = useI18n();
const tk = (k, a) => t("settings.app." + k, a || {});
const D = typeof window !== "undefined" ? window.desktop : null, desk = !!D;
// What the page offers follows what this copy is (core/device.js): the install and download cards are for a browser tab or the installed web app only.
const standalone = typeof matchMedia !== "undefined" && matchMedia("(display-mode: standalone)").matches;
const MM = typeof window !== "undefined" ? window.mmApp : null; // the phone app: its own version, and where to get a newer one
const showGet = device.inBrowser; // a browser tab or the installed web app: it can offer the other apps
const showInstall = showGet && !standalone; // "install this app" only from a browser tab
const showAndroid = showGet && device.android;
const RELEASES = "https://github.com/userofit123/moneymanager/releases/latest";
const newer = (a, b) => { const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
const appNewer = computed(() => !!(MM && UP.latest && newer(UP.latest, String(MM.version).split("-")[0])));
// The desktop apps are on GitHub: the files for this computer first, then the page with all of them
const REPO = "https://github.com/userofit123/moneymanager/releases", ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
const phone = /Android|iPhone|iPad|iPod/i.test(ua), win = /Windows/i.test(ua), linux = /Linux/i.test(ua) && !phone;
const downloads = computed(() => {
  const x = UP.latest, base = REPO + "/download/v" + x + "/", all = { k: "deskAll", href: REPO + "/latest", main: false };
  if (!x) return [{ k: "deskAll", href: REPO + "/latest", main: true }];
  if (win) return [{ k: "deskWin", href: base + "Money-Manager-Setup-" + x + ".exe", main: true }, all];
  if (linux) return [{ k: "deskRpm", href: base + "Money-Manager-" + x + "-linux-x86_64.rpm", main: true }, { k: "deskDeb", href: base + "Money-Manager-" + x + "-linux-amd64.deb", main: false }, { k: "deskApp", href: base + "Money-Manager-" + x + "-linux-x86_64.AppImage", main: false }, all];
  return [{ k: "deskAll", href: REPO + "/latest", main: true }];
});
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
    <div v-if="MM" id="appCard" class="card ss">
      <SetHead icon="phone" :title="tk('appT')" :desc="tk('appD')" />
      <div class="ssb">
        <SetRow :title="tk('installed')" :desc="'⁦v' + MM.version + '⁩'"><button type="button" class="btn o s" data-a="updNotes" @click="changelog">{{ tk("whatsNew") }}</button></SetRow>
        <SetRow :title="appNewer ? tk('appNew', { v: v() }) : tk('appGet')" :desc="tk('appGetD')"><button type="button" class="btn s" :class="{ o: !appNewer }" data-a="appGet" @click="MM.open(RELEASES)">{{ tk("appGetBtn") }}</button></SetRow>
      </div>
    </div>
    <div id="updCard" class="card ss">
      <SetHead icon="install" :title="MM ? tk('srvVerT') : tk('title')" :desc="desk ? tk('descDesk') : tk('descServer')" />
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
        <label v-if="desk && UP.status != 'dev' && !UP.manual" class="tg"><span><b style="font-weight:600">{{ tk("auto") }}</b><div class="sm">{{ tk("autoD") }}</div></span><input type="checkbox" data-upd="auto" :checked="UP.auto" @change="setAuto($event.target.checked)"></label>
      </div>
    </div>
    <div v-if="showGet" id="instCard" class="card ss">
      <SetHead icon="install" :title="showInstall ? tk('instT') : tk('getT')" :desc="showInstall ? tk('instD') : tk('getD')" />
      <div class="ssb">
        <SetRow v-if="showInstall" :title="tk('install')" :desc="installPrompt ? tk('instHint') : tk('instHow')"><button v-if="installPrompt" type="button" class="btn s" data-a="install" @click="install">{{ tk("installBtn") }}</button></SetRow>
        <SetRow v-if="showAndroid" :title="tk('androidT')" :desc="tk('androidD')"><a class="btn s" :href="RELEASES" target="_blank" rel="noopener" data-a="androidDl">{{ tk("androidBtn") }}</a></SetRow>
        <SetRow v-if="!phone" :title="tk('deskT')" :desc="tk('deskD')">
          <div class="flex" style="gap:6px;flex-wrap:wrap;justify-content:flex-end">
            <a v-for="d in downloads" :key="d.k" class="btn s" :class="{ o: !d.main }" :href="d.href" target="_blank" rel="noopener" data-a="deskDl">{{ tk(d.k) }}</a>
          </div>
        </SetRow>
      </div>
    </div>
  </div>
</template>
