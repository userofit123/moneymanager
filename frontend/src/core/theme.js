// The look of the app: light or dark, colour set, background, texture, surfaces, corners, density, font...
// The choice lives in `theme` (saved as "moneyTheme") and is put on the page by applyTheme(): CSS variables and
// data-* attributes on <html>, and classes on <body>. The rules that use them are in styles/app.css.
import { reactive, ref, watch } from "vue";
import { readJson, writeJson } from "./prefs.js";

export const ATM = {Indigo:{L:["#4355b9","#dee0ff","#0b1550","#fbf8fd","#7b4fb8","#fff"],D:["#b9c3ff","#2d3f9e","#dee0ff","#111218","#c7a6ff","#0b1550"]},
Ocean:{L:["#006b7d","#b3ebff","#001f26","#f4fafc","#2d7dd2","#fff"],D:["#4fd8eb","#004e5c","#b3ebff","#0a1417","#5aa9ff","#00363f"]},
Forest:{L:["#2e6b3a","#b4f1b8","#002106","#f6faf4","#8a7a1f","#fff"],D:["#98d49f","#135025","#b4f1b8","#0e1410","#d6c46b","#00390f"]},
Sunset:{L:["#a8431e","#ffdbcf","#380d00","#fff8f5","#c2185b","#fff"],D:["#ffb59a","#7f2a05","#ffdbcf","#17100d","#ff8fb1","#5b1a00"]},
Aurora:{L:["#6d4bc4","#e9ddff","#23005c","#faf7ff","#0a9aa6","#fff"],D:["#c8b3ff","#4b2d9a","#e9ddff","#0b0a16","#4fe0cf","#2a0c70"]},
Mono:{L:["#3b3b3b","#e4e4e4","#1b1b1b","#fafafa","#777","#fff"],D:["#e0e0e0","#3a3a3a","#f0f0f0","#101010","#9a9a9a","#1a1a1a"]},
Rose:{L:["#952345","#ffd6e2","#470015","#fdf7f9","#a54027","#ffffff"],D:["#f896b3","#6f2038","#fecddc","#170d10","#f4937b","#440417"]},
Ember:{L:["#954523","#ffe2d6","#471500","#fdf9f7","#a52746","#ffffff"],D:["#f8b396","#6f3820","#fedccd","#17100d","#f47b99","#441704"]},
Gold:{L:["#927526","#fef4d7","#463402","#fdfbf7","#a2562a","#ffffff"],D:["#f6dd98","#6d5922","#fdf0ce","#17140d","#f1a87e","#423205"]},
Meadow:{L:["#4b8f29","#e4fdd8","#194404","#f9fcf7","#9f9f2d","#ffffff"],D:["#b8f39a","#3c6b24","#defbd0","#10160d","#eeee81","#1a4107"]},
Lagoon:{L:["#298f8c","#d8fdfc","#044442","#f7fcfc","#2d6f9f","#ffffff"],D:["#9af3f0","#246b68","#d0fbfa","#0d1616","#81c1ee","#07413f"]},
Sky:{L:["#236595","#d6eeff","#002a47","#f7fafd","#4627a5","#ffffff"],D:["#96cff8","#204e6f","#cdeafe","#0d1317","#997bf4","#042944"]},
Slate:{L:["#455873","#e2e9f3","#152132","#f9fafb","#4d777f","#ffffff"],D:["#b3c4db","#384557","#dce4ef","#101214","#9fc8d0","#172231"]},
Plum:{L:["#8c2b8c","#fcd9fc","#420542","#fcf8fc","#9c3066","#ffffff"],D:["#f19df1","#692669","#fad1fa","#160e16","#eb84b8","#3f083f"]},
Mocha:{L:["#7b5a3c","#f6eadf","#372210","#fbfaf8","#897743","#ffffff"],D:["#e2c5ac","#5d4632","#f3e5d8","#15120f","#d9c896","#352312"]},
Mint:{L:["#2e895c","#dafbeb","#074024","#f8fcfa","#339990","#ffffff"],D:["#9feec7","#286747","#d2f9e6","#0e1612","#87e8e0","#0a3d24"]},
Midnight:{L:["#233a95","#d6deff","#000e47","#f7f8fd","#2790a5","#ffffff"],D:["#96a9f8","#20306f","#cdd7fe","#0d0f17","#7be0f4","#041044"]},
Candy:{L:["#95235c","#ffd6eb","#470024","#fdf7fa","#2790a5","#ffffff"],D:["#f896c7","#6f2047","#fecde6","#170d12","#7be0f4","#440424"]}};
export const FONTS = { sans: 'Inter,"Segoe UI",Roboto,system-ui,sans-serif', serif: '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif', round: 'ui-rounded,"SF Pro Rounded",Nunito,"Varela Round","Segoe UI",system-ui,sans-serif', mono: 'ui-monospace,"SF Mono","JetBrains Mono",Menlo,Consolas,monospace' };
export const CP = { L: ["#4355b9", "#c2185b", "#e68a00", "#00897b", "#7cb342", "#8e24aa", "#546e7a"], D: ["#9fb0ff", "#f48fb1", "#ffcc80", "#80cbc4", "#c5e1a5", "#ce93d8", "#b0bec5"] };
export const ST0 = { mode: "auto", atm: "Indigo", cc: "#4355b9", cu: { L: {}, D: {} }, cp: { L: {}, D: {} }, gi: 100, sym: "₪", surf: "solid", bg: "glow", tex: "none", tsc: 100, gbl: 18, gsat: 160, gop: 45, rad: "round", den: "cozy", spc: "standard", nsp: "standard", fnt: "sans", nav: "full" };
export const AKEYS = ["acc", "accc", "onc", "bg", "acc2", "on"];
const XDEF = { L: { tx: "#1b1b22", pos: "#1b7f4b", neg: "#c0392b" }, D: { tx: "#e6e4ea", pos: "#6fd69b", neg: "#ff9c8f" } };
// the colours that can be changed one by one in a custom colour set, with their English names (the Appearance panel translates them)
export const CUST = [["acc", "Accent"], ["acc2", "Gradient colour"], ["bg", "Background"], ["tx", "Text"], ["accc", "Accent tint"], ["onc", "Text on tint"], ["on", "Text on accent"], ["pos", "Positive"], ["neg", "Negative"]];
// what a saved look keeps
export const PKEYS = ["atm", "cc", "cu", "cp", "gi", "surf", "bg", "tex", "tsc", "gbl", "gsat", "gop", "rad", "den", "spc", "nsp", "fnt", "nav"];

