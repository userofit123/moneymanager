<script setup>
// Settings → Security: the password, two-factor sign-in and sessions.
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import SetHead from "./SetHead.vue";
import SetRow from "./SetRow.vue";
import { api, sendJson, toast, toastErr } from "./shared.js";
import { request } from "../../core/http.js";
import { signOut } from "../../core/boot.js";

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
// The phone app can ask for a fingerprint, face or screen lock when it opens (the app tells us whether the phone has one)
const MM = typeof window !== "undefined" ? window.mmApp : null;
const lock = ref({ available: false, enabled: false, delay: 30 });
onMounted(async () => { if (MM) { try { lock.value = await MM.lock(); } catch { /* no lock option */ } } });
async function setLock(e) {
  const on = e.target.checked;
  try { lock.value = await MM.setLock(on); } catch (x) { e.target.checked = false; toast(String(x?.message || x).includes("lockNone") ? tk("lockNone") : tk("lockFail"), { kind: "err" }); }
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
// Signing out shows the sign-in screen (core/boot.js).
const logout = (all) => signOut(all);
</script>

<template>
  <div id="setSec">
    <div v-if="MM" class="card ss">
      <SetHead icon="lock" :title="tk('lockTitle')" :desc="tk('lockDesc')" />
      <div class="ssb">
        <label class="tg"><span><b style="font-weight:600">{{ tk("lockOn") }}</b><div class="sm">{{ lock.available ? tk("lockHow") : tk("lockNone") }}</div></span><input type="checkbox" data-a="appLock" :checked="lock.enabled" :disabled="!lock.available && !lock.enabled" @change="setLock"></label>
        <SetRow v-if="lock.enabled" :title="tk('lockWhen')" :desc="tk('lockWhenD')"><select data-c="appLock" data-k="delay" :aria-label="tk('lockWhen')" :value="String(lock.delay)" @change="setDelay"><option v-for="d in DELAYS" :key="d" :value="String(d)">{{ tk("lockD" + d) }}</option></select></SetRow>
      </div>
    </div>
    <div class="card ss">
      <SetHead icon="key" :title="tk('pwTitle')" :desc="tk('pwDesc')" />
      <div class="ssb p">
        <form @submit.prevent>
          <div class="two">
            <div class="fld"><label>{{ tk("pwCur") }}</label><input id="pwCur" v-model="pw.cur" type="password" autocomplete="current-password"></div>
            <div class="fld"><label>{{ tk("pwNew") }}</label><input id="pwNew" v-model="pw.next" type="password" autocomplete="new-password"></div>
          </div>
        </form>
        <button type="button" class="btn s" data-a="pwChange" @click="changePw">{{ tk("pwChange") }}</button>
      </div>
    </div>
    <div class="card ss">
      <SetHead icon="phone" :title="tk('tfaTitle')" :desc="totp ? tk('tfaOnDesc') : tk('tfaOffDesc')" />
      <div class="ssb">
        <SetRow :title="tk('status')" :desc="totp ? tk('turnedOn') : tk('turnedOff')"><span class="bd" :class="totp ? 'dn' : 'fl'">{{ totp ? tk("on") : tk("off") }}</span></SetRow>
        <template v-if="start">
          <div class="sinfo"><div>{{ tk("tfaKey") }}<div class="num" style="font-size:16px;word-break:break-all;margin:8px 0 4px;color:var(--tx)">{{ start.secret }}</div><div style="word-break:break-all;font-size:12px">{{ start.uri }}</div></div></div>
          <div class="tools" style="margin-top:12px"><input id="tfaCode" v-model="code" inputmode="numeric" maxlength="6" :placeholder="tk('tfaCodePh')"><button type="button" class="btn s" data-a="tfaEnable" @click="tfaEnable">{{ tk("turnOn") }}</button></div>
        </template>
        <div v-else-if="totp" class="tools" style="margin-top:12px"><input id="tfaPw" v-model="offPw" type="password" :placeholder="tk('tfaPwPh')"><button type="button" class="btn r s" data-a="tfaDisable" @click="tfaDisable">{{ tk("turnOff") }}</button></div>
        <div v-else style="padding-top:12px"><button type="button" class="btn s" data-a="tfaStart" @click="tfaStart">{{ tk("setUp") }}</button></div>
      </div>
    </div>
    <div class="card ss">
      <SetHead icon="door" :title="tk('sessTitle')" :desc="tk('sessDesc')" />
      <div class="ssb">
        <SetRow v-for="s in sessions" :key="s.id" :title="sName(s)" :desc="[sWhere(s), tk('lastUsed') + ' ' + sWhen(s.lastSeen)].filter(Boolean).join(' · ')">
          <span v-if="s.current" class="bd dn">{{ tk("thisOne") }}</span>
          <button v-else type="button" class="btn o s" data-a="endSession" @click="endSession(s)">{{ tk("signOut") }}</button>
        </SetRow>
        <SetRow :title="tk('thisDevice')" :desc="tk('thisDeviceDesc')"><button type="button" class="btn o s" data-a="logout" @click="logout(false)">{{ tk("signOut") }}</button></SetRow>
        <SetRow :title="tk('everyDevice')" :desc="tk('everyDeviceDesc')"><button type="button" class="btn o s" data-a="logoutAll" @click="logout(true)">{{ tk("signOutAll") }}</button></SetRow>
      </div>
    </div>
  </div>
</template>
