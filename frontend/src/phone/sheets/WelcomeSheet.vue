<script setup>
// After signing in, in the phone app: what is new since the last visit, then, once, "Make it yours" asking for the
// profile. One sheet that shows each in turn (core/welcome.js, the same steps as the computer's windows).
// Closing it counts as "Got it" on what is new and as "Not now" on the profile.
import { computed } from "vue";
import { useWelcome } from "../../core/welcome.js";
import { openSettingsTab } from "../../views/settings/tab.js";
import ProfileFields from "../../components/ProfileFields.vue";
import PhoneSheet from "../components/PhoneSheet.vue";
import PIcon from "../components/PIcon.vue";

// "See everything that's new" opens What's new in Settings (the phone pushes it on the More tab)
const { t, news, ask, form, closeNews, fullLog, skip, save } = useWelcome({ openLog: () => openSettingsTab("rel") });
const open = computed({ get: () => !!(news.value || ask.value), set: (v) => { if (v) return; if (news.value) closeNews(); else if (ask.value) skip(); } });
const NEW = '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>';
const ME = '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>';
</script>

<template>
  <PhoneSheet v-model:open="open" :label="news ? t('upd.title') : t('upd.makeTitle')" :size="news ? 'large' : 'fit'" cls="ph-wn">
    <template #head>
      <div class="ph-wn-h">
        <span class="ph-tile" style="--tile: var(--acc)"><PIcon :svg="news ? NEW : ME" /></span>
        <div class="ph-wn-ht">
          <h2>{{ news ? t("upd.title") : t("upd.makeTitle") }}</h2>
          <p v-if="news"><span>{{ t("upd.nowOn") }}</span> ⁦{{ news.cur }}⁩</p>
          <p v-else>{{ t("upd.makeSub") }}</p>
        </div>
      </div>
    </template>
    <div v-if="news" class="ph-wn-b">
      <template v-for="r in news.secs" :key="r.v">
        <h3 v-if="news.secs.length > 1" class="ph-wn-v"><span>{{ t("upd.version") }}</span> ⁦{{ r.v }}⁩</h3>
        <div class="ph-wn-notes" v-html="r.html" />
      </template>
    </div>
    <div v-else-if="ask" class="ph-wn-b ph-wn-prof"><ProfileFields v-model="form" prefix="pp" /></div>
    <template #foot>
      <div class="ph-wn-f">
        <template v-if="news"><button type="button" class="ph-btn" @click="closeNews()">{{ t("upd.gotIt") }}</button><button type="button" class="ph-btn tonal" @click="fullLog">{{ t("upd.fullLog") }}</button></template>
        <template v-else><button type="button" class="ph-btn" @click="save">{{ t("upd.save") }}</button><button type="button" class="ph-btn tonal" @click="skip">{{ t("upd.notNow") }}</button></template>
      </div>
    </template>
  </PhoneSheet>
</template>
