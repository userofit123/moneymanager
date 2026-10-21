// What the data store tells the person while saving (saved, not saved, offline, a sync changed the data first), as toasts.
// Each message names what changed and has an Undo button.
import { i18n } from "../i18n.js";
import { data } from "../stores/data.js";
import { toast, clearToast } from "./toast.js";
import { tx } from "./heText.js";

const t = (...a) => i18n.global.t(...a);
let queue = [], timer = null;
data.hooks.notify = (kind, o = {}) => {
  if (kind === "saved") {
    // changes made together show as one message
    queue.push(...o.entries); clearTimeout(timer);
    timer = setTimeout(() => {
      const m = queue; queue = [];
      if (!m.length) return;
      const e = m[0], one = m.length === 1;
      toast(one ? (e.detail ? tx(e.detail) : t("save.saved")) : t("save.nSaved", { n: m.length }), { title: one ? tx(e.action) : t("save.saved"), undo: one && e.undo ? () => data.undo(e) : null });
    }, 40);
  } else if (kind === "stale") toast(t("save.stale"), { kind: "info" });
  else if (kind === "savefail") toast(t("save.fail"), { kind: "err", title: t("save.failTitle"), sticky: "savefail" });
  else if (kind === "offline") toast(t("save.off"), { kind: "info", title: t("save.offTitle"), sticky: "offline" });
  else if (kind === "filled") toast(t("save.filled", { n: o.n }, o.n), { title: t("save.jars") });
  else if (kind === "clear") { clearToast(o.key); clearToast("offline"); }
};
