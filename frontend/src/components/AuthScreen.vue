<script setup>
// The sign-in screen, and the first-time "choose a password" screen.
// On a phone (mobile.js) it is a full screen of its own: a centred column with large fields, clear of the notch and home bar
// (its styles, phone/styles/auth.css, are loaded only there).
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { isPhone } from "../mobile.js";
import { useI18n } from "vue-i18n";
import { app, signIn } from "../core/boot.js";
import { tx } from "../core/heText.js";
import AppLogo from "./AppLogo.vue";

const { t, te } = useI18n();
const pw = ref(""), pw2 = ref(""), code = ref(""), busy = ref(false);
const pwEl = ref(null), codeEl = ref(null);
const setup = computed(() => app.authMode === "setup");
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
      <h1>{{ setup ? t("auth.setupT") : t("auth.loginT") }}</h1>
      <p class="ph-auth-s">{{ setup ? t("auth.setupS") : t("auth.loginS") }}</p>
      <form @submit.prevent="go">
        <label for="authP">{{ t("auth.pw") }}</label>
        <input id="authP" ref="pwEl" v-model="pw" type="password" :autocomplete="setup ? 'new-password' : 'current-password'">
        <template v-if="setup"><label for="authP2">{{ t("auth.pw2") }}</label><input id="authP2" v-model="pw2" type="password" autocomplete="new-password"></template>
        <template v-if="app.need2fa"><label for="authC">{{ t("auth.code") }}</label><input id="authC" ref="codeEl" v-model="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></template>
        <p class="ph-auth-err" role="alert">{{ err }}</p>
        <button class="ph-auth-go" type="submit" :disabled="busy">{{ setup ? t("auth.create") : t("auth.signIn") }}</button>
      </form>
    </div>
  </div>
  <div v-else id="auth" style="display:flex;position:fixed;inset:0;z-index:300;background:var(--bg);align-items:center;justify-content:center;padding:20px">
    <div class="card" style="max-width:380px;width:100%">
      <div style="display:flex;align-items:center;gap:12px;margin:0 0 10px"><AppLogo sym="coin" style="margin:0" /><h3 style="margin:0">{{ setup ? t("auth.setupT") : t("auth.loginT") }}</h3></div>
      <div class="sm" style="margin-bottom:14px">{{ setup ? t("auth.setupS") : t("auth.loginS") }}</div>
      <form @submit.prevent="go">
        <div class="fld"><label for="authP">{{ t("auth.pw") }}</label><input id="authP" ref="pwEl" v-model="pw" type="password" :autocomplete="setup ? 'new-password' : 'current-password'"></div>
        <div v-if="setup" class="fld"><label for="authP2">{{ t("auth.pw2") }}</label><input id="authP2" v-model="pw2" type="password" autocomplete="new-password"></div>
        <div v-if="app.need2fa" class="fld"><label for="authC">{{ t("auth.code") }}</label><input id="authC" ref="codeEl" v-model="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></div>
        <div class="sm" style="color:var(--neg);min-height:18px;margin-bottom:8px" role="alert">{{ err }}</div>
        <button class="btn" style="width:100%" type="submit" :disabled="busy">{{ setup ? t("auth.create") : t("auth.signIn") }}</button>
      </form>
    </div>
  </div>
</template>
