// Attach files (receipts, invoices, photos) to a transaction: each file is sent to the server, then the transaction
// lists it (docs, docIds) in one change, with its history line and Undo. Used by the transaction window and the Taxes and
// reports page. Returns true when the files were attached; on a failed upload it shows a message and returns false.
import { data } from "../stores/data.js";
import { toast } from "./toast.js";
import { i18n } from "../i18n.js";

export async function attachDocs(x, files) {
  files = [...(files || [])];
  if (!x || !files.length) return false;
  try {
    const ups = [];
    for (const fl of files) ups.push(await data.api(`/api/transactions/${x.id}/documents`, { method: "POST", headers: { "x-filename": encodeURIComponent(fl.name), "content-type": fl.type || "application/octet-stream" }, body: fl }));
    data.change((S) => { const t2 = S.tx.find((y) => y.id == x.id); if (!t2) return false; t2.docs = [...(t2.docs || []), ...ups.map((u) => u.filename)]; t2.docIds = [...(t2.docIds || []), ...ups.map((u) => u.id)]; t2.docHas = [...(t2.docHas || []), ...ups.map(() => true)]; return [["Attached document", x.desc + ": " + ups.map((u) => u.filename).join(", ")]]; });
    return true;
  } catch { toast(i18n.global.t("activity.w.uploadFail"), { kind: "err" }); return false; }
}
