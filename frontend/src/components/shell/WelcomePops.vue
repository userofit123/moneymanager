<script setup>
// After signing in: the "has been updated" window with what is new since the last visit then, once, "Make it yours"
// asking for the profile (core/welcome.js, shared with the phone). Styled as .wnp in styles/components/app-windows.css.
import { ref } from "vue";
import { escLayer } from "../../core/layers.js";
import { useWelcome } from "../../core/welcome.js";
import ProfileFields from "../ProfileFields.vue";

const { t, news, ask, form, closeNews, fullLog, skip, save } = useWelcome();
const box = ref(null);
escLayer(() => !!(news.value || ask.value), () => { if (news.value) closeNews(); else if (ask.value) skip(); });
</script>

<template>
  <Teleport to="body">
    <div v-if="news" id="updPop" ref="box" class="wnp" role="dialog" aria-modal="true" @click.self="closeNews()">
      <div class="wnc">
        <div class="wnh"><span class="wnu"><svg viewBox="0 0 24 24"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></svg></span>
          <div><h3>{{ t("upd.title") }}</h3><div class="sm"><span>{{ t("upd.nowOn") }}</span> ⁦{{ news.cur }}⁩</div></div></div>
        <div class="wnb"><template v-for="r in news.secs" :key="r.v"><div class="wnv"><template v-if="news.secs.length > 1"><span>{{ t("upd.version") }}</span> ⁦{{ r.v }}⁩</template></div><div v-html="r.html" /></template></div>
        <div class="wnf"><button class="btn o" @click="fullLog">{{ t("upd.fullLog") }}</button><button class="btn" @click="closeNews()">{{ t("upd.gotIt") }}</button></div>
      </div>
    </div>
    <div v-if="ask" id="profPop" class="wnp" role="dialog" aria-modal="true">
      <div class="wnc">
        <div class="wnh"><span class="wnu"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg></span>
          <div><h3>{{ t("upd.makeTitle") }}</h3><div class="sm">{{ t("upd.makeSub") }}</div></div></div>
        <div class="wnb"><ProfileFields v-model="form" prefix="pp" /></div>
        <div class="wnf"><button class="btn o" @click="skip">{{ t("upd.notNow") }}</button><button class="btn" @click="save">{{ t("upd.save") }}</button></div>
      </div>
    </div>
  </Teleport>
</template>
