---
title: Sorting that does itself
description: How Money Manager gives your payments categories, tags and clearer names automatically: rules, the AI set-up helper, card payments and salary.
---

# Sorting that does itself

Reports, budgets and the forecast are only as good as the labels on your payments. Money Manager sorts them for you with **rules** you write once. You never have to touch the same shop twice.

Everything is in **Settings → Automatic sorting**, in six sections.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="screenshots/settings-sorting-dark.webp">
  <img alt="Settings, Automatic sorting: a rule says if the description contains a text, use this category" src="screenshots/settings-sorting-light.webp">
</picture>

> **Note** A category or name you set **by hand** is never changed by a rule. The rules only fill in what is empty.

## The words

- A **category** is the main label of a payment, one per payment: Groceries, Rent, Eating out.
- A **tag** is an extra label, as many as you like: *streaming*, *holiday*, *work*.
- A **rule** says: *if the description contains this text, then…*

## 1. Set up with an AI (the quick start)

The app comes **without** a ready-made list of categories and rules, because yours are different. To get started fast:

1. Open **Settings → Automatic sorting → Set up with an AI**.
2. **Download the file** of the names in your transactions. It holds only the names (shops and payers), how often each appears, and whether money went out or came in. **No amounts, no dates, no account numbers.**
3. **Copy the instructions** into any AI chat you already use (it goes to the AI company you choose, not to us), attach the file, and paste the answer back.
4. You first see a **table to check**, with a checkbox on every row: categories, category rules, tag rules, display names, card payments and salary. **Nothing is added until you agree.** Entries you sorted yourself keep their category, and **Undo** works.

Your existing categories, rules and tags stay as they are.

## 2. Category rules

A rule says: *if the description contains this text, use this category.* The **first rule that matches wins**.

To add one: type the text, choose a category, and press **Add rule**. You can edit the text or the category of existing rules in place, or press **Delete**.

> **Example** If the description contains `shufersal`, the category is **Groceries**.

## 3. Tag rules

Works like a category rule, but it **adds one or more tags** on top of the category. When you add a rule, the app can also tag the payments you already have. A rule needs at least one tag.

> **Example** `netflix` adds the tag `streaming`.

## 4. Display names

Banks write names like `WOLT*TLV 8842 IL`. A display-name rule gives an entry a clearer name. **Only what you see changes**: the bank's own text, your rules and your reports still use the original.

Choose where to look (**Anything**, **Description**, **Memo** and so on), **contains** or **is exactly**, the text, and the name to show.

## 5. Card payments

When you pay a credit card bill from your bank, that line is **not counted as spending**, because each purchase is already counted on the card. Otherwise everything would be counted twice.

The usual card companies are recognised with no rule. If your bank writes something unusual, add a text here and every bank line that contains it is treated as a card bill.

## 6. Salary

Income that contains the text (in the description or the payer) is marked **Salary** when it has no category yet. Income that says *salary* or *payroll*, and the same payer paying a similar amount every month, are recognised without a rule.

## Categories and tags page

Under **Categories and tags** in the menu you can see where your money goes per category and per tag, add a category, rename one (if the new name already exists, the two merge) or delete one. **Deleting never deletes payments.**

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="screenshots/categories-dark.webp">
  <img alt="Categories and tags: money out, money in and a usual month for each category" src="screenshots/categories-light.webp">
</picture>

## Fixing one payment

You do not have to write a rule for everything. In **Activity**, change the **Category** straight from the row. If the payment had no category, the app offers to make a rule, so the next ones are sorted by themselves.

## Bills, transfers and duplicates are found by themselves

These need no rules at all:

- **Bills:** when the same store charges you at a regular rhythm for a similar amount, it becomes a bill.
- **Transfers between your own accounts:** money that leaves one account and arrives in another within a few days is paired and not counted as spending or income. If less arrived than left, the difference is counted as an expense called *Fees & FX costs*.
- **Duplicates:** the same payment is never imported twice. If the same amount, store and day shows up twice, it is offered to you in **Needs review**.

Details in [How it works](how-it-works.md).
