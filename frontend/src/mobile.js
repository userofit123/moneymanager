// Phone or computer: the phone app shows on a screen up to 860px wide, or a touch screen up to 1100px.
// isPhone follows the screen live (resize, rotate) and html.phone is set with it, for the phone app's styles (src/phone/styles).
// (Light or dark, html[data-mode], is set by the look: core/theme.js.)
import { ref } from "vue";

export const isPhone = ref(false);
export function startMobile(root = document.documentElement, win = window) {
  const check = () => {
    const w = Math.min(win.innerWidth, root.clientWidth || win.innerWidth);
    const touch = win.matchMedia("(pointer:coarse)").matches;
    isPhone.value = w <= 860 || (touch && w <= 1100);
    root.classList.toggle("phone", isPhone.value);
  };
  check();
  win.addEventListener("resize", check);
  win.addEventListener("orientationchange", check);
}
