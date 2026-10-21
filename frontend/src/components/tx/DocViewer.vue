<script setup>
// The attachments viewer (#docv): the list of an entry's files and a preview of the chosen one (pictures, and PDFs drawn page by page
// with the pdf.js the current app ships at /pdf.min.js). Escape closes it, the arrow keys move between files.
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { docView, closeDocs } from "../../core/docs.js";
import { escLayer } from "../../core/layers.js";
import { displayName } from "../../lib/activity.js";

const { t } = useI18n();
const tx = computed(() => (docView.value ? (data.state.value?.tx || []).find((x) => x.id == docView.value.id) || null : null));
const sel = computed(() => docView.value?.i ?? null);
const kindOf = (n) => { const e = String(n).split(".").pop().toLowerCase(); return /^(png|jpe?g|gif|webp|bmp|avif|heic)$/.test(e) ? "img" : e == "pdf" ? "pdf" : "file"; };
const icon = (n) => ({ img: "🖼️", pdf: "📄", file: "📎" })[kindOf(n)];
const file = computed(() => {
  const x = tx.value, i = sel.value; if (!x || i == null) return null;
  const n = x.docs[i], id = x.docIds && x.docIds[i], has = x.docHas ? x.docHas[i] : true;
  return { n, url: id && has ? "/api/documents/" + id : "", kind: kindOf(n) };
});
escLayer(() => !!docView.value, closeDocs);
const pick = (i) => { docView.value = { ...docView.value, i }; };
// the fade in and out (.on)
const shown = ref(false), mounted = ref(false);
watch(docView, (v, was) => {
  if (v && !was) { mounted.value = true; requestAnimationFrame(() => (shown.value = true)); }
  else if (!v) { shown.value = false; setTimeout(() => { if (!docView.value) mounted.value = false; }, 200); }
});
watch(tx, (x) => { if (docView.value && !x) closeDocs(); });

// ---- PDF pages ----
let lib = null;
async function pdfLib() {
  if (lib) return lib;
  await new Promise((ok, no) => { const s = document.createElement("script"); s.src = "/pdf.min.js"; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js"; return lib;
}
const pdfEl = ref(null), pdfFail = ref(false);
watch(file, async (f) => {
  pdfFail.value = false; await nextTick();
  const el = pdfEl.value; if (!f || f.kind != "pdf" || !f.url || !el) return;
  try {
    const L = await pdfLib(), r = await fetch(f.url, { credentials: "same-origin" }); if (!r.ok) throw 0;
    const doc = await L.getDocument({ data: await r.arrayBuffer() }).promise; if (!el.isConnected) return;
    el.innerHTML = "";
    const w = Math.max(280, el.parentElement.clientWidth - 16), dpr = Math.min(2, window.devicePixelRatio || 1);
    for (let i = 1; i <= doc.numPages; i++) {
      const pg = await doc.getPage(i); if (!el.isConnected) return;
      const v0 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: (w / v0.width) * dpr }), c = document.createElement("canvas");
      c.width = vp.width; c.height = vp.height; el.appendChild(c);
      await pg.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
    }
  } catch { if (el.isConnected) pdfFail.value = true; }
});
const key = (e) => {
  if (!docView.value) return;
  if (tx.value && (e.key == "ArrowRight" || e.key == "ArrowLeft")) { const n = tx.value.docs.length, k = e.key == "ArrowRight" ? 1 : -1; pick(sel.value == null ? 0 : (sel.value + k + n) % n); }
};
onMounted(() => document.addEventListener("keydown", key, true));
onBeforeUnmount(() => document.removeEventListener("keydown", key, true));
</script>

<template>
  <Teleport to="body">
    <div v-if="mounted && tx" id="docv" :class="{ on: shown }" style="display:flex">
      <div class="dvback" @click="closeDocs" />
      <div class="dvbox" role="dialog" aria-modal="true" :aria-label="t('txw.dv.aria')">
        <div class="dvhead"><b>{{ t("txw.dv.title", { name: displayName(data.state.value, tx), n: tx.docs.length }, tx.docs.length) }}</b><button type="button" class="btn o s" @click="closeDocs">{{ t("txw.dv.close") }}</button></div>
        <div id="dvPrev">
          <div v-if="!file" class="sm" style="padding:6px 2px 10px">{{ t("txw.dv.choose") }}</div>
          <div v-else-if="!file.url" class="dvempty"><div style="font-size:34px">{{ icon(file.n) }}</div><b>{{ file.n }}</b><div class="sm">{{ t("txw.dv.nameOnly") }}</div></div>
          <template v-else>
            <div class="dvstage">
              <img v-if="file.kind === 'img'" :src="file.url" :alt="file.n">
              <template v-else-if="file.kind === 'pdf'"><div v-if="pdfFail" class="dvempty"><div class="sm">{{ t("txw.dv.pdfFail") }}</div><a class="btn s" :href="file.url" target="_blank" rel="noopener">{{ t("txw.dv.openDl") }}</a></div><div v-else ref="pdfEl" :key="file.url" class="pdfv"><div class="sm" style="padding:30px">{{ t("txw.dv.loading") }}</div></div></template>
              <div v-else class="dvempty"><div style="font-size:34px">{{ icon(file.n) }}</div><b>{{ file.n }}</b><div class="sm">{{ t("txw.dv.noPreview") }}</div><a class="btn s" :href="file.url" target="_blank" rel="noopener">{{ t("txw.dv.openDl") }}</a></div>
            </div>
            <div class="flex" style="justify-content:space-between;margin-top:8px"><b>{{ file.n }}</b><a class="sm" :href="file.url" target="_blank" rel="noopener" style="color:var(--acc);font-weight:600">{{ t("txw.dv.newTab") }}</a></div>
          </template>
        </div>
        <div class="sm" style="margin:12px 2px 6px">{{ sel == null ? t("txw.dv.files") : t("txw.dv.allFiles", { n: tx.docs.length }) }}</div>
        <div id="dvList"><button v-for="(n, i) in tx.docs" :key="i" type="button" class="dvitem" :class="{ on: i === sel }" @click="pick(i)"><span class="dvic">{{ icon(n) }}</span><span class="dvn">{{ n }}</span><span class="sm">{{ i === sel ? t("txw.dv.showing") : t("txw.dv.preview") }}</span></button></div>
      </div>
    </div>
  </Teleport>
</template>
