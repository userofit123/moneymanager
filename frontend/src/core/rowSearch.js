// The search box above a list of rules or tiles (Categories page, Settings → Automatic sorting):
// it hides the rows (.rule, .mrow) whose words do not contain what is typed, case ignored.
// What is typed is kept per list in `searches`, so it stays while you move around the app.
import { ref, reactive, watch, onMounted, onUpdated, nextTick } from "vue";

export const searches = reactive({});

// root: the element holding the list; key: which search box. Gives back the search that found nothing ("" when fine).
export function useRowSearch(root, key) {
  const none = ref("");
  function apply() {
    const el = root.value; if (!el) return;
    const q = (searches[key] || "").trim().toLowerCase(); let n = 0, tot = 0;
    el.querySelectorAll(".rule,.mrow").forEach((r) => {
      tot++;
      // the shown choice of each list is part of the row's words; the tag suggestions and the other choices are not
      const skip = [...r.querySelectorAll(".tsug"), ...r.querySelectorAll("select")].map((s) => s.textContent);
      const words = skip.reduce((w, x) => (x ? w.replace(x, " ") : w), r.textContent) + " " + [...r.querySelectorAll("input,select")].map((i) => (i.tagName == "SELECT" ? (i.options[i.selectedIndex] ? i.options[i.selectedIndex].text : "") : i.value)).join(" ");
      const hit = !q || words.toLowerCase().includes(q);
      r.hidden = !hit; if (hit) n++;
    });
    const v = q && tot && !n ? (searches[key] || "").trim() : "";
    if (none.value !== v) none.value = v;
  }
  onMounted(() => nextTick(apply));
  onUpdated(apply);
  watch(() => searches[key], () => nextTick(apply));
  return none;
}
