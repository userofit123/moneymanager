<script setup>
// The Appearance panel (web/index.html #pop and the theme actions in web/js/08-jars.js): mode, colour set, background, texture,
// surface, corners, font, density, spacing, navigation, and saved looks. Same markup and classes as the current app (styles/legacy.css).
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { theme, ATM, ST0, CP, CUST, AKEYS, looks, lookFor, saveLooks, copy, isDark, atmOf, cpOf, custVal, lookPal, setTheme, themeSwap, PKEYS } from "../core/theme.js";
import { toast } from "../core/toast.js";
import { tx } from "../core/heText.js";
import { appearanceOpen } from "../core/shell.js";
import { escLayer } from "../core/layers.js";

const { t } = useI18n();
const tab = ref("col");
const TABS = { col: "ap.tCol", sty: "ap.tSty", lay: "ap.tLay", sav: "ap.tSav" };
const k = computed(() => (isDark() ? "D" : "L"));
const dark = computed(() => k.value === "D");

// closing plays the same short fade-out as the current app (outAnim)
const out = ref(false);
watch(appearanceOpen, (o) => { if (!o) { out.value = true; setTimeout(() => (out.value = false), 200); } });
const close = () => { appearanceOpen.value = false; };
escLayer(appearanceOpen, close);
const el = ref(null);
const outside = (e) => { if (appearanceOpen.value && el.value && !el.value.contains(e.target) && !e.target.closest?.("#themeBtn,.ddm,[data-theme-open]")) close(); };
onMounted(() => document.addEventListener("click", outside, true));
onBeforeUnmount(() => document.removeEventListener("click", outside, true));

const BG = [["glow", "glow"], ["mesh", "mesh"], ["diagonal", "diagonal"], ["spot", "spot"], ["flat", "flat"]];
const TEX = ["none", "dots", "stripes", "grid", "static"];
const SURF = ["solid", "glass", "outline", "raised"];
const RAD = [["round", 18], ["soft", 9], ["sharp", 2]];
const FNT = [["sans", "Inter,system-ui,sans-serif", "sans"], ["serif", "Georgia,serif", "serif"], ["round", "ui-rounded,'SF Pro Rounded',Nunito,system-ui,sans-serif", "rounded"], ["mono", "ui-monospace,Menlo,Consolas,monospace", "mono"]];
const DEN = [["compact", 3], ["cozy", 6], ["roomy", 10]];
const SPC = [["tight", 2], ["standard", 5], ["loose", 9], ["wide", 13]];
const NSP = [["tight", 2], ["standard", 5], ["roomy", 8]];
const CKEY = { acc: "cAcc", acc2: "cAcc2", bg: "cBg", tx: "cTx", accc: "cAccc", onc: "cOnc", on: "cOn", pos: "cPos", neg: "cNeg" };

const opt = (key, v) => setTheme({ [key]: v });
const swatch = (n) => { const c = n === "Custom" ? atmOf("Custom")[k.value] : ATM[n][k.value]; return `linear-gradient(135deg,${c[0]} 0 52%,${c[4]} 52% 100%)`; };
const range = (key, v) => { theme[key] = +v; };

// a custom colour set: one base colour, then each colour by itself
const fromPreset = (e) => {
  const a = ATM[e.target.value]; if (!a) return;
  const cu = { L: {}, D: {} }; ["L", "D"].forEach((m) => AKEYS.forEach((x, j) => { cu[m][x] = a[m][j]; }));
  e.target.value = "";
  setTheme({ cc: a.L[0], cu, cp: { L: {}, D: {} }, atm: "Custom" });
};
const setBase = (v) => Object.assign(theme, { cc: v, atm: "Custom", cu: { L: {}, D: {} }, cp: { L: {}, D: {} } });
const setCust = (n, v) => { const cu = copy(theme.cu || { L: {}, D: {} }); (cu[k.value] = cu[k.value] || {})[n] = v; Object.assign(theme, { cu, atm: "Custom" }); };
const setChart = (i, v) => { const cp = copy(theme.cp || { L: {}, D: {} }); (cp[k.value] = cp[k.value] || {})[i] = v; theme.cp = cp; };
const custReset = () => setTheme({ cu: { L: {}, D: {} }, cp: { L: {}, D: {} }, cc: ST0.cc });
const reset = () => themeSwap(() => { const keep = { sym: theme.sym, ls: theme.ls }; Object.keys(theme).forEach((x) => delete theme[x]); Object.assign(theme, copy(ST0), keep); });

