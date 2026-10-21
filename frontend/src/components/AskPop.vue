<script setup>
// The confirm box (.askc), on top of everything; Cancel, a click outside or Escape close it, "Yes, do it" runs the change.
import { ref, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { asking, askClose, askYes } from "../core/ask.js";
import { escLayer } from "../core/layers.js";
const { t } = useI18n();
const yes = ref(null), shown = ref(false);
watch(asking, (a) => { shown.value = false; if (a) nextTick(() => { requestAnimationFrame(() => (shown.value = true)); yes.value?.focus(); }); });
escLayer(() => !!asking.value, askClose);
</script>

<template>
  <Teleport to="body">
    <div v-if="asking" class="askc" :class="{ in: shown }" @click.self="askClose">
      <div class="askb" role="alertdialog" :aria-label="asking.title"><b>{{ asking.title }}</b><div v-if="asking.text" class="sm">{{ asking.text }}</div>
        <div class="askf"><button type="button" class="btn o s" @click="askClose">{{ t("txw.cancel") }}</button><button ref="yes" type="button" class="btn s" :class="{ r: asking.danger }" @click="askYes">{{ t("txw.yes") }}</button></div>
      </div>
    </div>
  </Teleport>
</template>
