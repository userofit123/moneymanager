# Plan: Reports and payments for people who work for themselves

Status: planned, not started.

A new page that lists what you must report or pay (VAT, income tax, National Insurance, a yearly statement and so on), when it is due, how much goes in it from your own money in the app, and which receipts or invoices are still missing. In the end it gives you everything for one report as a zip file.

The app only reads and reminds. It never sends a report or pays anything.

## Agreed behaviour

**The person builds each report item** (nothing is built in for one country). One form, one item per thing to report or pay:

1. **Name**: for example "VAT report".
2. **Repeats**: every month, every 2 months, every 3 months, every year, or set dates (for example 15 Apr, 15 Jun, 15 Sep, 15 Jan).
3. **Covers**: the period before the due date (the 2 months before, the quarter before, last year).
4. **Date I want to do it**: a day of the month (a reminder, can be passed).
5. **Last day**: the day that can't be passed.
6. **Move this one date**: change a single date (for example an extension) without changing the repeat.
7. **What goes in**:
   - Money in: chosen categories (for example "Freelance income"), and optionally salary.
   - Money out: chosen categories (for example "Business expenses").
   - Optional: only some tags, and single transactions added or left out by hand.
   - Money back in a money-out category makes that category's total smaller.
8. **Papers needed**: for money in and for money out separately: none, receipt, or invoice, optionally only **over an amount**, with an optional note to check (for example "invoices over ₪5,000 need an allocation number").
9. **Amount** (optional), one of:
   - total money in / total money out / money in minus money out;
   - a % of one of those (for example the income tax advance);
   - VAT: **"amount includes VAT"** takes VAT out of the total (₪1,180 holds ₪180 at 18%), money in VAT minus money out VAT;
   - **an amount I enter** (for example the National Insurance advance);
   - **a % per tag** for expenses that count only in part (for example "car: 2/3").
10. **Only when**:
    - **your business type** (a choice set once, with a **from date** so it can change in the middle of a year), and/or
    - **a total in the app**: "money in this year is over ₪122,833". The app warns when it gets close and shows the items that now apply.
11. **Report with nothing in it**: the item still shows (for example "nothing came in, still send a zero report").
12. **Done**: each period is marked sent and/or paid (with the amount paid). Goes into the change history and can be undone.

**Business type**: a list the person keeps (for example patur, murshe, micro, or anything else), set in the page's settings, with the date each one started.

**The page**:
- Upcoming list first: what is next, its last day, its amount, and "3 papers missing".
- A calendar of the dates (month view).
- Opening an item shows its period: the totals, the transactions in it, the missing papers (each with a button to attach a file), and Done.
- **Export one period** as a zip: a summary (PDF or CSV: totals and the list of transactions) plus every attached file.

**Words on the page** (plain, en + he):
- Amounts are an estimate from the money in the app. Check with your accountant or the tax site.
- The app counts money on the day it reached the bank. VAT goes by the invoice date, so the two can differ.
- Yearly income tax with its tax steps is not calculated. The page shows the totals the report needs.

## Examples the form must be able to build (Israel, 2026)
- **Patur turnover statement**: every year, covers last year, last day 31 Jan, money in "Freelance income", amount = total money in, only when type is patur.
- **Patur limit check**: only when money in this year is over ₪122,833 (warns near it).
- **VAT report (murshe)**: every 2 months, last day the 15th (19th online), money in + money out, papers: invoice for money out, amount = VAT, amount includes VAT, % per tag for car/phone, zero report shows, only when type is murshe.
- **Income tax advance**: every month or 2 months, amount = % of money in.
- **National Insurance advance**: every month, amount I enter.
- **Micro business short report**: every year, last day 31 Mar, money in only, papers for money out: none.
- **Yearly report (1301)**: every year, money in + money out split by tags, plus salary.
- **US estimated tax**: set dates 15 Apr / 15 Jun / 15 Sep / 15 Jan, amount = (money in − money out) × your %.

## Findings
- Money coming in is already marked income / salary / money back (`lib/moneyIn.js`, `lib/txrows.js`); the money-back case is used for item 7.
- Each transaction holds its files in `docs` / `docIds`; tags in `tags`.
- No zip library in the app. The server only has `zlib` (gzip, `server/src/backup.js`). Needs a small zip writer (files stored without compression is enough: receipts are already PDFs and images) or a small dependency.
- There is already a `/reports` page (charts), so the new page uses its own route (for example `/taxes`).
- Repeating dates: check `lib/bills.js` for a helper to reuse before writing a new one.

## Design (every part of the page)
- **Every step with a screen (3–8) is designed with the design skills**, never styled by hand:
  - `impeccable` (`.claude/skills/impeccable`): plan the screen before building (`shape`), then `critique` and `polish` after. Its `init`/`document` step first writes a `DESIGN.md` from the app as it is today (colours, spacing, cards, lists, windows, icons), so the skill designs to match the app, not a new look.
  - `emil-design-eng` (`.claude/skills/emil-design-eng`): the small details: press and hover states, opening and closing windows, tooltip timing, motion.
  - `frontend-design` as before.
- **Matches the app**: reuses the existing cards, lists, chips, `BaseSheet`/`BaseDialog`, `PopMenu`, `MoneyInput`, tokens and icons. Each new part is compared in a screenshot with a neighbour page (Bills, Jars) before it is done.
- **Checked** in English and Hebrew (right to left), at desktop and phone width, light and dark.
- Every helper brief for these steps says this.

## Steps (each committable on its own)
0. **Design groundwork.** Run `impeccable` setup and write `DESIGN.md` (and `PRODUCT.md`) from the current app. No screen changes.
1. **Calculations (no screen).** `lib/` module: the dates of each item (repeat, covers, moved dates), the transactions in a period (categories, tags, kinds, added/left out), the totals, the amount (all kinds in item 9), missing papers, "only when". Tests for each, including the examples above.
2. **Saving.** Report items, business types and done periods in the saved data through `data.change()`, with history lines and their Hebrew in `core/heSaved.js`; server keeps the new fields.
3. **The form.** Add/edit window (`components/forms/`), en + he texts.
4. **The page.** Upcoming list, item period view with missing papers and Done, empty state with the ready-made examples (add with one tap, then change). Route, texts, help, changelogs.
5. **Calendar.** Month view of the dates on the page.
6. **Warnings.** Near/over a money-in limit and an item's last day coming up, as alerts (`lib/alerts.js`).
7. **Export.** Zip of one period: summary + attached files.
8. **Phone page**, based on the desktop blocks.

## Decided
- **Page name:** "Taxes and reports" / "מיסים ודיווחים".
- **Ready-made examples:** the Israel and US examples above are offered as items you add with one tap and then change (step 4, in the empty state and the add menu). They are a starting point only; once added, they are ordinary items.

## Open questions
- None.
