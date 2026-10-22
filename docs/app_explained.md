# Money app: Explained in plain language

This guide explains what the app does and how it thinks. The original plan is in the [specification](finance_app_spec_final.md); how each part behaves in detail is in [How it works](HOW_IT_WORKS.md).

## 1. What it is
One private place that shows all of your money: your Israeli banks and cards, Wise and your pension. It only reads. It cannot move money or change anything at a bank. It adds its own layer on top: categories, bills, budgets, savings jars, alerts and forecasts.

The goal is to do as much as possible by itself. It uses the data it already has to decide what is a bill, what is a transfer between your own accounts, what is a duplicate, and what is a real expense. It asks you only when it is unsure.

## 2. Two ways to run it
- **Windows app:** one installer. Everything stays on that computer; nothing to configure.
- **Linux app:** the same, as an AppImage, a .deb or an .rpm.
- **Docker:** for a laptop or home server. Same app, data in Docker volumes.

Either way the interface is the same, it works in English and Hebrew, and your data never leaves your own machine except to talk to your banks. See the README to install it.

## 3. The screens
- **Home.** Net worth (bank + Wise), with "With pension" underneath. Income, expenses and net for the month. Accounts, card charges coming up, this month against last month, upcoming bills, budgets, jars, exchange rates and recent activity. Anything that needs attention appears at the top.
- **Activity.** Every transaction. Tap one to set its category and tags, add a note, attach a receipt or invoice, and see its history. A "Needs review" tab lists transfers, duplicates and balance differences.
- **Jars.** Your virtual savings. Set how much money is available each month and jars fill in priority order. Jars with a deadline show whether you are on track.
- **Bills.** Every recurring charge, found automatically, with the predicted next amount.
- **Budgets.** A monthly limit per category.
- **Reports.** Net worth history, spending by category, income against expenses, trends, top merchants and tags.
- **Forecast.** Where your bank and Wise balance is heading over 3 months, 6 months and a year.
- **Alerts and Settings.** What needs attention, the rules that categorize automatically, the log of every change, and install options.

## 4. How the automatic parts work

### Categories
You create categories and write simple rules, such as "if the description contains Wolt, it is Eating out". The rules run on every new transaction and never overwrite something you set by hand. Tag rules work the same way (Settings → Tag rules): if the description contains the text, the transaction gets the tags, and when you add one the app offers to tag the transactions you already have. Anything unmatched waits in a review list.

### Bills
A store becomes a bill when it charges you at a regular rhythm (every month, every 2 months or once a year) for a similar amount. Groceries are not treated as bills because the timing is irregular.

The amount is always the real one. If next month's rent comes in lower, that amount replaces the old one, the change is flagged, and the next prediction uses it. For bills that vary, like electricity, the prediction is the average of the last three charges. A bill turns to "paid" when its charge arrives.

### Transfers and fees
When money leaves one of your accounts and arrives in another within a few days, the app recognises it as a transfer. The transfer is not counted as spending or income. If less arrived than left, the difference is the fee plus the exchange spread. It is counted automatically as an expense called "Fees & FX costs". Your total money stays correct, and the cost shows up in your reports.

Example: ₪1,500 leaves Hapoalim and $480 (about ₪1,466) arrives in Wise. The cost is ₪34, or 2.2%.

### Duplicates and the balance check
Two identical transactions on the same day are flagged so you can delete one or keep both. The balance check compares what the bank says you have with what your transactions add up to. A difference means something is missing, such as a fee that was never imported. One tap records the difference so the books match.

### Budgets
Each category has a limit. The app shows how much is left, a safe amount per day, and whether you are on pace to go over, given how far into the month you are.

### Jars and goals
A jar is a pot of money inside the app. It does not move any money in your real accounts.

