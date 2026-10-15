# Changelog

What changed in each version. The web app (Docker) and the Windows app share one version number. Entries under **Windows app** only apply to the installer.

Versions follow semantic versioning: **patch** (0.1.1) for fixes, **minor** (0.2.0) for new features, **major** (1.0.0) for changes that need action from you. The newest section is the version being released.

## [0.6.1] - 2026-10-15

### App
- **Docker: update like any other Docker app.** The app and scraper images are now published with every release (`ghcr.io/userofit123/moneymanager` and `ghcr.io/userofit123/moneymanager-scraper`, for amd64 and arm64) and `docker-compose.yml` uses them. Docker Desktop, Portainer and Dockhand show the update and can pull it with a button (or automatically, with Watchtower or Portainer's re-pull option); no terminal and no `git pull`. In a terminal it is `docker compose pull && docker compose up -d`. To build from the source in the folder, use `docker-compose.build.yml` (see the README). Update notices in the app now say this.
- **A card charge that was pending and then settled no longer creates a "balance went up with no matching transaction" alert.** A card balance already includes a pending charge, and when it came back settled the app counted it a second time.
- **"Paid from a jar?" is based on history.** A payment is suggested for a jar only when payments like it (the same store, or mostly the same category) were already attached to that jar. Names and amounts are no longer used, so coincidences do not alert.

### Windows app
- Includes the above.

## [0.6.0] - 2026-10-15

### App
- **A new first page: Recap.** It tells your month as a story: what you began the month with, what came in, what you have spent, what is in your accounts now, what you still have to pay, how your budgets are doing and where the month is predicted to end. Each step is a circle on a path that draws itself as you scroll, with its own numbers, pills and small pictures. The title greets you by name (the greeting that used to be on Home), and a row of days shows where you are in the month.
- **Everything on Recap is a link to its source.** Hover a day or a bar to see what happened that day, and click it to open the day in Activity. The coming-up bills open the bill, budgets and categories open Activity for that category, and the totals open Accounts, Jars, Bills, Budgets or Forecast.
- **Jars are part of the picture.** Recap says how much of your money is in jars and how much is free, and warns when the jars would not all be covered. When your jars hold more than your accounts can cover, a button takes the difference back from the jars, starting with the lowest priority.
- **Home is just "Home" again.** The greeting moved to Recap.
- **Your appearance no longer resets after an update.** Appearance settings are saved with a time stamp on this device and on the server, and the newest copy always wins.
- Works in English and Hebrew (right to left), on phones too.

### Windows app
- Includes all of the above.

## [0.5.2] - 2026-10-14

### App
- **Category rules now match the items they were made from.** A rule made from a name with numbers or punctuation, such as "SUPER-PHARM #123", did not match any of those items, so the other items in the group stayed uncategorized. Rule text and transaction text are now compared in the same plain form, against the description and the store. This applies to creating a rule from a suggestion, applying it to existing items, categorising new items, and tag rules.

### Windows app
- Includes the above.

## [0.5.1] - 2026-10-14

### App
- **The rule suggestion is finally visible.** After you change an item's category, a prompt appears with **Create rule…** and **Not now**. Before, the suggestion was saved in a lightbulb button that was never shown. The lightbulb now shows, with a count, in the button stack above the + button.
- **Suggestions look different from other notifications:** a lightbulb icon and an amber color. Success, error and alert messages keep their own colors and icons.
- **Failed bank logins say more.** The error now follows the bank's own requests from start to end and shows them first, and each failed attempt also saves a **network.txt** next to its screenshots (profiles, then _failed-logins).

### Windows app
- Includes all of the above.

## [0.5.0] - 2026-10-14

### App
- **A profile and a personal Home.** Settings → Profile holds your name, age, gender and what matters most to you. All of it is optional and each field says why it is asked. Home greets you by name (a different greeting each time you open the app, by time of day) in place of "Home", and the date under it follows the language. In Hebrew the app speaks to you in the right gender. The first time, a window offers the form once after the "updated" window; closing it never shows it again.
- **Icons on Home.** Net worth, income, expenses and net have an icon, and every bank, card and account has its own: real marks for Wise, American Express, Visa, Mastercard, PayPal and others, and a letter tile for the Israeli banks and cards.
- **A ? next to each section name** opens the info panel at that section, on every page and settings tab.
- **Alerts and info buttons** sit in a stack above the + button, always visible.
- **Accounts moved under Home** in the sidebar. A new account in a currency you do not follow yet adds that currency to Settings → Currencies.
- **Cleaner account and card pages.** No repeated name or digits, equal numbers of blocks in each row, clear chart headers ("Purchases by month · last 12 months"), a sync status with a separate last-synced line, and no net-worth row on cards.
- **Hover line on every line chart.** A vertical line with the values appears anywhere over the chart (accounts, cards, Reports, exchange rates).
- **Activity.** A group with future payments shows "Out so far" and "Expected". Group toggles are chevrons. Upcoming rows are tinted with a bar on their edge.
- **Appearance and settings stay after an update.** Your saved preferences come from the server at every start, and the Windows app waits for its usual address after an update instead of opening on a new one (which is what reset them).
- **Bank logins that fail keep every screenshot** (in the data folder, profiles → _failed-logins), so a failure like American Express "Failed to fetch" can be seen.
- **Fixes.** Changing a jar's type now saves. A category change offers a rule for similar items. Changes from a sync show without refreshing. New screens never run with old translations. More Hebrew.

### Windows app
- Includes all of the above.

## [0.4.21] - 2026-10-14

### App
- **Changing a jar's type now saves.** Changing only the type of a jar (for example Savings to Pay-off) was not saved and Money flow was not redrawn, so the old type came back. It now saves at once, updates Money flow, and a jar switched to Pay-off no longer counts its balance as put aside. After every save the jars shown are the ones stored in the database.
- **Rule suggestion on every category change.** Changing the category of any item (not only an uncategorized one) offers to create a rule. Creating it moves all similar items to that category.
- **Live data.** Changes made by a sync show within seconds, with no refresh: the app checks for new data every few seconds and when you return to the window.
- **More Hebrew.** Sync, test connection, import, gap and alert messages from the server, and the rest of the Home and Forecast texts are translated.
- **Failed bank logins keep their screenshots.** Every picture taken during a failed login is saved in the data folder (profiles, then _failed-logins), one folder per attempt, so a failure like American Express "Failed to fetch" can be seen.

### Windows app
- Includes all of the above.

## [0.4.20] - 2026-10-14

### App
- **Instalments no longer show "null/3".** When a bank sends the total number of payments without which one this is, the app reads the number from the text of the payment, and leaves the instalment out instead of showing "null of 3". Payments already imported with a missing number are shown correctly.
- **Bank errors say which step failed.** When a bank sends back an empty reply, the message now says whether it was the login step or the data step, and a login blocked by the bank's bot protection is retried once after a short wait. The bank browser now presents its real version, no longer carries the automation flag, and retries page loads, which are the changes users of the scraper library report help against American Express and Isracard blocks.
- **Hebrew.** The sidebar sync status ("see sources") and the generic bank error message are translated.

## [0.4.19] - 2026-10-14

### App
- **Jars come in three types.** **Savings** (money for something: a goal and a date are optional, with an amount per month), **Bills** (money kept for your bills) and the new **Pay-off** (a loan you pay back: the total you owe, what you already paid back, and what you pay each month). A pay-off jar counts up: when you pay the loan the jar does not go down, it shows how much is paid back.
- **Money that is not in your accounts no longer reduces your free money.** What you already paid back on a loan, and savings you mark **This money is not in my accounts here**, show in the jar but are not taken off your free money or shown as put aside in Money flow.
- **Backup and restore (Settings).** The app saves a backup of your data every day, keeps the last N days you choose, and can make one on demand. A backup holds your activity, accounts, categories, tags, rules, budgets and jars, never bank logins. You can protect backups with a password you choose, or leave them open. **Restore** replaces the data with the backup and leaves your connections alone; a copy of the current data is saved first. On a new device, use **Find a backup file…** to pick the file from the old one. On Windows you can change the folder and open it.
- **Money flow.** "My month ahead" and "My month so far" are now **Money flow · ahead** and **Money flow · so far**.
- **Update popup opens sooner.** The "What's new" popup no longer waits a second or two; it opens right after the app first draws.
- **Hebrew is complete.** The remaining English texts (messages, suggestions, sheets, labels, the browser's confirmation dialogs, server errors and Change history lines) are translated, and the update popup and change log show Hebrew release notes.
- **Settings.** Currencies has its own tab, Import no longer has a Sync now button, the export window is wider, downloads show a message, and a connection's status, last sync and accounts sit on one line.

## [0.4.18] - 2026-10-13

### App
- **My month ahead / My month so far (Home).** "Where my money goes" is now a plan for the rest of the month. A **Planned / Actual** switch changes it: Planned takes off the full budget (or usual month) of each item and ends at Free to use; Actual takes off what you really spent and ends at Available now. Both start from "Before spending" (your balance plus what you have already spent this month). The summary blocks, labels and bars follow the switch, the title changes with it, and the numbers always add up. Spending outside budgets shows as "Unplanned spending", so the total matches Expenses.
- **Clearer bars.** Budget (or spent) above each bar, a "What's left" block joined flat to the bottom of each bar, then the name. The removed part is a see-through version of the bar colour. The row labels are left-aligned in a narrower column so the bars use the width.
- **Count an entry in another month.** Open an entry → Actions → **Count in another month** (previous, next or any month) for reports, budgets and totals, for example a salary paid on the 30th that belongs to next month. The entry's real date, amount and details never change. It gets a pill in Activity and a notice inside the entry, and you can put it back with one click.
- **Dates and sorting in Activity.** Dates always show the year (dd/mm/yyyy, or mm/dd/yyyy in Appearance → Date format). New Sort box (newest, oldest, largest, smallest, also for groups). Clear resets the grouping and sort.
- **"Money Manager has been updated" popup** after an update, once per version, with what changed.
- **Connections page.** The add form is closed by default, with **+ Add connection** on the right and how many are connected (and whether any has an issue) on its left. Sync now, Edit connection and See where it stopped are in each connection's top row next to the status. Several accounts of one connection show side by side.
- **Forecast.** "What drives the forecast" is a simple table (Usually each month, Next month, the chosen horizon, Direction). It follows the "Based on the last" and horizon choices, and income that stopped months ago no longer appears.
- **Predicted bills.** The info panels of Home, Activity, Bills and Budgets explain that predicted and upcoming bills are information only and only unpaid bills due this month reduce "available".
- **Net worth.** "With pension" shows again, the pension appears nowhere until you enter an amount, and an empty second currency of a connected account (such as Wise) is no longer reported as "balance not read".
- **Settings.** The section is called "Version and updates" and always shows the installed version; the install card only appears where installing is possible. "Layout spacing" and "Sidebar spacing" (with picture buttons) are together in Appearance.
- **Motion.** The sidebar highlight glides between items (thin while moving), tab bars finish with the page fade-in, and the theme shuffle circle is faster with a soft edge.
- **Bank sign-in.** American Express and Isracard keep a real-Chrome identity at login, and the "See where it stopped" screenshot is available for failed connections.

## [0.4.17] - 2026-10-13

### App
- **Suggestions.** "Make a rule?" prompts are now persistent suggestions: a button above + shows a count and opens a list where you can apply or dismiss each one, or clear all. The "I made that change" confirmation stays.
- **Search in rule pages.** Categories, Tags and the rule pages have a search box (names, text, and what they map to). Categories also has a tidier add-category bar.
- **Hebrew fixes.** Drop-down icons are on the correct side, category names on the Categories page are translated, and the sidebar item is now "Bills".
- **Bills.** Old irregular bills that stopped are hidden. The installments list shows only active plans, newest first, one row per plan.
- **Grouped Activity.** Group totals now match their rows, and all groups open or close consistently.
- **Rename a category.** Each category in Categories has a pencil to rename it: it changes on every transaction, rule, budget, bill and jar, and merges into an existing category of the same name. Tags already had one (the pencil on each tag); both are now easier to see.
- **Category on expected bills.** The Category column on an "Expected bill" row in Activity is now a drop-down. It sets the category of that bill and its latest payment. (Transfers and other rows that are not payments still show the category as plain text.)
- **Net Worth tile.** It no longer says "With pension" until you have a pension. Its tooltip lists the accounts counted, any bank account or wallet that is **not** counted, and any account whose balance has not been read yet (it counts as 0 until a sync reads it); the subtitle names accounts with no balance.
- **Change log in the app.** Settings → App has a new **Change log** page listing every version and what changed, newest first, with your installed version marked. **See what changed** (after checking for updates) and **What's new** open it. **See what changed** is now a proper button instead of an underlined link with its text set too high.
- **Rule suggestions.** The "create a rule?" suggestion now appears whenever you set a category (also when changing one), and it also covers future items when none match yet.
- **See where a bank login stopped.** When a connection fails, **See where it stopped** (on the connection, and in the Test result) shows a screenshot of what the app's bank browser saw: a captcha, a notice, a blank page. It is kept in memory only, never saved.
- **American Express and Isracard sign-in.** The bank library reset the browser's identity (client hints) at login, undoing the earlier fix. It is now kept, and the page gets a moment to finish loading and see mouse movement before the login request, as a person would. This should stop the "bank accepted the login but sent back no data" error.

## [0.4.16] - 2026-10-13

### App
- **Dates always show the year.** Every date in Activity is dd/mm/yyyy. A new Date format setting (Appearance) switches it to mm/dd/yyyy.
- **Sorting in Activity.** A new Sort box: newest, oldest, largest or smallest amount. It also orders the groups when you group.
- **Clear resets everything.** The Clear button now also resets the grouping and the sort.

## [0.4.15] - 2026-10-13

### App
- **Bank browser looks like a real Chrome.** The bank browser still told banks it was "HeadlessChrome" in its client hints (sec-ch-ua) even after its user agent was changed, and had no `window.chrome`. Both now match a normal Chrome, which bank bot protection (American Express in particular) checks. Page console errors are added to the list of what was refused in bank errors.
- **Updating shows progress.** After you press **Restart and update**, the button turns into a disabled "Closing to update…" with a spinner, the other buttons hide, a line says the app is closing and will reopen by itself, and the sidebar notice says "Installing…".
- **Even spacing on connection cards.** The Sync now and Edit connection buttons now have the same space below them as at the sides.
- **Each kind of pill has its own colour** in Activity: Pending (orange), Expected bill (purple), Bill (blue), Upcoming (teal), Card payment (slate), Transfer (cyan), Possible duplicate (red), Same refund twice (pink), Jar (green), Instalment (indigo), Ignored and Auto (grey), Balance update (gold).
- **Pending pill.** A charge the bank still lists as pending shows an amber **Pending** pill next to its name in Activity, accounts and the transaction window.

## [0.4.14] - 2026-10-13

### App
- **Balance changes with no transaction.** A charge the bank still lists as **pending** now explains the balance change it caused (a card balance already includes pending charges), so the alert closes by itself. Before, only completed charges counted, so a pending charge such as a card purchase with a charged amount of 0 left the alert open. An amount within ₪1 now closes it as well.

## [0.4.13] - 2026-10-13

### App
- **Card payments, more reliable.** Bank lines such as "כ.א.ל חיוב", "מקס איט פי חיוב", "אמריקן אקס חיוב" and "ישראכרט חיוב" are recognised by name (dots and punctuation are ignored). When you mark one payment as a card payment by hand, the app offers to mark every other one with the same text and to remember it for future syncs.
- **Other rules.** A new **Other rules** tab in Categories lists the card payment rules and the salary rules (your own, and what is recognised automatically), where you can add or delete them.
- **Bills stop being predicted when they stop.** A bill the app found by itself is no longer predicted once a whole cycle has gone by without it (or the latest one is more than 10 days late), or when its last instalment was paid. If it is paid again later, it is picked up and predicted again, so bills that run a few months each year work. Bills you added yourself are untouched. To end one for good, use **Remove bill** (it is never detected again) or **Cancel** in the bill's menu on the Bills page.
- **Add account does both.** **Add an account** (on the Accounts page and in the **+** menu) first asks what kind: **Bank or credit card** (pick the company, then you land on its login form in Settings → Connections) or **An account I keep track of myself** (the existing form with a balance you enter).
- **Error log.** A new **Error log** section in Settings records every error the app meets: the time, what was being done, the full message and details, your last clicks and the last changes asked of the app, and where it happened (a sync, a connection test, the server, the page). It also shows system information (app version, Windows or Docker, system, memory, time zone, data size, last sync of each connection). **Copy everything** puts the report on the clipboard to send. Passwords, tokens and codes are removed before anything is stored.
- **Bank errors say what was refused.** When a bank fetch fails, the message now also lists the last requests the browser could not load (host and path only) and the page it stopped on, instead of only "Failed to fetch". This shows whether it is a blocked request, a refused sign-in or a changed page.
- **Card digits everywhere.** A card (or account) that is the only one on its login now shows the last 4 digits of its number too (for example "Max ·· 1234"), on the Accounts page, on its page and on the Home credit card tiles. Before, only logins with several cards showed them. The digits come from what the bank returned.
- **Fewer false duplicates.** Two identical charges on the same day that the same bank or card listed separately (two coffees from the same stall) are real purchases and are no longer flagged. A possible duplicate is now only flagged when the two entries came from different places (for example typed by hand and also imported) or were both typed by hand.
- **Clearer alerts.** Alerts now say what happened and what to do. "X looks overdue" is now "X: payment expected but not seen", with the expected date and amount and whether to do nothing or cancel the bill. The other alerts (bill due, paid from a jar, budget pace, card charge, large amount, transfers, duplicates, balance changes, income documents) were reworded the same way, in English and Hebrew.

## [0.4.12] - 2026-10-13

### App
- **Card payments are found automatically.** After every sync, a bank payment whose amount equals what a card was charged on that day (taking the card's own charge date) is marked as a card payment, so it is not counted as spending. The name patterns now also cover Visa Cal, Amex and Diners. A card payment you marked or un-marked by hand is left alone.
- **Salary is found automatically.** An income that says so (משכורת, שכר, salary, payroll) or that the same payer pays every month in a similar amount (3 months or more, 1,500 or more) is categorised as Salary. Only uncategorised income is touched.
- **Dates are read in Israel time.** A bank date at local midnight arrived as 21:00 of the day before and could land one day early (or a charge date a day off). New syncs read dates in Israel time and correct rows that an earlier version stored one day off.

## [0.4.11] - 2026-10-13

### App
- **Activity dates show the year** when it is not this year (for example 10/09/2025). Before, only month and day were shown, so a payment from last year looked like it belonged to this month.
- **Copy details.** The transaction window has a **Copy details** button that copies everything about the entry: the summary, every detail row, and all fields the bank returned.

## [0.4.10] - 2026-10-13

### App
- **Balance changes with no transaction.** When the missing transaction arrives later (for example a charge the bank first listed with no amount), the alert now closes by itself at the next sync, including ones that are already open. The "Leave it, with a note…" button is now called **Dismiss, with a note…**: it closes the alert without adding anything.

## [0.4.9] - 2026-10-13

### App
- **Spacing, for real.** A header and its block always sit a fixed 10px apart; the Spacing setting never changes that. Every group (a header with its block) is separated from the next by the same larger space on every page. Activity: the summary row is the table's header, the filters are a separate group above it, and the account page's search row and table are tight under their "Activity" header. Rows of groups on Home use the same gap as the other groups.

## [0.4.8] - 2026-10-13

### App
- **Hebrew version numbers.** Version numbers (for example 0.4.6) on the update page and in "What's new" are kept left-to-right, so they no longer come out reordered in Hebrew.

## [0.4.7] - 2026-10-13

### Windows app
- **Bank fetch.** On Windows the bank's browser claimed to be Linux, which bank bot protection can notice: sign-in worked but the transaction request was refused ("Failed to fetch"). The Windows (and macOS) browser now uses its own real user agent. The Docker version is unchanged.

## [0.4.6] - 2026-10-13

### App
- **Activity.** The summary row (All time, In, Out, Net) now sits right above the table as its header, and the space follows the Spacing setting only above it.

## [0.4.5] - 2026-10-13

### App
- **Charges that start at 0.** A card charge the bank first lists with an amount of 0 is now updated in place, with its category, tags and notes kept, when a later sync reports the real amount. Before, the 0 row stayed and a second row could appear.

## [0.4.4] - 2026-10-13

### App
- **Appearance and language are remembered.** The Windows app opened on a different local address each time, so the window forgot its settings on every start. It now uses a fixed address, and appearance, language and other view choices are also saved in your data, so they survive updates, reinstalls and a new browser.

## [0.4.3] - 2026-10-13

### App
- **Sync fix.** Banks and cards that report the shekel as "₪" (or "NIS") made a sync fail with "no exchange rate for ₪". Currency names are now normalised to ISO codes (₪ → ILS, $ → USD, € → EUR, £ → GBP).

## [0.4.2] - 2026-10-13

### App
- **Where my money goes.** A "What's left" label on the top row, and a new **Takes off your balance** row so each step adds up. Money put in jars or kept untouched now shows under Budget (as set aside) instead of Left to spend.

## [0.4.1] - 2026-10-13

### App
- **Design fixes.** The ₪ sign is bundled with the font and drawn at the same weight as the other symbols. Tabs use one sliding highlight whose corners follow its position (Activity too), and switching Categories tabs no longer rebuilds the page. Categories and Tags are tidy card lists. The Static surface option is removed.
- **Where my money goes** is now a true waterfall: each bar is your balance after the items before it, with the amount taken shown above it, and a table below lists budget, spent and left to spend for every item.
- **One spacing rule.** A header and its block are a group on every page; groups, blocks and grid columns all follow the Spacing setting.
- **Activity and accounts.** The summary row keeps "All time" and what is not counted on the left; more space under the filters; the account graph matches the Reports graph; "Open in Activity" sits on the search row.

## [0.4.0] - 2026-10-13

### App
- **Connections.** A connected account shows only its status and details; the login, nickname and test forms appear for accounts that are not connected, or behind **Edit connection**.
- **Settings tidied.** Left-hand sections (Connections, Sync, Alerts & notifications, Appearance, Data, Security, Activity log). Notifications moved here from Alerts. "Audit log" is now **Activity log**. Block spacing follows the Spacing setting like the rest of the app; new **Sidebar spacing** option.
- **Alerts page.** New **History** tab with everything that fired; alert types and thresholds stay on the page, delivery settings moved to Settings.
- **Accounts page** with a page per account (balance history, activity list shared with the Activity page). **Custom accounts**: enter a balance by hand, attach activity, choose whether it counts in net worth and reports. **Pension history** now appears in Activity; the pension hides itself when it has no value.
- **Home.** "Where my money goes" is a real waterfall (money in accounts, bars by size, budget "battery" bars, Budget / Left to spend, planned vs actual toggle) and sits under the credit cards. Month-based blocks say which month they show, have **All →** links, and are reordered (spending next to budgets, bills next to recent activity). Better exchange-rates block. Month vs month moved to Reports.
- **Jars and forecast.** Jar forecasts are honest (free money plus expected monthly surplus, in priority order) at 3, 6 and 12 months, and no longer disagree with the Forecast page. Forecast history is 13 months and offers 3/6/12 months. "Pays for these categories" is collapsed unless the jar has categories.
- **Activity.** In green, Out red, a cleaner summary row (Transactions, In, Out, Net), and **Load more** (50 at a time) on long lists and logs. PDF previews work again.
- **Budgets and reports.** The grey "today" line is explained; all bars share one look. Report charts default to Area, share the same style options and remember the choice. Hovering a category trend no longer bolds or shifts the label.
- **Page guide.** An **(i)** button beside the alerts bell opens a side panel that explains each page in plain words with examples (English and Hebrew; it opens from the left in Hebrew).
- **Fixes and speed.** A card row with a 0 charged amount now shows what actually left the account. Fewer repeated calculations on every change, cached category lists and tab-highlight lookups. A full check of the totals found no double counting (transfers, card payments, bills covered by jars, budgets vs bills).

### Windows app
- Includes all of the above.

## [0.3.0] - 2026-10-13

### App
- **Only connected accounts show.** A new install no longer shows a bank, two cards and a Wise wallet you never added. Accounts appear when you connect them, import a file or enter them; the hand-entered pension stays. Empty leftovers from older installs are removed automatically. The bank/card CSV import now lets you pick any company from the list.
- **One account per card, without duplicates.** A card login no longer shows both "Max" and its cards. Older transactions are matched to the right card by card number, and anything left over joins the busiest card, so the old combined account disappears.
- **Glass rebuilt from scratch.** Every block gets a blur of what is behind it (**Blur**, 0 to 40 px), a colour boost (**Vibrance**, 100 to 250 %) and a translucent fill (**Opacity**, 0 to 100 %). No tint, no gradient. The sliders are in the order you expect and only show when Glass is selected.
- **The shekel icon is drawn properly.**
- **Tabs, everywhere.** The stretching tab highlight now runs on every tab strip (Activity, Settings, Reports…). It is built from three pieces that move with transforms only, so the browser animates it on the graphics card instead of repainting.
- **Smoother app.** The page background is now a fixed layer instead of a "fixed" background (which made the browser repaint everything while scrolling), and the pulsing status dots no longer repaint continuously. Glass is the heaviest effect; Settings says so.
- **Demo data.** A year of realistic made-up data (`node src/cli.js demo`, or the demo compose file) to try every screen, and README screenshots in light and dark.
- **Docs.** The README is rewritten (install for Windows and Docker, first steps, updating, screenshots, security, help); the long guides moved to `docs/HOW_IT_WORKS.md` and `docs/TROUBLESHOOTING.md`.

### Windows app
- Includes all of the above.

## [0.2.0] - 2026-10-12

### App
- **Several logins at one company.** Add a bank, card company or Wise again to connect a second login, and give each a nickname ("Wise · Business"). Each keeps its own accounts, sync status and remembered device. Changing a nickname renames its accounts everywhere.
- **One account per card.** If one login holds several cards or bank accounts, each now gets its own account ("Max ·· 1234") with its own balance. Existing history is moved to the right card on the next sync.
- **Import history** is clearer: the first-import setting and the per-connection "Import history" both ask for a period (up to 5 years) and keep whatever the bank still has.
- **Settings tabs have icons.**
- **Tabs slide.** The selected tab's background is pulled to the new tab: its front edge runs ahead, the back catches up, and it thins a little while it stretches. It runs as one smooth browser animation.
- **Glass is just glass.** Choosing it changes only the blocks: no tint, no gradient, no change to the background. A Tint slider adds colour if you want it. The page texture shows on the glass, and Static texture no longer changes how blocks look.
- **Backgrounds match their previews** exactly (the page and the thumbnails use the same definition).
- **Custom colour** in Appearance → Atmosphere: pick any colour and the whole app follows it, light and dark.
- **Appearance only shows what applies:** Blur and Tint only with Glass, Texture density only with a texture.
- **Spacing** keeps a header with its block: the gap is between groups, not between a header and its block.
- **Windows app looks like the web version:** the app's own font is bundled (Windows no longer substitutes Segoe UI), the logo symbol is drawn rather than a font character (it was off-centre), and scrollbars are thin.
- **Appearance:** Density now changes spacing inside blocks on every page, and a new Spacing option sets the gap between blocks and sections.
- **Safer "Verify this device":** its browser can only load the bank's own websites.

## [0.1.0] - 2026-10-12

### App
- **Tag rules.** Automatic tags, like automatic categories: if a description contains some text, new transactions get those tags. When you add a rule the app offers to tag the transactions you already have.
- **Settings tabs.** Categories, Category rules and Tag rules are now separate tabs.
- **More banks and cards.** Leumi, Discount, Mercantile, Mizrahi-Tefahot, Otsar Hahayal, Union, First International, Massad, Yahav, Visa Cal and American Express join Hapoalim, Max, Isracard and Wise. Settings → Connections has an "Add a connection" picker, and only the connections you add are shown and synced.
- **Reports.** A cleaner header (one view picker, the time range, the amount and the change), an Area view next to Line, the explanation moved into a tooltip, "All" is never shorter than 3 years. On desktop, clicking a month on a chart opens Activity for that month.
- **Tooltips.** Every tooltip now has a small (i). Tap it to open the tooltip, which stays until you tap elsewhere. Works on phones.
- **Activity.** A tidier summary strip (count, In, Out, Net) and no stray separator line under group headers on mobile.
- **Payment history** has a bar chart, year headers and date tiles. **Bills** show "Found automatically" and "Added by you" as matching pills. **Jars**: a better category picker in the jar form, and the whole "Full by" cell has its tooltip.
- **Appearance.** A redesigned panel with previews. Textures (Dots, Stripes, Grid, Static) are separate from backgrounds and have a density slider. Glass now looks like glass, Raised is fixed, and Static is a new surface.
- **Glass** shows the app's own background (and texture) through blurred panels, with Blur and Transparency sliders. Textures and the glass effect were hidden behind the start-up colour; fixed. The atmosphere swatches are round again.
- **Tags page.** Settings → Tags lists every tag with its count; rename (or merge) and delete tags. Adding a tag to a transaction now offers to create a tag rule and tag the similar transactions you already have.
- **Alerts.** Besides ntfy, alerts can go to a Telegram bot or a webhook (Discord, Slack, Home Assistant, n8n). Both are off until you set them up and are stored encrypted.
- **Tooltip icons** are smaller, centred, aligned with their labels, and no longer turn the pointer into a question mark. Tag suggestions open as a popup instead of pushing the form down.
- **App icon.** Choose the symbol (₪ $ € £ ¥ or a coin) in Appearance; the sidebar logo, loading screen and browser tab follow it, and the loading screen uses your colours. The installed app icons are a generic coin.
- **Check for updates** works when no release exists yet instead of saying GitHub can't be reached.
- **Hebrew.** Layout now mirrors properly: tab order, amounts and graphs on the correct side, switches, menus. A pass over the translation: more natural wording, a consistent vocabulary (קופה, יעד, חשבון, תנועה), and text that was missing.
- **Version and updates** in Settings → App and data, with this changelog.

### Windows app
- First release of the installer: the database, the bank scraper and the app run inside it, with data kept on your computer. No Docker, no setup.
- Updates itself from this repository's GitHub releases, with an "Update automatically" switch. An update replaces the installed app and keeps your data.
- The key for saved bank logins is protected by Windows.
- Fixed: the first installer was missing the server's libraries ("Cannot find package 'express'"). They are now shipped and restored on first start.
