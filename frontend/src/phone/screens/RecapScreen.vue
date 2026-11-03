<script setup>
// Recap (in More): the month's story, step by step. It opens with a greeting, where the month stands and its days (touch a
// day to see what it held), then one block per step, joined by a thin line down the start side: what you began with, each
// money in, card bill and stretch of spending, what you have now, how it is split, what is still to pay, what needs a look,
// where you stand, and a look at next month. Each block has its picture, its amount, its sentence and its rows; every row
// opens the matching list. What each part holds comes from pagelogic/recap.js, the same as the computer page.
import { ref, computed } from "vue";
import { fm } from "../../format.js";
import { pages } from "../../routes.js";
import { dayBarHeights } from "../../lib/recap.js";
import { useRecap, ICON, SUMI } from "../../pagelogic/recap.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import PhoneSheet from "../components/PhoneSheet.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import EmptyState from "../components/EmptyState.vue";
import PIcon from "../components/PIcon.vue";
import ProgressBar from "../components/ProgressBar.vue";
import BaseDialog from "../../components/BaseDialog.vue";
defineProps({ id: { type: String, default: null } });

const { t, S, M, G, L, mi, dshort, dday, dfull, p2, parts, recapGo, billOpen, rel, relAmt, doRelease, dayTip } = useRecap();
const P = (k, o) => G(t("phone.recap." + k, o || {}));
const icon = pages.find((p) => p.name === "recap")?.icon || "";

// the blocks in order; "next" (a look at next month) comes last, after a small link that scrolls to it
const hero = computed(() => parts.value.find((s) => s.kind == "hero"));
const path = computed(() => parts.value.filter((s) => s.kind != "hero" && s.p != "next" && !s.none));
const next = computed(() => parts.value.find((s) => s.p == "next" && !s.none) || null);
const nextEl = ref(null);
const toNext = () => nextEl.value?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });

// colours: a block's tone (tp good, tn short, tw needs a look) and a sum line's kind
const TONE = { tp: "var(--pos)", tn: "var(--neg)", tw: "var(--warn)" };
const KIND = { out: "var(--neg)", in: "var(--pos)", card: "var(--acc2, var(--acc))", end: "var(--acc)" };
const SIGN = { out: "−", in: "+", card: "", end: "" };
const NOTE = { good: "good", warn: "warn" };
const SEG = { c1: "var(--c1)", c2: "var(--c2)", c3: "var(--c3)", c4: "var(--c4)", c5: "var(--c5)" };

// a row whose words hold a link of their own ("and 3 more") opens that link; otherwise the row's own
const open = (e, link) => { const a = e.target.closest?.("[data-a='recapGo']"); if (a) return recapGo(a.dataset.k); if (link) recapGo(link); };
const upOpen = (x) => (x[3] != null ? billOpen(x[3]) : x[4] != null ? recapGo("tx:" + x[4]) : null);
const segOf = (it) => { const L0 = it.filter((x) => x[1] >= 1), tot = L0.reduce((s, x) => s + x[1], 0) || 1; return L0.map((x) => ({ x, f: x[1] / tot })); };
// "Sonol · 19 Oct": each part keeps its own order, so a date never joins an English name in a Hebrew line,
// and a short part (a date) stays on one line
const dots = (h) => String(h).split(" · ").map((p) => (p.length <= 12 ? '<bdi class="ph-rc-nw">' : "<bdi>") + p + "</bdi>").join(" · ");
const mon = (d) => dshort(d).replace(/[0-9\s]/g, "");
// each sum (how a step's amount adds up) starts folded under a "See how it adds up" line, so the steps read as a story
const sums = ref(new Set());
const sumOpen = (k) => sums.value.has(k);
const sumFlip = (k) => { const n = new Set(sums.value); n.has(k) ? n.delete(k) : n.add(k); sums.value = n; };

// the days: the strip under the greeting and the bars in "So far this month"; touching one opens what it held
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

