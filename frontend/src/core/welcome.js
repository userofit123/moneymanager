// What greets someone after signing in: the "has been updated" window with what is new since the last visit then, once,
// "Make it yours" asking for the profile. Used by the computer's windows (components/shell/WelcomePops.vue) and the phone's
// sheet (phone/sheets/WelcomeSheet.vue). openLog: how "See everything that's new" opens What's new in Settings.
import { ref, onMounted, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { whatsNew, markSeen } from "./updates.js";
import { toast } from "./toast.js";
import { go } from "../router.js";
import { openSettingsTab } from "../views/settings/tab.js";
import { profRead } from "../views/settings/profile.js";
import { sheetsOpen } from "./sheets.js";

export function useWelcome({ openLog = () => { openSettingsTab("rel"); go("/settings"); } } = {}) {
  const { t } = useI18n();
  const news = ref(null), ask = ref(false), form = ref({ name: "", age: "", gender: "" });

  function profileAsk() {
    const S = data.state.value;
    if (!S || (S.cfg && S.cfg.profile) || news.value || sheetsOpen()) return;
    ask.value = true;
    nextTick(() => document.getElementById("ppName")?.focus());
  }
  function closeNews(then) { if (news.value) markSeen(news.value.cur); news.value = null; setTimeout(then || profileAsk, 350); }
  const fullLog = () => closeNews(openLog);
  function skip() {
    ask.value = false;
    data.change((S) => { S.cfg = S.cfg || {}; if (!S.cfg.profile) S.cfg.profile = { asked: 1 }; return []; });
    toast(t("upd.later"), { kind: "info" });
  }
  function save() {
    const n = profRead(form.value);
    ask.value = false;
    data.change((S) => { S.cfg = S.cfg || {}; S.cfg.profile = n; return [["Updated profile", n.name ? n.name : "no name"]]; });
  }
  onMounted(async () => {
    news.value = await whatsNew(!!data.state.value?.tx?.length);
    // "Got it" is not focused: the loading screen may still hide the page, and a focus ring there would look odd
    if (!news.value) setTimeout(profileAsk, 500);
  });
  return { t, news, ask, form, profileAsk, closeNews, fullLog, skip, save };
}
