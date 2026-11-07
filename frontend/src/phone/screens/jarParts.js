// What the phone's Jars and Jar screens share: the jar's ⋯ actions (the computer's ⋯ menu and its up/down arrows) and the
// questions asked before marking a jar as done or deleting it (the computer's confirm windows). J is useJars().
import { ask } from "../../core/ask.js";

const ICON = {
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
  up: '<path d="M6 15l6-6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>',
  done: '<path d="M5 12l5 5L20 7"/>', del: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  reopen: '<path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4"/>',
};

export function askDoneOf(J, id) {
  const { t, tx, fm } = J;
  J.askDone(id);
  const j = J.doneAsk.value; if (!j) return;
  ask(t("jars.done.title", { name: tx(j.n) }), t("jars.done.text") + (j.bal > 0 ? " " + t("jars.done.back", { amount: fm(j.bal) }) : ""), J.doDone, { yes: t("jars.markDone") });
}

function askDelOf(J, id) {
  const { t, tx } = J;
  J.askDel(id);
  const j = J.delAsk.value; if (!j) return;
  ask(t("jars.del.title", { name: tx(j.n) }), t("jars.del.text"), J.doDel, { danger: true, yes: t("jars.menu.del") });
}

// an open jar's actions: Edit, Move up, Move down, Mark as done, Delete
export function jarActions(J, j) {
  const { t, save, moveJar, M } = J;
  return [
    { label: t("jars.menu.edit"), icon: ICON.edit, run: () => J.openEdit(j.id) },
    ...(j.ix > 0 ? [{ label: t("jars.up"), icon: ICON.up, run: () => save((s) => moveJar(s, j.id, true)) }] : []),
    ...(j.ix < M.value.jars.length - 1 ? [{ label: t("jars.down"), icon: ICON.down, run: () => save((s) => moveJar(s, j.id, false)) }] : []),
    { label: t("jars.markDone"), icon: ICON.done, run: () => askDoneOf(J, j.id) },
    { label: t("jars.menu.del"), icon: ICON.del, danger: true, run: () => askDelOf(J, j.id) },
  ];
}
