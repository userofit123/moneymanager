<script setup>
// New jar or goal, or edit a jar (jarNewOpen/jarEditOpen in web/js/08-jars.js), from anywhere: the + button, Jars, Home.
// id: the jar to edit (0 for a new one); start: what the form starts with (jarFormOf(jar) when editing).
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { jars } from "../../core/derived.js";
import { saveJar, jarCtx } from "../../views/jars.js";
import { fm } from "../../lib/bills.js";
import { toast } from "../../core/toast.js";
import { useFormSheet } from "../../core/useFormSheet.js";
import JarForm from "../../views/JarForm.vue";

const props = defineProps({ id: { type: Number, default: 0 }, start: { type: Object, default: () => ({ kind: "goal" }) } });
const emit = defineEmits(["close"]);
const { open, close } = useFormSheet(emit);
const { t } = useI18n();
const S = computed(() => data.state.value);
function save(f) {
  const ctx = jarCtx(jars.value, fm);
  const res = saveJar(structuredClone(S.value), props.id, f, ctx);
  if (res.err) { toast(t("jars.form.e." + res.err), { kind: "err" }); document.getElementById("nj" + (res.field || "").toUpperCase())?.focus(); return; }
  close();
  data.change((next) => { const r = saveJar(next, props.id, f, ctx); return r.logs.length ? r.logs : false; });
}
const setOpen = (v) => { if (!v) close(); };
</script>

<template>
  <JarForm :open="open" :S="S" :M="jars" :id="id" :start="start" @update:open="setOpen" @save="save" />
</template>