// a plain copy (structuredClone cannot copy the reactive objects the look is kept in)
export const copy = (v) => JSON.parse(JSON.stringify(v));
const saved = readJson("moneyTheme", {}) || {};
export const theme = reactive({ ...copy(ST0), ...saved });
if (theme.surf == "static") theme.surf = "solid";
if (theme.bg == "dots" || theme.bg == "stripes") { theme.tex = theme.bg; theme.bg = "glow"; } // textures used to be backgrounds

// Saved looks, and the look chosen for light and for dark mode.
export const looks = ref(readJson("moneyThemes", []) || []);
export const lookFor = ref(readJson("moneyThemeAs", {}) || {});
export const saveLooks = () => { writeJson("moneyThemes", looks.value); writeJson("moneyThemeAs", lookFor.value); };

const mq = typeof matchMedia !== "undefined" ? matchMedia("(prefers-color-scheme:dark)") : null;
const deviceDark = ref(!!mq?.matches);
mq?.addEventListener?.("change", (e) => { if (theme.mode == "auto") themeSwap(() => { deviceDark.value = e.matches; }); else deviceDark.value = e.matches; });
export const isDark = () => theme.mode == "dark" || (theme.mode == "auto" && deviceDark.value);

// a colour set made from one colour: the same six values every built-in set has
export function customAtm(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ""), n = parseInt(m ? m[1] : "4355b9", 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, sat = 0; const l = (mx + mn) / 2;
  if (mx != mn) { const d = mx - mn; sat = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx == r ? (g - b) / d + (g < b ? 6 : 0) : mx == g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  const S = Math.round(Math.min(90, Math.max(30, sat * 100))), H = Math.round(h), c = (hh, ss, ll) => hslHex((hh + 360) % 360, ss, ll);
  const L = [c(H, S, 42), c(H, S, 92), c(H, S, 14), c(H, 28, 98), c(H + 40, Math.round(S * 0.8), 42), "#ffffff"], D = [c(H, S, 78), c(H, Math.round(S * 0.7), 28), c(H, S, 90), c(H, 16, 8), c(H + 40, S, 76), c(H, S, 14)];
  return { L, D };
}
// hsl → #rrggbb
function hslHex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return "#" + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}
export const cuOf = (k) => (theme.atm == "Custom" && theme.cu && theme.cu[k]) || {};
export const atmOf = (n) => {
  if (n != "Custom") return ATM[n] || ATM.Indigo;
  const b = customAtm(theme.cc);
  ["L", "D"].forEach((k) => { const o = cuOf(k); AKEYS.forEach((x, i) => { if (o[x]) b[k][i] = o[x]; }); });
  return b;
};
export const cpOf = (k) => CP[k].map((c, i) => (theme.atm == "Custom" && theme.cp && theme.cp[k] && theme.cp[k][i]) || c);
export const custVal = (n, k) => { const o = cuOf(k); if (o[n]) return o[n]; const i = AKEYS.indexOf(n); return i >= 0 ? atmOf("Custom")[k][i] : XDEF[k][n]; };
// the two colours shown on a colour set's swatch, and a saved look's colours
export const lookPal = (v, k) => { const b = v.atm == "Custom" ? customAtm(v.cc)[k] : (ATM[v.atm] || ATM.Indigo)[k], o = (v.atm == "Custom" && v.cu && v.cu[k]) || {}; return b.map((c, i) => o[AKEYS[i]] || c); };

