<script setup>
// Recap (in More): the computer's Recap for a phone, part by part in the same order and look. The greeting with the month's
// days; then a route down the start side, the same as the computer's path of circles: what you began with, each step
// through the month (money in, card bills, stretches of spending), what you have now, how it is split, what is still to pay,
// what needs a look. The route ends at "Where you stand" (two totals, the big amount and the month's line), then a link down
// to a look at next month. Each part has its label (a link), its big amount, its sentence and the same pictures as the
// computer: sums as a stack of small cards, notes, name pills, the day bars, the split bar, payments by date and budget
// cards. What the computer shows on hover opens with a tap. What each part holds comes from pagelogic/recap.js.
import { ref, computed, watch, nextTick, onBeforeUnmount } from "vue";
import { f0, fm } from "../../format.js";
import { pages } from "../../routes.js";
import { dayBarHeights } from "../../lib/recap.js";
import { useRecap, ICON, SUMI } from "../../pagelogic/recap.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import PhoneSheet from "../components/PhoneSheet.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import EmptyState from "../components/EmptyState.vue";
import PIcon from "../components/PIcon.vue";
import BaseDialog from "../../components/BaseDialog.vue";
defineProps({ id: { type: String, default: null } });

const { t, S, M, G, L, mi, nm, dshort, dday, dfull, p2, parts, recapGo, billOpen, rel, relAmt, doRelease, dayTip } = useRecap();
const P = (k, o) => G(t("phone.recap." + k, o || {}));
const icon = pages.find((p) => p.name === "recap")?.icon || "";

// the parts as the computer orders them: the greeting, what you began with, the steps in between (the route), where you
// stand (the end of the route) and, on its own, a look at next month
const all = computed(() => parts.value.filter((s) => !s.none));
const hero = computed(() => all.value.find((s) => s.kind == "hero"));
const path = computed(() => all.value.filter((s) => s.kind != "hero" && s.p != "next"));
const end = computed(() => path.value.find((s) => s.kind == "end") || null);
const route = computed(() => path.value.filter((s) => s.kind != "end"));
const next = computed(() => all.value.find((s) => s.p == "next") || null);
// the circles take turns between the two accent colours, as on the computer (the first and the last are the main one)
const pc = (i) => (i % 2 ? "var(--acc2)" : "var(--acc)");
const nextEl = ref(null);
const toNext = () => nextEl.value?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });

// a big amount: the shekel sign small, the digits large (the same as the computer)
const neg = (n) => (n < 0 ? "−" : "");
// the colours of a sum's cards, as on the computer: money out, money in, spent by card (shown, not counted), the result
const SUMK = { out: ["var(--neg)", "var(--c2)", "−"], in: ["var(--pos)", "var(--c3)", "+"], card: ["var(--acc2)", "var(--acc)", ""], end: ["var(--acc)", "var(--acc2)", ""] };
const sq = (k) => ({ "--g1": SUMK[k][0], "--g2": SUMK[k][1] });
const NOTE = { good: "good", warn: "warn" };
const noteIc = (c) => ICON[c.tone == "good" ? "good" : c.tone == "warn" ? "warn" : "info"];
// a line whose words hold a link of its own ("and 3 more") opens that link; otherwise the line's own
const open = (e, link) => { const a = e.target.closest?.("[data-a='recapGo']"); if (a) return recapGo(a.dataset.k); if (link) recapGo(link); };
const lines = (s) => (typeof s.line == "string" ? [{ html: s.line }] : s.line || []);
const upOpen = (x) => (x[3] != null ? billOpen(x[3]) : x[4] != null ? recapGo("tx:" + x[4]) : null);
const segOf = (it) => { const L0 = it.filter((x) => x[1] >= 1), tot = L0.reduce((s, x) => s + x[1], 0) || 1; return L0.map((x) => ({ x, f: x[1] / tot })); };
// "Sonol · 19 Oct": each part keeps its own order, so a date never joins an English name in a Hebrew line
const dots = (h) => String(h).split(" · ").map((x) => (x.length <= 12 ? '<bdi class="nw">' : "<bdi>") + x + "</bdi>").join(" · ");
const mon = (d) => dshort(d).replace(/[0-9\s]/g, "");

