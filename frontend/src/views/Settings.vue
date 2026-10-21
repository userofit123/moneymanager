<script setup>
// Settings: the list of
// sections on one side (five groups) and the open section next to it. Each section is its own file in views/settings/.
// The open section is not part of the address.
import { computed, defineAsyncComponent, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import PageHeader from "../components/PageHeader.vue";
import { NAV, PANES } from "./settings/nav.js";
import { settingsTab } from "./settings/tab.js";

const { t } = useI18n();
onMounted(() => { data.start(); });

const panes = Object.fromEntries(Object.entries(PANES).map(([id, load]) => [id, defineAsyncComponent(load)]));
const pane = computed(() => panes[settingsTab.value] || panes.prof);
</script>

<template>
  <PageHeader :title="t('nav.settings')" />
  <section id="set" class="view on">
    <div class="setwrap">
      <div id="setTabs" class="setnav" role="navigation" :aria-label="t('settings.nav.aria')">
        <template v-for="g in NAV" :key="g.group">
          <div class="sng">{{ t("settings.nav.groups." + g.group) }}</div>
          <button v-for="tab in g.tabs" :key="tab.id" type="button" data-a="setTab" :data-t="tab.id" :class="{ on: settingsTab === tab.id }" @click="settingsTab = tab.id">
            <svg viewBox="0 0 24 24" v-html="tab.icon" /><span>{{ t("settings.nav.tabs." + tab.id) }}</span>
          </button>
        </template>
      </div>
      <div class="setmain stk">
        <component :is="pane" :key="settingsTab" />
      </div>
    </div>
  </section>
</template>
