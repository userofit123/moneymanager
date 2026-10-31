<script setup>
// Settings → Where alerts go: this device, the closed app (push), Telegram, a webhook and ntfy.
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { getJson, sendJson } from "../../core/http.js";
import { toast } from "../../core/toast.js";
import { tx } from "../../core/heText.js";
import { notify, notifyLocalOff, setNotifyLocalOff } from "../../core/pwa.js";
import { device } from "../../core/device.js";
import BaseSheet from "../../components/BaseSheet.vue";
import SetSection from "./SetSection.vue";
import SetRow from "./SetRow.vue";
import { ask } from "../../core/ask.js";

const { t } = useI18n();
const tk = (k, a) => t("settings.notify." + k, a || {});
const tt = (k, a) => tk("t." + k, a);
const S = computed(() => data.state.value);
const NCH = ref({ telegram: false, telegramChat: "", webhook: false });
const loadNch = async () => { try { NCH.value = await getJson("/api/notify/channels"); } catch { /* keep */ } };
const perm = ref(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
const pushSt = ref(tk("checking")), pushHere = ref(false); // pushHere: phone push is on for this device
const tg = ref({ token: "", chat: "" }), wh = ref("");
onMounted(async () => { data.start(); pushRefresh(); await loadNch(); tg.value.chat = NCH.value.telegramChat || ""; });

// The phone app cannot receive web push: it asks its server for new alerts from time to time and shows them itself (window.mmApp)
const MM = typeof window !== "undefined" ? window.mmApp : null, inApp = !!MM;
const app = ref({ enabled: false, allowed: true });
onMounted(async () => { if (MM) { try { app.value = await MM.notif(); } catch { /* old app */ } } });
// the switches set the value first and put it back when it fails, so the switch always shows the real state
async function appSet(on) {
  app.value = { ...app.value, enabled: on };
  try { app.value = await MM.setNotif(on); } catch (x) { app.value = { ...app.value, enabled: false }; const m = String(x?.message || x); toast(tk(m.includes("notifBlocked") ? "appBlocked" : m.includes("notifServer") ? "appServer" : "appFail"), { kind: "err" }); }
}
async function appTest() { try { await MM.testNotif(); toast(tk("appSent")); } catch { toast(tk("appServer"), { kind: "err" }); } }
// ---- this device ----
const localOn = ref(perm.value == "granted" && !notifyLocalOff()); // the switch "Show alerts on this device"
async function localSet(on) {
  localOn.value = on;
  if (!on) { setNotifyLocalOff(true); return; }
  if (typeof Notification === "undefined") { localOn.value = false; toast(tt("unsupported"), { kind: "err" }); return; }
  if (Notification.permission == "default") await Notification.requestPermission();
  perm.value = Notification.permission;
  if (perm.value != "granted") { localOn.value = false; toast(tk("deniedHelp"), { kind: "err" }); return; }
  setNotifyLocalOff(false);
}
async function notifTest() { const ok = await notify(tx("Money"), tt("testText"), true); toast(ok ? tt("testSent") : tt("allowFirst"), { kind: ok ? "ok" : "err" }); }

// ---- phone push (the service worker /sw.js holds the subscription) ----
const b64u = (x) => { const p = "=".repeat((4 - (x.length % 4)) % 4), r = atob((x + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(r, (c) => c.charCodeAt(0)); };
const pushReg = async () => navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
async function pushRefresh() {
  if (!("PushManager" in window) || !navigator.serviceWorker) { pushOk.value = false; pushSt.value = window.isSecureContext ? tk("noSupport") : tk("needHttps"); return; }
  if (perm.value == "denied") { pushOk.value = false; pushSt.value = tk("deniedHelp"); return; }
  try {
    const reg = await pushReg(), sub = reg && (await reg.pushManager.getSubscription());
    const st = await data.api("/api/push/status", sendJson("POST", { endpoint: sub && sub.endpoint }));
    pushHere.value = !!st.here;
    pushSt.value = (st.here ? tk("hereOn") : tk("hereOff")) + " " + (st.devices == 1 ? tk("devOne") : tk("devMany", { n: st.devices }));
    return true;
  } catch { pushSt.value = tk("couldNotCheck"); return false; }
}
const pushOk = ref(true); // this browser can do push
async function pushSet(on) { const was = pushHere.value; pushHere.value = on; if (on) await pushOn(); else await pushOff(); if (!pushOk.value) { pushHere.value = false; pushSt.value = tk("noService"); return; } if (!(await pushRefresh())) pushHere.value = was; }
async function pushOn() {
  try {
    if (!("PushManager" in window)) { toast(tt("needHttps"), { kind: "err" }); return; }
    if ((await Notification.requestPermission()) != "granted") { toast(tt("allowFirst"), { kind: "err" }); return; }
    perm.value = Notification.permission;
    const reg = await pushReg(); if (!reg) { toast(tt("notReady"), { kind: "err" }); return; }
    const k = (await data.api("/api/push/key")).key;
    let sub = await reg.pushManager.getSubscription();
    // a sign-up made for an older server key never works again: drop it and sign up anew
    const same = (a) => { const x = new Uint8Array(a || []), y = b64u(k); return x.length == y.length && x.every((v, i) => v == y[i]); };
    if (sub && !same(sub.options && sub.options.applicationServerKey)) { await sub.unsubscribe(); sub = null; }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(k) });
    await data.api("/api/push/subscribe", sendJson("POST", { sub: sub.toJSON(), label: navigator.userAgent.slice(0, 60) }));
    toast(tt("turnedOn"));
  } catch (e) {
    // AbortError: the browser has no push service here (a private window, or a browser built without one)
    if (e && e.name == "AbortError") { pushOk.value = false; toast(tk("noService"), { kind: "err" }); return; }
    toast(tt("couldNotOn"), { kind: "err" });
  }
}
async function pushOff() {
  try {
    const reg = await pushReg(), sub = reg && (await reg.pushManager.getSubscription());
    if (sub) { await data.api("/api/push/unsubscribe", sendJson("POST", { endpoint: sub.endpoint })); await sub.unsubscribe(); }
    toast(tt("turnedOff"));
  } catch { toast(tt("couldNotOff"), { kind: "err" }); }
}
async function pushTest() { try { const r = await data.api("/api/push/test", { method: "POST" }); toast(r.ok ? tt("testSent") : tt("noDevice"), { kind: r.ok ? "ok" : "err" }); } catch { toast(tt("noServer"), { kind: "err" }); } }

// ---- ntfy: the address is part of the data (S.ntfy), saved like any change, with no history line ----
const setNtfy = (v) => data.change((s) => { s.ntfy = v.trim(); return []; });
const notSent = ref(""), notSentOpen = ref(false);
async function ntfyTest() {
  try { const r = await data.api("/api/ntfy/test", { method: "POST" }); if (r.ok) toast(tt("sentNtfy")); else { notSent.value = tx(r.reason || ""); notSentOpen.value = true; } }
  catch { toast(tt("noServer"), { kind: "err" }); }
}

// ---- Telegram and webhook ----
async function nchSave(k) {
  const body = k == "telegram" ? { token: tg.value.token, chat: tg.value.chat } : { url: wh.value };
  try { await data.api("/api/notify/channels/" + k, sendJson("PUT", body)); toast(tt("savedEnc")); if (k == "telegram") tg.value.token = ""; else wh.value = ""; await loadNch(); }
  catch (e) { toast(tx(e.message), { kind: "err" }); }
}
async function nchTest(k) { try { const r = await data.api("/api/notify/channels/" + k + "/test", { method: "POST" }); toast(r.ok ? tt("testSent") : tt("notSentCheck"), { kind: r.ok ? "ok" : "err" }); } catch { toast(tt("noServer"), { kind: "err" }); } }
const nchDel = (k) => ask(tt("stopAsk"), "", () => nchDelGo(k), { danger: true });
async function nchDelGo(k) { try { await data.api("/api/notify/channels/" + k, { method: "DELETE" }); toast(tt("removed")); await loadNch(); } catch (e) { toast(tx(e.message), { kind: "err" }); } }
</script>

<template>
  <div v-if="S" id="setNotify">
    <SetSection v-if="inApp" icon="phone" :title="tk('appT')" :desc="tk('appD')">
      <SetRow toggle :title="tk('appOn')" :desc="tk('appHow')" data-a="appNotif" :model-value="app.enabled" @update:model-value="appSet" />
      <SetRow v-if="app.enabled" :title="tk('testT')" :desc="tk('testD')"><button type="button" class="btn o s" data-a="appTest" @click="appTest">{{ tk("pushTest") }}</button></SetRow>
    </SetSection>
    <SetSection v-if="!inApp" icon="phone" :title="tk('deviceT')" :desc="tk('deviceD')">
      <SetRow toggle :title="tk('localOn')" :desc="perm == 'denied' ? tk('deniedHelp') : tk('localHow')" data-a="notifLocal" :disabled="perm == 'denied' || perm == 'unsupported'" :model-value="localOn" @update:model-value="localSet" />
      <SetRow v-if="localOn" :title="tk('testT')" :desc="tk('testD')"><button type="button" class="btn o s" data-a="notifTest" @click="notifTest">{{ tk("test") }}</button></SetRow>
    </SetSection>
    <SetSection v-if="device.inBrowser" icon="bell" :title="tk('pushT')" :desc="tk('pushD')">
      <SetRow toggle :title="tk('pushSwitch')" data-a="pushSwitch" :disabled="!pushOk" :model-value="pushHere" @update:model-value="pushSet">
        <template #desc><span id="pushSt">{{ pushSt }}</span></template>
      </SetRow>
      <SetRow v-if="pushHere" :title="tk('testT')" :desc="tk('testD')"><button type="button" class="btn o s" data-a="pushTest" @click="pushTest">{{ tk("pushTest") }}</button></SetRow>
    </SetSection>
    <SetSection icon="send" :title="tk('tgT')" :desc="tk('tgD')">
      <SetRow :title="tk('status')" :desc="NCH.telegram ? tk('tgOnD') : tk('tgOffD')" :badge="NCH.telegram" :cls="NCH.telegram ? '' : 'inl'">
        <template v-if="NCH.telegram"><button type="button" class="btn o s" data-a="nchTest" data-k="telegram" @click="nchTest('telegram')">{{ tk("test") }}</button><button type="button" class="btn r s" data-a="nchDel" data-k="telegram" @click="nchDel('telegram')">{{ tk("remove") }}</button></template>
      </SetRow>
      <SetRow stack :desc="tk('tgTokenD')">
        <template #title><label for="nchTgT">{{ tk("tgToken") }}</label></template>
        <input id="nchTgT" dir="ltr" v-model="tg.token" type="password" autocomplete="off" :placeholder="NCH.telegram ? tk('tgSaved') : '123456:ABC…'">
      </SetRow>
      <SetRow stack :desc="tk('tgChatD')">
        <template #title><label for="nchTgC">{{ tk("tgChat") }}</label></template>
        <input id="nchTgC" dir="ltr" v-model="tg.chat" placeholder="123456789" inputmode="numeric">
        <button type="button" class="btn s" data-a="nchSave" data-k="telegram" @click="nchSave('telegram')">{{ tk("save") }}</button>
      </SetRow>
    </SetSection>
    <SetSection icon="link" :title="tk('whT')" :desc="tk('whD')">
      <SetRow :title="tk('status')" :desc="NCH.webhook ? tk('whOnD') : tk('whOffD')" :badge="NCH.webhook" :cls="NCH.webhook ? '' : 'inl'">
        <template v-if="NCH.webhook"><button type="button" class="btn o s" data-a="nchTest" data-k="webhook" @click="nchTest('webhook')">{{ tk("test") }}</button><button type="button" class="btn r s" data-a="nchDel" data-k="webhook" @click="nchDel('webhook')">{{ tk("remove") }}</button></template>
      </SetRow>
      <SetRow stack :desc="tk('whLabelD')">
        <template #title><label for="nchWhU">{{ tk("whLabel") }}</label></template>
        <input id="nchWhU" dir="ltr" v-model="wh" type="password" autocomplete="off" :placeholder="NCH.webhook ? tk('tgSaved') : 'https://…'">
        <button type="button" class="btn s" data-a="nchSave" data-k="webhook" @click="nchSave('webhook')">{{ tk("save") }}</button>
      </SetRow>
    </SetSection>
    <SetSection icon="bell" title="ntfy" :desc="tk('ntfyD')">
      <SetRow stack :desc="tk('ntfyLabelD')">
        <template #title><label for="nchNtfy">{{ tk("ntfyLabel") }}</label></template>
        <input id="nchNtfy" dir="ltr" data-c="ntfy" :value="S.ntfy" placeholder="http://192.168.1.20:2586/money" @change="setNtfy($event.target.value)">
        <button type="button" class="btn o s" data-a="ntfyTest" @click="ntfyTest">{{ tk("ntfyTest") }}</button>
      </SetRow>
    </SetSection>
    <BaseSheet :open="notSentOpen" @close="notSentOpen = false">
      <h3>{{ tt("notSent") }}</h3>
      <div class="sm nsent">{{ notSent }}</div>
      <div class="cend"><button type="button" class="btn" @click="notSentOpen = false">{{ tt("done") }}</button></div>
    </BaseSheet>
  </div>
</template>
