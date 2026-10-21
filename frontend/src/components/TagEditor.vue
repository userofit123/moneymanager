<script setup>
// The tag editor: the tags as chips with ×, and a box to type more with a list of existing tags under it.
// A copy of the current app's tagEd / tagSug / tagCommit / tagRemove and their key handlers (web/js/04-transactions.js):
// ↓/↑ pick from the list, Enter or "," adds (several at once with commas), Backspace in an empty box removes the last tag,
// Escape hides the list, and leaving the box adds what was typed (unless commitOnBlur is off, as for a rule not added yet).
// The parent changes the data: "add" gives the new tags (spelled like the tags already in use), "remove" the chip's index,
// "go" a tag that was clicked. take() hands over (and clears) what is typed but not added yet.
import { ref, computed, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { allTags, tagSuggest } from "../lib/categories.js";
import { escLayer } from "../core/layers.js";

const props = defineProps({ tags: { type: Array, default: () => [] }, all: { type: Array, default: null }, commitOnBlur: { type: Boolean, default: true } });
const emit = defineEmits(["add", "remove", "go"]);
const { t } = useI18n();
const text = ref(""), open = ref(false), hi = ref(-1), inp = ref(null), sug = ref(null);
const known = computed(() => props.all || allTags(data.state.value));
const S = computed(() => tagSuggest(known.value, props.tags, text.value));
const picks = computed(() => [...S.value.items.map(([g]) => g), ...(S.value.create ? [S.value.create] : [])]);
const norm = (v) => { v = String(v).trim().replace(/^#+/, ""); if (!v) return ""; const e = known.value.find(([g]) => g.toLowerCase() == v.toLowerCase()); return e ? e[0] : v; };
const list = (v) => String(v).split(",").map(norm).filter(Boolean);
function commit(v) { const L = list(v); if (L.length) emit("add", L); }
function take() { const L = list(text.value); text.value = ""; return L; }
defineExpose({ take, focus: () => inp.value?.focus() });

escLayer(() => open.value && picks.value.length > 0, () => { open.value = false; });
const show = () => { open.value = true; hi.value = -1; };
function move(d) {
  const n = picks.value.length; if (!n) return;
  hi.value = Math.max(0, Math.min(n - 1, hi.value + d));
  nextTick(() => sug.value?.querySelectorAll(".tpick")[hi.value]?.scrollIntoView({ block: "nearest" }));
}
function key(e) {
  if (e.key == "ArrowDown") { e.preventDefault(); move(1); }
  else if (e.key == "ArrowUp") { e.preventDefault(); move(-1); }
  else if (e.key == "Enter" || e.key == ",") { e.preventDefault(); e.stopPropagation(); const v = hi.value >= 0 && picks.value[hi.value] != null ? picks.value[hi.value] : text.value; text.value = ""; hi.value = -1; commit(v); }
  else if (e.key == "Backspace" && !text.value) { if (props.tags.length) emit("remove", props.tags.length - 1); }
}
function pick(g) { text.value = ""; hi.value = -1; commit(g); }
function blur() {
  const v = text.value;
  setTimeout(() => { if (document.activeElement !== inp.value) open.value = false; }, 150);
  if (v.trim() && props.commitOnBlur) { text.value = ""; commit(v); }
}
</script>

<template>
  <div class="tbox">
    <div class="tcs">
      <span v-for="(g, i) in tags" :key="g + i" class="tchip"><span class="catl" @click="emit('go', g)">{{ g }}</span><button type="button" class="tx2" :aria-label="t('activity.removeTag')" @click="emit('remove', i)">×</button></span>
      <input ref="inp" v-model="text" class="tin" :placeholder="tags.length ? t('activity.addMore') : t('activity.addTag')" autocomplete="off" @focus="show" @input="show" @keydown="key" @blur="blur" />
    </div>
    <div ref="sug" class="tsug" :hidden="!open || !picks.length">
      <button v-for="([g, n], i) in S.items" :key="g" type="button" class="tpick" :class="{ hi: hi == i }" @mousedown.prevent="pick(g)"><span>{{ g }}</span><small>{{ n }}</small></button>
      <button v-if="S.create" type="button" class="tpick new" :class="{ hi: hi == S.items.length }" @mousedown.prevent="pick(S.create)">{{ t("activity.createTag", { tag: S.create }) }}</button>
    </div>
  </div>
</template>
