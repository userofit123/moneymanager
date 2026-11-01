// A row that scrolls sideways fades out on the side that has more out of sight, so it never looks cut off at the edge.
// Gives the --fl / --fr fade sizes (left, right) for the row's mask; "on" is false when everything fits.
import { ref, onMounted, onBeforeUnmount, onActivated } from "vue";
export function useEdgeFade(el, size) {
  const fade = ref({}), on = ref(false);
  function edges() {
    const e = el.value; if (!e) return;
    const rtl = getComputedStyle(e).direction === "rtl", max = e.scrollWidth - e.clientWidth, s = Math.abs(e.scrollLeft);
    const start = s > 6, end = s < max - 6; // more out of sight on that side (a few px is only the row's own padding)
    on.value = max > 6;
    fade.value = { "--fl": (rtl ? end : start) ? size : "0px", "--fr": (rtl ? start : end) ? size : "0px" };
  }
  let ro = null;
  onMounted(() => { edges(); ro = new ResizeObserver(edges); ro.observe(el.value); });
  onActivated(edges);
  onBeforeUnmount(() => ro?.disconnect());
  return { fade, on, edges };
}
