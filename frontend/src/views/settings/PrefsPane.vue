<script setup>
// Settings → Preferences. A copy of the current app's "Language and region" and "App icon" cards (web/js/06-trend-forecast-sync.js renderSet;
// the lang, datef, weekf and opt actions in web/js/08-jars.js). The choices are kept in this browser, under the current app's names.
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { setLang } from "../../i18n.js";
import SetHead from "./SetHead.vue";
import SetRow from "./SetRow.vue";
import { dateFormat, weekStart } from "../../core/prefs.js";
import { DATE_FORMATS, ICONS, iconSvg, readIcon, saveDateFormat, saveWeekStart, saveIcon } from "./prefs.js";

const { t, locale } = useI18n();
const tk = (k) => t("settings.pref." + k);
// the date order and the week start are shared by every page, so a change shows everywhere at once
const df = dateFormat, ws = weekStart, icon = ref(readIcon());
</script>

<template>
  <div id="setPref">
    <div class="card ss">
      <SetHead icon="sliders" :title="tk('title')" :desc="tk('desc')" />
      <div class="ssb">
        <SetRow :title="tk('lang')" :desc="tk('langDesc')">
          <div id="segLang" class="seg apseg"><button type="button" data-a="lang" data-l="en" :class="{ on: locale === 'en' }" @click="setLang('en')">English</button><button type="button" data-a="lang" data-l="he" :class="{ on: locale === 'he' }" @click="setLang('he')">עברית</button></div>
        </SetRow>
        <SetRow :title="tk('dateFormat')">
          <div id="segDf" class="seg apseg"><button v-for="[v, l] in DATE_FORMATS" :key="v" type="button" data-a="datef" :data-v="v" :class="{ on: df === v }" @click="saveDateFormat(v)">{{ l }}</button></div>
        </SetRow>
        <SetRow :title="tk('weekStart')" :desc="tk('weekDesc')">
          <div id="segWs" class="seg apseg"><button v-for="v in ['sun', 'mon']" :key="v" type="button" data-a="weekf" :data-v="v" :class="{ on: ws === v }" @click="saveWeekStart(v)">{{ tk(v) }}</button></div>
        </SetRow>
      </div>
    </div>
    <div class="card ss">
      <SetHead icon="sliders" :title="tk('iconTitle')" :desc="tk('iconDesc')" />
      <div class="ssb p">
        <div class="apg c6"><button v-for="[v, l] in ICONS" :key="v" type="button" class="apt" :class="{ on: icon === v }" data-a="opt" data-k="sym" :data-v="v" @click="icon = saveIcon(v)"><span class="apv symv" :data-ss="v" v-html="iconSvg(v)" /><span class="apl">{{ tk(l) }}</span></button></div>
      </div>
    </div>
  </div>
</template>