// the days: the strip under the greeting and the bars in "So far this month"; a tap opens what that day held
const day = ref(0), dayOpen = ref(false);
const D = computed(() => (M.value && day.value ? M.value.days[day.value - 1] : null));
const dayDate = computed(() => (M.value && day.value ? `${M.value.MK}-${p2(day.value)}` : ""));
const showDay = (i) => { if (!M.value?.days[i - 1]) return; day.value = i; dayOpen.value = true; };
const pickStrip = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.("[data-d]"); if (el) showDay(+el.dataset.d); };
const days = computed(() => (M.value ? Array.from({ length: M.value.dim }, (_, i) => i + 1) : []));
const BW = 600, BH = 96, GAP = 4;
const bars = computed(() => {
  const m = M.value; if (!m) return [];
  const n = m.dim, bw = (BW - GAP * (n - 1)) / n, hs = dayBarHeights(m, BH);
  return hs.map((h, i) => ({ i: i + 1, x: i * (bw + GAP), w: bw, h, now: i == m.day - 1 }));
});
const pickBar = (e) => { const r = e.currentTarget.getBoundingClientRect(), n = M.value.dim; showDay(Math.max(1, Math.min(n, Math.floor(((e.clientX - r.left) / r.width) * n) + 1))); };
const seeDay = () => { dayOpen.value = false; recapGo(dayDate.value); };

// ---- each part comes in as it scrolls into view, as on the computer: its circle pops, the line runs down to the next
// circle, the part fades up, its big amount counts up from 0 and its pictures move into place (recap.css). With reduced
// motion (or no IntersectionObserver) everything simply shows.
const REDUCE = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };
const scr = ref(null), anim = ref(!REDUCE() && typeof IntersectionObserver !== "undefined");
// the digits are Vue's own text, so only its value changes (the amount is read each frame, in case it changes meanwhile)
function countUp(el) {
  const tn = el.firstChild, t0 = performance.now(), Dd = 1100; if (!tn || !+el.dataset.v) return; tn.nodeValue = "0";
  const step = (nw) => { if (!el.isConnected) return; const to = +el.dataset.v || 0, k = Math.min(1, (nw - t0) / Dd), e = 1 - Math.pow(1 - k, 3); tn.nodeValue = f0(k < 1 ? Math.round(to * e) : to); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
const showIn = (x) => { if (x.classList.contains("in")) return; x.classList.add("in"); x.querySelectorAll(".ph-rc-cnt").forEach(countUp); };
const io = anim.value ? new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting) return; showIn(e.target); io.unobserve(e.target); }), { threshold: 0, rootMargin: "0px 0px -12% 0px" }) : null;
watch([M, all], () => nextTick(() => { const el = scr.value?.$el; if (io && el) el.querySelectorAll(".ph-rc-rv:not(.in)").forEach((x) => io.observe(x)); }), { immediate: true, flush: "post" });
onBeforeUnmount(() => io?.disconnect());

// "Where you stand": the start of the month, today and the end of the month on one line, "Today" in a chip under its dot
const PW = 600, PH = 120, PX = 18, PT = 14, PB = 14;
const pathG = computed(() => {
  const s = end.value, m = M.value; if (!s || !m) return null;
  const v = s.path, lo = Math.min(...v), hi = Math.max(...v), sp = Math.max(1, hi - lo), Y = (a) => PH - PB - ((a - lo) / sp) * (PH - PT - PB);
  const xs = [PX, PX + (PW - 2 * PX) * Math.min(1, Math.max(0.05, m.day / m.dim)), PW - PX], pts = xs.map((x, i) => ({ x, y: Y(v[i]) }));
  const f = xs[1] / PW;
  return { pts, a: `${pts[0].x},${pts[0].y} ${pts[1].x},${pts[1].y}`, b: `${pts[1].x},${pts[1].y} ${pts[2].x},${pts[2].y}`,
    area: `${pts[0].x},${PH - PB + 8} ${pts[0].x},${pts[0].y} ${pts[1].x},${pts[1].y} ${pts[1].x},${PH - PB + 8}`, x: (f * 100).toFixed(2) + "%", f: f.toFixed(4), y: ((pts[1].y / PH) * 100).toFixed(2) + "%" };
});
</script>

