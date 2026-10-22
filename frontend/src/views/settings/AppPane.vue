<script setup>
// Settings → Version and updates: the installed version, new versions, and (in a browser) installing the app or getting the desktop app.
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { UP, upWeb } from "../../core/updates.js";
import { installPrompt, install } from "../../core/pwa.js";
import SetHead from "./SetHead.vue";
import SetRow from "./SetRow.vue";
import { openSettingsTab } from "./tab.js";

const { t } = useI18n();
const tk = (k, a) => t("settings.app." + k, a || {});
const D = typeof window !== "undefined" ? window.desktop : null, desk = !!D;
// "Install on this device" is for someone using the app in a browser: not in the installed phone app, and not in the desktop app (which is installed already,
// also when its window shows another server, whose page has no desktop controls: desktopServers is there then).
const inDesktop = typeof window !== "undefined" && !!window.desktopServers;
const standalone = typeof matchMedia !== "undefined" && matchMedia("(display-mode: standalone)").matches;
const showInstall = !desk && !inDesktop && !standalone;
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
    <div v-if="showInstall" id="instCard" class="card ss">
      <SetHead icon="install" :title="tk('instT')" :desc="tk('instD')" />
      <div class="ssb">
        <SetRow :title="tk('install')" :desc="installPrompt ? tk('instHint') : tk('instHow')"><button v-if="installPrompt" type="button" class="btn s" data-a="install" @click="install">{{ tk("installBtn") }}</button></SetRow>
        <SetRow v-if="!phone" :title="tk('deskT')" :desc="tk('deskD')">
          <div class="flex" style="gap:6px;flex-wrap:wrap;justify-content:flex-end">
            <a v-for="d in downloads" :key="d.k" class="btn s" :class="{ o: !d.main }" :href="d.href" target="_blank" rel="noopener" data-a="deskDl">{{ tk(d.k) }}</a>
          </div>
        </SetRow>
      </div>
    </div>
  </div>
</template>
