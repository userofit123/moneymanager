<script setup>
// Settings → Profile. A copy of the current app's Profile section (web/js/09-profile-export-settings.js profFields, renderProfile, profSave;
// web/js/08-jars.js profClear): name, age, gender and what matters most, all optional, kept in the user's own data (cfg.profile).
import { ref, computed, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import SetHead from "./SetHead.vue";
import ProfileFields from "../../components/ProfileFields.vue";
import { changeState, toastErr } from "./shared.js";
import { profAge, profRead } from "./profile.js";

const { t } = useI18n();
const tk = (k) => t("settings.prof." + k);
const S = computed(() => data.state.value);
const root = ref(null);
const form = ref({ name: "", age: "", gender: "", goal: "" });
const fill = () => {
  const p = (S.value && S.value.cfg && S.value.cfg.profile) || {};
  form.value = { name: p.name || "", age: profAge(p) || "", gender: p.gender || "", goal: p.goal || "" };
};
onMounted(() => { data.start(); fill(); });
// Like the current app, a change that arrives while you are typing here does not replace what you typed.
watch(() => JSON.stringify(S.value && S.value.cfg && S.value.cfg.profile), () => {
  if (root.value && root.value.contains(document.activeElement) && document.activeElement.matches("input,select")) return;
  fill();
});

async function save() {
  const n = profRead(form.value);
  try { await changeState((s) => { s.cfg = s.cfg || {}; s.cfg.profile = n; return [["Updated profile", n.name ? n.name : "no name"]]; }); } catch (e) { toastErr(e); }
  fill();
}
async function clear() {
  if (!confirm(tk("clearAsk"))) return;
  try { await changeState((s) => { s.cfg = s.cfg || {}; s.cfg.profile = { asked: 1 }; return [["Cleared profile", ""]]; }); } catch (e) { toastErr(e); }
  fill();
}
</script>

<template>
  <div ref="root" id="setProf">
    <div class="card ss">
      <SetHead icon="user" :title="tk('title')" :desc="tk('desc')" />
      <div class="ssb p">
        <ProfileFields v-model="form" prefix="pf" />
        <div class="flex" style="justify-content:flex-end;gap:10px"><button type="button" class="btn o" data-a="profClear" @click="clear">{{ tk("clear") }}</button><button type="button" class="btn" data-a="profSave" @click="save">{{ tk("save") }}</button></div>
      </div>
    </div>
  </div>
</template>