// saved looks
const lookName = ref(""), nameEl = ref(null);
const snap = () => copy(Object.fromEntries(PKEYS.map((x) => [x, theme[x]])));
const openSave = () => { tab.value = "sav"; nextTick(() => nameEl.value?.focus()); };
function saveLook() {
  const nm = lookName.value.trim();
  if (!nm) { nameEl.value?.focus(); return; }
  if (looks.value.length >= 25) { toast(t("ap.max"), { kind: "err" }); return; }
  looks.value = [...looks.value, { id: Date.now().toString(36), name: nm, v: snap() }];
  lookName.value = ""; saveLooks();
}
const useLook = (x) => setTheme(copy(x.v));
function assign(x, sc) {
  lookFor.value = { ...lookFor.value, [sc]: lookFor.value[sc] == x.id ? null : x.id }; saveLooks();
  const y = looks.value.find((z) => z.id == lookFor.value[sc]);
  if (y && (sc == "D") == isDark()) setTheme(copy(y.v));
}
const updLook = (x) => { looks.value = looks.value.map((y) => (y.id == x.id ? { ...y, v: snap() } : y)); saveLooks(); toast(t("ap.savedLook", { name: x.name })); };
const delLook = (x) => { looks.value = looks.value.filter((y) => y.id != x.id); const a = { ...lookFor.value }; ["L", "D"].forEach((s) => { if (a[s] == x.id) a[s] = null; }); lookFor.value = a; saveLooks(); };
const lookDot = (x) => { const c = lookPal(x.v, k.value); return `background:linear-gradient(135deg,${c[0]} 0 50%,${c[4]} 50% 100%);box-shadow:0 0 0 3px ${c[3]},0 0 0 4px var(--ol)`; };
</script>

