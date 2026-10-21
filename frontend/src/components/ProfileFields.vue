<script setup>
// The profile fields (name, age, gender, what matters most), all optional: in Settings → Profile and in the "Make it yours" window
// (profFields in web/js/09-profile-export-settings.js). v-model is { name, age, gender, goal }; prefix keeps the ids apart.
import { useI18n } from "vue-i18n";
import { PF_GENDER, PF_GOAL } from "../views/settings/profile.js";
const model = defineModel({ type: Object, required: true });
defineProps({ prefix: { type: String, default: "pf" } });
const { t } = useI18n();
const tk = (k) => t("settings.prof." + k);
</script>

<template>
  <div class="fld"><label :for="prefix + 'Name'">{{ tk("name") }}</label><input :id="prefix + 'Name'" v-model="model.name" maxlength="40" autocomplete="off" :placeholder="tk('namePh')"><div class="sm">{{ tk("nameHint") }}</div></div>
  <div class="two">
    <div class="fld"><label :for="prefix + 'Age'">{{ tk("age") }}</label><input :id="prefix + 'Age'" v-model="model.age" type="number" inputmode="numeric" min="10" max="110" :placeholder="tk('agePh')"><div class="sm">{{ tk("ageHint") }}</div></div>
    <div class="fld"><label :for="prefix + 'Gender'">{{ tk("gender") }}</label><select :id="prefix + 'Gender'" v-model="model.gender"><option v-for="[k, l] in PF_GENDER" :key="k" :value="k">{{ tk(l) }}</option></select><div class="sm">{{ tk("genderHint") }}</div></div>
  </div>
  <div class="fld"><label :for="prefix + 'Goal'">{{ tk("goal") }}</label><select :id="prefix + 'Goal'" v-model="model.goal"><option v-for="[k, l] in PF_GOAL" :key="k" :value="k">{{ tk(l) }}</option></select><div class="sm">{{ tk("goalHint") }}</div></div>
</template>
