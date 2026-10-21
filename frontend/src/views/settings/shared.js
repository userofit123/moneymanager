// What every section of Settings uses. The calls to the server, the toasts and saving now live in the app's core
// (core/http.js, core/toast.js, stores/data.js); these names are kept so the panes read the same.
import { data } from "../../stores/data.js";
export { sendJson } from "../../core/http.js";
export { toasts, toast, toastErr, dismissToast, clearToast } from "../../core/toast.js";

// A call to the server (after any unsaved change is saved). Throws an Error with the server's own message when it says no.
export const api = (path, opt) => data.api(path, opt);

// edit(copy) changes the copy and returns a list of change-history lines [[action, detail, undo?], ...] (or false to stop).
export async function changeState(edit) {
  if (!data.state.value) return false;
  data.change(edit);
  return true;
}