<template>
  <PhoneScreen ref="scr" class="ph-rc" :class="{ 'ph-rc-anim': anim }">
    <template v-if="!S">
      <div class="ph-rc-skel" aria-hidden="true"><i /><i /><i /></div>
      <SkeletonRows :rows="4" />
    </template>
    <EmptyState v-else-if="!S.tx.length" :icon="icon" :title="L('empty')" :text="L('emptyX')" />

    <template v-else-if="M">
      <!-- the greeting, where the month stands and its days -->
      <section v-if="hero" class="ph-rc-hero">
        <h1 class="ph-rc-greet" v-html="hero.greet" />
        <p class="ph-rc-lead" v-html="hero.lead" />
        <div class="ph-rc-days" role="group" :aria-label="P('daysAria')" @click="pickStrip">
          <button v-for="i in days" :key="i" type="button" :data-d="i" :class="{ p: i < M.day, n: i == M.day }" :style="{ '--i': i }" :aria-label="dfull(M.MK + '-' + p2(i))" />
        </div>
        <div class="ph-rc-dayl">
          <span>{{ L("dayOf", { d: M.day, n: M.dim }) }}</span>
          <span>{{ M.dim - M.day > 0 ? L("daysLeft", { n: M.dim - M.day }, M.dim - M.day) : L("lastDay") }}</span>
        </div>
      </section>

      <!-- the route: one circle per part, joined by a line, the part beside it -->
      <ol class="ph-rc-route">
        <li v-for="(s, i) in route" :key="s.p" class="ph-rc-z ph-rc-rv" :style="{ '--pb': pc(i), '--pn': pc(i + 1) }">
          <span class="ph-rc-cir" aria-hidden="true"><PIcon :svg="ICON[s.ic]" /></span>
          <div class="ph-rc-zb">
            <component :is="s.go ? 'button' : 'span'" :type="s.go ? 'button' : null" class="ph-rc-lab" @click="s.go && recapGo(s.go)">
              <span v-html="s.label" /><PIcon v-if="s.go" name="chevron" dir class="ph-chev" />
            </component>
            <div class="ph-rc-big" :class="{ word: s.big.word != null }">
              <template v-if="s.big.word != null">{{ s.big.word }}</template>
              <bdi v-else dir="ltr">{{ neg(s.big.amt) }}<small>₪</small><span class="ph-rc-cnt" :data-v="Math.round(Math.abs(s.big.amt))">{{ f0(s.big.amt) }}</span></bdi>
            </div>

            <!-- the sentence, the names that paid, a note, the take-back button -->
            <template v-for="(x, j) in lines(s)" :key="'l' + j">
              <p v-if="x.html" class="ph-rc-p" @click="open($event)" v-html="x.html" />
              <div v-else-if="x.pills && x.pills.length" class="ph-rc-pills">
                <button v-for="(w, k) in x.pills" :key="k" type="button" class="ph-rc-pill" @click="recapGo(w[2])"><span v-html="nm(w[0])" /><b v-html="mi(w[1])" /></button>
              </div>
              <component :is="x.chip.go ? 'button' : 'div'" v-else-if="x.chip" :type="x.chip.go ? 'button' : null" class="ph-rc-note" :class="NOTE[x.chip.tone]" @click="x.chip.go && recapGo(x.chip.go)">
                <i class="cp"><PIcon :svg="noteIc(x.chip)" /></i>
                <span class="tx"><small v-if="x.chip.lab" v-html="x.chip.lab" /><span v-html="x.chip.txt" /></span>
              </component>
              <button v-else-if="x.rel" type="button" class="ph-rc-note warn" @click="rel = true">
                <i class="cp"><PIcon :svg="ICON.warn" /></i>
                <span class="tx"><small>{{ x.rel.lab }}</small><span v-html="x.rel.txt" /></span>
              </button>
            </template>

            <template v-for="(v, j) in s.vis || []" :key="'v' + j">
              <!-- a sum: what you had, a card for each change with what it is made of, and the result -->
              <div v-if="v.sum" class="ph-rc-eq">
                <component :is="v.sum.had[2] ? 'button' : 'div'" v-if="v.sum.had" :type="v.sum.had[2] ? 'button' : null" class="qh" @click="v.sum.had[2] && recapGo(v.sum.had[2])">
                  <span>{{ v.sum.had[0] }}</span><b v-html="mi(v.sum.had[1])" />
                </component>
                <div v-for="(g, k) in v.sum.groups" :key="k" class="sq" :class="'q' + g.k" :style="sq(g.k)">
                  <span class="qb"><PIcon :svg="SUMI[g.k]" /></span>
                  <span class="qd">
                    <component :is="g.link ? 'button' : 'span'" :type="g.link ? 'button' : null" class="qt" @click="open($event, g.link)">
                      <span><span :data-tip="g.tip || null" :class="{ tipd: g.tip }" v-html="g.label" /></span>
                      <b><bdi dir="ltr">{{ SUMK[g.k][2] }}<span v-html="mi(g.amt)" /></bdi></b>
                    </component>
                    <span v-if="g.k == 'card'" class="qx" :data-tip="L('laterTip')">{{ L("notSum") }}</span>
                    <span class="ql" />
                    <span v-if="g.note && g.k != 'card'" class="qn" @click="open($event)" v-html="g.note" />
                    <span v-if="g.subs && g.subs.length" class="qp">
                      <component :is="x[2] ? 'button' : 'span'" v-for="(x, n) in g.subs" :key="n" :type="x[2] ? 'button' : null" class="qs" @click="open($event, x[2])">
                        <span v-html="dots(x[0])" /><b v-html="mi(x[1])" />
                      </component>
                    </span>
                  </span>
                </div>
                <div v-if="v.sum.end" class="sq qend" :style="sq('end')">
                  <span class="qb"><PIcon :svg="SUMI.end" /></span>
                  <span class="qd">
                    <component :is="v.sum.end[2] ? 'button' : 'span'" :type="v.sum.end[2] ? 'button' : null" class="qt" @click="v.sum.end[2] && recapGo(v.sum.end[2])">
                      <span>{{ v.sum.end[0] }}</span><b v-html="mi(v.sum.end[1])" />
                    </component>
                    <span class="ql" />
                    <span v-if="v.sum.end[3]" class="qf"><span v-html="v.sum.end[3][0]" /><b v-html="mi(v.sum.end[3][1])" /></span>
                    <span v-if="v.sum.end[4]" class="qn" v-html="v.sum.end[4]" />
                  </span>
                </div>
              </div>

              <!-- a note under the sum: this month so far -->
              <component :is="v.chip.go ? 'button' : 'div'" v-else-if="v.chip" :type="v.chip.go ? 'button' : null" class="ph-rc-note" :class="NOTE[v.chip.tone]" @click="v.chip.go && recapGo(v.chip.go)">
                <i class="cp"><PIcon :svg="noteIc(v.chip)" /></i>
                <span class="tx"><small v-if="v.chip.lab" v-html="v.chip.lab" /><span v-html="v.chip.txt" /></span>
              </component>

              <!-- each day's spending: a tap on a bar shows that day -->
              <svg v-else-if="v.bars" class="ph-rc-bars" :viewBox="`0 0 ${BW} ${BH}`" preserveAspectRatio="none" role="img" :aria-label="L('barsAria')" @click="pickBar">
                <rect v-for="b in bars" :key="b.i" :x="b.x" :y="b.h != null ? BH - b.h : BH - 2" :width="b.w" :height="b.h != null ? b.h : 2" :rx="Math.min(4, b.w / 2)" :class="b.h == null ? 'f' : b.now ? 't' : 'b'" :style="{ '--i': b.i }" />
              </svg>
              <p v-else-if="v.cap" class="ph-rc-cap">{{ P("barsLead") }}</p>

              <!-- how the money is split: one bar of pills, then each part with its dot and amount -->
              <div v-else-if="v.seg" class="ph-rc-seg">
                <div class="ph-rc-segbar" aria-hidden="true"><i v-for="(x, k) in segOf(v.seg)" :key="k" :class="x.x[2]" :style="{ flex: x.f, '--i': k }" /></div>
                <div class="ph-rc-leg">
                  <component :is="x.x[3] ? 'button' : 'span'" v-for="(x, k) in segOf(v.seg)" :key="k" :type="x.x[3] ? 'button' : null" @click="x.x[3] && recapGo(x.x[3])">
                    <i :class="x.x[2]" /><span>{{ x.x[0] }}</span><b v-html="mi(x.x[1])" />
                  </component>
                </div>
              </div>

              <!-- the payments still due, by date -->
              <div v-else-if="v.up && v.up.length" class="ph-rc-up">
                <div class="t">{{ L("upcoming") }}</div>
                <component :is="x[3] != null || x[4] != null ? 'button' : 'div'" v-for="(x, k) in v.up.slice(0, 3)" :key="k" :type="x[3] != null || x[4] != null ? 'button' : null" class="ph-rc-uc" @click="upOpen(x)">
                  <span class="ub"><b>{{ +x[0].slice(8) }}</b><span>{{ mon(x[0]) }}</span></span>
                  <span class="ux"><span v-html="nm(x[1])" /><small>{{ dday(x[0]) }}</small></span>
                  <b class="ua" v-html="mi(x[2])" />
                </component>
              </div>

              <!-- what needs a look: a card per budget or jar -->
              <div v-else-if="v.attn" class="ph-rc-attn">
                <component :is="o.go ? 'button' : 'div'" v-for="(o, k) in v.attn" :key="k" :type="o.go ? 'button' : null" class="ph-rc-br" :class="o.tone" @click="o.go && recapGo(o.go)">
                  <span class="h"><b v-html="o.name" /><span>{{ o.tag }}</span></span>
                  <span v-if="o.bar" class="bar"><i :style="{ width: o.bar.u.toFixed(1) + '%' }" /><em v-if="o.bar.pace != null" :style="{ insetInlineStart: o.bar.pace.toFixed(1) + '%' }" /></span>
                  <span class="w" v-html="o.why" />
                </component>
              </div>
            </template>
          </div>
        </li>
        <!-- the end of the route: where you stand -->
        <li v-if="end" class="ph-rc-z ph-rc-zend ph-rc-rv" :style="{ '--pb': 'var(--acc)' }">
          <span class="ph-rc-cir" aria-hidden="true"><PIcon :svg="ICON.path" /></span>
        </li>
      </ol>

      <!-- where you stand: in your accounts and at the end of the month, the money after known payments, the month's line -->
      <section v-if="end" class="ph-rc-end ph-rc-rv">
        <button type="button" class="ph-rc-lab" @click="recapGo(end.go)"><span>{{ end.label }}</span><PIcon name="chevron" dir class="ph-chev" /></button>
        <div class="ph-rc-st">
          <button v-for="x in end.two" :key="x[2]" type="button" @click="recapGo(x[2])"><span>{{ x[0] }}</span><b v-html="mi(x[1])" /></button>
        </div>
        <div class="ph-rc-rl">{{ end.rl }}</div>
        <div class="ph-rc-big xl"><bdi dir="ltr">{{ neg(end.big.amt) }}<small>₪</small><span class="ph-rc-cnt" :data-v="Math.round(Math.abs(end.big.amt))">{{ f0(end.big.amt) }}</span></bdi></div>
        <p class="ph-rc-p" v-html="end.line" />
        <div v-if="pathG" class="ph-rc-pw" :style="{ '--x': pathG.x, '--f': pathG.f, '--y': pathG.y }">
          <svg :viewBox="`0 0 ${PW} ${PH}`" aria-hidden="true">
            <defs><linearGradient id="phrcg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".28" /><stop offset="1" stop-color="var(--acc)" stop-opacity="0" /></linearGradient></defs>
            <line :x1="PX" :x2="PW - PX" :y1="PH - PB + 8" :y2="PH - PB + 8" class="ax" />
            <polygon :points="pathG.area" fill="url(#phrcg)" />
            <polyline :points="pathG.a" class="ln" pathLength="1" />
            <polyline :points="pathG.b" class="ln d" />
            <circle :cx="pathG.pts[0].x" :cy="pathG.pts[0].y" r="7" class="dt" />
            <circle :cx="pathG.pts[1].x" :cy="pathG.pts[1].y" r="10" class="dn" />
            <circle :cx="pathG.pts[2].x" :cy="pathG.pts[2].y" r="7" class="dt" />
          </svg>
          <div class="ph-rc-pt"><span>{{ end.pathL[1] }}</span><b v-html="mi(end.path[1])" /></div><i class="ph-rc-pa" />
        </div>
        <div v-if="pathG" class="ph-rc-pl">
          <div><span>{{ end.pathL[0] }}</span><b v-html="mi(end.path[0])" /></div>
          <div><span>{{ end.pathL[2] }}</span><b v-html="mi(end.path[2])" /></div>
        </div>
      </section>

      <!-- a look at next month -->
      <template v-if="next">
        <button type="button" class="ph-rc-cue" @click="toNext"><span>{{ L("nextCue") }}</span><PIcon name="chevron" class="down" /></button>
        <section ref="nextEl" class="ph-rc-end ph-rc-next ph-rc-rv">
          <button type="button" class="ph-rc-lab" @click="recapGo(next.go)"><span>{{ next.label }}</span><PIcon name="chevron" dir class="ph-chev" /></button>
          <div class="ph-rc-big"><bdi dir="ltr">{{ neg(next.big.amt) }}<small>₪</small><span class="ph-rc-cnt" :data-v="Math.round(Math.abs(next.big.amt))">{{ f0(next.big.amt) }}</span></bdi></div>
          <p class="ph-rc-p" v-html="next.line" />
          <div class="ph-rc-eq">
            <button type="button" class="qh" @click="recapGo(next.sum.had[2])"><span>{{ next.sum.had[0] }}</span><b v-html="mi(next.sum.had[1])" /></button>
            <div v-for="(g, k) in next.sum.groups" :key="k" class="sq" :class="'q' + g.k" :style="sq(g.k)">
              <span class="qb"><PIcon :svg="SUMI[g.k]" /></span>
              <span class="qd">
                <button type="button" class="qt" @click="recapGo(g.link)"><span>{{ g.label }}</span><b><bdi dir="ltr">{{ SUMK[g.k][2] }}<span v-html="mi(g.amt)" /></bdi></b></button>
                <span class="ql" />
                <span v-if="g.subs.length" class="qp">
                  <button v-for="(x, n) in g.subs" :key="n" type="button" class="qs" @click="recapGo(x[2])"><span v-html="dots(x[0])" /><b v-html="mi(x[1])" /></button>
                </span>
              </span>
            </div>
            <div class="sq qend" :style="sq('end')">
              <span class="qb"><PIcon :svg="SUMI.end" /></span>
              <span class="qd"><span class="qt"><span>{{ next.sum.end[0] }}</span><b v-html="mi(next.sum.end[1])" /></span><span class="ql" /></span>
            </div>
          </div>
        </section>
      </template>
    </template>

    <!-- what a day held -->
    <PhoneSheet v-model:open="dayOpen" :title="dayDate ? dfull(dayDate) : ''" cls="ph-rc-daysheet">
      <div v-if="D" class="ph-rc-tip" v-html="dayTip(D, day > M.day, day == M.day, false)" />
      <template #foot><button type="button" class="ph-btn tonal" @click="seeDay">{{ P("dayOpen") }}</button></template>
    </PhoneSheet>

    <!-- "Take back from the jars", the same as on the Jars page -->
    <BaseDialog :open="rel" :title="t('jars.takeBack', { amount: fm(relAmt) })" @update:open="rel = false">
      <div class="sm" style="line-height:1.5">{{ t("jars.rel.text", { amount: fm(relAmt) }) }}</div>
      <template #actions><button type="button" class="btn o" @click="rel = false">{{ t("jars.cancel") }}</button><button type="button" class="btn" @click="doRelease">{{ t("jars.rel.yes") }}</button></template>
    </BaseDialog>
  </PhoneScreen>
</template>
