# Personal Finance Hub: Final Specification (v1.0)

Status: **the original plan** (October 2026), kept for reference. The app has been built from it; where it differs, the app and [How it works](HOW_IT_WORKS.md) are right. The **[OPEN]** items were decided as listed in [Explained](app_explained.md#9-decisions-made-along-the-way). This version merged v0.4 and the v0.5 addendum and added the mobile fixes.

## 1. Purpose and principles
A self-hosted app on my home server that gathers all of my money data in one place and works out as much as it can by itself.

- **Read-only.** It never moves money or changes anything at a bank, card or Wise. It only reads.
- **Automatic first.** It uses the data it already has to decide what is a bill, an expense, income, a transfer or a duplicate, and asks me only when it is unsure.
- **Actual beats expected.** Real charges always replace estimates.
- **No AI in the core app.** Forecasts, categories, bills and alerts are rules and arithmetic on my own history, so the same data always gives the same result. Optional AI help for unclear merchant names is off by default **[OPEN]**.
- **Private.** All data stays on my server, reachable only over Tailscale or the home network.
- **Mobile first.** It must work as well on a phone as on a computer, and be installable as an app.

## 2. Data sources
| Source | Method | Data | Notes |
|---|---|---|---|
| Bank Hapoalim | israeli-bank-scrapers (headless browser login) | Balance, transactions | May require an OTP code. |
| Max | Same scraper library | Transactions, upcoming charges | Check which fields are returned. |
| Isracard | Same scraper library | Transactions, upcoming charges | Same as above. |
| Wise (USD) | Wise API, personal token (Limited permissions); token created | Balances; transactions **[OPEN]** | Statements may be refused for personal tokens. Fallback: monthly CSV import. |
| Pension | Manual entry | Balance | Updated by hand when I move money. **[OPEN]** a scraper later. |

Requirements:
- Scheduled sync (every 6 to 12 hours) and a "sync now" button.
- No transaction is ever imported twice; pending transactions are replaced when they settle.
- Per-source sync status, with a visible warning when a source fails.
- Manual entry and CSV import as a fallback for any source.
- Bank-supplied categories, if present, are stored as a hint only.
- Scrapers run in an isolated container with a pinned library version and outbound access only to the banks. Credentials are never stored in the app code or logs.

## 3. Currencies
- The display currency is ₪. Every account and transaction keeps its original currency and amount.
- Balances convert at today's rate. Transactions convert at the rate on their own date, stored with the row, so history does not change when rates move. **[OPEN]** confirm.
- Rate sources: Frankfurter (ECB reference rates) for display; Bank of Israel representative rates for tax and invoices **[OPEN]**. Rates are cached, with a "stale" marker if the source is unreachable.

## 4. Screens and features

### 4.1 Navigation and layout
- **Desktop:** left sidebar (Home, Activity, Jars, Bills, Budgets, Reports, Forecast, Alerts, Settings). Sync status and Appearance sit at the bottom of the sidebar. A bell in the header opens Alerts. Content is centered on wide screens.
- **Phone:** a bottom bar with Home, Activity, Jars, Bills and More. More opens a sheet with Budgets, Reports, Forecast, Alerts, Settings, Appearance, sync status and Install. A "+" button adds a transaction or a receipt photo from anywhere.
- **Phone layout rule:** the bottom bar is set by a script from the screen width and touch capability, with a pure-CSS backup for when scripts are blocked. It must only take its own height, stay fixed at the bottom while scrolling, and never cover the content.
- **Appearance:** Light, Dark, Auto; six atmosphere themes (Indigo, Ocean, Forest, Sunset, Aurora, Mono); solid or glass surfaces. Remembered per device.

### 4.2 Home
- Alerts strip with the top three items.
- Key figures: **net worth (bank + Wise, pension left out) with "With pension ₪X" underneath**, income, expenses and net for the month (transfers excluded).
- Account cards (Wise shown in ₪ with the USD amount and rate beneath; pension marked manual), card cards (upcoming charge vs last month).
- Spending this month vs last month with a per-category comparison.
- Upcoming bills, budgets closest to their limit, jars, exchange rates, spending donut and recent activity.

### 4.3 Activity
- One list for income and expenses: a table on desktop, a card list on phones. Tapping a row opens its detail sheet.
- Filters: text (also notes and tags), source, category, type (income, expenses, transfers).
- **Detail sheet:** category, tags, note, documents (upload, or the camera on a phone), transfer and duplicate status, and the change history of that transaction.
- **Needs review tab:** pending transfers, possible duplicates and the balance check (4.9).

### 4.4 Categories, tags, auto-categorization
- User-made categories with colors, one category per transaction, free-form tags. Split transactions **[OPEN]**.
- Rules: "if the description contains X, set category Y and optionally add tag Z". They run on every import, never overwrite manual changes, can be applied to past transactions, and are ordered when several match. Hebrew and English matching.
- Uncategorized transactions go to a review queue and raise an alert.

### 4.5 Jars and goals
- Jars are informational only and not linked to real accounts.
- Each jar has a name, priority, target, monthly cap (or "refilled every month" for a bill jar), balance and an optional deadline.
- Allocation runs in priority order. Each jar takes the lesser of what it needs and its cap; a full jar frees its share for the next; the remainder is "Unallocated".
- The Jars page opens with two cards side by side: "Money available to allocate each month" (editable) and "Unallocated".
- Jar cards have compact inputs for target and cap, and up/down buttons for priority. Changes are logged and can be undone.
- **Goals:** a jar with a deadline shows the monthly amount needed, compares it with the cap, shows "On track" or "Behind", and offers "Set cap to ₪X". "New goal" creates a jar with the cap needed to finish on time at the lowest priority.
- **[OPEN]** What counts as "total available money" each month; whether jar spending is recorded as jar transactions.

### 4.6 Bills and subscriptions (automatic and self-correcting)
- **Found automatically.** A store becomes a bill when it charges at a regular rhythm (monthly, every 2 months or yearly) for a similar amount (within 25%). Irregular spending such as groceries is ignored. A bill I remove is remembered and not detected again.
- **The actual charge wins.** The bill amount is always the latest real charge. If next month's rent is lower, that amount replaces the old one, the change is flagged ("₪200 less than the charge before"), and the next prediction uses it.
- **Prediction for the next due date:** the same as the last charge for fixed bills; the average of the last 3 charges for bills that vary (for example electricity). A single price step (₪49 → ₪55) counts as a price change, not as "varying".
- Status: paid (when the charge arrives), due soon, overdue.
- Summary: monthly total (yearly bills spread over 12 months), due in the next 14 days (predicted amounts), price changes and their effect per year.
- A "Cancel?" flag for unused subscriptions. Manual bills exist for things not charged yet; a matching charge takes over once it appears.
- **[OPEN]** Rename a detected bill; merge two merchants that are the same bill; card bills are matched on purchase date, not the card's charge date.

### 4.7 Budgets
- A monthly limit per category with a progress bar and a marker for how far into the month it is.
- Shows spent, left, a safe amount per day, and the end-of-month projection at the current pace.
- Status: on track, on pace to exceed, almost at the limit (default 80%), over.
- Suggested limit from the last 3 months; spending with no budget is listed with "Set budget".
- **[OPEN]** Rollover of unused budget.

### 4.8 Alerts
- Types (each can be switched off): bills due or overdue, bill price changes, budget limits, card charge much higher than last month (default +10%), large transactions (default ₪5,000), transfers and duplicates to review, books not matching the bank, a source out of date, uncategorized transactions, forecast turning negative, income without documents.
- Adjustable thresholds; alerts can be dismissed or opened; badge counts on the bell and navigation.
- Delivery: in the app, as phone or browser notifications through the installed app, and optionally to my own ntfy server. Background push needs the server to send web push or ntfy messages. **[OPEN]** choose web push or ntfy as the main route.
- The pension is manual, so it never raises an "out of date" alert.

### 4.9 Transfers, duplicates, balance check
- **Transfer detection.** An outgoing transaction from one of my accounts and an incoming one to another of my accounts, within 3 days and within about 6% in value after conversion, are paired. Both legs are excluded from income and expenses. I can confirm each, or mark "Not a transfer".
- **Fees are never lost.** Each side is recorded as the bank reports it, so my total money stays correct. The difference between what left and what arrived (fee plus exchange spread) is counted automatically as an expense in the category "Fees & FX costs", so it shows in reports and budgets. Example: ₪1,500 leaves Hapoalim, $480 (about ₪1,466) arrives in Wise, cost ₪34 (2.2%). A separate fee row from the bank is an ordinary expense linked to the transfer.
- **Duplicates.** Two rows with the same date, store, amount and account are flagged. I can delete one or keep both.
- **Balance check.** For each account the app compares the bank-reported balance with the balance implied by my transactions. A difference means something is missing (a fee, an un-imported charge). It is shown, and one tap records it as an "unrecorded charge" so the books match.
- **[OPEN]** Paying a credit card bill from the bank is also an internal transfer; match bank debits to card statements so they are not counted twice.

### 4.10 Reports
- **Net worth history** over 6 or 12 months. Without pension by default (stacked bank + Wise), with a switch "With pension". Monthly snapshots are stored so history does not change with exchange rates.
- Spending by category, income vs expenses, category trends, top merchants, spending by tag. The pension is not part of these reports. Export to CSV **[OPEN]** PDF.

### 4.11 Forecast
Plain arithmetic on history, no AI. For each income source and expense category, over the last 2, 3 or 5 complete months, using an average or a straight trend line (limited to 50% to 150% of the average). It shows the projected bank + Wise balance for 3 months, 6 months and 1 year with a likely range (±1 standard deviation of past monthly net, widening with time), a table of sources and categories, jar fill dates, and a warning if the balance turns negative. The pension is not part of the forecast.
Known limits: one-off items are not predicted; card timing is by purchase date; more months of history give better results. **[OPEN]** planned one-off items.

### 4.12 Notes and audit log
- A searchable free-text note on every transaction.
- Every change is recorded with time, who (me or System) and details. Edits to categories, notes, budgets and jars can be undone from the log.
- Automatic actions (bill detected, transfer detected, sync) are logged as "System".

## 5. Mobile and installable app (PWA)
- Touch targets of at least 44 px; sheets slide up from the bottom; form text of 16 px (prevents zoom on iPhone); the transaction table becomes a card list; charts scale to the screen and tooltips work on tap; safe-area padding for notches; reduced motion is respected.
- Web app manifest (name, standalone display, theme colors, 192 and 512 icons, a maskable icon, shortcuts for Activity, Add transaction and Bills), an Apple touch icon, and a service worker.
- Installation needs HTTPS or localhost. My Tailscale certificate setup provides it. Android and desktop Chrome offer an install option; on iPhone use Share → Add to Home Screen.
- Offline: the app opens without a connection and shows an offline banner. The service worker always fetches the page fresh when online and replaces old caches when the version number changes, so devices pick up updates. The web server must send "no-cache" for the page and "no-store" for the service worker file.
- **[OPEN]** May the real app cache recent transactions for offline viewing?

## 6. Non-functional requirements
- **Security:** credentials in environment variables or a secrets file (permissions 600), never logged; access only over Tailscale or the local network; app password, 2FA **[OPEN]**; a PIN or biometric lock for the installed phone app **[OPEN]**.
- **Backups:** database and documents back up automatically to the old server (Dell), the same pattern as the Immich backup.
- **Reliability:** a failing scraper is visible and never breaks the app.
- **Privacy:** logs contain no personal data.
- **Language:** Hebrew and English text, ₪ as the display currency. Right-to-left layout **[OPEN]**.

## 7. Hosting (matches my server setup)
- Server `rhs`: Ubuntu, Docker, Tailscale, Caddy reverse proxy on the shared `proxy` network. Compose files in `~/docker/finance/`.
- Served at `https://rhs.taile6739f.ts.net:PORT` through Caddy. **[OPEN]** choose the port (9008 is reserved for n8n in my notes).
- Database and documents under `/mnt/data/finance/`, added to the nightly backup.
- **Known server issue to fix first:** unreliable DNS from the ISP while the server runs on WiFi. Add extra DNS servers to systemd-resolved and reconnect the built-in Ethernet port.

## 8. Architecture
- Docker Compose: Postgres, a Node backend with a scheduler, the web front end (the demo is the visual and behavior reference), and a separate scraper container with Chromium.
- Main tables: accounts, transactions (original currency and amount, rate used, note), exchange_rates, categories, tags, transaction_tags, rules, documents, jars (with deadline), jar_movements, bills (detected and manual, ignored list), budgets, alert_settings, dismissed_alerts, transfer_links (with status), reconciliation_adjustments, net_worth_snapshots, audit_log (with undo data), planned_items, sync_runs.
- Forecasts, bill status and predictions, budget status and alerts are computed on demand from the data. Net worth snapshots are stored once a month.

## 9. Scraper test plan
1. Test one source at a time in a throwaway container: last 30 days, print balance, count and the first rows, save nothing.
2. Check that login works from the server, that fields look right, and whether a category comes with each source.
3. Delete the credentials file after each test. If a test fails twice, stop and investigate before retrying.
4. Fix the DNS problem first (section 7).
5. If Max or Isracard block the basic library, try the maintained fork.

## 10. Build order
1. Database, manual entry, documents, notes, audit log.
2. Currency handling and exchange rates.
3. Wise balances, then the transaction test; Hapoalim, Max, Isracard scrapers.
4. Transfer and duplicate detection, balance check.
5. Categories, tags and auto-rules.
6. Home, Activity, appearance, mobile layout and PWA.
7. Bills (detection and prediction), budgets, jars and goals.
8. Alerts and notifications.
9. Reports and net worth snapshots.
10. Forecast (needs several months of imported history).

## 11. Tests
- **Forecast:** a flat series gives a straight line; a rising series gives the expected slope; the 50% to 150% limit holds; the current month is excluded.
- **Jars:** total 20,000, bills 5,000, trip capped at 500 with 16,500 remaining gives 33 months.
- **Transfers:** ₪1,500 out and $480 in (rate 3.055) pair with a ₪34 cost; a salary and a rent payment on the same day do not pair; totals exclude both legs and include the cost.
- **Duplicates and balance check:** same date, store, amount and account flagged; "keep both" remembered; a ₪12 difference shows and clears after recording.
- **Bills:** rent, Netflix, electricity, arnona and car insurance are detected; Shufersal shopping is not; a lower rent replaces the amount and flags a decrease; a price step is not "varying"; electricity predicts the average of 3.
- **Budgets:** pace projection and status thresholds.
- **Pension:** not in net worth, reports or forecast by default; no out-of-date alert.
- **Audit:** every edit creates an entry; undo restores the old value.
- **Mobile:** on 320, 360, 390 and 430 px phones, a sideways phone, a tablet and a phone in "desktop site" mode, the bottom bar sits at the bottom, stays fixed while scrolling, and the page does not scroll sideways. With scripts blocked the bar still sits at the bottom.
- **PWA:** manifest and icons valid, installable on Android and iPhone, opens offline, updates after a version bump.

## 12. Open questions
1. Does a Wise personal token return transactions for my account?
2. Which fields do Max and Isracard return (categories, upcoming charges)?
3. What counts as the monthly total for jars, and should the forecast use it?
4. Official exchange-rate source for taxes and invoices: Bank of Israel or ECB?
5. Which web port will the app use?
6. Web push or ntfy as the main route for background alerts?
7. App lock for the installed phone app, and offline caching of recent transactions?
8. How to match a credit card bill paid from the bank so it is not counted twice?
9. Pension updates, split transactions, budget rollover, planned one-off items, renaming and merging bills, Hebrew right-to-left.
