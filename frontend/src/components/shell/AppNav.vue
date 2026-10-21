<script setup>
// The menu: a rail on a computer, a bar at the bottom of a phone (web/index.html <nav>). Same items, order, icons and badges as the current app;
// the gliding highlight (navPill) moves to the open page. At the bottom of the rail: update, sync status and Appearance.
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { pages } from "../../routes.js";
import { current, hrefOf, go } from "../../router.js";
import { alertList, reviewCount } from "../../core/derived.js";
import { syncState } from "../../core/sources.js";
import { job } from "../../core/jobs.js";
import { appearanceOpen, moreOpen, quickOpen, syncOpen } from "../../core/shell.js";
import AppLogo from "../AppLogo.vue";
import UpdateButton from "./UpdateButton.vue";

const { t } = useI18n();
const navPages = pages.filter((p) => p.nav);
// the current app's page names, which its stylesheet uses (for example nav .nb[data-v=alerts] is hidden on a phone)
const OLDV = { recap: "recap", home: "dash", accounts: "acc", activity: "tx", jars: "jars", bills: "bills", budgets: "budg", reports: "rep", forecast: "fc", alerts: "alerts", categories: "cats", settings: "set" };
const badge = (p) => (p.name === "alerts" ? alertList.value.length : p.name === "activity" ? reviewCount.value : 0);
const nav = ref(null), pill = ref(null);

// The highlight glides from the old page to the new one, stretching on the way (navPill in web/js/09-profile-export-settings.js).
let cur = null, anim = null, at = null;
const D = 300;
function place(animate) {
  const nv = nav.value, p = pill.value; if (!nv || !p) return;
  const b = nv.querySelector(".nb.on[data-v]"), ic = b && b.querySelector(".ic");
  if (!b || !ic || !b.offsetWidth) { p.style.display = "none"; nv.classList.remove("pl"); cur = null; anim?.cancel(); anim = null; return; }
  const to = { x: b.offsetLeft + ic.offsetLeft, y: b.offsetTop + ic.offsetTop, w: ic.offsetWidth, h: ic.offsetHeight };
  let from = cur; if (anim) { if (at) from = at(Math.min(1, (anim.currentTime || 0) / D)); anim.cancel(); anim = null; }
  p.style.display = ""; p.style.width = to.w + "px"; p.style.height = to.h + "px"; p.style.borderRadius = getComputedStyle(ic).borderTopLeftRadius; nv.classList.add("pl");
  const set = (r) => `translate(${r.x}px,${r.y}px) scale(${r.w / to.w},${r.h / to.h})`;
  p.style.transform = set(to); cur = to;
  if (!animate || !from || (from.x === to.x && from.y === to.y && from.w === to.w && from.h === to.h) || matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  const vert = !document.documentElement.classList.contains("mob"), clamp = (u) => Math.max(0, Math.min(1, u)), ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const a0 = vert ? from.y : from.x, a1 = vert ? to.y : to.x, l0 = vert ? from.h : from.w, l1 = vert ? to.h : to.w, c0 = vert ? from.x : from.y, c1 = vert ? to.x : to.y, m = vert ? to.w : to.h, b0 = a0 + l0, b1 = a1 + l1, fwd = a1 + b1 >= a0 + b0;
  at = (u) => { const lead = 1 - Math.pow(1 - clamp(u / 0.65), 3), trail = ease(clamp((u - 0.25) / 0.75)), A = a0 + (a1 - a0) * (fwd ? trail : lead), B = b0 + (b1 - b0) * (fwd ? lead : trail), nr = 1 - 0.55 * Math.sin(Math.PI * u), c = c0 + (c1 - c0) * ease(u), len = Math.max(1, B - A), th = m * nr, cc = c + (m - th) / 2; return vert ? { x: cc, y: A, w: th, h: len } : { x: A, y: cc, w: len, h: th }; };
  const N = 24, frames = []; for (let i = 0; i <= N; i++) { const u = i / N, r = i == N ? to : at(u); frames.push({ transform: set(r), offset: u }); }
  anim = p.animate(frames, { duration: D, easing: "linear" }); anim.onfinish = () => { anim = null; };
}
watch(() => current.value.name, () => nextTick(() => place(true)));
// it follows the menu when its size or the look changes (corners, menu style, spacing, phone/computer), and once the fonts are in
const onResize = () => place(false);
let ro = null, mo = null;
onMounted(() => {
  nextTick(() => place(false)); setTimeout(onResize, 50); addEventListener("resize", onResize);
  ro = new ResizeObserver(onResize); ro.observe(nav.value);
  mo = new MutationObserver(onResize); mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-rad", "data-nav", "data-nsp", "class"] });
  document.fonts?.ready.then(onResize);
});
onBeforeUnmount(() => { removeEventListener("resize", onResize); ro?.disconnect(); mo?.disconnect(); });
</script>

<template>
  <nav ref="nav" :aria-label="t('shell.menu')">
    <i ref="pill" class="nbi" style="transform-origin:0 0" />
    <AppLogo shuffle />
    <template v-for="p in navPages" :key="p.name">
      <button type="button" class="nb" :class="{ on: current.name === p.name, sec: !p.main }" :data-v="OLDV[p.name]" :aria-current="current.name === p.name ? 'page' : undefined" @click="go(hrefOf(p))">
        <span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true" v-html="p.icon" /></span>{{ t("nav." + p.name) }}<span v-if="p.name === 'activity' || p.name === 'alerts'" class="badge" :style="{ display: badge(p) ? 'grid' : 'none' }">{{ badge(p) }}</span>
      </button>
      <button v-if="p.name === 'jars'" type="button" class="nb only-m navplus" :aria-label="t('shell.add')" @click="quickOpen = true"><span class="pb">+</span></button>
    </template>
    <button type="button" class="nb only-m" @click="moreOpen = true">
      <span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg></span>{{ t("shell.more") }}<span class="badge" :style="{ display: alertList.length ? 'grid' : 'none' }">{{ alertList.length }}</span>
    </button>
    <div class="navb">
      <UpdateButton />
      <button type="button" class="syncb" :class="{ spinning: !!job }" @click="syncOpen = true"><i class="live" :class="syncState.live" /><span id="sync">{{ syncState.top }}<br><b style="color:var(--tx);font-size:12px">{{ syncState.sub }}</b></span></button>
      <button id="themeBtn" type="button" class="nb" @click="appearanceOpen = !appearanceOpen"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor" /></svg></span>{{ t("shell.appearance") }}</button>
    </div>
  </nav>
</template>