// "Where you stand": the start of the month, today and the end of the month on one line
const PW = 320, PH = 96, PX = 14;
const pathPts = (s) => {
  const m = M.value, v = s.path, lo = Math.min(...v), hi = Math.max(...v), sp = Math.max(1, hi - lo), Y = (a) => PH - 16 - ((a - lo) / sp) * (PH - 36);
  const xs = [PX, PX + (PW - 2 * PX) * Math.min(1, Math.max(0.05, m.day / m.dim)), PW - PX];
  return xs.map((x, i) => ({ x, y: Y(v[i]) }));
};
</script>

<template>
  <PhoneScreen class="ph-rc" :large="false">
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
          <button v-for="i in days" :key="i" type="button" :data-d="i" :class="{ p: i < M.day, n: i == M.day }" :aria-label="dfull(M.MK + '-' + p2(i))" />
        </div>
        <div class="ph-rc-dayl">
          <span>{{ L("dayOf", { d: M.day, n: M.dim }) }}</span>
          <span>{{ M.dim - M.day > 0 ? L("daysLeft", { n: M.dim - M.day }, M.dim - M.day) : L("lastDay") }}</span>
        </div>
      </section>

      <!-- the steps through the month, joined by a line -->
      <ol class="ph-rc-path">
        <li v-for="s in path" :key="s.p" class="ph-rc-step" :class="[s.tone, { endp: s.kind == 'end' }]" :style="{ '--tile': TONE[s.tone] || 'var(--acc)' }">
          <component :is="s.go ? 'button' : 'div'" :type="s.go ? 'button' : null" class="ph-rc-head" @click="s.go && recapGo(s.go)">
            <span class="ph-tile ph-rc-dot"><PIcon :svg="ICON[s.kind == 'end' ? 'path' : s.ic]" /></span>
            <span class="ph-rc-label" v-html="s.label" />
            <PIcon v-if="s.go" name="chevron" dir class="ph-chev" />
          </component>

          <div class="ph-rc-body">
            <!-- where you stand: in your accounts today and at the end of the month, side by side -->
            <div v-if="s.two" class="ph-stats ph-rc-two">
              <button v-for="x in s.two" :key="x[2]" type="button" class="ph-stat" @click="recapGo(x[2])"><span class="ph-stat-l">{{ x[0] }}</span><b class="ph-stat-v" v-html="mi(x[1])" /></button>
            </div>
            <p v-if="s.rl" class="ph-rc-rl">{{ s.rl }}</p>
            <div class="ph-rc-big" :class="{ word: s.big.word != null, neg: s.big.amt < -0.5 }" v-html="s.big.word != null ? s.big.word : mi(s.big.amt)" />

            <!-- the sentence, the names that paid, a note, the take-back button -->
            <template v-if="typeof s.line == 'string'"><p class="ph-rc-line" v-html="s.line" /></template>
            <template v-for="(x, i) in typeof s.line == 'string' ? [] : s.line" v-else :key="'l' + i">
              <p v-if="x.html" class="ph-rc-line" v-html="x.html" />
              <div v-else-if="x.pills && x.pills.length" class="ph-rc-pills">
                <button v-for="(w, j) in x.pills" :key="j" type="button" class="ph-rc-pill" @click="recapGo(w[2])"><span>{{ w[0] }}</span><b v-html="mi(w[1])" /></button>
              </div>
              <component :is="x.chip.go ? 'button' : 'div'" v-else-if="x.chip" :type="x.chip.go ? 'button' : null" class="ph-rc-note" :class="NOTE[x.chip.tone]" @click="x.chip.go && recapGo(x.chip.go)">
                <PIcon :svg="ICON[x.chip.tone == 'good' ? 'good' : x.chip.tone == 'warn' ? 'warn' : 'info']" />
                <span><small v-html="x.chip.lab" /><span v-html="x.chip.txt" /></span>
              </component>
              <button v-else-if="x.rel" type="button" class="ph-rc-note warn act" @click="rel = true">
                <PIcon :svg="ICON.warn" />
                <span><small>{{ x.rel.lab }}</small><span v-html="x.rel.txt" /></span>
              </button>
            </template>

            <!-- where you stand: the line from the start of the month to its end -->
            <div v-if="s.path" class="ph-card ph-rc-pathc">
              <svg :viewBox="`0 0 ${PW} ${PH}`" aria-hidden="true">
                <line :x1="PX" :x2="PW - PX" :y1="PH - 4" :y2="PH - 4" class="ax" />
                <polyline :points="pathPts(s).slice(0, 2).map((p) => p.x + ',' + p.y).join(' ')" class="ln" />
                <polyline :points="pathPts(s).slice(1).map((p) => p.x + ',' + p.y).join(' ')" class="ln d" />
                <circle v-for="(p, i) in pathPts(s)" :key="i" :cx="p.x" :cy="p.y" :r="i == 1 ? 6 : 4" :class="i == 1 ? 'dn' : 'dt'" />
              </svg>
              <div class="ph-rc-pathl">
                <span v-for="(v, i) in s.path" :key="i"><small>{{ s.pathL[i] }}</small><b v-html="mi(v)" /></span>
              </div>
            </div>

            <template v-for="(v, i) in s.vis || []" :key="'v' + i">
              <!-- a sum: what you had, each change with what it is made of, and the result -->
              <template v-if="v.sum">
                <button type="button" class="ph-rc-how" :aria-expanded="sumOpen(s.p + i)" @click="sumFlip(s.p + i)">
                  <span>{{ P(sumOpen(s.p + i) ? "sumHide" : "sumShow") }}</span><PIcon name="chevron" class="down" :class="{ turn: sumOpen(s.p + i) }" />
                </button>
                <div v-if="sumOpen(s.p + i)" class="ph-group-b ph-rc-sum">
                  <component :is="v.sum.had[2] ? 'button' : 'div'" v-if="v.sum.had" :type="v.sum.had[2] ? 'button' : null" class="ph-row ph-rc-had" @click="v.sum.had[2] && recapGo(v.sum.had[2])">
                    <span class="ph-row-main"><span class="ph-row-t ph-rc-wrap">{{ v.sum.had[0] }}</span></span>
                    <b class="ph-amt" v-html="mi(v.sum.had[1])" />
                  </component>
                  <div v-for="(g, j) in v.sum.groups" :key="j" class="ph-rc-g" :class="'k-' + g.k" :style="{ '--tile': KIND[g.k] }">
                    <component :is="g.link ? 'button' : 'div'" :type="g.link ? 'button' : null" class="ph-row ph-rc-gr" @click="open($event, g.link)">
                      <span class="ph-tile"><PIcon :svg="SUMI[g.k]" /></span>
                      <span class="ph-row-main">
                        <span class="ph-row-t ph-rc-wrap"><span :data-tip="g.tip || null" v-html="g.label" /></span>
                        <span v-if="g.k == 'card'" class="ph-row-s"><span class="ph-rc-tag" :data-tip="L('laterTip')">{{ L("notSum") }}</span></span>
                        <span v-else-if="g.note" class="ph-row-s ph-rc-wrap" v-html="g.note" />
                      </span>
                      <b class="ph-amt" :class="{ quiet: g.k == 'card' }" dir="ltr"><bdi>{{ SIGN[g.k] }}</bdi><bdi v-html="mi(g.amt)" /></b>
                    </component>
                    <div v-if="g.subs && g.subs.length" class="ph-rc-subs">
                      <component :is="x[2] ? 'button' : 'div'" v-for="(x, k) in g.subs" :key="k" :type="x[2] ? 'button' : null" class="ph-rc-sub" @click="open($event, x[2])">
                        <span class="ph-rc-wrap" v-html="dots(x[0])" /><b class="ph-amt" v-html="mi(x[1])" />
                      </component>
                    </div>
                  </div>
                  <div v-if="v.sum.end" class="ph-row ph-rc-end" :style="{ '--tile': KIND.end }">
                    <span class="ph-tile"><PIcon :svg="SUMI.end" /></span>
                    <span class="ph-row-main">
                      <span class="ph-row-t ph-rc-wrap">{{ v.sum.end[0] }}</span>
                      <span v-if="v.sum.end[3]" class="ph-row-s ph-rc-after"><span class="ph-rc-wrap" v-html="v.sum.end[3][0]" /><b v-html="mi(v.sum.end[3][1])" /></span>
                      <span v-if="v.sum.end[4]" class="ph-row-s ph-rc-wrap" v-html="v.sum.end[4]" />
                    </span>
                    <b class="ph-amt" :class="{ neg: v.sum.end[1] < -0.5 }" v-html="mi(v.sum.end[1])" />
                  </div>
                </div>
              </template>

              <!-- a note under the sum: this month so far -->
              <component :is="v.chip.go ? 'button' : 'div'" v-else-if="v.chip" :type="v.chip.go ? 'button' : null" class="ph-rc-note" :class="NOTE[v.chip.tone]" @click="v.chip.go && recapGo(v.chip.go)">
                <PIcon :svg="ICON[v.chip.tone == 'good' ? 'good' : v.chip.tone == 'warn' ? 'warn' : 'info']" />
                <span><small v-html="v.chip.lab" /><span v-html="v.chip.txt" /></span>
              </component>

              <!-- each day's spending: touch a bar to see that day -->
              <div v-else-if="v.bars" class="ph-card ph-rc-bars">
                <svg :viewBox="`0 0 ${BW} ${BH}`" preserveAspectRatio="none" role="img" :aria-label="L('barsAria')" @click="pickBar">
                  <rect v-for="b in bars" :key="b.i" :x="b.x" :y="b.h != null ? BH - b.h : BH - 2" :width="b.w" :height="b.h != null ? b.h : 2" :rx="Math.min(4, b.w / 2)" :class="b.h == null ? 'f' : b.now ? 't' : 'b'" />
                </svg>
              </div>
              <p v-else-if="v.cap" class="ph-rc-cap">{{ P("barsLead") }}</p>

              <!-- how the money is split: one bar, then each part with its amount -->
              <div v-else-if="v.seg" class="ph-rc-seg">
                <div class="ph-rc-segbar" aria-hidden="true"><i v-for="(x, k) in segOf(v.seg)" :key="k" :style="{ flex: x.f, background: SEG[x.x[2]] }" /></div>
                <div class="ph-group-b">
                  <button v-for="(x, k) in segOf(v.seg)" :key="k" type="button" class="ph-row ph-rc-legr" @click="recapGo(x.x[3])">
                    <i class="ph-rc-sw" :style="{ background: SEG[x.x[2]] }" />
                    <span class="ph-row-main"><span class="ph-row-t ph-rc-wrap">{{ x.x[0] }}</span></span>
                    <b class="ph-amt" v-html="mi(x.x[1])" />
                    <PIcon name="chevron" dir class="ph-chev" />
                  </button>
                </div>
              </div>

              <!-- the payments still due, by date -->
              <div v-else-if="v.up && v.up.length" class="ph-rc-up">
                <h3>{{ L("upcoming") }}</h3>
                <div class="ph-group-b">
                  <component :is="x[3] != null || x[4] != null ? 'button' : 'div'" v-for="(x, k) in v.up.slice(0, 3)" :key="k" :type="x[3] != null || x[4] != null ? 'button' : null" class="ph-row ph-two ph-rc-upr" @click="upOpen(x)">
                    <span class="ph-rc-date"><b>{{ +x[0].slice(8) }}</b><small>{{ mon(x[0]) }}</small></span>
                    <span class="ph-row-main"><span class="ph-row-t">{{ x[1] }}</span><span class="ph-row-s">{{ dday(x[0]) }}</span></span>
                    <b class="ph-amt" v-html="mi(x[2])" />
                  </component>
                </div>
              </div>

              <!-- what needs a look -->
              <div v-else-if="v.attn" class="ph-group-b ph-rc-attn">
                <button v-for="(o, k) in v.attn" :key="k" type="button" class="ph-rc-a" :class="o.tone" @click="recapGo(o.go)">
                  <span class="ph-rc-a-h"><b v-html="o.name" /><span>{{ o.tag }}</span></span>
                  <ProgressBar v-if="o.bar" :value="o.bar.u" :max="100" :tone="o.tone == 'o' ? 'neg' : 'warn'" :mark="o.bar.pace" />
                  <span class="ph-rc-a-p" v-html="o.why" />
                </button>
              </div>
            </template>
          </div>
        </li>
      </ol>

      <!-- a look at next month -->
      <template v-if="next">
        <button type="button" class="ph-rc-cue" @click="toNext"><span>{{ L("nextCue") }}</span><PIcon name="chevron" class="down" /></button>
        <section ref="nextEl" class="ph-rc-step ph-rc-next" :class="next.tone" :style="{ '--tile': TONE[next.tone] || 'var(--acc)' }">
          <button type="button" class="ph-rc-head" @click="recapGo(next.go)">
            <span class="ph-tile ph-rc-dot"><PIcon :svg="ICON.ahead" /></span>
            <span class="ph-rc-label">{{ next.label }}</span>
            <PIcon name="chevron" dir class="ph-chev" />
          </button>
          <div class="ph-rc-body">
            <div class="ph-rc-big" :class="{ neg: next.big.amt < -0.5 }" v-html="mi(next.big.amt)" />
            <p class="ph-rc-line" v-html="next.line" />
            <button type="button" class="ph-rc-how" :aria-expanded="sumOpen('next')" @click="sumFlip('next')">
              <span>{{ P(sumOpen("next") ? "sumHide" : "sumShow") }}</span><PIcon name="chevron" class="down" :class="{ turn: sumOpen('next') }" />
            </button>
            <div v-if="sumOpen('next')" class="ph-group-b ph-rc-sum">
              <button type="button" class="ph-row ph-rc-had" @click="recapGo(next.sum.had[2])">
                <span class="ph-row-main"><span class="ph-row-t ph-rc-wrap">{{ next.sum.had[0] }}</span></span>
                <b class="ph-amt" v-html="mi(next.sum.had[1])" />
              </button>
              <div v-for="(g, j) in next.sum.groups" :key="j" class="ph-rc-g" :class="'k-' + g.k" :style="{ '--tile': KIND[g.k] }">
                <button type="button" class="ph-row ph-rc-gr" @click="recapGo(g.link)">
                  <span class="ph-tile"><PIcon :svg="SUMI[g.k]" /></span>
                  <span class="ph-row-main"><span class="ph-row-t ph-rc-wrap">{{ g.label }}</span></span>
                  <b class="ph-amt" dir="ltr"><bdi>{{ SIGN[g.k] }}</bdi><bdi v-html="mi(g.amt)" /></b>
                </button>
                <div v-if="g.subs.length" class="ph-rc-subs">
                  <button v-for="(x, k) in g.subs" :key="k" type="button" class="ph-rc-sub" @click="recapGo(x[2])"><span class="ph-rc-wrap" v-html="dots(x[0])" /><b class="ph-amt" v-html="mi(x[1])" /></button>
                </div>
              </div>
              <div class="ph-row ph-rc-end" :style="{ '--tile': KIND.end }">
                <span class="ph-tile"><PIcon :svg="SUMI.end" /></span>
                <span class="ph-row-main"><span class="ph-row-t ph-rc-wrap">{{ next.sum.end[0] }}</span></span>
                <b class="ph-amt" :class="{ neg: next.sum.end[1] < -0.5 }" v-html="mi(next.sum.end[1])" />
              </div>
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
