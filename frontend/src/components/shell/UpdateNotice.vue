<script setup>
// The notice that a new version of this app is out (the desktop app and the Android app only: a browser tab has the server's
// own update steps in Settings). Download starts it here, the bar shows how far it got, then Install. View opens
// Settings → Version and updates, where all this is too, so the notice keeps out of the way there. Close hides it for this
// version on this device; a newer version shows again.
// It wears a toast's look (toasts.css) and sits at the bottom of the window; on the phone, above the tab bar.
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { ownUpdate, ownDownload, ownInstall, openUpdates } from "../../core/updates.js";
import { noticeShown } from "../../lib/ownUpdate.js";
import { readPref, writePref } from "../../core/prefs.js";
import { current, query } from "../../router.js";
import { settingsTab } from "../../views/settings/tab.js";
import { isPhone } from "../../mobile.js";

const { t } = useI18n();
const KEY = "moneyUpdClosed"; // kept on this device only (not one of the choices prefs.js copies to the server)
const closedFor = ref(readPref(KEY) || "");
const U = ownUpdate;
// Settings → Version and updates: the phone shows it as Settings with ?sec=app, the computer as the Settings tab
const onPage = computed(() => current.value.name === "settings" && (isPhone.value ? new URLSearchParams(query.value).get("sec") === "app" : settingsTab.value === "app"));
const shown = computed(() => noticeShown(U.value, closedFor.value) && !onPage.value);
const v = (x) => "⁦" + x + "⁩";
const sub = computed(() => {
  const u = U.value;
  if (u.status === "downloading") return u.percent >= 0 ? t("upd.dlPct", { p: u.percent }) : t("upd.dlMb", { mb: u.mb });
  if (u.status === "ready") return u.where === "phone" ? t("upd.readyPhoneD") : t("upd.readyD");
  if (u.err) return t("settings.app.appErr." + u.err);
  return u.cur ? t("upd.haveV", { v: v(u.cur) }) : "";
});
function close() { closedFor.value = U.value.version; writePref(KEY, U.value.version); }
</script>

<template>
  <div v-if="shown" class="upn" role="status">
    <div class="toast info">
      <span class="ti"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg></span>
      <div class="tm">
        <b>{{ t("upd.newT", { v: v(U.version) }) }}</b>
        <div>{{ sub }}</div>
        <span v-if="U.status === 'downloading'" class="bar"><i :style="{ width: Math.max(U.percent, 0) + '%' }" /></span>
        <div class="upn-acts">
          <button v-if="U.status === 'ready'" type="button" class="btn s" data-a="upnInstall" @click="ownInstall">{{ t("settings.app.appInstall") }}</button>
          <button v-else-if="U.status === 'available'" type="button" class="btn s" data-a="upnDownload" @click="ownDownload">{{ t("settings.app.appDownload") }}</button>
          <button type="button" class="btn o s" data-a="upnView" @click="openUpdates">{{ t("upd.view") }}</button>
        </div>
      </div>
      <button type="button" class="tx" data-a="upnClose" :aria-label="t('common.close')" @click="close">×</button>
    </div>
  </div>
</template>
