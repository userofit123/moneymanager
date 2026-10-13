# Changelog

What changed in each version. The web app (Docker) and the Windows app share one version number. Entries under **Windows app** only apply to the installer.

Versions follow semantic versioning: **patch** (0.1.1) for fixes, **minor** (0.2.0) for new features, **major** (1.0.0) for changes that need action from you. The newest section is the version being released.

## [0.4.12] - 2026-10-13

### App
- **Card payments are found automatically.** After every sync, a bank payment whose amount equals what a card was charged on that day (taking the card's own charge date) is marked as a card payment, so it is not counted as spending. The name patterns now also cover Visa Cal, Amex and Diners. A card payment you marked or un-marked by hand is left alone.
- **Card payments, more reliable.** Bank lines such as "כ.א.ל חיוב", "מקס איט פי חיוב", "אמריקן אקס חיוב" and "ישראכרט חיוב" are recognised by name (dots and punctuation are ignored). When you mark one payment as a card payment by hand, the app offers to mark every other one with the same text and to remember it for future syncs.
- **Other rules.** A new **Other rules** tab in Categories lists the card payment rules and the salary rules (your own, and what is recognised automatically), where you can add or delete them.
- **Bills stop being predicted when they stop.** A bill the app found by itself is no longer predicted once a whole cycle has gone by without it (or the latest one is more than 10 days late), or when its last instalment was paid. If it is paid again later, it is picked up and predicted again, so bills that run a few months each year work. Bills you added yourself are untouched. To end one for good, use **Remove bill** (it is never detected again) or **Cancel** in the bill's menu on the Bills page.
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
