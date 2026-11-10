<script setup>
// The party for a new level (core/celebrate.js): confetti falling from the top of the screen to the bottom, and a burst
// of sparks from the level badge when it shows (the side column on a computer, the top bar on a phone). It lasts a few
// seconds and is then removed; it never catches a click. With "reduce motion" on in the device, only the message shows.
// Shown on every page (App.vue).
import { ref, watch, nextTick, onBeforeUnmount } from "vue";
import { party } from "../core/celebrate.js";

const show = ref(false), cv = ref(null);
let raf = 0;
const reduce = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion:reduce)").matches;

// the theme's colours, so the confetti matches the look (light, dark and the Appearance looks)
function colours() {
  const cs = getComputedStyle(document.body);
  const list = ["--acc", "--acc2", "--c1", "--c2", "--c3", "--c4", "--pos"].map((k) => cs.getPropertyValue(k).trim()).filter(Boolean);
  return list.length ? list : ["#4355b9"];
}
// the level badge's middle, when one is on the screen
function badgeAt() {
  for (const el of document.querySelectorAll(".ptb")) {
    const r = el.getBoundingClientRect();
    if (r.width && r.height && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return null;
}

const rnd = (a, b) => a + Math.random() * (b - a);
function run() {
  const c = cv.value;
  if (!c) return;
  const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2), ctx = c.getContext("2d");
  if (!ctx) { show.value = false; return; }
  c.width = W * dpr; c.height = H * dpr;
  ctx.scale(dpr, dpr);
  const col = colours(), pick = () => col[(Math.random() * col.length) | 0];
  // confetti: paper bits that start above the screen and fall, swaying and turning
  const bits = Array.from({ length: Math.min(160, Math.round(W / 8)) }, () => ({
    x: rnd(0, W), y: rnd(-H * 0.5, -10), vx: rnd(-30, 30), vy: rnd(160, 300), w: rnd(6, 10), h: rnd(8, 14),
    a: rnd(0, 6.3), va: rnd(-6, 6), sw: rnd(0, 6.3), c: pick(),
  }));
  // sparks from the level badge: out in every direction, then pulled down and fading
  const at = badgeAt();
  const sparks = at ? Array.from({ length: 36 }, (_, i) => { const ang = (i / 36) * 6.283 + rnd(-0.1, 0.1), sp = rnd(140, 320); return { x: at.x, y: at.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: rnd(2, 3.5), c: pick() }; }) : [];
  const END = 4200, t0 = performance.now();
  let last = t0;
  const frame = (t) => {
    const dt = Math.min(0.05, (t - last) / 1000), age = t - t0;
    last = t;
    ctx.clearRect(0, 0, W, H);
    let alive = false;
    for (const b of bits) {
      b.sw += dt * 3; b.x += (b.vx + Math.sin(b.sw) * 40) * dt; b.y += b.vy * dt; b.a += b.va * dt;
      if (b.y > H + 20) continue;
      alive = true;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a); ctx.scale(1, Math.cos(b.sw * 1.7)); // turning paper
      ctx.fillStyle = b.c; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); ctx.restore();
    }
    const fade = Math.max(0, 1 - age / 1400);
    if (fade > 0) {
      ctx.globalAlpha = fade;
      for (const s of sparks) {
        s.vx *= 1 - 1.8 * dt; s.vy = s.vy * (1 - 1.8 * dt) + 260 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fillStyle = s.c; ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (sparks.length) alive = true;
    }
    if (alive && age < END) raf = requestAnimationFrame(frame);
    else show.value = false;
  };
  raf = requestAnimationFrame(frame);
}

watch(party, async (p) => {
  if (!p || reduce() || typeof document === "undefined") return;
  cancelAnimationFrame(raf);
  show.value = true;
  await nextTick();
  run();
});
onBeforeUnmount(() => cancelAnimationFrame(raf));
</script>

<template>
  <canvas v-if="show" ref="cv" class="lvparty" aria-hidden="true" />
</template>