<template>
  <div id="pop" ref="el" class="pop" :class="{ on: appearanceOpen, out }" role="dialog" :aria-label="t('ap.title')">
    <div class="aph"><b>{{ t("ap.title") }}</b><span class="aphb"><button class="btn o s" @click="openSave">{{ t("ap.save") }}</button><button class="btn o s" @click="reset">{{ t("ap.reset") }}</button></span></div>
    <div id="apTabs" class="seg apseg aptabs">
      <button v-for="x in ['col', 'sty', 'lay', 'sav']" :key="x" :class="{ on: tab === x }" @click="tab = x">{{ t(TABS[x]) }}</button>
    </div>
    <div class="apb">
      <div class="apbt" :class="{ on: tab === 'col' }">
        <div class="aps"><h4>{{ t("ap.mode") }}</h4>
          <div id="segMode" class="seg apseg">
            <button :class="{ on: theme.mode === 'light' }" @click="opt('mode', 'light')"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>{{ t("ap.light") }}</button>
            <button :class="{ on: theme.mode === 'dark' }" @click="opt('mode', 'dark')"><svg viewBox="0 0 24 24"><path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" /></svg>{{ t("ap.dark") }}</button>
            <button :class="{ on: theme.mode === 'auto' }" @click="opt('mode', 'auto')"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor" /></svg>{{ t("ap.auto") }}</button>
          </div>
        </div>
        <div class="aps"><h4>{{ t("ap.atm") }}</h4>
          <div id="sw" class="sw">
            <button v-for="(v, n) in ATM" :key="n" :class="{ on: theme.atm === n }" :aria-label="tx(n)" :title="tx(n)" @click="opt('atm', n)"><span class="swd" :style="{ background: swatch(n) }" /><span class="swn">{{ tx(n) }}</span></button>
            <button :class="{ on: theme.atm === 'Custom' }" :aria-label="t('ap.customA')" :title="t('ap.customA')" @click="opt('atm', 'Custom')"><span class="swd" :style="{ background: theme.atm === 'Custom' ? swatch('Custom') : 'conic-gradient(#f55,#fb3,#9d4,#3cb,#49f,#a6e,#f55)' }" /><span class="swn">{{ t("ap.custom") }}</span></button>
          </div>
          <div v-if="theme.atm === 'Custom'" id="cust" class="cust">
            <div class="apr"><span>{{ t("ap.from") }}</span><select @change="fromPreset"><option value="">{{ t("ap.fromPh") }}</option><option v-for="(v, n) in ATM" :key="n" :value="n">{{ tx(n) }}</option></select></div>
            <div class="apr"><span>{{ t("ap.base") }}</span><input type="color" :value="theme.cc || '#4355b9'" :aria-label="t('ap.base')" @input="setBase($event.target.value)"><output>{{ (theme.cc || "").toUpperCase() }}</output></div>
            <div class="cuh"><b>{{ dark ? t("ap.darkC") : t("ap.lightC") }}</b><button class="btn o s" @click="custReset">{{ t("ap.reset") }}</button></div>
            <div class="cgrid"><label v-for="[n] in CUST" :key="n" class="crow"><input type="color" :value="custVal(n, k)" :aria-label="t('ap.' + CKEY[n])" @input="setCust(n, $event.target.value)"><span>{{ t("ap." + CKEY[n]) }}</span></label></div>
            <details class="cch"><summary>{{ t("ap.charts") }}</summary><div class="cgrid"><label v-for="(c, i) in CP.L" :key="i" class="crow"><input type="color" :value="cpOf(k)[i]" :aria-label="t('ap.chartN', { n: i + 1 })" @input="setChart(i, $event.target.value)"><span>{{ t("ap.colourN", { n: i + 1 }) }}</span></label></div></details>
          </div>
        </div>
        <div class="aps"><h4>{{ t("ap.bg") }}</h4>
          <div class="apg c5"><button v-for="[v, l] in BG" :key="v" class="apt" :class="{ on: theme.bg === v }" @click="opt('bg', v)"><span class="apv bgv" :class="'bg-' + v" /><span class="apl">{{ t("ap." + l) }}</span></button></div>
          <div id="giRow" class="apr" :class="{ off: theme.bg === 'flat' }"><span>{{ t("ap.gi") }}</span><input type="range" min="0" max="200" step="5" :value="theme.gi == null ? 100 : theme.gi" :aria-label="t('ap.gi')" @input="range('gi', $event.target.value)"><output>{{ Math.round(theme.gi == null ? 100 : theme.gi) }}%</output></div>
        </div>
        <div class="aps"><h4>{{ t("ap.tex") }}</h4>
          <div class="apg c5"><button v-for="v in TEX" :key="v" class="apt" :class="{ on: theme.tex === v }" @click="opt('tex', v)"><span class="apv txv" :class="'tx-' + v" /><span class="apl">{{ t("ap." + v) }}</span></button></div>
          <div v-if="theme.tex !== 'none'" id="texRow" class="apr"><span>{{ t("ap.texScale") }}</span><input type="range" min="40" max="240" step="10" :value="+theme.tsc || 100" :aria-label="t('ap.texScale')" @input="range('tsc', $event.target.value)"><output>{{ Math.round(+theme.tsc || 100) }}%</output></div>
        </div>
      </div>
      <div class="apbt" :class="{ on: tab === 'sty' }">
        <div class="aps"><h4>{{ t("ap.surf") }}</h4>
          <div class="apg c5"><button v-for="v in SURF" :key="v" class="apt" :class="{ on: theme.surf === v }" @click="opt('surf', v)"><span class="apv sfv" :class="'sf-' + v"><i /></span><span class="apl">{{ t("ap." + v) }}</span></button></div>
          <template v-if="theme.surf === 'glass'">
            <div class="apr"><span>{{ t("ap.blur") }}</span><input type="range" min="0" max="40" step="1" :value="theme.gbl" :aria-label="t('ap.blurA')" @input="range('gbl', $event.target.value)"><output>{{ Math.round(theme.gbl) }}px</output></div>
            <div class="apr"><span>{{ t("ap.vib") }}</span><input type="range" min="100" max="250" step="5" :value="theme.gsat" :aria-label="t('ap.vibA')" @input="range('gsat', $event.target.value)"><output>{{ Math.round(theme.gsat) }}%</output></div>
            <div class="apr"><span>{{ t("ap.op") }}</span><input type="range" min="0" max="100" step="5" :value="theme.gop" :aria-label="t('ap.opA')" @input="range('gop', $event.target.value)"><output>{{ Math.round(theme.gop) }}%</output></div>
          </template>
        </div>
        <div class="aps"><h4>{{ t("ap.corners") }}</h4>
          <div class="apg"><button v-for="[v, r] in RAD" :key="v" class="apt" :class="{ on: theme.rad === v }" @click="opt('rad', v)"><span class="apv rv"><i :style="{ borderTopLeftRadius: r + 'px' }" /></span><span class="apl">{{ t("ap." + v) }}</span></button></div>
        </div>
        <div class="aps"><h4>{{ t("ap.font") }}</h4>
          <div class="apg c4"><button v-for="[v, ff, l] in FNT" :key="v" class="apt" :class="{ on: theme.fnt === v }" @click="opt('fnt', v)"><span class="apv fv" :style="{ fontFamily: ff }">Aa</span><span class="apl">{{ t("ap." + l) }}</span></button></div>
        </div>
      </div>
      <div class="apbt" :class="{ on: tab === 'lay' }">
        <div class="aps"><h4>{{ t("ap.den") }}</h4>
          <div class="apg"><button v-for="[v, g] in DEN" :key="v" class="apt" :class="{ on: theme.den === v }" @click="opt('den', v)"><span class="apv dv" :style="{ '--g': g + 'px' }"><i /><i /><i /></span><span class="apl">{{ t("ap." + v) }}</span></button></div>
        </div>
        <div class="aps"><h4>{{ t("ap.spc") }}</h4>
          <div class="apg c4"><button v-for="[v, g] in SPC" :key="v" class="apt" :class="{ on: theme.spc === v }" @click="opt('spc', v)"><span class="apv spv" :style="{ '--g': g + 'px' }"><i /><i /><i /></span><span class="apl">{{ t("ap." + v) }}</span></button></div>
        </div>
        <div class="aps only-d"><h4>{{ t("ap.nsp") }}</h4>
          <div class="apg c3"><button v-for="[v, g] in NSP" :key="v" class="apt" :class="{ on: theme.nsp === v }" @click="opt('nsp', v)"><span class="apv spv sbv" :style="{ '--g': g + 'px' }"><i /><i /><i /><i /></span><span class="apl">{{ t("ap." + v) }}</span></button></div>
        </div>
        <div class="aps only-d"><h4>{{ t("ap.nav") }}</h4>
          <div class="seg apseg"><button :class="{ on: theme.nav === 'full' }" @click="opt('nav', 'full')">{{ t("ap.labels") }}</button><button :class="{ on: theme.nav === 'mini' }" @click="opt('nav', 'mini')">{{ t("ap.icons") }}</button></div>
        </div>
      </div>
      <div class="apbt" :class="{ on: tab === 'sav' }">
        <div class="aps"><h4>{{ t("ap.saveNow") }}</h4>
          <div class="apr" style="margin-top:0"><input ref="nameEl" v-model="lookName" type="text" maxlength="30" :placeholder="t('ap.name')" :aria-label="t('ap.nameA')" style="flex:1;min-width:0" @keydown.enter="saveLook"><button class="btn s" @click="saveLook">{{ t("ap.saveBtn") }}</button></div>
          <div class="sm" style="margin-top:8px">{{ t("ap.notSaved") }}</div>
        </div>
        <div class="aps"><h4>{{ t("ap.yours") }}</h4>
          <div id="tpList">
            <div v-for="x in looks" :key="x.id" class="tpr">
              <span class="tpd" :style="lookDot(x)" /><b>{{ x.name }}</b>
              <span class="tpa">
                <button class="btn o s" @click="useLook(x)">{{ t("ap.use") }}</button>
                <button class="btn o s" :class="{ on: lookFor.L == x.id }" :title="t('ap.useL')" :aria-label="t('ap.useL')" @click="assign(x, 'L')">{{ t("ap.light") }}</button>
                <button class="btn o s" :class="{ on: lookFor.D == x.id }" :title="t('ap.useD')" :aria-label="t('ap.useD')" @click="assign(x, 'D')">{{ t("ap.dark") }}</button>
                <button class="btn o s" :title="t('ap.updateT')" @click="updLook(x)">{{ t("ap.update") }}</button>
                <button class="btn o s" :aria-label="t('ap.del')" @click="delLook(x)">×</button>
              </span>
            </div>
            <div v-if="!looks.length" class="sm">{{ t("ap.nothing") }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
