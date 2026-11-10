<script setup>
// Settings → Preferences: the "Language and region", "App icon" and "Points and levels" cards (with the new-level party). The choices are kept in this browser.
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { setLang } from "../../i18n.js";
import SetSection from "./SetSection.vue";
import SetRow from "./SetRow.vue";
import { dateFormat, weekStart } from "../../core/prefs.js";
import { pointsPref } from "../../core/points.js";
import { celebratePref } from "../../core/celebrate.js";
import { DATE_FORMATS, ICONS, iconSvg, readIcon, saveDateFormat, saveWeekStart, saveIcon } from "./prefs.js";

const { t, locale } = useI18n();
const tk = (k) => t("settings.pref." + k);
// the date order and the week start are shared by every page, so a change shows everywhere at once
const df = dateFormat, ws = weekStart, icon = ref(readIcon());
// points on or off: off hides the badge and gives no points
const setPoints = (on) => (pointsPref.value = on ? "on" : "off");
// confetti when a new level is reached (only while points are on)
const setCelebrate = (on) => (celebratePref.value = on ? "on" : "off");
</script>

<template>
  <div id="setPref">
    <SetSection icon="globe" :title="tk('title')" :desc="tk('desc')">
      <SetRow :title="tk('lang')" :desc="tk('langDesc')">
        <div id="segLang" class="seg apseg"><button type="button" data-a="lang" data-l="en" :class="{ on: locale === 'en' }" @click="setLang('en')">English</button><button type="button" data-a="lang" data-l="he" :class="{ on: locale === 'he' }" @click="setLang('he')">עברית</button></div>
      </SetRow>
      <SetRow :title="tk('dateFormat')" :desc="tk('dfDesc')">
        <div id="segDf" class="seg apseg"><button v-for="[v, l] in DATE_FORMATS" :key="v" type="button" data-a="datef" :data-v="v" :class="{ on: df === v }" @click="saveDateFormat(v)">{{ l }}</button></div>
      </SetRow>
      <SetRow :title="tk('weekStart')" :desc="tk('weekDesc')">
        <div id="segWs" class="seg apseg"><button v-for="v in ['sun', 'mon']" :key="v" type="button" data-a="weekf" :data-v="v" :class="{ on: ws === v }" @click="saveWeekStart(v)">{{ tk(v) }}</button></div>
      </SetRow>
    </SetSection>
    <SetSection icon="app" :title="tk('iconTitle')" :desc="tk('iconDesc')" pad>
      <div class="apg c6"><button v-for="[v, l] in ICONS" :key="v" type="button" class="apt" :class="{ on: icon === v }" data-a="opt" data-k="sym" :data-v="v" @click="icon = saveIcon(v)"><span class="apv symv" :data-ss="v" v-html="iconSvg(v)" /><span class="apl">{{ tk(l) }}</span></button></div>
    </SetSection>
    <SetSection icon="sparkle" :title="tk('pointsTitle')" :desc="tk('pointsDesc')">
      <SetRow toggle data-k="points" :title="tk('pointsOn')" :desc="tk('pointsOnDesc')" :model-value="pointsPref !== 'off'" @update:model-value="setPoints" />
      <SetRow v-if="pointsPref !== 'off'" toggle data-k="celebrate" :title="tk('celebrateOn')" :desc="tk('celebrateOnDesc')" :model-value="celebratePref !== 'off'" @update:model-value="setCelebrate" />
    </SetSection>
  </div>
</template>
