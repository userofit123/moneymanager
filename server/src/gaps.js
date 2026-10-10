// Actions on a balance gap. There is no "ignore": a gap is explained, recorded as a charge, or marked reviewed with a note.
import { tx, audit, bumpRev } from "./db.js";
import { rateOn } from "./fx.js";

export async function recordGap(id, action, body) {
  return tx(async (c) => {
    const g = (await c.query(
      "SELECT g.*, a.name, a.currency FROM balance_gaps g JOIN accounts a ON a.id=g.account_id WHERE g.id=$1 AND g.status='open' FOR UPDATE", [id])).rows[0];
    if (!g) return null;
    if (action === "review") {
      const note = String(body.note || "").trim();
      if (!note) throw new Error("a note is required to mark a gap as reviewed");
      await c.query("UPDATE balance_gaps SET status='reviewed', review_note=$2 WHERE id=$1", [id, note]);
      await audit(c, "Gap reviewed", `${g.name} ${g.currency}: ${Math.abs(g.remaining)} · ${note}`, "You");
    } else if (action === "record") {
      if (g.remaining >= 0) throw new Error("only money that left can be recorded as a charge");
      const today = new Date().toISOString().slice(0, 10);
      const rate = await rateOn(g.currency, today);
      const foreign = g.currency !== "ILS";
      const amt = Math.abs(g.remaining);
      await c.query(
        `INSERT INTO transactions (date,description,from_name,to_name,amount,orig_currency,orig_amount,rate,category,note,source,gap_explained)
         VALUES ($1,'Unrecorded charge (balance gap)',$2,'Bank',$3,$4,$5,$6,'Fees & FX costs','Recorded to make the books match the balance','manual',$7)`,
        [today, g.name, -(+(amt * rate).toFixed(2)), foreign ? g.currency : null, foreign ? -amt : null, rate, g.remaining]);
      await c.query("UPDATE balance_gaps SET remaining=0, status='cleared' WHERE id=$1", [id]);
      await audit(c, "Gap recorded as charge", `${g.name} ${g.currency}: ${amt} recorded as an unrecorded charge`, "You");
    } else throw new Error("unknown action");
    await bumpRev(c);
    return { ok: true };
  });
}
