// For a window shown by FormHost: it opens at once and, when closed, fades out before FormHost removes it.
import { ref } from "vue";
export function useFormSheet(emit) {
  const open = ref(true);
  const close = () => { if (!open.value) return; open.value = false; setTimeout(() => emit("close"), 240); };
  return { open, close };
}
