<script setup>
// An amount box that shows thousands separators while typing ("6,000").
// v-model holds the plain number as text ("6000"), so code never sees the commas.
import { ref, watch } from "vue";
const model = defineModel({ type: [String, Number], default: "" });
const grp = (v) => { const m = String(v).match(/^(-?)(\d*)(\.\d*)?$/); return m ? m[1] + m[2].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (m[3] || "") : String(v); };
const shown = ref(grp(model.value ?? ""));
watch(model, (v) => { if (String(v ?? "") !== shown.value.replace(/,/g, "")) shown.value = grp(v ?? ""); });
function input(e) {
  const el = e.target, raw = el.value, pos = el.selectionStart, before = raw.slice(0, pos).replace(/[^\d.]/g, "").length;
  const out = grp(raw.replace(/[^\d.-]/g, ""));
  shown.value = out; model.value = out.replace(/,/g, "");
  if (out !== raw) { el.value = out; let n = 0, i = 0; for (; i < out.length && n < before; i++) if (/[\d.]/.test(out[i])) n++; try { el.setSelectionRange(i, i); } catch { /* not a text box */ } }
}
</script>

<template>
  <input type="text" inputmode="numeric" data-money="1" :value="shown" @input="input">
</template>
