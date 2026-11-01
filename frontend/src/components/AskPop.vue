<script setup>
// The confirm box (.askc), on top of everything; Cancel, a click outside or Escape close it, "Yes, do it" runs the change.
// In the phone app (mobile.js) it is a sheet from the bottom: the question, then "Yes, do it" and Cancel, in reach of the thumb.
import { ref, watch, nextTick, defineAsyncComponent } from "vue";
import { isPhone } from "../mobile.js";
import { useI18n } from "vue-i18n";
import { asking, askClose, askYes } from "../core/ask.js";
import { escLayer } from "../core/layers.js";
const { t } = useI18n();
const yes = ref(null), shown = ref(false);
const PhoneSheet = defineAsyncComponent(() => import("../phone/components/PhoneSheet.vue"));
watch(asking, (a) => { shown.value = false; if (a && !isPhone.value) nextTick(() => { requestAnimationFrame(() => (shown.value = true)); yes.value?.focus(); }); });
escLayer(() => !!asking.value, askClose);
</script>

<template>
  <component :is="PhoneSheet" v-if="isPhone" :open="!!asking" :label="asking?.title" cls="ph-ask" @close="askClose">
    <template v-if="asking">
      <p class="ph-ask-t">{{ asking.title }}</p>
      <p v-if="asking.text" class="ph-ask-x">{{ asking.text }}</p>
      <button type="button" class="ph-btn" :class="{ danger: asking.danger }" @click="askYes">{{ asking.yes || t("txw.yes") }}</button>
      <button type="button" class="ph-btn tonal" @click="askClose">{{ t("txw.cancel") }}</button>
    </template>
  </component>
  <Teleport v-else to="body">
    <div v-if="asking" class="askc" :class="{ in: shown }" @click.self="askClose">
      <div class="askb" role="alertdialog" :aria-label="asking.title"><b>{{ asking.title }}</b><div v-if="asking.text" class="sm">{{ asking.text }}</div>
        <div class="askf"><button type="button" class="btn o s" @click="askClose">{{ t("txw.cancel") }}</button><button ref="yes" type="button" class="btn s" :class="{ r: asking.danger }" @click="askYes">{{ asking.yes || t("txw.yes") }}</button></div>
      </div>
    </div>
  </Teleport>
</template>
