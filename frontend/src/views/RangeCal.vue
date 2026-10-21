<script setup>
// "Custom range": a calendar to pick two dates, and the same two dates to type. A copy of the current app's calendar (rcMonthHtml, openRangeCal, rcApply in web/js/07-periods-rules.js).
import { now } from "../core/clock.js";
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { rangeOf } from "../lib/activity.js";
import { escLayer } from "../core/layers.js";

const props = defineProps({ from: String, to: String, anchor: Object, df: { type: String, default: "dmy" }, ws: { type: String, default: "sun" } });
const emit = defineEmits(["apply", "cancel"]);
const { t, locale } = useI18n();
const tk = (key) => t(key); // for keys built from a value
const p2 = (n) => String(n).padStart(2, "0");
const iso = (d) => d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
const today = iso(now.value);
const addM = (m, k) => { const d = new Date(+m.slice(0, 4), +m.slice(5, 7) - 1 + k, 1); return d.getFullYear() + "-" + p2(d.getMonth() + 1); };
const has = !!props.from;
const from = ref(has ? props.from : ""), to = ref(has ? props.to : ""), hover = ref("");
const view = ref(has ? props.from.slice(0, 7) : addM(today.slice(0, 7), -1));
const txtF = ref(""), txtT = ref(""), badF = ref(false), badT = ref(false);
const dstr = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d)); return m ? (props.df === "mdy" ? m[2] + "/" + m[3] + "/" + m[1] : m[3] + "/" + m[2] + "/" + m[1]) : String(d); };
const syncText = () => { txtF.value = from.value ? dstr(from.value) : ""; txtT.value = to.value ? dstr(to.value) : ""; badF.value = badT.value = false; };
syncText();
function parseD(s) {
  s = String(s || "").trim(); if (!s) return "";
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s), d, mo, y;
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; } else {
    m = /^(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{2}|\d{4})$/.exec(s); if (!m) return null;
    const a = +m[1], b = +m[2]; y = +m[3]; if (y < 100) y += 2000;
    if (props.df === "mdy") { mo = a; d = b; } else { d = a; mo = b; }
  }
  const x = new Date(y, mo - 1, d);
  return x.getFullYear() === y && x.getMonth() === mo - 1 && x.getDate() === d ? iso(x) : null;
}
function typed(which) {
  const v = parseD(which === "from" ? txtF.value : txtT.value), bad = which === "from" ? badF : badT;
  if (v === null) { bad.value = true; return; }
  bad.value = false;
  if (which === "from") { from.value = v; if (v) view.value = v.slice(0, 7); } else to.value = v;
  if (from.value && to.value && to.value < from.value) [from.value, to.value] = [to.value, from.value];
}
const two = ref(typeof innerWidth !== "undefined" && innerWidth >= 700);
const bad = computed(() => badF.value || badT.value);
const canApply = computed(() => !!from.value && !bad.value);
const loc = () => (locale.value === "he" ? "he-IL" : "en-GB");
const days = computed(() => { const base = new Date(2024, 0, 7 + (props.ws === "mon" ? 1 : 0)); return [...Array(7)].map((_, i) => { const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i); return locale.value === "he" ? d.toLocaleDateString("he-IL", { weekday: "narrow" }) : d.toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 2); }); });
function month(ym) {
  const Y = +ym.slice(0, 4), M = +ym.slice(5, 7), off = (new Date(Y, M - 1, 1).getDay() - (props.ws === "mon" ? 1 : 0) + 7) % 7, dim = new Date(Y, M, 0).getDate();
  let a = from.value, b = to.value || (from.value && hover.value && hover.value > from.value ? hover.value : "");
  if (a && b && b < a) [a, b] = [b, a];
  const cells = [];
  for (let i = 0; i < off; i++) cells.push({ blank: true, k: "b" + i });
  for (let d = 1; d <= dim; d++) { const k = ym + "-" + p2(d); cells.push({ k, d, cls: { s: k === a, e: k === (b || a), r: !!(a && b && k > a && k < b), t: k === today } }); }
  return { title: new Date(Y, M - 1, 1).toLocaleDateString(loc(), { month: "long" }) + " " + Y, cells };
}
const months = computed(() => [month(view.value), ...(two.value ? [month(addM(view.value, 1))] : [])]);
function pick(k) {
  if (!from.value || to.value) { from.value = k; to.value = ""; hover.value = ""; } else { to.value = k; if (to.value < from.value) [from.value, to.value] = [to.value, from.value]; }
  syncText();
}
function quick(p) { const [a, b] = rangeOf(p, now.value, props.ws); from.value = a; to.value = b.endsWith("-31") ? iso(new Date(+b.slice(0, 4), +b.slice(5, 7), 0)) : b; view.value = from.value.slice(0, 7); syncText(); }
function apply() { if (!canApply.value) return; let a = from.value, b = to.value || from.value; if (b < a) [a, b] = [b, a]; emit("apply", { from: a, to: b }); }
const el = ref(null), pos = ref({});
escLayer(() => true, () => emit("cancel"));
const off = (e) => { if (el.value && !el.value.contains(e.target)) emit("cancel"); };
const key = (e) => { if (e.key === "Enter" && e.target.closest?.(".rcal input")) { e.preventDefault(); apply(); } };
const shown = ref(false);
onMounted(async () => {
  await nextTick();
  const b = props.anchor?.getBoundingClientRect?.(), w = el.value.offsetWidth, h = el.value.offsetHeight;
  if (b) { const x = Math.max(8, Math.min(b.left, innerWidth - w - 8)); let y = b.bottom + 8; if (y + h > innerHeight - 8) y = Math.max(8, b.top - h - 8); pos.value = { insetInlineStart: (document.documentElement.classList.contains("he") ? innerWidth - x - w : x) + "px", top: y + "px" }; }
  requestAnimationFrame(() => { shown.value = true; });
  setTimeout(() => document.addEventListener("pointerdown", off, true), 0);
  document.addEventListener("keydown", key, true);
});
onBeforeUnmount(() => { document.removeEventListener("pointerdown", off, true); document.removeEventListener("keydown", key, true); });
</script>

