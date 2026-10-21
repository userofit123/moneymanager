<script setup>
// Settings → Notifications. A copy of the current app's section (web/js/04-transactions.js renderAlertSettings, second half, pushReg,
// pushRefresh, pushOn, pushOff, loadNch; the notifOn, notifTest, push*, ntfyTest and nch* cases in 08-jars.js): notifications on this
// device, phone push, ntfy, Telegram and a webhook.
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { getJson, sendJson } from "../../core/http.js";
import { toast } from "../../core/toast.js";
import { tx } from "../../core/heText.js";
import { notify } from "../../core/pwa.js";
import BaseSheet from "../../components/BaseSheet.vue";
import SetHead from "./SetHead.vue";

const { t } = useI18n();
const tk = (k, a) => t("settings.notify." + k, a || {});
const tt = (k, a) => tk("t." + k, a);
const S = computed(() => data.state.value);
const NCH = ref({ telegram: false, telegramChat: "", webhook: false });
const loadNch = async () => { try { NCH.value = await getJson("/api/notify/channels"); } catch { /* keep */ } };
const perm = ref(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
const pushSt = ref(tk("checking"));
const tg = ref({ token: "", chat: "" }), wh = ref("");
onMounted(async () => { data.start(); pushRefresh(); await loadNch(); tg.value.chat = NCH.value.telegramChat || ""; });

// ---- this device ----
async function notifOn() {
  if (typeof Notification === "undefined") { toast(tt("unsupported"), { kind: "err" }); return; }
  await Notification.requestPermission(); perm.value = Notification.permission;
  toast(tt("permission", { p: tk("perm." + perm.value) }));
}
async function notifTest() { const ok = await notify(tx("Money"), tt("testText")); toast(ok ? tt("testSent") : tt("allowFirst"), { kind: ok ? "ok" : "err" }); }

// ---- phone push (the service worker /sw.js holds the subscription) ----
const b64u = (x) => { const p = "=".repeat((4 - (x.length % 4)) % 4), r = atob((x + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(r, (c) => c.charCodeAt(0)); };
const pushReg = async () => navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
async function pushRefresh() {
  if (!("PushManager" in window) || !navigator.serviceWorker) { pushSt.value = window.isSecureContext ? tk("noSupport") : tk("needHttps"); return; }
  try {
    const reg = await pushReg(), sub = reg && (await reg.pushManager.getSubscription());
    const st = await data.api("/api/push/status", sendJson("POST", { endpoint: sub && sub.endpoint }));
    pushSt.value = (st.here ? tk("hereOn") : tk("hereOff")) + " " + (st.devices == 1 ? tk("devOne") : tk("devMany", { n: st.devices }));
  } catch { pushSt.value = tk("couldNotCheck"); }
}
async function pushOn() {
  try {
    if (!("PushManager" in window)) { toast(tt("needHttps"), { kind: "err" }); return; }
    if ((await Notification.requestPermission()) != "granted") { toast(tt("allowFirst"), { kind: "err" }); return; }
    perm.value = Notification.permission;
    const reg = await pushReg(); if (!reg) { toast(tt("notReady"), { kind: "err" }); return; }
    const k = (await data.api("/api/push/key")).key;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(k) });
    await data.api("/api/push/subscribe", sendJson("POST", { sub: sub.toJSON(), label: navigator.userAgent.slice(0, 60) }));
    toast(tt("turnedOn")); pushRefresh();
  } catch { toast(tt("couldNotOn"), { kind: "err" }); }
}
async function pushOff() {
  try {
    const reg = await pushReg(), sub = reg && (await reg.pushManager.getSubscription());
    if (sub) { await data.api("/api/push/unsubscribe", sendJson("POST", { endpoint: sub.endpoint })); await sub.unsubscribe(); }
    toast(tt("turnedOff")); pushRefresh();
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
async function nchDel(k) { if (!confirm(tt("stopAsk"))) return; try { await data.api("/api/notify/channels/" + k, { method: "DELETE" }); toast(tt("removed")); await loadNch(); } catch (e) { toast(tx(e.message), { kind: "err" }); } }
</script>

<template>
  <div v-if="S" id="setNotify">
    <div class="card ss">
      <SetHead icon="phone" :title="tk('deviceT')" :desc="tk('deviceD')" />
      <div class="ssb p"><div class="sm" style="margin-bottom:10px">{{ tk("permission") }} <b>{{ tk("perm." + perm) }}</b></div><div class="flex" style="gap:8px"><button type="button" class="btn s" data-a="notifOn" @click="notifOn">{{ tk("allow") }}</button><button type="button" class="btn o s" data-a="notifTest" @click="notifTest">{{ tk("test") }}</button></div></div>
    </div>
    <div class="card ss">
      <SetHead icon="phone" :title="tk('pushT')" :desc="tk('pushD')" />
      <div class="ssb p"><div id="pushSt" class="sm" style="margin-bottom:10px">{{ pushSt }}</div><div class="flex" style="gap:8px"><button type="button" class="btn s" data-a="pushOn" @click="pushOn">{{ tk("pushOn") }}</button><button type="button" class="btn o s" data-a="pushOff" @click="pushOff">{{ tk("pushOff") }}</button><button type="button" class="btn o s" data-a="pushTest" @click="pushTest">{{ tk("pushTest") }}</button></div></div>
    </div>
    <div class="card ss">
      <SetHead icon="bell" title="ntfy" :desc="tk('ntfyD')" />
      <div class="ssb p"><div class="fld"><label>{{ tk("ntfyLabel") }}</label><input data-c="ntfy" :value="S.ntfy" placeholder="https://rhs.taile6739f.ts.net:PORT/money" @change="setNtfy($event.target.value)"></div><button type="button" class="btn o s" data-a="ntfyTest" @click="ntfyTest">{{ tk("ntfyTest") }}</button></div>
    </div>
    <div class="sm" style="margin:0 4px 12px;line-height:1.5">{{ tk("note") }}</div>
    <div class="card ss">
      <SetHead icon="phone" :title="tk('tgT')" :desc="tk('tgD')" />
      <div class="ssb p">
        <div class="flex" style="justify-content:space-between;gap:8px"><span class="sm">{{ tk("status") }}</span><span class="bd" :class="NCH.telegram ? 'dn' : 'fl'">{{ NCH.telegram ? tk("on") : tk("off") }}</span></div>
        <div class="fld" style="margin-top:8px"><label for="nchTgT">{{ tk("tgToken") }}</label><input id="nchTgT" v-model="tg.token" type="password" autocomplete="off" :placeholder="NCH.telegram ? tk('tgSaved') : '123456:ABC…'"></div>
        <div class="fld"><label for="nchTgC">{{ tk("tgChat") }}</label><input id="nchTgC" v-model="tg.chat" placeholder="123456789" inputmode="numeric"></div>
        <div class="flex" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn s" data-a="nchSave" data-k="telegram" @click="nchSave('telegram')">{{ tk("save") }}</button><template v-if="NCH.telegram"><button type="button" class="btn o s" data-a="nchTest" data-k="telegram" @click="nchTest('telegram')">{{ tk("test") }}</button><button type="button" class="btn r s" data-a="nchDel" data-k="telegram" @click="nchDel('telegram')">{{ tk("remove") }}</button></template></div>
      </div>
    </div>
    <div class="card ss">
      <SetHead icon="link" title="Webhook" :desc="tk('whD')" />
      <div class="ssb p">
        <div class="flex" style="justify-content:space-between;gap:8px"><span class="sm">{{ tk("status") }}</span><span class="bd" :class="NCH.webhook ? 'dn' : 'fl'">{{ NCH.webhook ? tk("on") : tk("off") }}</span></div>
        <div class="fld" style="margin-top:8px"><label for="nchWhU">{{ tk("whLabel") }}</label><input id="nchWhU" v-model="wh" type="password" autocomplete="off" :placeholder="NCH.webhook ? tk('tgSaved') : 'https://…'"></div>
        <div class="flex" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn s" data-a="nchSave" data-k="webhook" @click="nchSave('webhook')">{{ tk("save") }}</button><template v-if="NCH.webhook"><button type="button" class="btn o s" data-a="nchTest" data-k="webhook" @click="nchTest('webhook')">{{ tk("test") }}</button><button type="button" class="btn r s" data-a="nchDel" data-k="webhook" @click="nchDel('webhook')">{{ tk("remove") }}</button></template></div>
      </div>
    </div>
    <BaseSheet :open="notSentOpen" @close="notSentOpen = false">
      <h3>{{ tt("notSent") }}</h3>
      <div class="sm" style="margin-bottom:12px">{{ notSent }}</div>
      <div class="flex" style="justify-content:flex-end"><button type="button" class="btn" @click="notSentOpen = false">{{ tt("done") }}</button></div>
    </BaseSheet>
  </div>
</template>
