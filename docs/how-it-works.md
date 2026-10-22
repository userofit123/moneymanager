---
title: How it works
description: What Money Manager does behind the scenes: sync, duplicates, transfers, bills, budgets, jars, the forecast and your change history. The details behind the screens.
---

# How it works

The details behind the screens. You do not need to read this to use the app. It is here for when you wonder *why* a number is what it is. The pages themselves also explain their numbers when you point at them.

**The idea in one paragraph:** the app reads your accounts, keeps its own copy, and builds everything else (categories, bills, budgets, jars, the forecast) from that copy. It never writes anything to a bank. Because it does the sorting itself, it also tells you what it is unsure about, and every change it makes is written to a history you can read and mostly undo.

## Data flow
- The app loads `GET /api/state` and saves edits with `PUT /api/state` a moment after each change. If a sync changed the data in between, the server answers 409 and the app takes the newer copy and asks you to repeat the change. Other open windows and devices get the change within a second (`/api/events`).
- **Change history and Undo:** every change is written to the change history (Settings → Change history) with what it replaced, so almost any change can be undone, from the "Saved" message or from the history. Deleting transactions cannot be undone.
- **Upkeep after every change:** the app finds transfers between your own accounts and repeating bills, applies your category rules, pays from jars linked to a category and keeps the amount held back for this month up to date.
- **Offline:** the service worker keeps the app and the last data on the device; without a connection the app opens read-only with a banner.
- **Sync:** Wise balances via its API, bank and card transactions via the scraper, then dedupe (never imported twice), conversion at the transaction date's rate (stored on the row), category and tag rules (never overwriting manual ones), transfer pairing, balance snapshots and gaps.
- **Several logins and cards:** each login is a connection (`wise`, `wise~2`, …) with an optional nickname ("Wise · Business"). One login holding several cards or bank accounts gets one account per card ("Max ·· 1234") with its own balance. A login with one card keeps the plain name. Only accounts that are connected, imported or hand-entered appear.
- **Missing money:** a balance that moved without a transaction becomes a gap in Activity → Needs review. Clear it by adding the transaction, importing the Wise CSV (merges with hand-entered rows), recording a small charge as a fee, or marking it reviewed with a note.
- **Credit card bills are not counted twice.** A payment from the bank to a card you have connected is shown as a *card payment* and left out of spending, income, reports and the forecast, because the purchases are already counted on the card.
- **Forecast:** positive amounts are income and negative ones are expenses, whatever the category. It averages complete months that have data; an income source counts from the month it first appears. The page states what it used and warns when a month has no income (usually incomplete history).
- **Bills:** recurring (a rhythm is found automatically), irregular (every payment to a store is a bill even if it does not repeat), or a one-off (one marked payment). Mark any payment from its details in Activity.
- **Budgets** are proposed from your real spending in the last three complete months and only created when you accept them.
- **Jars** fill from your real balance (minus what is already in jars and an optional buffer), in priority order; every fill is recorded per jar and month. A bill jar is refilled to its target.
- **Wise:** balances come from the API. Balance statements are refused for personal tokens in most regions (PSD2), so the app falls back to Wise's activity list. Test connection says which one your token gets.
- **History:** the first sync reads the period set in Settings → Connections (up to 5 years): the app asks the bank for that much and keeps whatever the bank still has, usually 1 to 2 years. **Import history** on a connection does the same on demand. Existing rows are matched, not duplicated.
- **Alerts:** shown in the app; sync failures, new gaps and gaps older than 3 days are also pushed to ntfy, a Telegram bot or a webhook if you set one up.

## Appearance
Light, dark or automatic; an atmosphere (built-in colour sets or your own colour); a background (glow, mesh, diagonal, spotlight, flat); a texture; a surface (solid, glass, outline, raised, static); corners; density (space inside blocks) and spacing (space between blocks); font; and the app icon symbol.

**Glass** gives every block a blur of what is behind it (*Blur*), a colour boost (*Vibrance*) and a translucent fill (*Opacity*). It is the heaviest effect for the graphics card; if the app feels slow, switch the surface back to Solid.

## Updates
The Windows and Linux apps use electron-updater against this repository's GitHub releases (public). The Docker app polls the GitHub API and shows the commands to run. See [Updating](updating.md).
