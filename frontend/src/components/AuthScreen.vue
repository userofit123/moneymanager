<script setup>
// The sign-in screen, the first-time "choose a password" screen, "Forgot password?" (AuthForgot.vue)
// and the new recovery key shown once (RecoveryKey.vue) before the app opens.
// On a phone (mobile.js) it is a full screen of its own: a centred column with large fields, clear of the notch and home bar
// (its styles, phone/styles/auth.css, are loaded only there).
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { isPhone } from "../mobile.js";
import { useI18n } from "vue-i18n";
import { app, signIn, keySaved } from "../core/boot.js";
import { tx } from "../core/heText.js";
import AppLogo from "./AppLogo.vue";
import AuthForgot from "./AuthForgot.vue";
import RecoveryKey from "./RecoveryKey.vue";

const { t, te } = useI18n();
const pw = ref(""), pw2 = ref(""), code = ref(""), busy = ref(false);
const pwEl = ref(null), codeEl = ref(null);
const setup = computed(() => app.authMode === "setup");
// "Forgot password?": which step it is on, for the heading
const forgot = ref(false), fstep = ref("choose"), fway = ref("");
const onStep = (s, w) => { fstep.value = s; fway.value = w; };
function openForgot() { app.error = ""; fstep.value = "choose"; forgot.value = true; }
function closeForgot() { forgot.value = false; nextTick(() => pwEl.value?.focus()); }
const head = computed(() => {
  if (app.newKey) return app.keyWhy === "setup" ? ["auth.rk.setupT", "auth.rk.setupS"] : ["auth.rk.resetT", "auth.rk.resetS"];
  if (forgot.value) return fstep.value === "choose" ? ["auth.f.title", "auth.f.sub"] : fstep.value === "pw" ? ["auth.f.pwT", "auth.f.pwS"] : fway.value === "code" ? ["auth.f.codeT", "auth.f.codeS"] : ["auth.f.keyT", "auth.f.keyS"];
  return setup.value ? ["auth.setupT", "auth.setupS"] : ["auth.loginT", "auth.loginS"];
});
const saving = ref(false);
async function saved() { saving.value = true; try { await keySaved(); } finally { saving.value = false; } }
// the server's own message (in Hebrew through tx(), core/heSaved.js), or one of ours by its key
const err = computed(() => (!app.error ? "" : te("auth." + app.error) ? t("auth." + app.error) : tx(app.error)));
async function go() {
  if (busy.value) return;
  busy.value = true;
  try { await signIn({ pw: pw.value, pw2: pw2.value, code: code.value }); } finally { busy.value = false; }
}
watch(() => app.need2fa, (v) => { if (v) nextTick(() => codeEl.value?.focus()); });
onMounted(() => setTimeout(() => pwEl.value?.focus(), 50));
if (isPhone.value) import("../phone/styles/auth.css");
</script>

<template>
  <div v-if="isPhone" id="auth" class="ph-auth">
    <div class="ph-auth-c">
      <AppLogo sym="coin" class="ph-auth-logo" />
      <h1>{{ t(head[0]) }}</h1>
      <p class="ph-auth-s">{{ t(head[1]) }}</p>
      <template v-if="app.newKey">
        <RecoveryKey :value="app.newKey" />
        <button class="ph-auth-go" type="button" data-a="keySaved" :disabled="saving" @click="saved">{{ t("auth.rk.saved") }}</button>
      </template>
      <AuthForgot v-else-if="forgot" @back="closeForgot" @step="onStep" />
      <form v-else @submit.prevent="go">
        <label for="authP">{{ t("auth.pw") }}</label>
        <input id="authP" ref="pwEl" v-model="pw" type="password" :autocomplete="setup ? 'new-password' : 'current-password'">
        <template v-if="setup"><label for="authP2">{{ t("auth.pw2") }}</label><input id="authP2" v-model="pw2" type="password" autocomplete="new-password"></template>
        <template v-if="app.need2fa"><label for="authC">{{ t("auth.code") }}</label><input id="authC" ref="codeEl" v-model="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></template>
        <p class="ph-auth-err" role="alert">{{ err }}</p>
        <button class="ph-auth-go" type="submit" :disabled="busy">{{ setup ? t("auth.create") : t("auth.signIn") }}</button>
        <button v-if="!setup" type="button" class="fpw-link" data-a="forgotPw" @click="openForgot">{{ t("auth.f.forgot") }}</button>
      </form>
    </div>
  </div>
  <div v-else id="auth" style="display:flex;position:fixed;inset:0;z-index:300;background:var(--bg);align-items:center;justify-content:center;padding:20px">
    <div class="card" style="max-width:380px;width:100%">
      <div style="display:flex;align-items:center;gap:12px;margin:0 0 10px"><AppLogo sym="coin" style="margin:0" /><h3 style="margin:0">{{ t(head[0]) }}</h3></div>
      <div class="sm" style="margin-bottom:14px">{{ t(head[1]) }}</div>
      <template v-if="app.newKey">
        <RecoveryKey :value="app.newKey" />
        <button class="btn" style="width:100%" type="button" data-a="keySaved" :disabled="saving" @click="saved">{{ t("auth.rk.saved") }}</button>
      </template>
      <AuthForgot v-else-if="forgot" @back="closeForgot" @step="onStep" />
      <form v-else @submit.prevent="go">
        <div class="fld"><label for="authP">{{ t("auth.pw") }}</label><input id="authP" ref="pwEl" v-model="pw" type="password" :autocomplete="setup ? 'new-password' : 'current-password'"></div>
        <div v-if="setup" class="fld"><label for="authP2">{{ t("auth.pw2") }}</label><input id="authP2" v-model="pw2" type="password" autocomplete="new-password"></div>
        <div v-if="app.need2fa" class="fld"><label for="authC">{{ t("auth.code") }}</label><input id="authC" ref="codeEl" v-model="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></div>
        <div class="sm" style="color:var(--neg);min-height:18px;margin-bottom:8px" role="alert">{{ err }}</div>
        <button class="btn" style="width:100%" type="submit" :disabled="busy">{{ setup ? t("auth.create") : t("auth.signIn") }}</button>
        <button v-if="!setup" type="button" class="fpw-link" data-a="forgotPw" @click="openForgot">{{ t("auth.f.forgot") }}</button>
      </form>
    </div>
  </div>
</template>