<template>
  <div ref="el" class="actv"><div class="rcal" :class="{ in: shown }" role="dialog" :aria-label="t('activity.cal.title')" :style="pos">
    <div class="rcn">
      <button type="button" class="ib" :aria-label="t('activity.cal.earlier')" @click="view = addM(view, -1)"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" /></svg></button>
      <div class="rcms">
        <div v-for="m in months" :key="m.title" class="rcm"><div class="rct">{{ m.title }}</div><div class="rcw"><span v-for="(w, i) in days" :key="i">{{ w }}</span></div>
          <div class="rcg"><template v-for="c in m.cells" :key="c.k"><i v-if="c.blank"></i><button v-else type="button" :class="c.cls" @click="pick(c.k)" @mouseenter="from && !to && (hover = c.k)">{{ c.d }}</button></template></div></div>
      </div>
      <button type="button" class="ib" :aria-label="t('activity.cal.later')" @click="view = addM(view, 1)"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg></button>
    </div>
    <div class="rcin"><label>{{ t("activity.cal.start") }}<input v-model="txtF" inputmode="numeric" autocomplete="off" :class="{ bad: badF }" :placeholder="df === 'mdy' ? 'mm/dd/yyyy' : 'dd/mm/yyyy'" @input="typed('from')" @change="!bad && syncText()" /></label><span>–</span><label>{{ t("activity.cal.end") }}<input v-model="txtT" inputmode="numeric" autocomplete="off" :class="{ bad: badT }" :placeholder="df === 'mdy' ? 'mm/dd/yyyy' : 'dd/mm/yyyy'" @input="typed('to')" @change="!bad && syncText()" /></label></div>
    <div class="rcq"><button v-for="q in ['month', 'lastmonth', '30d', 'year']" :key="q" type="button" class="chip" @click="quick(q)">{{ tk("activity.range." + q) }}</button></div>
    <div class="rcf"><button type="button" class="btn o s" @click="emit('cancel')">{{ t("activity.d.cancel") }}</button><button type="button" class="btn s" :disabled="!canApply" @click="apply">{{ t("activity.cal.apply") }}</button></div>
  </div></div>
</template>
