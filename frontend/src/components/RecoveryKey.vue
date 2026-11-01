<script setup>
// A recovery key shown once (after the first password, after a reset with the old key, or from Settings → Security),
// with Copy, Download (.txt) and Print, so it can be kept somewhere safe.
import { useI18n } from "vue-i18n";
import { copyText } from "../views/settings/errlog.js";
import { now } from "../core/clock.js";
import { dstr } from "../dates.js";

const props = defineProps({ value: { type: String, required: true } });
const { t } = useI18n();
// the phone app's web view cannot print
const canPrint = typeof window !== "undefined" && !window.mmApp && typeof window.print === "function";

const fileText = () => [t("auth.rk.fileT"), "", props.value, "", t("auth.rk.made", { d: dstr(now.value) }), "", t("auth.rk.fileS")].join("\n");
const copy = () => copyText(props.value, t("auth.rk.copied"));
function download() {
  const l = document.createElement("a");
  l.href = URL.createObjectURL(new Blob([fileText() + "\n"], { type: "text/plain;charset=utf-8" }));
  l.download = "money-recovery-key.txt"; document.body.appendChild(l); l.click(); l.remove();
  setTimeout(() => URL.revokeObjectURL(l.href), 4000);
}
// Prints only the key and its note (styles/components/recovery.css, html.rkprint)
function print() {
  const h = document.documentElement;
  h.classList.add("rkprint");
  addEventListener("afterprint", () => h.classList.remove("rkprint"), { once: true });
  window.print();
}
</script>

<template>
  <div class="rkey">
    <div class="rkey-v num" dir="ltr" data-a="recoveryKey">{{ value }}</div>
    <div class="rkey-acts">
      <button type="button" class="btn o s" data-a="rkCopy" @click="copy">{{ t("auth.rk.copy") }}</button>
      <button type="button" class="btn o s" data-a="rkDownload" @click="download">{{ t("auth.rk.download") }}</button>
      <button v-if="canPrint" type="button" class="btn o s" data-a="rkPrint" @click="print">{{ t("auth.rk.print") }}</button>
    </div>
    <div class="rkey-p"><h2>{{ t("auth.rk.fileT") }}</h2><p>{{ t("auth.rk.fileS") }}</p></div>
  </div>
</template>