A jar can **pay for categories**. Example: link the jar "Small spending" to "Shopping & home". When you buy a ₪120 lamp in that category, the jar goes down by ₪120. This happens by itself, and you can detach any payment. A category belongs to one jar. Only spending after you link it counts (or since the start of the month if you tick that box).

Each jar takes what it needs in priority order, up to its cap. A full jar passes its share to the next one. A jar with a deadline shows the monthly amount it needs and offers a button to set the cap to that amount.

### Forecast
No AI. For each income source and expense category the app looks at the last 2, 3 or 5 complete months and projects either the average or a straight trend line. It adds income minus expenses month by month to today's balance. The shaded band shows how much your past months varied, so it grows over time. One-off items such as a trip are not predicted unless they happened in the months it looked at.

### Pension
The pension is updated by hand when you move money into it. It is left out of net worth, reports and the forecast by default. You can switch it on in the net worth chart.

### Alerts
Bills due or overdue, price changes, budgets, a card charge much higher than last month, large transactions, transfers or duplicates to review, balance differences, uncategorized items, a forecast that turns negative, and income with no document attached. You can switch each type off and change the thresholds.

## 5. What works today

| Part | Today |
|---|---|
| Screens, phone and computer layouts, English and Hebrew (right to left), install as an app | Working |
| Bank, card and Wise data | Real, read by the sync (see below), plus CSV import and transactions you add by hand |
| Bill and transfer detection, budgets, jars, forecast, alerts | Working on your real data |
| Saving your changes | In the app's database, with a change history; almost every change can be undone |
| Offline | The app opens without a connection and shows your last data, read-only |
| Background alerts | Through ntfy, a Telegram bot or a webhook, if you set one up (Settings → Alerts) |
| Not built | Splitting one transaction into parts; planned one-off future items; a PIN lock for the phone app |

## 6. Where the data comes from

### Wise
Balances come from Wise's API with a read-only personal token. Statements are refused for personal tokens in most regions, so the app falls back to Wise's activity list; **Test connection** says which one your token gets. A monthly CSV export can be imported too, and it merges with what is already there.

### Banks and credit cards
A community library, israeli-bank-scrapers, logs in to the websites like you would and reads your data. Supported: Bank Hapoalim, Bank Leumi, Discount, Mercantile Discount, Mizrahi-Tefahot, Otsar Hahayal, Union, First International, Massad, Yahav, and the cards Max, Isracard, Visa Cal and American Express. In Settings → Connections you choose which ones to add; only those you add are shown and synced.

- Your bank logins are stored encrypted and are never shown again, not even to you.
- Banks change their sites, so a sync can break until the library is updated (see [Troubleshooting](TROUBLESHOOTING.md)).
- When a bank asks for a one-time code, use Settings → Connections → **Verify this device** once.
- After failed logins the app stops trying a source (it shows **Locked**) so the bank does not lock your account. Fix the login, then **Unlock**.

## 7. Installing it
The [README](../README.md) has the steps for the Windows app and for Docker on a home server, how to reach it from your phone, and how updates work.

## 8. Security in plain terms
- The app is read-only toward your banks.
- Reach it only through Tailscale or your home network, never from the open internet.
- Bank logins are encrypted with a key kept outside the database. Save that key in your password manager.
- Back up the database and your documents regularly (`backup.sh`).
- More in [Security](SECURITY.md).

## 9. Decisions made along the way
1. **Wise:** balances from the API; transactions from the activity list or a CSV import.
2. **Credit card bills are not counted twice:** a payment from the bank to a connected card is a *card payment*, left out of spending, reports and the forecast.
3. **Money available for jars:** your real balance minus what is already in jars and the amount you keep untouched.
4. **Exchange rates:** the European Central Bank's daily reference rates (through Frankfurter), stored per transaction date.
5. **Port:** 8787 by default (`APP_PORT` in `.env`).
6. **Background alerts:** ntfy, a Telegram bot or a webhook.
7. **Offline:** the last data is kept on the device so the app opens without a connection; signing out removes it.
