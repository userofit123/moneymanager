<script setup>
// The tab bar: Recap, Home, Activity, Jars, Bills, Forecast and More, each with its icon, its name and a count where something waits
// (Activity: items to review; More: alerts). The open tab's icon sits in a pill. Tapping the open tab again goes to its top.
// It hides while the keyboard is open, so the field being typed in stays in view.
import { computed, ref, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { pages } from "../../routes.js";
import { TABS } from "../screens.js";
import { usePhoneNav } from "../navigation.js";
import { alertList, reviewCount } from "../../core/derived.js";
import { ICONS } from "../icons.js";
import PIcon from "./PIcon.vue";

const { t } = useI18n();
const nav = usePhoneNav();
const icon = (n) => pages.find((p) => p.name === n)?.icon || ICONS.more4;
const count = (n) => (n === "activity" ? reviewCount.value : n === "more" ? alertList.value.length : 0);
const shown = (n) => (n > 99 ? t("phone.shell.badgeMax") : String(n));
const tabs = computed(() => TABS.map((n) => ({ n, on: nav.tabName.value === n, c: count(n) })));

// the keyboard takes more than a quarter of the screen: hide the bar
const kb = ref(false), vv = typeof window !== "undefined" ? window.visualViewport : null;
const onVv = () => { kb.value = !!vv && innerHeight - vv.height > innerHeight * 0.25; };
onMounted(() => vv?.addEventListener("resize", onVv));
onBeforeUnmount(() => vv?.removeEventListener("resize", onVv));
</script>

<template>
  <div class="ph-tabs" :class="{ kb }" role="navigation" :aria-label="t('phone.shell.tabs.label')">
    <button v-for="x in tabs" :key="x.n" type="button" class="ph-tab" :class="{ on: x.on }" :aria-current="x.on ? 'page' : undefined" @click="nav.tab(x.n)">
      <span class="ph-tab-ic"><PIcon :svg="icon(x.n)" /><span v-if="x.c" class="ph-badge">{{ shown(x.c) }}</span></span>
      <span class="ph-tab-l">{{ t("phone.shell.tabs." + x.n) }}</span>
    </button>
  </div>
</template>
