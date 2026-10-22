// Every <details> in the app slides open and closed instead of jumping.
// The height is animated; "opening"/"closing" classes let the styles (each window's file in styles/components/) turn the arrow and fade the content. data-noanim opts out.
let started = false;
export function startDetails() {
  if (started || typeof document === "undefined") return; started = true;
  document.addEventListener("click", (e) => {
    const sm = e.target.closest && e.target.closest("details>summary");
    if (!sm || e.defaultPrevented) return;
    const d = sm.parentElement;
    if (d.tagName != "DETAILS" || d.dataset.noanim != null) return;
    e.preventDefault();
    const was = d.open;
    if (d._anim) { d._anim.cancel(); d._anim = null; d.style.height = ""; d.style.overflow = ""; }
    if (matchMedia("(prefers-reduced-motion:reduce)").matches || !d.animate) { d.open = !was; return; }
    const done = () => { d._anim = null; d.style.height = ""; d.style.overflow = ""; d.classList.remove("closing", "opening"); };
    if (!was) {
      const h0 = d.offsetHeight; d.open = true; const h1 = d.offsetHeight;
      d.style.overflow = "hidden"; d.classList.add("opening");
      d._anim = d.animate({ height: [h0 + "px", h1 + "px"] }, { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" });
      d._anim.onfinish = done; d._anim.oncancel = done;
    } else {
      const h0 = d.offsetHeight; d.open = false; const h1 = d.offsetHeight; d.open = true;
      d.style.overflow = "hidden"; d.classList.add("closing");
      d._anim = d.animate({ height: [h0 + "px", h1 + "px"] }, { duration: 220, easing: "cubic-bezier(.4,0,.2,1)" });
      d._anim.onfinish = () => { d.open = false; done(); }; d._anim.oncancel = done;
    }
  }, true);
}
