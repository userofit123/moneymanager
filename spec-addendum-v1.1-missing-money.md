# Spec addendum v1.1: Missing money and missing transactions

Applies on top of the final specification (v1.0), section 4.9 (balance check) and the Wise source in section 2.

## Why
Wise gives the app a live balance but no transaction list (personal accounts cannot read statements over the API). The same can happen with any source that is late or incomplete. The app must therefore notice when the balance moved without a matching transaction, say so clearly, and let me fix it by adding the transaction by hand or by importing the CSV.

## How it works
1. **Snapshots.** On every sync the app stores the balance of each account and currency (for example Wise USD and Wise ILS) with the time it changed.
2. **Expected balance.** Expected = the last known balance + the transactions imported since then.
3. **Gap.** Gap = actual balance − expected balance, in the original currency, with a ₪ equivalent.
   - Actual is lower than expected: **missing money out** ("money left, no transaction yet").
   - Actual is higher than expected: **missing money in** ("money arrived, no transaction yet").
4. **Display.** Each gap is a card in Activity → Needs review, and an alert with a badge. It shows the account, the amount, the direction and the time window it happened in (between the previous and the current snapshot).
5. **Net worth stays correct.** Net worth and balances always use the real balance from the source. A gap only means income, expenses and category reports are incomplete until it is explained.

## Ways to clear a gap
- **Add the transaction by hand.** The form opens pre-filled with account, currency, direction, amount and the date window. I add the description, category, tags, note and a receipt or invoice. When it is saved the gap shrinks by that amount and disappears at zero.
- **Partial amounts.** If I explain only part of a gap, the remainder stays open.
- **Import the Wise CSV.** The imported rows are matched against open gaps and clear them automatically. If I had already added the transaction by hand, the app recognises it (same account, same amount, date within 1 day) and merges the two. The CSV row wins for amount, date and description; my category, tags, note and documents are kept.
- **Record as an unrecorded charge.** For small unexplained amounts (a fee), one tap records them as an expense in "Fees & FX costs".
- **Currency conversion inside Wise.** A drop in the USD balance and a rise in the ILS balance within the same window are suggested as one "conversion" with the cost shown, the same way transfers between accounts are handled.
- **No silent hiding.** A gap can only be cleared by explaining it. There is no "ignore" button. I can mark it "reviewed" with a note, and that is written to the audit log.

## Rules
- Gaps are measured per account and currency, so a USD gap is never mixed with an ILS gap.
- Every action (gap created, transaction added, gap cleared, merged with CSV) is written to the audit log and can be undone where possible.
- The same engine replaces the current "balance check" for Hapoalim, Max, Isracard and Wise, so every source gets the same treatment.
- Sync frequency for balances: every few hours. **[OPEN]** check Wise's API rate limits before choosing the interval.
- An alert is raised when a gap is older than a chosen number of days (default 3).

## Example
| Time | What happens | App shows |
|---|---|---|
| Mon | Wise USD balance: $318.47 | Nothing |
| Wed | Balance is $268.47, no transaction | Missing money out: $50.00 on Wise USD, between Mon and Wed |
| Wed | I add "Figma subscription", $50, category Subscriptions, with the receipt | Gap cleared |
| Month end | I import the Wise CSV | The CSV row replaces my entry, keeping my category and receipt |

## Tests
- A balance drop with no transaction creates a missing-out gap with the right currency and window.
- A balance rise with no transaction creates a missing-in gap.
- Adding a transaction for the exact amount clears the gap; adding a smaller one leaves the remainder.
- Importing a CSV row that matches a hand-entered transaction merges them without duplicating the amount and keeps my category, note and documents.
- A USD drop with an ILS rise in the same window is suggested as a conversion, with the cost.
- A gap older than the alert limit raises an alert.
