<script setup>
// Settings → Password and sign-in: app lock, the password, the recovery key, two-step sign-in and the signed-in devices.
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import SetSection from "./SetSection.vue";
import SetRow from "./SetRow.vue";
import { api, sendJson, toast, toastErr } from "./shared.js";
import { request } from "../../core/http.js";
import { signOut } from "../../core/boot.js";
import { dstr } from "../../dates.js";
import RecoveryKey from "../../components/RecoveryKey.vue";
import { qrPath, keyGroups } from "../../lib/qr.js";
import { copyText } from "./errlog.js";
import { isPhone } from "../../mobile.js";

const { t, locale } = useI18n();
const tk = (k) => t("settings.sec." + k);
// ---- where you are signed in ----
const sessions = ref([]);
const loadSessions = async () => { try { const r = await request("/api/sessions", { cache: "no-store" }); if (r.ok) sessions.value = await r.json(); } catch { /* the list stays as it was */ } };
onMounted(loadSessions);
const sWhen = (w) => new Date(w).toLocaleString(locale.value === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const sName = (s) => tk("dev." + s.kind) + (s.version ? " ⁦" + s.version + "⁩" : "");
const sWhere = (s) => [s.browser, s.os].filter(Boolean).join(" · ");
async function endSession(s) { await request("/api/sessions/" + s.id + "/end", { method: "POST" }); toast(tk("ended")); loadSessions(); }
const totp = ref(false);
const start = ref(null); // { secret, uri } while two-factor is being set up
// The setup link as a QR code for the authenticator app, drawn here so the secret never leaves the page
const qr = computed(() => (start.value ? qrPath(start.value.uri) : null));
const copyKey = () => copyText(start.value.secret, tk("tfaCopied"));
// The phone app can ask for a fingerprint, face or screen lock when it opens (the app tells us whether the phone has one)
const MM = typeof window !== "undefined" ? window.mmApp : null;
const lock = ref({ available: false, enabled: false, delay: 30 });
// A phone cannot scan its own screen: in the browser the otpauth:// link opens the authenticator app (the phone app only opens web links)
const canOpen = computed(() => isPhone.value && !MM);
onMounted(async () => { if (MM) { try { lock.value = await MM.lock(); } catch { /* no lock option */ } } });
// A failed switch is drawn again from `lock` (lockKey), so it shows Off.
const lockKey = ref(0);
async function setLock(on) {
  try { lock.value = await MM.setLock(on); } catch (x) { lockKey.value++; toast(String(x?.message || x).includes("lockNone") ? tk("lockNone") : tk("lockFail"), { kind: "err" }); }
}
async function setDelay(e) {
  try { lock.value = await MM.setLock(lock.value.enabled, +e.target.value); } catch { toast(tk("lockNone"), { kind: "err" }); }
}
const DELAYS = [0, 30, 60, 300];
const pw = ref({ cur: "", next: "" }), code = ref(""), offPw = ref("");

async function status() { try { totp.value = (await (await request("/api/auth/status", { cache: "no-store" })).json()).totp; } catch { /* keep what we had */ } }
onMounted(status);

// A call to the sign-in part of the server; says `msg` when it worked and shows the server's words when it did not.
async function call(path, body, msg) {
  try { const r = await api(path, sendJson("POST", body || {})); if (msg) toast(msg); return r; } catch (e) { toastErr(e); return null; }
}
async function changePw() {
  const r = await call("/api/auth/password", { current: pw.value.cur, next: pw.value.next }, tk("pwDone"));
  if (r) { pw.value = { cur: "", next: "" }; await status(); }
}
async function tfaStart() { const r = await call("/api/auth/2fa/start"); if (r) { start.value = r; code.value = ""; } }
async function tfaEnable() { const r = await call("/api/auth/2fa/enable", { code: code.value }, tk("tfaIsOn")); if (r) { start.value = null; await status(); } }
async function tfaDisable() { const r = await call("/api/auth/2fa/disable", { password: offPw.value }, tk("tfaIsOff")); if (r) { offPw.value = ""; await status(); } }
// ---- the recovery key: lets a forgotten password be reset on the sign-in screen ----
const rk = ref({ has: true, at: null }), rkAsk = ref(false), rkPw = ref(""), rkNew = ref("");
async function rkLoad() { try { const r = await request("/api/auth/recovery-key", { cache: "no-store" }); if (r.ok) rk.value = await r.json(); } catch { /* keep what we had */ } }
onMounted(rkLoad);
async function rkMake() {
  const r = await call("/api/auth/recovery-key", { password: rkPw.value }, tk("rkDone"));
  if (r) { rkNew.value = r.key; rkPw.value = ""; rkAsk.value = false; await rkLoad(); }
}
// Signing out shows the sign-in screen (core/boot.js).
const logout = (all) => signOut(all);
</script>

<template>
  <div id="setSec">
    <SetSection v-if="MM" icon="lock" :title="tk('lockTitle')" :desc="tk('lockDesc')">
      <SetRow :key="lockKey" toggle data-a="appLock" :title="tk('lockOn')" :desc="lock.available ? tk('lockHow') : tk('lockNone')" :model-value="lock.enabled" :disabled="!lock.available && !lock.enabled" @update:model-value="setLock" />
      <SetRow v-if="lock.enabled" :title="tk('lockWhen')" :desc="tk('lockWhenD')"><select data-c="appLock" data-k="delay" :aria-label="tk('lockWhen')" :value="String(lock.delay)" @change="setDelay"><option v-for="d in DELAYS" :key="d" :value="String(d)">{{ tk("lockD" + d) }}</option></select></SetRow>
    </SetSection>
    <SetSection icon="key" :title="tk('pwTitle')" :desc="tk('pwDesc')" pad>
      <form @submit.prevent>
        <div class="two">
          <div class="fld"><label for="pwCur">{{ tk("pwCur") }}</label><input id="pwCur" v-model="pw.cur" type="password" autocomplete="current-password"></div>
          <div class="fld"><label for="pwNew">{{ tk("pwNew") }}</label><input id="pwNew" v-model="pw.next" type="password" autocomplete="new-password"></div>
        </div>
        <div class="sact"><button type="button" class="btn s" data-a="pwChange" @click="changePw">{{ tk("pwChange") }}</button></div>
      </form>
    </SetSection>
    <SetSection icon="shield" :title="tk('rkTitle')" :desc="tk('rkDesc')">
      <div v-if="!rk.has && !rkNew" class="sinfo" data-a="rkNudge">{{ tk("rkNudge") }}</div>
      <SetRow :title="tk('rkRow')" :desc="rk.has ? t('settings.sec.rkHas', { d: rk.at ? dstr(rk.at) : '' }) : tk('rkNone')">
        <button v-if="!rkAsk && !rkNew" type="button" class="btn s" :class="{ o: rk.has }" data-a="rkStart" @click="rkAsk = true">{{ rk.has ? tk("rkMakeNew") : tk("rkMake") }}</button>
      </SetRow>
      <SetRow v-if="rkAsk" stack :title="tk('rkPwT')" :desc="rk.has ? tk('rkPwD') : tk('rkPwD1')">
        <input id="rkPw" v-model="rkPw" type="password" autocomplete="current-password" :aria-label="tk('tfaPwPh')" :placeholder="tk('tfaPwPh')" @keydown.enter.prevent="rkMake">
        <button type="button" class="btn s" data-a="rkMake" @click="rkMake">{{ tk("rkGo") }}</button>
        <button type="button" class="btn o s" @click="rkAsk = false; rkPw = ''">{{ tk("rkCancel") }}</button>
      </SetRow>
      <div v-if="rkNew" class="rknew">
        <p class="sm">{{ tk("rkShow") }}</p>
        <RecoveryKey :value="rkNew" />
        <div class="sact"><button type="button" class="btn s" data-a="rkSaved" @click="rkNew = ''">{{ tk("rkSaved") }}</button></div>
      </div>
    </SetSection>
    <SetSection icon="phone" :title="tk('tfaTitle')" :desc="tk('tfaDesc')">
      <SetRow :title="tk('tfaRow')" :desc="totp ? tk('tfaOnDesc') : tk('tfaOffDesc')" :badge="totp">
        <button v-if="!totp && !start" type="button" class="btn s" data-a="tfaStart" @click="tfaStart">{{ tk("setUp") }}</button>
      </SetRow>
      <template v-if="start">
        <div class="sinfo tfaset" :class="{ tfaph: isPhone }">
          <p class="tfahow">{{ tk(!isPhone ? "tfaHow" : canOpen ? "tfaHowTap" : "tfaHowType") }}</p>
          <a v-if="canOpen" class="btn s tfaopen" :href="start.uri" data-a="tfaOpen">{{ tk("tfaOpen") }}</a>
          <svg v-if="!isPhone" class="tfaqr" role="img" :aria-label="tk('tfaQr')" :viewBox="`-4 -4 ${qr.size + 8} ${qr.size + 8}`" shape-rendering="crispEdges"><rect x="-4" y="-4" :width="qr.size + 8" :height="qr.size + 8" fill="#fff" /><path :d="qr.d" fill="#000" /></svg>
          <div v-if="!isPhone || canOpen" class="tfaalt">{{ tk(isPhone ? "tfaTypePhone" : "tfaType") }}</div>
          <div class="tfakeyrow"><span class="tfakey" data-a="tfaKey"><bdi dir="ltr">{{ keyGroups(start.secret) }}</bdi></span><button type="button" class="btn o s" data-a="tfaCopy" @click="copyKey">{{ tk("tfaCopy") }}</button></div>
          <template v-if="isPhone">
            <div class="tfaalt">{{ tk("tfaQrPhone") }}</div>
            <svg class="tfaqr" role="img" :aria-label="tk('tfaQr')" :viewBox="`-4 -4 ${qr.size + 8} ${qr.size + 8}`" shape-rendering="crispEdges"><rect x="-4" y="-4" :width="qr.size + 8" :height="qr.size + 8" fill="#fff" /><path :d="qr.d" fill="#000" /></svg>
          </template>
        </div>
        <SetRow stack :title="tk('tfaCodeT')" :desc="tk('tfaCodeD')"><input id="tfaCode" v-model="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" :aria-label="tk('tfaCodeT')" :placeholder="tk('tfaCodePh')"><button type="button" class="btn s" data-a="tfaEnable" @click="tfaEnable">{{ tk("turnOn") }}</button></SetRow>
      </template>
      <SetRow v-else-if="totp" stack :title="tk('tfaOffT')" :desc="tk('tfaOffD')"><input id="tfaPw" v-model="offPw" type="password" autocomplete="current-password" :aria-label="tk('tfaPwPh')" :placeholder="tk('tfaPwPh')"><button type="button" class="btn r s" data-a="tfaDisable" @click="tfaDisable">{{ tk("turnOff") }}</button></SetRow>
    </SetSection>
    <SetSection icon="door" :title="tk('sessTitle')" :desc="tk('sessDesc')">
      <SetRow v-for="s in sessions" :key="s.id" :title="sName(s)" :desc="[sWhere(s), tk('lastUsed') + ' ' + sWhen(s.lastSeen)].filter(Boolean).join(' · ')">
        <span v-if="s.current" class="bd dn">{{ tk("thisOne") }}</span>
        <button v-else type="button" class="btn o s" data-a="endSession" @click="endSession(s)">{{ tk("signOut") }}</button>
      </SetRow>
      <SetRow :title="tk('thisDevice')" :desc="tk('thisDeviceDesc')"><button type="button" class="btn o s" data-a="logout" @click="logout(false)">{{ tk("signOut") }}</button></SetRow>
      <SetRow :title="tk('everyDevice')" :desc="tk('everyDeviceDesc')"><button type="button" class="btn o s" data-a="logoutAll" @click="logout(true)">{{ tk("signOutAll") }}</button></SetRow>
    </SetSection>
  </div>
</template>
