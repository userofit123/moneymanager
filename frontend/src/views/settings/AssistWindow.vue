<script setup>
// "Verify this device": the bank's page in the app's own browser, shown live over the whole page (#assist in web/index.html,
// assistOpen/assistTick/assistPost in web/js/07-periods-rules.js, the assist* cases in 08-jars.js). Clicking the picture clicks the page,
// the wheel scrolls it, and "Type my…" fills a saved login without it ever reaching this page.
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { assistWaiting } from "../../core/boot.js";
import { escLayer } from "../../core/layers.js";
import { AS, shot, assistPost, assistStop, assistOpen, loadConn, fieldName } from "./conn.js";

const { t } = useI18n();
const tk = (k, a) => t("settings.conn.assist." + k, a || {});
const text = ref("");
escLayer(() => !!AS.value, () => assistStop(true));
function click(e) { const r = e.target.getBoundingClientRect(); assistPost("click", { x: ((e.clientX - r.left) * AS.value.w) / r.width, y: ((e.clientY - r.top) * AS.value.h) / r.height }); }
function wheel(e) { assistPost("scroll", { dy: e.deltaY }); }
function send() { if (text.value) { assistPost("type", { text: text.value }); text.value = ""; } }
// a verification window that was already open when the app started opens again here (watchJobs)
watch(assistWaiting, async (src) => { if (!src) return; assistWaiting.value = ""; await loadConn(); assistOpen(src); }, { immediate: true });
</script>

<template>
  <Teleport to="body">
    <div v-if="AS" id="assist" style="display:block;position:fixed;inset:0;z-index:250;background:var(--bg);overflow:auto;padding:14px">
      <div style="max-width:1040px;margin:0 auto">
        <div class="flex" style="justify-content:space-between;gap:10px"><b id="assistT" style="font-size:18px">{{ tk("titleFor", { label: AS.label }) }}</b><div class="flex" style="gap:8px"><button type="button" class="btn o s" data-a="assistStop" data-cancel="1" @click="assistStop(true)">{{ tk("close") }}</button><button type="button" class="btn s" data-a="assistStop" @click="assistStop(false)">{{ tk("done") }}</button></div></div>
        <div class="sm" style="margin:8px 0 10px;line-height:1.5">{{ tk("d1") }} <b>{{ tk("d1b") }}</b>{{ tk("d1c") }}</div>
        <img id="assistImg" :src="shot || undefined" :alt="tk('imgAlt')" style="width:100%;border:1px solid var(--bd,#8884);border-radius:12px;cursor:pointer;background:#fff;display:block;touch-action:manipulation" @click="click" @wheel.prevent="wheel">
        <div class="tools" style="margin-top:10px"><input id="assistTxt" v-model="text" :placeholder="tk('ph')" autocomplete="off" @keydown.enter="send"><button type="button" class="btn s" data-a="assistType" @click="send">{{ tk("send") }}</button><button type="button" class="btn o s" data-a="assistKey" data-k="Enter" @click="assistPost('key', { key: 'Enter' })">{{ tk("enter") }}</button><button type="button" class="btn o s" data-a="assistKey" data-k="Tab" @click="assistPost('key', { key: 'Tab' })">{{ tk("tab") }}</button><button type="button" class="btn o s" data-a="assistKey" data-k="Backspace" @click="assistPost('key', { key: 'Backspace' })">⌫</button><button type="button" class="btn o s" data-a="assistScroll" data-d="-400" @click="assistPost('scroll', { dy: -400 })">▲</button><button type="button" class="btn o s" data-a="assistScroll" data-d="400" @click="assistPost('scroll', { dy: 400 })">▼</button></div>
        <div id="assistCreds" class="tools" style="margin-top:8px"><button v-for="f in AS.fields" :key="f.k" type="button" class="btn o s" data-a="assistCred" :data-f="f.k" @click="assistPost('credential', { field: f.k })">{{ tk("typeMy", { field: fieldName(f).toLowerCase() }) }}</button></div>
        <div class="sm" style="margin-top:8px">{{ tk("hint") }}</div>
      </div>
    </div>
  </Teleport>
</template>
