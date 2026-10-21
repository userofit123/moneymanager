// Same as the small script at the top of web/index.html: html.mob is set on phones (860px wide, or a touch screen up to 1100px).
// (Light or dark, html[data-mode], is set by the look: core/theme.js.)
export function startMobile(root = document.documentElement, win = window) {
  const mob = () => {
    const w = Math.min(win.innerWidth, root.clientWidth || win.innerWidth);
    const touch = win.matchMedia("(pointer:coarse)").matches;
    root.classList.toggle("mob", w <= 860 || (touch && w <= 1100));
  };
  mob();
  win.addEventListener("resize", mob);
  win.addEventListener("orientationchange", mob);
}
