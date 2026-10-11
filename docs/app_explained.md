# Money app: Explained in plain language

This guide explains what the app does, how it thinks, what is real and what is only a demo, and what to do next. The detailed requirements are in the final specification.

## 1. What it is
One private place on your home server that shows all of your money: Bank Hapoalim, Max, Isracard, Wise and your pension. It only reads. It cannot move money or change anything at a bank. It adds its own layer on top: categories, bills, budgets, savings jars, alerts and forecasts.

The goal is to do as much as possible by itself. It uses the data it already has to decide what is a bill, what is a transfer between your own accounts, what is a duplicate, and what is a real expense. It asks you only when it is unsure.

## 2. What you have today
A working demo of the whole interface, built from made-up data. It runs in a browser and can be installed on a phone. Your changes are saved only in that browser.

| File | What it is |
|---|---|
| index.html | The app (demo) |
| manifest.webmanifest, icons | Make it installable as a phone app |
| sw.js | Makes it open without internet and keeps it up to date |
| nginx.conf | Tells the web server not to keep old copies |
| README.md | How to host it on your server |
| finance_app_spec_final.md | The complete requirements |

The demo shows how everything should look and behave. The real app replaces the made-up data with your server's database and the bank scrapers.

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
You create categories and write simple rules, such as "if the description contains Wolt, it is Eating out". The rules run on every new transaction and never overwrite something you set by hand. Anything unmatched waits in a review list.

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

## 5. What is real and what is demo

| Part | Today |
|---|---|
| Screens, design, phone layout, install, offline | Real and working |
| Bill detection, transfer detection, budgets, jars, forecast, alerts | Real logic, running on demo data |
| Bank data | Made up. The real data comes from the scrapers |
| Saving your changes | In your browser only. The real app uses a server database |
| Background notifications | Only while the app is open. Real background alerts need the server |
| Hebrew right-to-left layout, split transactions, planned one-off items | Not built yet |

## 6. Getting the real data

### Wise
You already created a personal token with limited permissions. It should read your balances. Whether it can read transactions for your account is unconfirmed. If Wise refuses, you import a monthly CSV instead.

### Hapoalim, Max and Isracard
A community library, israeli-bank-scrapers, logs in to the websites like you would and reads your data.

- It needs your real passwords, so keep them in a protected file on the server and never in chat.
- Banks change their sites, so a scraper can break and need an update.
- Hapoalim may ask for a code.
- Test one source at a time in a throwaway container. Pull the last 30 days, print a summary, and delete the credentials file afterwards.
- If a test fails twice, stop and look into it before trying again, so you do not lock the account.
- Fix the server's DNS problem first: add extra DNS servers to systemd-resolved and plug the built-in Ethernet cable back in.

## 7. Putting the demo on your server
The README has the full steps. In short:
1. Put the files in `~/docker/money/app`.
2. Run them in a small nginx container on the `proxy` network, with the supplied `nginx.conf`.
3. Add a block for it to your Caddyfile, using a free port. 9008 is reserved for n8n in your notes.
4. Open `https://rhs.taile6739f.ts.net:PORT` on a phone connected to Tailscale.
5. Android: browser menu → Install app. iPhone: Share → Add to Home Screen.

If the phone shows an old version, clear the site's data, or remove and reinstall the app. If the bottom bar looks wrong, send a screenshot and your phone model.

## 8. Security in plain terms
- The app is read-only toward your banks.
- Reach it only through Tailscale or your home network, never from the open internet.
- Keep bank passwords in a protected file on the server, not in the app.
- Back up the database and your documents to the old Dell server.
- Decide whether the installed phone app should ask for a PIN or fingerprint if you lose the phone.

## 9. Decisions still open
1. Does your Wise token return transactions?
2. Which details do Max and Isracard provide?
3. What counts as "money available" for jars, and should the forecast use it?
4. Which exchange rate is official for tax: Bank of Israel or ECB?
5. Which port will the app use?
6. Web push or your own ntfy server for background alerts?
7. A lock for the phone app, and whether recent transactions may be saved for offline viewing?
8. How to avoid counting a credit card bill twice when you pay it from the bank?

## 10. Suggested next steps
1. Fix the server DNS and test the scrapers one source at a time.
2. Check what your Wise token can read.
3. Decide the open questions above.
4. Give the final specification and the demo to the coding agent, in the build order from the spec.
5. Import as much history as the sources allow, so the forecast and bill detection have enough to work with.
