<script setup>
// "Forgot password?" on the sign-in screen: prove it is you with the recovery key or a code sent to the phone,
// then choose a new password (and the authenticator code when two-step sign-in is on). The server: server/src/passwordRecovery.js.
// Drawn inside AuthScreen's card on a computer and inside its full screen on a phone (phone/styles/auth.css).
import { ref, computed, onMounted, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { isPhone } from "../mobile.js";
import { request, getJson, sendJson } from "../core/http.js";
import { enterApp } from "../core/boot.js";
import { tx } from "../core/heText.js";

const emit = defineEmits(["back", "step"]);
const { t, te } = useI18n();
const step = ref("choose"); // choose | secret | pw
const way = ref(""); // key | code
const canCode = ref(false); // an alert channel can carry a code (the server says only yes or no)
const secret = ref(""), pw = ref(""), pw2 = ref(""), code = ref(""), need2fa = ref(false);
const err = ref(""), busy = ref(false), sent = ref(false);
const firstEl = ref(null);
const errText = computed(() => (!err.value ? "" : te("auth.f." + err.value) ? t("auth.f." + err.value) : te("auth." + err.value) ? t("auth." + err.value) : tx(err.value)));

onMounted(async () => { try { canCode.value = !!(await getJson("/api/auth/reset")).phone; } catch { /* only the key then */ } });

function go(s) { step.value = s; err.value = ""; emit("step", s, way.value); nextTick(() => firstEl.value?.focus()); }
async function post(path, body) {
  const r = await request(path, sendJson("POST", body || {})).catch(() => null);
  const j = r ? await r.json().catch(() => ({})) : {};
  return { ok: !!r?.ok, j: r ? j : { error: "failed" } };
}
async function run(fn) { if (busy.value) return; busy.value = true; try { await fn(); } finally { busy.value = false; } }

const sendCode = () => run(async () => {
  const { ok, j } = await post("/api/auth/reset/code");
  if (!ok) { err.value = j.error || "failed"; return; }
  way.value = "code"; secret.value = ""; sent.value = true;
  if (step.value !== "secret") go("secret"); else err.value = "";
});
function pick(w) { if (w === "code") return sendCode(); way.value = "key"; secret.value = ""; go("secret"); }

const check = () => run(async () => {
  const { ok, j } = await post("/api/auth/reset/check", { way: way.value, secret: secret.value });
  if (!ok) { err.value = j.error || "failed"; return; }
  need2fa.value = !!j.need2fa; pw.value = pw2.value = code.value = ""; go("pw");
});
const finish = () => run(async () => {
  if (pw.value !== pw2.value) { err.value = "differ"; return; }
  const { ok, j } = await post("/api/auth/reset/finish", { way: way.value, secret: secret.value, password: pw.value, code: code.value });
  if (ok) { await enterApp(j.recoveryKey); return; }
  if (j.wrong) { go("secret"); err.value = j.error; return; } // the key or code stopped working meanwhile
  if (j.need2fa) need2fa.value = true;
  err.value = j.error || "failed";
});
const submit = () => (step.value === "secret" ? check() : step.value === "pw" ? finish() : null);
function back() { if (step.value === "choose") emit("back"); else go(step.value === "pw" ? "secret" : "choose"); }

const goCls = computed(() => (isPhone.value ? "ph-auth-go" : "btn fpw-go"));
const errCls = computed(() => (isPhone.value ? "ph-auth-err" : "sm fpw-err"));
</script>

<template>
  <form class="fpw" @submit.prevent="submit">
    <template v-if="step === 'choose'">
      <div class="fpw-ways">
        <button type="button" class="fpw-way" data-a="resetKey" :disabled="busy" @click="pick('key')">
          <span><b>{{ t("auth.f.useKey") }}</b><span>{{ t("auth.f.useKeyD") }}</span></span>
          <svg class="fpw-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
        </button>
        <button v-if="canCode" type="button" class="fpw-way" data-a="resetCode" :disabled="busy" @click="pick('code')">
          <span><b>{{ t("auth.f.useCode") }}</b><span>{{ t("auth.f.useCodeD") }}</span></span>
          <svg class="fpw-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <p v-if="errText" :class="errCls" role="alert">{{ errText }}</p>
      <div class="fpw-none">
        <b>{{ t("auth.f.neither") }}</b>
        <p>{{ t("auth.f.neitherDocker") }}</p>
        <code dir="ltr">docker compose exec app node src/cli.js set-password</code>
        <p>{{ t("auth.f.neitherApp") }}</p>
      </div>
    </template>

    <template v-else-if="step === 'secret'">
      <div v-if="way === 'key'" class="fld">
        <label for="fpwKey">{{ t("auth.f.keyLbl") }}</label>
        <input id="fpwKey" ref="firstEl" v-model="secret" dir="ltr" class="fpw-key" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD-EFGH-JKMN-PQRS-TUVW">
      </div>
      <div v-else class="fld">
        <label for="fpwCode">{{ t("auth.f.codeLbl") }}</label>
        <input id="fpwCode" ref="firstEl" v-model="secret" dir="ltr" inputmode="numeric" autocomplete="one-time-code" maxlength="6">
      </div>
      <p :class="errCls" role="alert">{{ errText }}</p>
      <button type="submit" :class="goCls" :disabled="busy || !secret.trim()">{{ t("auth.f.next") }}</button>
      <button v-if="way === 'code'" type="button" class="fpw-link" data-a="resendCode" :disabled="busy" @click="sendCode">{{ t("auth.f.sendAgain") }}</button>
    </template>

    <template v-else>
      <div class="fld"><label for="fpwP">{{ t("auth.f.newPw") }}</label><input id="fpwP" ref="firstEl" v-model="pw" type="password" autocomplete="new-password"></div>
      <div class="fld"><label for="fpwP2">{{ t("auth.f.newPw2") }}</label><input id="fpwP2" v-model="pw2" type="password" autocomplete="new-password"></div>
      <div v-if="need2fa" class="fld"><label for="fpwC">{{ t("auth.code") }}</label><input id="fpwC" v-model="code" dir="ltr" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></div>
      <p :class="errCls" role="alert">{{ errText }}</p>
      <button type="submit" :class="goCls" :disabled="busy">{{ t("auth.f.save") }}</button>
    </template>

    <button type="button" class="fpw-link" data-a="resetBack" @click="back">{{ step === "choose" ? t("auth.f.toSignIn") : t("auth.f.back") }}</button>
  </form>
</template>
