<script setup>
// The current app's pop-up window: a .scrim behind and a .sheet with a grab bar (web/js/03-bills-home.js openSheet), styled by styles/legacy.css.
// Escape or a click on the scrim closes it. "cls" adds the old modifier classes, such as "txw" for the wide transaction window.
import { onMounted, onBeforeUnmount } from "vue";
defineProps({ cls: { type: String, default: "" } });
const emit = defineEmits(["close"]);
const esc = (e) => { if (e.key === "Escape") { e.stopPropagation(); emit("close"); } };
onMounted(() => document.addEventListener("keydown", esc, true));
onBeforeUnmount(() => document.removeEventListener("keydown", esc, true));
</script>

<template>
  <Teleport to="body">
    <div class="scrim on" @click="emit('close')"></div>
    <div class="sheet on" :class="cls" role="dialog" aria-modal="true"><div class="grab"></div><slot /></div>
  </Teleport>
</template>
