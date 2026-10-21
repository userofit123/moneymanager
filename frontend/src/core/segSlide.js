// The sliding highlight of every row of tabs (.seg): when another tab is picked, the coloured pill stretches and glides over to it.
// A copy of the current app's seg slider (web/js/09-profile-export-settings.js): the pill is an <i class="segi"><b></b></i> put first in
// the .seg, styled in styles/legacy.css (.segi, .seg.sl). It watches the page, so every tab row gets it without any code in the page.
const st = new Map(), waiting = new Set();
let raf = 0, started = false;
const todo = new Set();
const RM = typeof matchMedia !== "undefined" ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: true };

// which tab row this is, so its last place is remembered when the page draws it again
const KC = new WeakMap();
function keyOf(sg) {
  if (sg.id) return sg.id;
  let c = KC.get(sg); if (c) return c;
  const b = sg.querySelector("button"), k = b ? b.dataset.a || b.dataset.t || "x" : "x";
  let n = 0;
  for (const o of document.querySelectorAll(".seg")) { if (o == sg) break; const ob = o.querySelector("button"); if (ob && (ob.dataset.a || ob.dataset.t || "x") == k) n++; }
  c = k + "#" + n; KC.set(sg, c); return c;
}
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const rad = (R, M, L, Rt) => { const a = L ? R : M, b = Rt ? R : M; return a + "px " + b + "px " + b + "px " + a + "px"; };
function put(p, g, l, r, rd, sy) {
  const e = p.firstChild;
  e.style.width = r - l + "px"; e.style.height = g.b - g.t + "px";
  e.style.transform = "translate(" + l + "px," + g.t + "px) scaleY(" + (sy || 1) + ")"; e.style.borderRadius = rd;
}

function sync(sg) {
  if (!sg.isConnected) return;
  const bs = [...sg.querySelectorAll(":scope>button")], b = sg.querySelector(":scope>button.on");
  let pill = sg.querySelector(":scope>.segi");
  if (!b) { if (pill) pill.style.display = "none"; return; }
  if (!sg.offsetWidth) { waiting.add(sg); return; }
  waiting.delete(sg);
  if (!pill) { pill = document.createElement("i"); pill.className = "segi"; pill.innerHTML = "<b></b>"; sg.prepend(pill); sg.classList.add("sl"); }
  pill.style.display = "";
  const k = keyOf(sg), idx = bs.indexOf(b), g = { l: b.offsetLeft, r: b.offsetLeft + b.offsetWidth, t: b.offsetTop, b: b.offsetTop + b.offsetHeight }, h = g.b - g.t;
  const R = Math.round(Math.max(1, Math.min(parseFloat(getComputedStyle(b).borderTopLeftRadius) || 99, h / 2))), M = Math.min(R, Math.max(3, Math.round(h * 0.3)));
  const lo = Math.min(...bs.map((x) => x.offsetLeft)), hi = Math.max(...bs.map((x) => x.offsetLeft + x.offsetWidth)), rd = bs.length < 2 ? R + "px" : rad(R, M, g.l <= lo + 1, g.r >= hi - 1);
  let s = st.get(k);
  const e = pill.firstChild;
  const rest = () => { if (s.anim) { s.anim.cancel(); s.anim = null; } put(pill, g, g.l, g.r, rd); s.cur = { l: g.l, r: g.r, rd }; s.g = g; };
  if (!s) { s = { idx, anim: null }; st.set(k, s); put(pill, g, g.l, g.r, rd); s.cur = { l: g.l, r: g.r, rd }; s.g = g; return; }
  if (s.snap) { s.snap = false; s.idx = idx; rest(); return; }
  if (s.idx === idx) { if (!s.anim) put(pill, g, g.l, g.r, rd); s.cur = s.anim ? s.cur : { l: g.l, r: g.r, rd }; return; }
  s.idx = idx;
  if (RM.matches || !s.cur) { rest(); return; }
  const from = { ...s.cur }; if (s.anim) { s.anim.cancel(); s.anim = null; }
  // ends together with the page fade-in (.35s)
  const dist = Math.abs(g.l - from.l), dur = Math.round(Math.min(350, 250 + dist * 0.1)), N = 24, sq = Math.min(0.14, 0.05 + dist / 3000), kf = [];
  const c0 = (from.l + from.r) / 2, c1 = (g.l + g.r) / 2, w0 = from.r - from.l, w1 = g.r - g.l, stretch = Math.min(dist * 0.2, 44);
  put(pill, g, from.l, from.r, from.rd);
  for (let i = 0; i <= N; i++) {
    const t = i / N, x = ease(t), sn = Math.sin(Math.PI * t), sy = 1 - sn * sq, c = c0 + (c1 - c0) * x, w = w0 + (w1 - w0) * x + stretch * sn;
    kf.push({ width: w + "px", transform: "translate(" + (c - w / 2) + "px," + g.t + "px) scaleY(" + sy + ")", borderRadius: t < 0.5 ? from.rd : rd, offset: t });
  }
  kf[0].borderRadius = from.rd; kf[N].borderRadius = rd;
  s.anim = e.animate(kf, { duration: dur, easing: "linear", fill: "both" });
  s.anim.onfinish = () => { if (!s.anim) return; s.anim.cancel(); s.anim = null; put(pill, g, g.l, g.r, rd); s.cur = { l: g.l, r: g.r, rd }; };
  s.cur = { l: g.l, r: g.r, rd }; s.g = g; put(pill, g, g.l, g.r, rd);
}
const flush = () => { raf = 0; const l = [...todo]; todo.clear(); l.forEach(sync); };
const q = (sg) => { if (sg) todo.add(sg); if (!raf) raf = requestAnimationFrame(flush); };
const all = () => { document.querySelectorAll(".seg").forEach((x) => todo.add(x)); if (!raf) raf = requestAnimationFrame(flush); };

export function startSegSlide() {
  if (started || typeof MutationObserver === "undefined") return; started = true;
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type == "attributes") {
        if (m.target.closest && m.target.closest(".segi")) continue;
        const p = m.target.parentElement; if (p && p.classList.contains("seg")) q(p);
        if (waiting.size) waiting.forEach(q);
      } else {
        if (m.target.classList && m.target.classList.contains("seg") && ![...m.addedNodes].every((n) => n.classList && n.classList.contains("segi"))) q(m.target);
        for (const n of m.addedNodes) {
          if (n.nodeType != 1 || (n.classList && n.classList.contains("segi"))) continue;
          if (n.matches && n.matches(".seg")) q(n); else if (n.querySelectorAll) n.querySelectorAll(".seg").forEach(q);
        }
      }
    }
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "hidden"] });
  addEventListener("resize", () => { st.forEach((s) => { s.snap = true; }); all(); });
  all();
}