export function applyTheme() {
  if (typeof document === "undefined") return;
  const d = isDark(), k = d ? "D" : "L";
  // a look chosen for light or dark mode takes over when the mode changes
  if (theme.ls !== k) { theme.ls = k; const x = looks.value.find((y) => y.id == lookFor.value[k]); if (x) Object.assign(theme, copy(x.v)); }
  const a = atmOf(theme.atm)[k], ex = cuOf(k), h = document.documentElement, r = h.style;
  r.colorScheme = d ? "dark" : "light";
  h.dataset.mode = d ? "dark" : "light";
  ["bg", "tex", "rad", "den", "spc", "nsp", "fnt", "nav"].forEach((x) => { h.dataset[x] = theme[x]; });
  r.setProperty("--tsc", String((+theme.tsc || 100) / 100));
  r.setProperty("--gi", String((theme.gi == null ? 100 : +theme.gi) / 100));
  const n = (v, def, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(+v) && v != null ? +v : def));
  r.setProperty("--gblur", n(theme.gbl, 18, 0, 40) + "px"); r.setProperty("--gsat", n(theme.gsat, 160, 100, 250) + "%"); r.setProperty("--gop", n(theme.gop, 45, 0, 100) + "%");
  r.setProperty("--font", FONTS[theme.fnt] || FONTS.sans);
  [["--acc", a[0]], ["--accc", a[1]], ["--onc", a[2]], ["--bg", a[3]], ["--acc2", a[4]], ["--on", a[5]], ["--tx", ex.tx || XDEF[k].tx], ["--tx2", ex.tx ? "color-mix(in srgb,var(--tx) 68%,var(--bg))" : d ? "#a9a7b3" : "#5a5865"], ["--pos", ex.pos || XDEF[k].pos], ["--neg", ex.neg || XDEF[k].neg],
    ["--s1", "color-mix(in srgb,var(--tx) " + (d ? "5" : "3") + "%,var(--bg))"], ["--s2", "color-mix(in srgb,var(--tx) " + (d ? "10" : "7") + "%,var(--bg))"], ["--ol", "color-mix(in srgb,var(--tx) " + (d ? "13" : "11") + "%,transparent)"]].forEach(([p, v]) => r.setProperty(p, v));
  cpOf(k).forEach((c, i) => r.setProperty("--c" + i, c));
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", a[3]);
  ["glass", "outline", "raised"].forEach((c) => document.body?.classList.toggle(c, theme.surf == c));
  writeJson("moneyTheme", theme);
  writeJson("moneyBoot", { bg: a[3], d, a1: a[0], a2: a[4], on: a[5], sym: theme.sym });
}

// The new look fades in (a view transition), like themeSwap(); from an element, it spreads out in a circle from it (themeSwapFrom).
const still = () => typeof document === "undefined" || !document.startViewTransition || matchMedia("(prefers-reduced-motion:reduce)").matches;
export function themeSwap(fn) {
  const go = () => { const h = document.documentElement; h.classList.add("nt"); fn(); requestAnimationFrame(() => requestAnimationFrame(() => h.classList.remove("nt"))); };
  if (still()) go(); else document.startViewTransition(go);
}
export function themeSwapFrom(el, fn) {
  if (still() || !el) { fn(); return; }
  const h = document.documentElement, b = el.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2, R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)), F = Math.round(Math.min(260, Math.max(140, R * 0.22)));
  h.style.setProperty("--vt-x", x + "px"); h.style.setProperty("--vt-y", y + "px"); h.style.setProperty("--vt-f", F + "px"); h.style.setProperty("--vt-r", "0px"); h.classList.add("vt-r");
  const t = document.startViewTransition(() => { fn(); });
  t.ready.then(() => h.animate({ "--vt-r": ["0px", R + F + "px"] }, { duration: 600, easing: "cubic-bezier(.35,.15,.65,.85)", fill: "forwards", pseudoElement: "::view-transition-new(root)" })).catch(() => {});
  t.finished.finally(() => { h.classList.remove("vt-r"); ["--vt-x", "--vt-y", "--vt-f", "--vt-r"].forEach((p) => h.style.removeProperty(p)); });
}
// Change the look: setTheme({ atm: "Ocean" }) fades to it.
export const setTheme = (o, from) => (from ? themeSwapFrom(from, () => Object.assign(theme, o)) : themeSwap(() => Object.assign(theme, o)));
// The logo's random look (case "shuffle")
export function shuffle(el) {
  const pk = (L) => L[Math.floor(Math.random() * L.length)];
  setTheme({ atm: pk(Object.keys(ATM).filter((x) => x != theme.atm)), bg: pk(["glow", "mesh", "diagonal", "spot", "dots", "stripes", "flat"].filter((x) => x != theme.bg)) }, el);
}

// Applies the look now and after every change (the swap functions change `theme` inside the transition, so the page is redrawn there).
let started = false;
export function startTheme() {
  if (started) return; started = true;
  applyTheme();
  watch(() => JSON.stringify(theme) + deviceDark.value, applyTheme, { flush: "sync" });
}
