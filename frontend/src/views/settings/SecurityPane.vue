<script setup>
// Settings → Security: the password, two-factor sign-in and sessions.
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import SetHead from "./SetHead.vue";
import SetRow from "./SetRow.vue";
import { api, sendJson, toast, toastErr } from "./shared.js";
import { request } from "../../core/http.js";
import { signOut } from "../../core/boot.js";

const { t } = useI18n();
const tk = (k) => t("settings.sec." + k);
const totp = ref(false);
const start = ref(null); // { secret, uri } while two-factor is being set up
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
        <SetRow :title="tk('thisDevice')" :desc="tk('thisDeviceDesc')"><button type="button" class="btn o s" data-a="logout" @click="logout(false)">{{ tk("signOut") }}</button></SetRow>
        <SetRow :title="tk('everyDevice')" :desc="tk('everyDeviceDesc')"><button type="button" class="btn o s" data-a="logoutAll" @click="logout(true)">{{ tk("signOutAll") }}</button></SetRow>
      </div>
    </div>
  </div>
</template>
