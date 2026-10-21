<script setup>
// A sentence with the names, dates and amounts it is about in bold (data-em/emph in the current app's
// web/js/09-profile-export-settings.js). em: the names to bold; lead: also bold a short "Label:" at the start ("Usual causes:").
import { computed } from "vue";
import { categoryName } from "../catnames.js";
import { i18n } from "../i18n.js";
const props = defineProps({ text: { type: String, default: "" }, em: { type: Array, default: () => [] }, lead: Boolean });
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const parts = computed(() => {
  const v = props.text, toks = [];
  props.em.filter(Boolean).forEach((n) => { toks.push(n); const h = categoryName(n, i18n.global.locale.value); if (h && h !== n) toks.push(h); });
  const re = new RegExp("(" + [...toks.sort((a, b) => b.length - a.length).map(esc), "[⁦⁩]*\\d{1,2}[⁦⁩]* (?:[A-Z][a-z]{2,8}|ב[֐-׿׳״]+)(?:,? [⁦⁩]*\\d{1,2}[⁦⁩]*:[⁦⁩]*\\d{2}[⁦⁩]*)?(?: [⁦⁩]*\\d{4}[⁦⁩]*)?", "\\d{1,2}\\/\\d{1,2}\\/\\d{4}", "[⁦]?[−+-]?[₪$€£¥]\\s?\\d[\\d,]*(?:\\.\\d+)?[⁩]?"].join("|") + ")", "g");
  const out = []; let last = 0, m, start = 0;
  if (props.lead) { const lm = /^(\s*[^:.\n]{3,30}:)(?=\s)/.exec(v); if (lm) { out.push({ b: lm[1] }); start = last = lm[1].length; } }
  re.lastIndex = start;
  while ((m = re.exec(v))) { if (m.index >= last) { if (m.index > last) out.push({ s: v.slice(last, m.index) }); out.push({ b: m[0] }); last = m.index + m[0].length; } if (m[0].length == 0) re.lastIndex++; }
  if (last < v.length) out.push({ s: v.slice(last) });
  return out;
});
</script>

<template><template v-for="(p, i) in parts" :key="i"><b v-if="p.b">{{ p.b }}</b><template v-else>{{ p.s }}</template></template></template>
