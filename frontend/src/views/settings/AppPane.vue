<script setup>
// Settings → Version and updates: the installed version, new versions, and (in a browser) installing the app or getting the desktop app.
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { UP, upWeb } from "../../core/updates.js";
import { installPrompt, install } from "../../core/pwa.js";
import SetSection from "./SetSection.vue";
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
const RELEASES = "https://github.com/userofit123/moneymanager/releases/latest";
const newer = (a, b) => { const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
const appNewer = computed(() => !!(MM && UP.latest && newer(UP.latest, String(MM.version).split("-")[0])));
// Install: the options for this device first, then the other devices the app works on.
// win, mac, linux, android, ios: each has its way to install from the browser, and some have an app to download from GitHub.
const REPO = "https://github.com/userofit123/moneymanager/releases";
const OSES = ["win", "mac", "linux", "android", "ios"];
const here = device.ios ? "ios" : device.android ? "android" : device.windows ? "win" : device.mac ? "mac" : device.linux ? "linux" : "";
const others = OSES.filter((o) => o !== here);
// The files on GitHub for one kind of device (the first one is the main button)
function files(os) {
  const x = UP.latest, base = REPO + "/download/v" + x + "/";
  if (os == "android") return [{ k: "androidBtn", href: RELEASES, main: true }];
  if (os != "win" && os != "linux") return [];
  if (!x) return [{ k: "deskAll", href: REPO + "/latest", main: true }];
  if (os == "win") return [{ k: "deskWin", href: base + "Money-Manager-Setup-" + x + ".exe", main: true }];
  return [{ k: "deskRpm", href: base + "Money-Manager-" + x + "-linux-x86_64.rpm", main: true }, { k: "deskDeb", href: base + "Money-Manager-" + x + "-linux-amd64.deb", main: false }, { k: "deskApp", href: base + "Money-Manager-" + x + "-linux-x86_64.AppImage", main: false }];
}
// this computer's desktop app files, then the page with all of them
const hereFiles = computed(() => { const l = files(here); return here == "win" || here == "linux" ? (UP.latest ? [...l, { k: "deskAll", href: REPO + "/latest", main: false }] : l) : []; });
// the update states that have a line of text under "New versions"
const STATES = ["uptodate", "checking", "available", "downloading", "installing", "ready", "error", "dev"];
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
    <SetSection v-if="MM" id="appCard" icon="phone" :title="tk('appT')" :desc="tk('appD')">
      <SetRow :title="tk('installed')" :desc="'⁦v' + MM.version + '⁩'"><button type="button" class="btn o s" data-a="updNotes" @click="changelog">{{ tk("whatsNew") }}</button></SetRow>
      <SetRow :title="appNewer ? tk('appNew', { v: v() }) : tk('appGet')" :desc="tk('appGetD')"><button type="button" class="btn s" :class="{ o: !appNewer }" data-a="appGet" @click="MM.open(RELEASES)">{{ tk("appGetBtn") }}</button></SetRow>
    </SetSection>
    <SetSection id="updCard" icon="install" :title="MM ? tk('srvVerT') : tk('title')" :desc="desk ? tk('descDesk') : tk('descServer')">
      <SetRow :title="tk('installed')" :desc="UP.cur ? '⁦v' + UP.cur + '⁩' : ''"><button type="button" class="btn o s" data-a="updNotes" @click="changelog">{{ tk("whatsNew") }}</button></SetRow>
      <SetRow :title="tk('updT')" :cls="UP.status == 'error' ? 'updfail' : ''">
        <template v-if="STATES.includes(UP.status)" #desc>
          <template v-if="UP.status == 'uptodate'">{{ UP.none ? tk("latestNone") : tk("latest") }}</template>
          <template v-else-if="UP.status == 'checking'">{{ tk("checking") }}</template>
          <template v-else-if="UP.status == 'available'">{{ desk ? tk("availDesk", { v: v() }) : tk("availServer", { v: v() }) }}</template>
          <template v-else-if="UP.status == 'downloading'">{{ tk("downloading", { v: v(), p: UP.percent }) }}<span class="bar updbar"><i :style="{ width: UP.percent + '%' }" /></span></template>
          <template v-else-if="UP.status == 'installing'"><i class="spinner" /> {{ tk("installing", { v: v() }) }}</template>
          <template v-else-if="UP.status == 'ready'">{{ tk("ready", { v: v() }) }}</template>
          <template v-else-if="UP.status == 'error'">{{ tk("error") }} {{ UP.err || "" }} {{ tk("errorNeed") }}</template>
          <template v-else>{{ tk("dev") }}</template>
        </template>
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
      </SetRow>
      <SetRow v-if="desk && UP.status != 'dev' && !UP.manual" toggle data-upd="auto" :title="tk('auto')" :desc="tk('autoD')" :model-value="UP.auto" @update:model-value="setAuto" />
      <template v-if="!desk && UP.status == 'available'" #foot>{{ tk("serverHow1") }} <b>Update</b> {{ tk("or") }} <b>Pull and redeploy</b> {{ tk("serverHow2") }} <code dir="ltr">docker compose pull</code> <code dir="ltr">docker compose up -d</code>. {{ tk("serverHow3") }}</template>
    </SetSection>
    <template v-if="showGet">
      <SetSection id="instCard" icon="install" :title="tk('instT')" :desc="here ? tk('hereD', { d: tk('os.' + here) }) : tk('instD')">
        <SetRow v-if="standalone" :title="tk('doneT')" :desc="tk('doneD')" />
        <SetRow v-else :title="tk('browserT')" :desc="installPrompt ? tk('instHint') : tk('how.' + (here || 'win'))"><button v-if="installPrompt" type="button" class="btn s" data-a="install" @click="install">{{ tk("installBtn") }}</button></SetRow>
        <SetRow v-if="here == 'android'" :title="tk('androidT')" :desc="tk('androidD')"><a class="btn s" :href="RELEASES" target="_blank" rel="noopener" data-a="androidDl">{{ tk("androidBtn") }}</a></SetRow>
        <SetRow v-if="hereFiles.length" stack :title="tk('deskT')" :desc="tk('deskD')">
          <a v-for="d in hereFiles" :key="d.k" class="btn s" :class="{ o: !d.main }" :href="d.href" target="_blank" rel="noopener" data-a="deskDl">{{ tk(d.k) }}</a>
        </SetRow>
      </SetSection>
      <SetSection id="instOther" icon="app" :title="tk('otherT')" :desc="tk('otherD')">
        <SetRow v-for="o in others" :key="o" :stack="files(o).length > 1" :title="tk('os.' + o)" :desc="tk('how.' + o) + (files(o).length ? ' ' + tk('get.' + o) : '')">
          <a v-for="d in files(o)" :key="d.k" class="btn o s" :href="d.href" target="_blank" rel="noopener" :data-a="o == 'android' ? 'androidDl' : 'deskDl'">{{ tk(d.k) }}</a>
        </SetRow>
      </SetSection>
    </template>
  </div>
</template>
