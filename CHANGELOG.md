# Changelog

What changed in each version. The web app (Docker) and the Windows app share one version number. Entries under **Windows app** only apply to the installer.

Versions follow semantic versioning: **patch** (0.1.1) for fixes, **minor** (0.2.0) for new features, **major** (1.0.0) for changes that need action from you. The newest section is the version being released.

## [0.12.12] - 2026-10-24

### App
- **Settings: more room between fields** (Profile and other forms), so each hint reads with its own field.
- **Settings: a clearer side list.** Its sections sit under seven plain headings (You, Banks and cards, Sorting, Alerts, Sign-in and safety, Your data, About the app), and the list fits the window. Clearer names: **Where alerts go** (was Notifications), **Password and sign-in** (was Security), **Automatic sync**, **What's new** (was Change log) and **Problems and support** (was Error log). On a phone, the open section's chip stays in sight.
- **Settings: the cards leave room for the round buttons at the side**, so a switch or button at the end of a line is never under them; Preferences' **Language and region** has a globe icon.
- **Settings: Profile, Preferences and Currencies tidied.** Same card layout as the other sections; Currencies shows the ones in use and an **Add a currency** line, with a short note about the rates at the bottom; Profile's buttons are the same size as elsewhere; App icon has its own icon.
- **Settings: the Sorting pages tidied.** Every rule list (Category rules, Tag rules, Display names, Card payments, Salary) has the same card: the form for a new rule, a search box (Display names has one now too), the rules and a short note at the bottom; the empty text no longer says "below" when the form is above, and in Hebrew the arrow in each rule points the right way. **Set up with an AI** has three clear numbered steps and no empty space at the top.
- **Settings: the Alerts pages tidied.** In **Which alerts**, each alert's amount (card charge, large transaction, bill reminder, budget warning) sits right under its switch, and dismissed alerts come back from their own card. **Where alerts go** has the same switches and cards as the other pages, a one-line plain explanation of Telegram, webhooks and ntfy, and the note about what is sent over the internet in the Telegram card.
- **Settings: Password and sign-in tidied.** Two-step sign-in is one line with its On/Off label and its **Set up** button, app lock is a plain switch, and the list of where you are signed in is called **Signed-in devices**.
- **Settings: Connections and Automatic sync tidied.** Every bank card has the same layout as the other sections, with its buttons in its title line; with nothing connected, the page says so and how to start; the one-time-code note sits inside the Connections card; **Sync log** is now **Past syncs**, and the sync settings use plain names (**How far back each sync reads**, **Next sync**).
- **Settings: last touches on a phone.** Switches, short boxes and Delete buttons stay clear of the round buttons at the side, each card's icon sits at the top of its title, **Add** stays beside the currency box, and in Hebrew the System information values read and cut off at the right end; the ntfy example is a home-network address.
- **Predictions say "likely" everywhere.** Bills the app guesses are now **likely bill** / **Likely on** in Activity, **Likely in** / **Likely out** in Activity's header, **Likely** on Recap's calendar, and alerts say a payment was **likely due**. The jar texts talk about the free money **you'll likely have**. "If you expected income…" and a bill's **Expected amount** (a number you type) stay as they were.
- **Help uses today's names.** The Forecast guide names the table's columns **Average**, **Likely**, **Total** and **Trend** and its rows **Saved each month (money in − money out)** and **Money you'll likely have at month's end**; Recap's guide says **Likely end**.
- **Fixed: Accounts no longer counts another currency 1 to 1.** Without an exchange rate it uses the last saved one, the same as Home; with none ever, the account shows its own amount and **not counted yet** instead of a wrong shekel amount.
- **Fixed: Update balance no longer shows ₪0 for another currency.** It uses the last saved exchange rate; with none ever, it shows the balance in its own currency (for example **USD 400**) and **not counted yet**. The balance is saved in its own currency, as before.
- **Fixed: no false "balance changed" item when a card lists a charge at another time than its total counts it.** When leaving out one or a few new charges from around that day makes the card's balance add up, nothing is flagged, and the charge still counts once the total catches up.
- **Fixed: Recap's "Balance after card bills" matches "Your money after known payments".** It rounds each amount first, so the two no longer differ by ₪1, and the two small boxes at the end of Recap lift on hover like the other blocks, without an underline.
- **Fixed: Recap's Today box points at the today dot again**, also at the start and end of the month, when the box itself stays inside the chart.
- **Recap shows there is more below the path.** A small **Next month** arrow under the end of the path leads down to the look at next month (press it to scroll there), and that part's text is wider.
- **Fixed: Home's first tile has no ? any more**, and its (i) sits right after **In your accounts** instead of at the far end.
- **Fixed: the search icon in Activity is sharp again** with the see-through (glass) look, instead of a blur.
- **Fixed: Recap's day bars run left to right in Hebrew too**, the first day on the left, like every chart over time.
- **Fixed: Recap's month graph runs left to right in Hebrew too** (start of month on the left), and the Today box's pointer always meets the box, also at the ends of the month.
- **Settings side list has room to breathe**: more space between the items and above each group, and each settings page fades up when it opens, like the other pages.
- **Fixed: amounts inside Hebrew sentences.** A space before an amount, a comma after it, or a joined "מ-" no longer jumps to the wrong side (for example in the Forecast guide's examples).
- **Forecast guide in Hebrew:** says **קופות** (jars) like the rest of the app and no longer says "we".
- **Bank names come from one list.** Activity, the transaction window and Sync read the built-in bank and card names from one place. Nothing changes on screen.
- **Home: the money in and money out tiles use the key numbers' names.** **Income** is now **Money in** and **Expenses** is **Money out** (same amounts); their tips say **Money in so far** and **Money out so far**, and the help uses the new names.
- **Free to use window shows only its lines.** "How is this worked out?" now lists only the lines that add up to **Free to use**; the older lists of bills and planned spending under them are gone.
- **Key numbers button.** A new round button above the help button opens a side panel with the key numbers: **Known now**, **Your plans**, **This month so far**, **Likely: this month** and **Likely: next month**, each with its name and amount (the same amounts as Home, Recap and the Forecast). Each row has a short tip. Press it again, Escape or × to close.
- **One list of key numbers, one name each.** The same amount now has the same name on Home, Recap, the Forecast and Jars: **In your accounts** (not "Your balance today" or "In your bank today"), **Card purchases not paid yet** (not "not charged yet"), **Upcoming payments this month** (not "Bills due this month"), **Put aside** (jars and the safety cushion), **Free to use** (not "Safe to put in jars" or "Available now") and **Money you'll likely have at the end of {month}** (not "Your remaining amount on …"; **Your remaining amount** is now only today's). Recap's list of payments by day is now called **By date**.
- **Key numbers: clear names, predictions say "likely".** **Your remaining amount** is now **Your money after known payments** (short: **After known payments**) everywhere. **Expected money in / out** is now **Likely money in / out during {month}**. The Forecast's **Saved** row is **Saved each month**, its **Expected** column is **Likely**, and **Amount at month's end** is **Money you'll likely have at month's end**. Amounts that are already known never say "likely".
- **Key numbers panel adds up.** **Known now**: in your accounts − card purchases not paid yet − upcoming payments = your money after known payments. **Your plans**: that − **Left in your budgets** (new key number, the same amount as Home's) − put aside = free to use; below zero it reads **Short by**. A "−" marks each part and a line sits above each result.
- **Left in your budgets comes before Put aside** on Home's money flow (Planned), in its tips, in "How is this worked out?", on Recap and on the Jars page. Same amounts.
- **Home's money flow is lighter.** The small lines under **Put aside** and **Free to use** are gone; their tips explain them.
- **The side panel remembers what it showed.** After a reload, the key numbers or the page guide open again, whichever was open.
- **The side panel slides smoothly.** The page now slides to its new width together with the panel, when it opens and when it closes.
- **Help: the picture of Home's tiles uses today's names** (**In your accounts**, **Saved this month**).
- **New key number: Likely spending for the rest of {month}.** What usually still goes out this month after today, learned from the last 2 full months (not budgets). The Forecast's end-of-month tip and its money out bar tip now use this name for the same amount, and the end-of-month tip lists each part: in your accounts − card purchases not paid yet − upcoming payments − likely spending + income still to come.
- **Fixed: Free to use is worked out once.** Home, Recap and the Jars page used three ways; now all show Home's money flow amount, and every breakdown lists the same parts (in your accounts − card purchases not paid yet − upcoming payments − put aside − left in your budgets). On the demo, Recap's Free to use goes from ₪6,299 to ₪6,334, the same as Home.
- **Fixed: In your accounts includes the accounts you added by hand and marked to count** everywhere (Recap, the Forecast, Free to use, Jars, Key numbers), not only on Home's tile.
- **Fixed: Recap's expected end of the month also takes off this month's card purchases charged next month**, like the Forecast. On the demo it goes from ₪42,079 to ₪38,613, the Forecast's number.
- **Fixed: a bill paid from a jar still counts in the forecast.** A bill a jar pays that is due today or late and not paid yet (like ₪319) is now counted in **End of** this month and every point after it, like any other unpaid bill (once). The forecast looks only at real money in and out, not at jars. This month's amount in the table is now the same number as everywhere else (before, it could be ₪1 apart).
- **Fixed: this month in the Forecast table adds up.** Its bar tip and its opened row now also show what usually still comes after today (**Usually still to come** / **Usually still to go out**), so so far + still to go out + usually still to come is exactly the whole month, in every row, the totals and **Saved**.
- **Fixed: "Still to come" uses the amount the bank lists.** A bill the bank already lists for later counts that payment's own amount, not the bill's usual one, so it matches Activity.
- **Fixed: a regular income that comes a few days late still counts this month.** An income paid in each of the last two months that has not come yet this month counts its usual amount until the month ends, whatever its usual day.
- **Forecast chart:** the badge now says **May dip below zero around** a month. The help explains that a one-time cost is spread evenly over every month (₪955 once in 3 months counts as ₪318 each month).
- **Fixed: alerts no longer list made-up connections when nothing is connected.**
- **Fixed: Home's Planned tab no longer takes a bill paid from a jar off its budget twice.** A bill a jar pays (due later, today or late) comes off its budget row once, so the row shows the right amount still to come (like ₪700 left of a ₪3,000 budget after ₪300 spent and ₪2,000 rent from a jar), and the jar step no longer counts the jar money that pays it.
- **Forecast: income uses its average; jars and the alert use your chosen months.** Each income is now expected to be exactly its average every month (₪16,800 that came in 2 of the last 3 months is ₪11,200 a month); its **Trend** is still shown, for information only. Spending still follows its trend. A row with money in only one of the months shown is its average every month, with no trend (₪10,000 once in 6 months is ₪1,667 every month). The jar forecast and the forecast alert now use the months you chose on the Forecast page (3, 6 or 12; 3 when none was chosen), and the alert also warns when the end of this month is below zero. The **Expected next month** tip and the help say this.
- **Forecast: fixes so the numbers agree.** A row marked **Steady** now expects exactly its average next month (before, ₪162 average could expect ₪154). Recap's "A look at November" and the Forecast now read the same rounded amounts from one place, so a line is never ₪1 apart (like ₪420 on Recap and ₪419 on the Forecast). On the first days of the month, while a card bill is still due, the end-of-month tip's parts add up exactly to its total. The jar forecast no longer takes card purchases not paid yet off twice, so jars get the money really expected to be left (for example ₪9,226 in the first month instead of ₪2,980). A bill jar is now shown filling up to the amount it is refilled to, so its text and its tiles agree. Incomes are never named only with a bank or payment-app word ("זיכוי מלאומי", "bit העברת כסף", "הפק מזומן בנקט"); they use the name you gave, the payer or the category. Money in another currency (like a dollar wallet) is never counted as ₪1 a dollar: until the rates load, the last ones that loaded are used, and with none at all the account is left out of the total and marked "not counted yet". Your own accounts and the words "in your bank and …" now come from your accounts and their names, never a fixed bank name. The help now says the forecast starts from what is really yours at the end of this month.
- **Forecast: the first card shows the end of this month.** It is now **End of** this month, the likely amount on its last day (the same number as the chart's first point and the "31 Oct" step), with how much is in your bank today under it. Its tip goes from your bank today, less card purchases not paid yet, bills due and usual spending still to come, to that amount. In "How next month is worked out", **Today** is now the money in your bank (the same as Home's **In your accounts**), and the end-of-month step shows what is taken off on the way, with the same parts in its tip. The other cards and the chart now name the last day of the month their amount is for (like "31 Jan"), not just the month. The table's last row is now called **Amount at month's end**; the lines in the table are in normal type (only the headings and totals are bold), every line is the same height, and a line's months now slide open and shut smoothly. The coloured top card has the same edge on both sides. The other cards' change is now measured from the end of this month ("vs end of October").
- **Forecast: the same amount everywhere.** Each amount is now rounded to whole shekels once and reused, so a tile and its tip always show the same number (before, "After ₪551 more spending this month" could show ₪552 in its tip), and "How next month is worked out" adds up exactly with the amounts shown. Home's **Your remaining amount** (Current), Recap's **Your remaining amount** and the Forecast's **Your amount now** are now one shared sum, so they are always the same. The **Likely range** and **Expected next month** tips are simpler, the **Trend** head is bold like the others, an opened row shows its months from the row's start (the "Each month" label is gone), and rows open and close smoothly.
- **Forecast: clearer tips and table.** Every tip on the page is short and laid out one idea per line, with bold lead words, lists for choices (like **Based on the last**: 3, 6 or 12 months and what each one does) and money in green, money out in red. The shaded band is now called **Likely range**, with its tip explaining why it widens. The table heads are two lines (**Average** per month, **Expected** next month, **Total** next 12 months), and **Direction** is now called **Trend**. **Saved** and **Balance at the end** use the same text size as the other rows. Opening a row shows each month as a small cell (month above amount) under the bars, with this month marked. The first card shows the bank line first, with the end of this month right under it, and the chart's "1 year" mark is no longer cut off.
- **Forecast: the jar cards are clearer.** Each jar's small chart now shows the same 12 months as the numbers under it (before, it went on for 2 years, so a jar that stays at ₪0 for a year looked like it was rising). When a jar gets less than its monthly amount, the note now says why: jars with a higher priority come first and take the money expected to be left, or too little money is expected to be left after spending. The note has a warning sign at its start.
- **Forecast table: this month matches Activity.** Tap a row's bars: this month shows the same "so far" as the Activity page, and a new line shows the payments still to come this month (like expected bills and charges dated later), which are already in its usual total. **Saved** now shows this month's amount so far too.
- **Forecast table: the lines add up to the totals.** In every column (each month, **Average**, **Expected** next month and **Total** next 12 months) the lines under **Money coming in** and **Money going out** now add up exactly to the total shown (before, they could be ₪1 off); the totals are unchanged.
- **Wording: the app no longer says "we".** Texts that spoke as "we" or "us" now use plain, neutral wording.
- **Home: the money flow shows only real amounts.** It starts from **In your accounts** (the same number as the card at the top), then takes off card purchases not paid yet, **Upcoming payments this month** (bills still due this month and payments already listed for a later day this month, the same list as Recap's "You still have to pay"), what is put aside (jars and the safety cushion), and what is still to come this month (the rest of each budget or usual month), and ends at **Free to use** or **Short by**, the same as the Jars page. The made-up "Before spending" number is gone. A switch shows two views: **Current** (first) takes off only card purchases not paid yet and upcoming payments this month and ends at **Your remaining amount**, the same number as Recap and the Forecast (jars, the cushion and what is still to come are plans, so they are left out); **Planned** (shown first, as before) takes off everything above and ends at **Free to use**. Nothing is taken off twice: a payment a jar pays for is not taken off again with the jars, and a card purchase is only in the card step. The section is now just called **Money flow**.
- **Forecast: clear rules and a simpler table.** The forecast now always learns from exactly the months you choose (3, 6 or 12): this month and the ones just before it, the same for every row, on any day of the month. This month counts what happened so far plus what usually still happens after today (learned from the 2 full months before, payee by payee, without counting a payment twice); a salary that usually comes later in the month and has not come yet counts as coming, also in the end of this month. Pending purchases count just as they do on the Activity page, so this month so far is exactly Activity's total for the month; a pending card purchase is still paid once, with next month's card bill. The six rules are written on the page's help. In "What drives the forecast" each row now shows small bars, one per month (this month striped: part so far, part expected); hover a bar to see its amount, or tap the row to list every month. The columns are **Average per month**, **Expected next month**, **Next 12 months (total)** and the direction for every row. Every row follows one rule: spending counts in the month you buy, card purchases too. **Saved (money in − money out)** is exactly the money coming in less the money going out in every column (below zero means you spent more than came in). The forecast starts from **your remaining amount** on the last day of this month (the balance expected then, less this month's card purchases not paid yet), and each month simply adds what it saves, so **Balance at the end** (your money at the end of each month, after paying for everything you bought) is the month before plus **Saved**, the chart's own number. Every number on the page is this same kind: the chart's "Now" point and the first card are **Your remaining amount now**, the same as Recap's "Your remaining amount" (today's balance less card purchases not paid yet and payments already due), with the bank balance in small text ("₪24,000 in the bank"). The month bars fill the whole group, with the same width for 3, 6 or 12 months, and each bar is a bit wider. It fits a phone without scrolling sideways.
- **The forecast is more realistic.** It now counts money on the day it leaves or reaches your bank: spending counts in the month you buy (card purchases too), starting from your remaining amount at the end of this month. Money that came in only some months counts as much as it came (₪6,000 that came once in the last 3 months counts as ₪2,000 a month). "The last 3 months" is always exactly 3 months: from the 10th they are this month (what you spent so far, plus what each payee usually still pays after today's date, but never a payment that was already made this month: ₪149 paid every month stays ₪149) and the 2 before it. An income that already came this month counts it (₪16,800 in September and October counts as ₪11,200 a month); one that has not come yet uses the full months before, so a salary is never counted short. A category that is going up or down keeps moving only a little, never more than 20% away from its usual month. The rest of this month is worked out from what you usually spend in a day, not from the whole rest of your budgets. "Where it will probably be" now follows the same rules, the jars use the same months ahead, and Recap's "A look at next month" shows exactly the Forecast's first month, step by step.
- **The Forecast shows how it adds up.** A new "How next month is worked out" strip goes from today to the end of next month, step by step, with the same numbers as the chart and Recap. The table has a column for each month it learns from ("Aug, Sept and Oct (so far)"), an "Average per month" column (its head explains that a month with nothing counts as ₪0), this month showing what was really spent so far with "normally ₪1,731" (the whole month the forecast uses) under it, value columns of the same width, an extra older month when an income that has not come yet learns from it, a direction for the totals too, and the balance at the end, which is the chart's own number. Every column head explains itself. Incomes are named with the name you gave them, never a bank word like "זיכוי" or "credit". The chart names every month when there is room. "How next month is worked out" is now four equal tiles joined by → + =: today, the end of this month (with what is still to spend or still coming in), next month (what it saves, with its money in and out) and where you land at the end of next month; on a phone they sit two by two.
- **Forecast help explains each step in plain words,** with small examples: where the forecast starts (the end of this month), how income that comes only some months counts, how card purchases are counted, how an unusual month is softened, and what the shaded area means. The old texts about the removed horizon and method choices are gone.
- **Recap rebuilt as a step-by-step flow:** what you began with, what came in, what you spent, what you are left with today, what you still have to pay, what is worth a look, and the predicted end. Each step shows the sum that leads to the next number, who paid you and where your money went (as pills you can tap), and how much of your credit card spending the bank has not taken yet. "You still have to pay" shows only what is sure to go out (card charges not taken yet and bills still due); what you will probably still spend from your budgets is shown underneath and counted in the predicted end, with the sum that gets there. Credit card purchases now count as spent the day you make them, so the predicted end includes your card bills; a Wise card counts as paid at once. "November will begin with … on its way out" is gone; in the last days it shows the bills expected next month instead. Budgets over their limit, jars that will be short and a category above its usual are together under "Worth a look", and no step opens the Forecast page any more.
- **Recap: the line that joins the steps looks better.** A light dotted trail now shows the whole way from the start to the predicted end, and a solid line fills it in as you scroll, with a glowing dot at its tip. It is one smooth line that passes under the circles, and each circle gives a small bounce when the line reaches it. With reduced motion turned on, the line shows fully drawn.
- **Glass look:** buttons, chips and pills stay solid now; only the blocks and cards are see-through. Windows, menus, pop-ups and tips (chart tips too) are frosted but almost solid, so the text behind them does not show through, whatever Opacity or Blur you choose. Fixed: a drop-down list scrolled to its chosen item, or a long window scrolled down, lost its background and showed the page through it. The sums on Recap are one clean block, without a box around each line. The Recap line now starts with a dot just under the first step, instead of behind its note.
- **Recap follows your month as it happened.** After what you began with, it shows each day money came in, each day a credit card bill was taken, and the spending in between, in date order, each with the sum that leads to the next number. A month with two paydays, or a card bill before or after your salary, shows just that, so the page is as long as your month. Small amounts in are counted with the spending around them. The start icon (a down arrow) under "You began … with" is now where the line starts, and the line has a soft glow. On a phone the start icon sits on the column of circles, so the line runs straight down. The notes under the numbers have a new look: a card with a coloured block holding the icon at its start, set in slightly from the edges with a soft curve, then a short label in the same colour with a small line under it, and the sentence with its amounts in that colour. Upcoming payments use the same card, with the date in the coloured block. In each part, the description, notes, sums, bars, lists and graphs now share one width, so they line up. In a spending step, the sum shows what left your account with its categories under it, then what you spent by credit card with its categories (shown, but not taken off, because it comes out of your account only when the card bill is due), and ends with what is left. Each sum on Recap is now a stack of small cards: what you had, then a card for each change with a coloured block and icon (red-orange for money out, green for money in, purple for credit card spending, which is marked "Not charged yet", with a tooltip that explains it), its parts listed inside, and the result as the last card, now called "Left in your accounts" (or "In your accounts today") instead of just "Left", which sounded like money that had left the account. Under it, a smaller line "After card bills" shows that balance minus what you had already spent by credit card and had not left the account yet. For card bills paid since then it uses the real amount the bank paid, and it says how much of it is an earlier month's card bill and when it left (or leaves) the account. Refunds on a card lower its bill. The lines of each sum now add up in whole shekels (before, rounding could leave them ₪1 apart). A card bill or money in now shows the same whole amount in its own step as in the line that announced it (₪204, not ₪204 in one place and ₪205 in the next). Money in and card bills list who paid you or which card under their line. The wording on the page is plainer: "you paid your credit card bill" instead of "your credit card bill left your account", and the same for the other lines about card bills. "After all that, you are left with" also shows what you spent so far this month, how it compares with last month, and each day's spending. A card bill step now says what that bill paid for, from the purchases it was matched to ("This pays for 2 card purchases, all from October 19"), and its sum lists those purchases, so a small extra card bill in the middle of the month no longer claims to be last month's bill.
- **Recap: card spending is counted in the month it leaves your account.** The app now reads the charge date the card company gives for each purchase (or, when there is none, the card's usual charge day, learned from its earlier purchases and bills). "You still have to pay" counts only card charges and bills that leave your account this month; card purchases charged next month are shown as "Next month's card bill so far", not counted. The predicted end is now what should be in your account on the last day of the month: the part of your usual spending that goes on cards moves to next month, and a note shows what you will have after next month's card bill. Before, the end of the month took off both last month's card bill and this month's card purchases. The card lines use plainer, everyday words, like "Card purchases not charged yet" and "Balance after card bills".
- **Recap has clearer parts for today's money.** "After all that, you are left with" shows your balance, the card spending still to leave it, and what is yours after the card bills, then one note on this month's spending compared with last month, and the daily bars. A new "Free to use" part shows how today's balance is split, the same way as the Jars page: each jar, the safety cushion, what you will still spend this month (bills still due, what is left in your budgets, and what you usually spend where there is no budget, each named), and what is free (next month's card bill is shown there but not taken off, since it leaves next month). Every heading on Recap now opens more about it: the start opens your accounts, a card bill opens that payment, "Worth a look" opens your budgets. "You still have to pay" says what is in it (card bills, other bills, or both), lists each card bill and each bill with its day, and now also counts payments already listed for later this month (like an instalment the card company has sent), so it matches the upcoming payments in Activity. "Worth a look" says what it holds: only budgets ("2 budgets need a look", under "Your budgets"), only the jars, only spending above usual, or a mix ("3 things need a look", with "2 budgets and 1 category spending more than usual"). "Next card bill so far" now shows your balance today, the card bills, and "Your remaining amount": your balance once those card bills are paid, since the rest is already spent. "You still have to pay" and "Free to use" now agree: "Free to use" lists the cushion, the jars (saying how much of them is for payments still due), the payments still due that no jar pays for (under the same name, "You still have to pay"), and "Probably still to spend" (the rest of your budgets and usual spending, without the known payments). "You still have to pay" says how much of it comes from a jar. The last part on the path is now "Where you stand now": what is in your accounts today and what is expected at the end of the month, small and side by side, then your remaining amount, big (today's balance less the card purchases already made and the payments already due), with the graph. Under it, a new part "A look at November" shows the same prediction as the Forecast page's next month: the balance predicted for the last day of this month, less the card bill for what you bought on cards until then, plus next month's predicted income (each source says whether it comes every month, as an average, or is a guess) and less its predicted spending, ending with the balance predicted for the last day of next month. Its heading opens the Forecast page. Forecast: the months ahead now start from the balance predicted for the end of this month, after its card bill, instead of from today's balance, so they no longer skip what is still due this month. The forecast always looks a year ahead (the horizon choice is gone) and has one way of working (the method choice is gone): an unusually big or small month is pulled toward the typical month, then the direction you are heading carries on for up to 6 months, at most half above or below the typical month. It learns from the last 3 months unless you choose 6 or 12. The lines go from what is fixed to what is a guess: next month's card bill so far, the safety cushion, your jars, then what you will still spend this month. "You still have to pay" now lists every bill still due this month (bills a budget pays for were missing), and a new "Your next card bill so far" part shows the card purchases that leave your account next month, by card, with the day each card's bill comes.
- **Fixed: "costs more now" no longer shows for a tiny change** like ₪23 → ₪23 (+1%). A bill's price change now counts only when it moves by at least 2% and at least ₪1, on Alerts, Home and the Bills page.
- **Fixed: a bill no longer shows twice on Activity.** When the bank already lists the bill's payment for a day or a few days after its usual day (like a card charge dated tomorrow), the extra "not seen yet" row is gone, and the bill is not called late or overdue while that payment is on its way.
- **Activity now shows the next payment of a purchase you are paying in instalments.** If this month was payment 9 of 10, next month's payment 10 of 10 shows as expected (and 3 of 8 after 2 of 8, and so on), like the other expected bills. It is not counted until the bank lists it.
- **The "take back from your jars" button on Home now says why:** "Your jars are currently ₪89 over what you have. Lower them by ₪89.".
- **The Sources window has a Sync button on each connected source,** at the end of its row, so you can sync just that one.
- **Fixed: Hebrew that speaks to you now follows your gender setting everywhere** (for example "צרפו אחת אם אתם צריכים" is now "צרף … אתה צריך" or "צרפי … את צריכה"). More verbs and words are covered, and with no gender set it stays in the plural.
- **Alerts:** the History tab no longer sits lower than the Alerts tab, the tabs fade in when you switch, and an alert you dismiss shows as closed in History right away.
- **Forecast page tidied:** the "last 3 months" note, "what this is based on", the method and the jar money line now sit behind an (i) button (on the chart title and on "Based on the last"). "Now" is "Current balance", the chart has equal space on both sides, "Based on the last N months" is the first column heading of the table, and the table has clearer money-in, money-out, total and left-over rows.
- **Forecast: the end of this month is shown.** The **Your amount now** card also shows, in small, what your money will probably be at the end of this month, and the chart now shows only month ends: it starts on the last day of this month, with no point for now. The chart's title is now "How much money you will really have, after all expenses". When you switch between 3, 6 and 12 months, the chart's line moves smoothly to its new place. The card, **Based on the last** and **Balance at the end** have clearer (i) tips. A row with money in only one of the months shows **—** instead of a direction, and the **Saved** and **Balance at the end** rows are no longer underlined.
- **Fixed: the "what's new" window no longer repeats "Includes everything above" for each app.**
- **Categories and Tags page tidied:** the menu and page title say "Categories and Tags", the tabs fade in when you switch, you can keep several categories or tags open at once, the (?) next to the titles is gone, the count after a title is set off with a dot, and both tabs now have the same spacing.
- **Accounts tidied:** the stray "entered by you" next to the Other section is gone, the chart note ("last 12 months") now sits next to the chart title with a dot between, a card's "Purchases by month" chart shows every month since its first purchase (up to 3 years) instead of only 12, and the note above a bank or wallet balance chart now is now just "The balance at the end of each month." In Hebrew the menu and page title say "חשבונות" instead of "חשבונות בנק", matching English. The browser's Back now works like a normal Back on Accounts: opening an account is a step, and Back returns to the list you were just on. An open account stays open when you refresh. The "All accounts" button always shows the list, and its arrow now flips correctly in Hebrew.
- **Glass is back, rebuilt** (Appearance > Style > Surface). Cards, tables, windows, menus, pop-ups and the phone's bars let the background show through, while the background and texture themselves stay as they are. Three sliders appear only with Glass: **Blur** (0 to 100%, how blurred the background looks through them), **Vibrance** (how bright and colourful it looks) and **Opacity** (100% is a solid colour, 0% fully clear). Saved looks keep these settings.
- **Appearance reorganised:** the tabs are now Colours, Backdrop, Style, Layout and Saved. Background and texture moved to the new Backdrop tab, which has five new backgrounds (Aurora, Horizon, Two-tone, Corner glow, Sweep) and a Texture opacity slider. The Custom colour box is laid out in groups with each colour's code. The Rounded font is now really rounded (Nunito, and Rubik for Hebrew).
- **Fixed: Home's "Free to use" now takes off card purchases you have not paid yet,** the same amount Recap and the Forecast take off, because the next card bill will take that money. The money flow shows it under "Before spending", Recap's "Free to use" and the Jars page take it off too, and automatic jar filling no longer gives jars money the card bill will take.
- **Fixed: pending payments now count everywhere the same way as on the Activity page:** Home's six months and last month, Reports, Accounts (money in and out, and the card chart), Budgets and the Jars page.
- **Fixed: a card shows the same amount in Home's Cards box and in its chart on Accounts.** Both now count the same payments: not the ones you left out, and not money moved from the card to your own accounts.
- **Home: clearer names on the top cards.** "Net worth" is now **In your accounts**, and "Net" is now **Saved this month (in − out)**, with "Transfers between your accounts not counted" under it.
- **Settings: the Your data pages tidied.** Backup and restore, Import and export and Change history use the same cards and lines as the other sections. What a backup contains is a short note at the bottom of the Automatic backup card; **Last backup** sits next to **Back up now**; the backup folder box is full width on a phone; **Charges are positive numbers** is a switch with a short explanation.
- **Settings: the About the app pages tidied.** Version and updates, What's new, Server and Problems and support use the same cards as the other sections; update status sits on its own **New versions** line with its buttons, and Problems and support has a **Send to get help** line with Copy everything and Clear the list.

### Windows app
- Includes everything above.

### Linux app
- Includes everything above.

## [0.12.11] - 2026-10-23

### App
- **New: the Mac app** (a .dmg for Apple-chip and Intel Macs, on the release page). It is not signed with a paid Apple account, so each Mac approves it once under System Settings → Privacy & Security → Open Anyway, and it cannot update itself: the app says when a newer one is out and opens the download page. See "The Mac app" in the guide. It has not been tried on a real Mac yet.

### Mac app
- First version.

### Windows app
- Includes everything above.

### Linux app
- Includes everything above.

## [0.12.10] - 2026-10-23

### App
- **Fixed: updating the Linux app (.rpm and .deb) no longer shows the "Force quit or wait" window.** The app now hides its windows before it closes to install the update, so the desktop has nothing to flag while it waits for your password and for the installer. It still closes and opens again by itself.

### Windows app
- Includes everything above.

### Linux app
- Includes everything above.

## [0.12.9] - 2026-10-23

### App
- **The Notifications page now shows the real state.** "Allow notifications" only appears when notifications are not allowed yet, and "Send a test" only when they are. Phone push shows "Turn on for this device" when it is off and "Turn off" (with "Send a test") when it is on. If the computer or browser blocks notifications, it says where to allow them.
- **Fixed: test notifications in the Windows and Linux apps said "Sent" but nothing appeared.** The app now shows the notification itself.
- **Settings now match the device you are using** (Android app, Windows or Linux app, the web app on your home screen, or a browser tab). Notifications show the switches that make sense there ("Show alerts on this device", and "Alerts when the app is closed" only in a browser), and Version and updates shows only the updates, installs and downloads that fit: the Android download link in a browser on an Android phone, the desktop downloads on a computer.
- **Security → Sessions now lists every place you are signed in**: the Android app, the Windows or Linux app, the web app and each browser, with the system, the version and when it was last used. Sign out any of them from the list. Your server must be on 0.12.9 for the list to be complete.
- **The Android lock screen wears the app's own colours** (background, text and accent) instead of a plain grey bar, with the app icon and a rounded button.

### Android app
- Includes everything above.

### Windows app
- Includes everything above.

### Linux app
- Includes everything above.

## [0.12.8] - 2026-10-23

### App
- **Fixed: the Android app lock on older phones (Android 10 and older) said "no fingerprint" even when one was set up.** It now asks for the fingerprint or face, with the phone's screen lock as a second choice.
- **The Android lock screen looks right:** the app's icon and a quiet "Unlock" button, instead of a white bar behind the fingerprint window.
- **Android notifications show the app's icon in the status bar**, not a bell.

### Android app
- Includes everything above.

### Windows app
- Includes everything above.

### Linux app
- Includes everything above.

## [0.12.7] - 2026-10-23

### App
- **Fixed: the Windows and Linux apps of 0.12.5 and 0.12.6 did not open** (nothing happened when you clicked the app). A file was missing from the package. Install this version over it; your data is not touched. A new test now stops this from happening again.

- **Fixed: "Needs review" balance gaps are now the same on every copy of the app.** A gap used to depend on exactly when each copy synced, so two copies with the same payments could show different gaps (or one could show a gap the other never did). Now the app compares the newest balance with an earlier balance plus every payment added since, which gives the same answer however often it synced. There is at most one open gap per account, it grows or shrinks as payments and balances come in, and it closes by itself when the balance adds up. Reviewing a gap, or recording it as a charge, starts counting again from the newest balance.

### Windows app
- Includes everything above.

### Linux app
- Includes everything above.

## [0.12.6] - 2026-10-23

### App
- **Fixed: turning on the Android app lock gave "This phone has no fingerprint…" even when one was set up.** It now turns on, and any other failure gets its own message.
- **Settings → Security is now under "Your data"**, not "You and the app".
- **Fixed: "Needs review" balance gaps now close by themselves when the balance adds up over the whole period.** Before, two copies of the app with the same payments could show different gaps, because each gap depended on exactly when that copy synced. A drop and a later rise that cancel out (a hold on a card, a charge that went away and came back) no longer stay open. Gaps that really do not add up still wait for you.
- **New: alerts as notifications in the Android app.** Turn them on in **Settings → Notifications** (and allow notifications when the phone asks). The app asks your server for new alerts about every 15 minutes, also when it is closed, and shows each as a phone notification. **Send a test** shows one at once. Your server must be on 0.12.6 or newer. This does not use Google or any outside service.

### Android app
- Includes everything above.

### Windows app
- Includes everything above.

### Linux app
- Includes everything above.

## [0.12.5] - 2026-10-23

### App
- **New: the Android app.** A real app for your phone (an APK on the release page): its own screens, with the data from your own server, a list of servers, a check that the app and the server fit, and an **app lock** (fingerprint, face or the phone's screen lock) that you turn on in **Settings → Security**, with a choice of how long you can be away before it asks again. See "The Android app" in the guide.
- **Apps and servers now fit by "API level", not by version number.** A newer server keeps working with an older app (and the other way round) until something they both depend on really changes. When they do not fit, the app says so in plain words. Servers 0.12.1 to 0.12.4 count as level 1.
- **The desktop apps' menu has an update line** (**Check for updates…**, **Download update**, **Restart and update**), and the **⋮** button shows a small dot while an update is waiting.
- **No gap at the top of the desktop apps' window.** The page runs up to the top edge, with an invisible area to drag the window and the **⋮** button on top of it.
- **Settings → Version and updates** shows the phone app's own version and where to get a newer one.
- **Fixed: the app opens with the last data it saw** also when a proxy in front of your server answers with an error while the server is down.

### Android app
- First version. Not in an app store: download **Money-Manager-x.y.z.apk** from the release page and install it. No phone notifications and no file saving (exports) from inside the app yet; use the web page for those.

### Windows app
- Includes everything above.

### Linux app
- Includes everything above.

## [0.12.4] - 2026-10-23

### App
- **Fixed, for real: "Cannot reach the server" in the desktop apps' "My server" mode.** Big answers from the server (your data) were damaged on the way when the server compressed them, so the app could sign in but not load your data. They now arrive intact.
- **Fixed: closing the app no longer hangs** ("Force quit or wait", also when an update restarts it). The app closes its local server properly and never waits more than a few seconds.
- **Fixed: the background bank connector no longer stays running after the desktop app was force-quit.** It now ends by itself when the app is gone.
- **The desktop apps' menu is reachable again.** The window has no system menu bar, so there is a ⋮ button at the left end of the title strip that opens it (servers, version, check for updates, quit). Pressing Alt on its own opens it too, and Ctrl+Q quits.

### Windows app
- Includes everything above.

### Linux app
- Includes everything above.

## [0.12.3] - 2026-10-23

### App
- **Fixed: "Cannot reach the server" in the desktop apps' "My server" mode** when the server's certificate comes from your own home network's authority. The app's own screens now reach the server the way a browser does, so they trust what your computer trusts.
- **Fixed: going back to "This computer" after viewing a server no longer shows "PGlite is closed".** This computer's private database now keeps running in the background once opened (and keeps syncing) until you quit the app.

### Windows app
- Includes everything above.

### Linux app
- Includes everything above.

## [0.12.2] - 2026-10-23

### App
- **The title strip of the desktop apps blends with your background.** It is see-through (what scrolls under it is blurred), instead of a flat dark band across the top. The window buttons have no background of their own either.
- **Messages, the page guide and the attachment viewer start below the title strip,** so the window buttons never cover them.
- **"Check for updates" no longer shows an error while a new release is still being built.** It says you have the latest version until the files are ready.

### Windows app
- Includes everything above.

### Linux app
- Includes everything above.

## [0.12.1] - 2026-10-23

### App
- **Docker: optional automatic updates.** One extra file (`docker-compose.autoupdate.yml`) updates the app and the scraper by themselves every night when a new release is published. It is optional because it needs access to Docker.
- **Windows and Linux apps: the Server menu shows the app's own version and has "Check for updates…".** It is the one place to see the app's version when the window is showing your own server, whose Settings show the server's version.
- **Windows and Linux apps: the window buttons match your server's colours,** also when the server is an older version. The buttons used to sit on a white box; now the app remembers the colours and draws the title strip itself when the server's page has none.
- **Settings: the server list moved to its own page, Settings → Your data → Server** (desktop apps only). "Version and updates" is only about versions again.
- **"Install on this device" only shows in a browser,** not in the installed app or the desktop app, and now also offers the **desktop app** for download (Windows, or Fedora/Ubuntu/AppImage on Linux) from GitHub.
- **Desktop apps in "My server" mode now show the app's own screens with your server's data,** not the server's pages. So what you see is the version you installed, and it updates itself, while the data, your saved logins and the bank syncing stay on the server. It works when the app and the server have the same first two version numbers (for example 0.12.x with 0.12.x); otherwise the server's own pages are shown, with a note. The server's sign-in status now also reports its version.
- **A new documentation site and a rewritten README,** with install guides for Windows, Linux, Docker and your phone, a tour of every screen, and new screenshots in light and dark, English and Hebrew.

### Linux app
- **On GNOME, closing the window quits the app** (GNOME has no tray to bring it back from, so it used to stay running out of sight). Everywhere there is now a **Quit** in the Server menu, and Ctrl+Q.
- **Software centres (GNOME Software, Discover) show the app's name, description and coin icon** when you open the .rpm or .deb, instead of a gear and the package name.

## [0.12.0] - 2026-10-23

### App
- Internal: the app's tests no longer depend on the computer's time zone.
- **The app's own icon is always the coin.** The coin, drawn exactly like the installed app's icon, is now the default app icon (loading screen, sign-in); the shekel and other currency icons are still a choice in Settings → Preferences → App icon.
- **Sign-in and first password screen: the icon is the general coin icon, next to the title** (it was the shekel tile above it, and it was hidden on phones).
- **Activity lists: a row keeps the payment tags (instalment like 3/4, expected bill, upcoming, pending) and shows up to three tags next to its name (they all move under the name when they do not fit beside it); any others become one "+N" tag** that names them when you point at it, so the name is never squeezed out. The full set is still in the transaction window.
- **Fixed: urgent alerts were sent to your phone again every time you opened or refreshed the app.** The app now remembers, on each device, which alerts it has already told you about, and only tells you about new ones (an alert that goes away and comes back is announced again).
- **Alerts: each alert now shows when it first appeared** (for example "Appeared 12 Oct, 14:30"), on the Now tab as well as in History.
- **Forecast: the shadow under the "What drives the forecast" table is no longer cut off** (it looked like a square corner in the Raised look).
- **Raised look: tables no longer show a straight bottom line that stops at the rounded corners.**
- **Tables: the last row now follows the table's rounded corners** (for example "Left over" on the Forecast page).
- **Forecast: the help ? for the three choices on top now sits next to "Forecast horizon"** instead of on a row of its own.
- **Forecast: "What this is based on" is shorter.** It keeps your monthly income and expenses and the months used; the rules (what counts as income, one-offs, card payments) are in the page's help.
- **Forecast: the long explanations moved to the help panel.** The page keeps just "Based on the last N months" and one short line under the jars; how it is calculated (no AI, the trend line, what is left out) is now in the page's help.
- **Recap: "Take back from the jars" is now a button chip right under the jars warning,** like the warning itself, instead of a paragraph with a button. It is shorter, and the longer explanation shows when you point at it.
- **Recap: "Today" on the month's money line now sits in a small box right under its dot,** instead of in the middle, so it matches where today really is and never crowds the start and end amounts.
- **Recap: numbers and their pictures now animate together.** The graphs, bars and lines used to wait a second or two after the numbers counted up; now they start at the same moment.
- **On every rules page, the form for a new rule is now above the list of rules.**
- **Fixed: the Alerts settings button on the Alerts page now opens the alert settings.**
- **Alert notifications show the app's symbol in the phone's top bar** instead of a white square.
- **Categories and tags is now a page to read your money.** Each category and tag shows money out, money in, in minus out, a usual month and how it changed, for the last 3, 6 or 12 months. Open a row to see its latest payments and a month-by-month chart. Adding, renaming and deleting are in each row's ⋯ menu. Also shows this month and last month, a budget column (with "Set a budget" when there is none) and more; choose the columns you want, click a column title to sort, and add a tag even before any payment has it. Money in shows with + in green and money out with −; this month or last month turns red when it is above the usual month. Every column title explains itself when you point at it, and "Set a budget" starts at the usual month.
- **All the sorting rules moved to Settings → Automatic sorting:** category rules, tag rules, display names, card payments and salary, each in its own section.
- **Let an AI set up your sorting.** The app no longer comes with a ready-made list of categories, rules and shop names. In Settings → Automatic sorting → Set up with an AI you download the names in your transactions (no amounts, dates or accounts), copy the instructions into any AI chat, and it first shows you a table to check. Its answer sets up categories, tags, category rules, tag rules, display names, card payments and salary at once. You see every row with a checkbox before anything is added, entries you sorted yourself keep their category, and Undo works. Your existing categories, rules and tags stay as they are.
- **Fewer false "Needs review" items about balances.** A card whose debt went down because the bank paid it no longer shows as unexplained: the payment in the bank explains it. Old history brought in by Import history no longer looks like new money. When several purchases arrive at once, each one now explains the exact change it caused, so no odd leftover amount moves to the next item.
- **The example on the name rules page uses a made-up employer name.**
- **A card's balance is explained as what you owe.** Instead of "₪30 arrived in this account", it says "You owe ₪30 less on this card".
- **The app has been rebuilt from the ground up.** It looks and works the same, with the same pages, words and settings in English and Hebrew, but it is now built in a modern way (Vue), so it is faster to improve and easier to keep working well. Your data, your look and your settings stay as they are.
- **Undo for almost every change**, in the "Saved" message and in Settings → Change history, not only for a few kinds. Deleting transactions still has no Undo.
- **Escape closes the newest pop-up first**, then the next one.
- **Every "Are you sure?" is the app's own box**, never the browser's.
- **The app opens without a connection** on a phone or computer where it was used before, showing your last data.
- **Smaller things:** income from a source going up is green on Reports; adding an account from Home shows where to find it; a jar's history has "See all", with All / Put in / Taken out / Payments; a bill's ⋯ menu has "Show in Activity"; Enter adds in every box on Categories and tags, and the rename box shows the name in your language; after adding a tag the suggestion list closes so it does not cover the buttons; Recap's day bars name the payees; more of the app is in Hebrew (colour set names, bank names in filters, the help guide's pictures), and names like "10bis" read the right way.
- **Pages now have real addresses.** Going to Jars shows `/jars` instead of `#jars` (and `/settings`, `/activity` and so on). You can open or share any of them directly, and the back button works. Old `#jars` links still open the right page.
- **The number on a menu item stays visible when you point at it.** It is no longer covered by the highlight.
- **The line on each budget bar is easier to see and use.** It now sticks out above and below the bar, and the small cut-off info icon is gone. Point at the line (or tap it on a phone) to see what it means: where the month is now. In Hebrew the line is now on the correct side too. The mouse pointer over it is always the normal arrow, never a question mark.
- **Recap explains the "Take back from the jars" button.** A short note now says why it shows up and what it does: it only lowers what is saved in your jars, nothing moves in your bank.
- **Settings is easier to find your way around.** The sections are now in five clear groups: You and the app, Banks and cards, Your data, Alerts, and About. On phones the group names show between the buttons.
- **The Categories page is now called "Categories and tags".** Its tabs are ordered with your categories and tags first, then the automatic rules. "Other rules" is now "Card and salary rules".
- **App icon fixed.** The browser tab, the home-screen icon and the installed app now always show the coin icon. Before, the tab could show a ₪ sign instead. Old copies are refreshed automatically.
- **Live updates.** A change now shows in every open window and device within a second, with no refresh. A new bank sync or a changed category appears everywhere on its own.
- **Smoother animations:** the Recap page and other animated numbers no longer slow the whole app down while they count up, so scrolling and movement feel smooth.
- **Sidebar highlight:** when you switch pages, the highlight now stretches and glides smoothly to the new item. It no longer jumps to the side when it starts, or keeps moving after it lands.
- **Change history in Hebrew:** changes to a jar (its name, goal, monthly amount, deadline and so on) now show in Hebrew too. The Hebrew for history lines and server messages is now a much smaller part of the app, so it loads faster; everything else looks the same.
- **The app opens faster, mostly on phones.** It now downloads about a third less before it can start: the texts of the other language, the help guide and the pop-up windows come later, when they are needed. They are still kept on your device, so they also work without a connection.
- **Each page loads only its own look.** The app's styles are now in small files, and each page brings its own when you open it; styles nothing used any more are gone. Nothing looks or moves differently.

### Windows app
- Includes everything above.
- **The window's title bar matches the app.** The system title bar is replaced by a strip in the app's colours (it follows light, dark and your look); the window buttons sit on it, and you can drag the window by it. The same in the Linux app.
- **Use your own server instead of this computer's database (also in the Linux app).** The first time you open the app on a new computer it asks where your money is kept: **This computer** (its own private database, works offline) or **My server** (the address of your Money Manager, for example `money.home`). You can keep several servers and switch from **Settings → App and data → Server**, the **Server** menu (Alt) or the tray icon; nothing is deleted when you switch, each one keeps its own data, and its logins stay separate. A server with its own security certificate is accepted once you confirm its fingerprint. An installed app that already has data stays on this computer without being asked.

### Linux app
- **New: Money Manager for Linux.** The same app as the Windows one, with its own database and bank scraper inside and nothing to set up. Three files on each release: an AppImage (any Linux), a .deb (Debian, Ubuntu, Mint) and an .rpm (Fedora, Red Hat, openSUSE). The AppImage adds itself to the app menu with the coin icon the first time it runs. Your data is kept in `~/.config/Money Manager`. Saved bank logins are locked with the desktop's keyring when there is one, otherwise with a key file in the data folder.

## [0.11.0] - 2026-10-16

### App
- Phone push notifications: alerts now reach your phone even when the app is closed. Turn it on in Settings → Notifications → Phone push (needs the app opened over https).

### Windows app
- Includes everything above.

## [0.10.0] - 2026-10-16

### App
- **Activity: a calendar for custom ranges.** Picking "Custom range…" opens a calendar for two dates, with the dates also typeable, quick presets, and the dates shown as text in the filter. The time frame menu no longer wraps.
- **Activity: clearer totals line.** It says "Filter results" or "All activity", and what is left out of In, Out and Net. Its tooltip explains each item, and In, Out and Net have their own tooltips.
- **A new entry window.** Details are always shown on one side. Name, category and tags, Note, Documents, Actions, How it's counted and Change history are closed sections on the other side. Attach a document and Copy details sit in the footer, and actions that change something now ask first.
- **Clearer tooltips on every entry pill**, in plain language, including a hover that shows an entry's note. Names are cleaned of leftover HTML tags.
- **Needs review:** names, dates and amounts are bold in every explanation.
- **Export page:** a tidier layout, cards that follow your appearance settings, a redesigned More filters, Reset and Download on the right, and a sticky preview.
- **Appearance:** Colour, Style and Layout tabs, custom atmospheres with every colour, and saved looks you can assign to light and dark. Language, date format, first weekday and app icon moved to Settings → Preferences.
- **Hebrew:** group headers, the minus sign on the left of amounts, calendar and icon directions, and the new text were checked and translated.
- **Sources popup** shows each connection's progress while syncing, and the sync bar follows the app theme.

### Windows app
- Includes all of the above.

## [0.9.0] - 2026-10-16

### App
- **Rename entries.** Open an entry and give it a display name (for example "Salary" instead of "זיכוי"). Only what you see changes: the bank's text, your rules, bills and reports still use the original, which the entry shows as "Original name".
- **Name rules.** In Categories → Name rules, or with "Rule…" in an entry, name every entry that matches. A rule can look in the description, memo, from, to, note or anything, and match "contains" or "is exactly". A name you give one entry by hand beats a rule.
- **Display names everywhere.** Activity, Home, Recap, alerts, dialogs, payment history, jar history and the attachments viewer show the display name.
- **Bill jars can cover all bills, all regular bills or all irregular bills.** Irregular bills count as their last 12 months divided by 12.
- **American Express sign-in.** Dropping a leftover sign-in now keeps the cookies the bank's bot protection uses to recognise this browser, and failed-login messages are longer and show what the browser did, without the stack trace.

### Windows app
- Includes all of the above.

## [0.8.1] - 2026-10-16

### App
- **American Express: a leftover sign-in no longer breaks the connection test or sync.** If the saved browser is still signed in (for example after "Verify this device"), the bank sends the login page on to the signed-in site and the first request failed with "Failed to fetch". The app now drops that sign-in (first the cookies that end with the browser, then, only if needed, all of the bank's cookies) and loads the login page again. Other banks are not affected.

### Windows app
- Includes all of the above.

## [0.8.0] - 2026-10-16

### App
- **Make your own atmosphere.** Pick "Custom" in Appearance to choose the accent, gradient colour, background, text, tint, positive and negative colours and the 7 chart colours, separately for light and dark. Start from any preset or from one base colour. A new "Gradient strength" slider sets how strong the background gradient is.
- **Save your looks.** The new Saved tab in Appearance keeps any number of named looks (up to 25). Set one to be used in light mode and one in dark mode, and it applies when the mode changes. Saved looks are kept in the database with your other preferences, so they follow you across devices.
- **A tidier Appearance panel.** It now has Colour, Style and Layout tabs. Picking from a drop-down no longer closes the panel.
- **Language, date format, first day of the week and the app icon moved to Settings → Preferences**, because they are app settings, not looks.

### Windows app
- Includes all of the above.

## [0.7.2] - 2026-10-16

### App
- **A balance gap that pending charges already explain no longer asks you to review it.** When the charges still pending on a card add up to the drop in its balance, the gap closes right away (no waiting for another sync), and until then it is hidden from Needs review and from the review alerts. The pending charges still show in the "pending charges" alert, which you can open and dismiss.
- **A balance gap that matches an expected bill is only an alert.** For example "Isracard: ₪24 left, probably Spotify" no longer sits in Needs review. It closes by itself when the bank lists the charge.

### Windows app
- Includes all of the above.

## [0.7.1] - 2026-10-16

### App
- **A balance gap made of several pending charges closes by itself.** If your card balance drops by the total of two, three or any number of charges the bank still lists as pending, the "balance went down with no matching transaction" alert (and its item in Needs review) now clears at the next sync. Before, only a single charge could explain it.
- **Pending charges get a plain alert.** "Max: 2 pending charges (₪311)" tells you the charges are already in your balance and listed in Activity, and goes away when they settle. You can open it and dismiss it, and turn it off in Alert settings.
- **Bills follow the days they are really charged.** A bill the app found on its own now takes its day of the month from its last few charges, so a bill charged on the 16th is no longer predicted for the 15th.
- **An expected bill stays in Activity until its charge appears.** When a bill's day has come but the bank has not listed the charge yet, it shows as "not seen yet" instead of disappearing.
- **A balance gap that matches an expected bill says so.** For example "Isracard: ₪24 left, probably Spotify", with a note that the bank has not listed it yet and nothing is needed from you.

### Windows app
- Includes all of the above.

## [0.7.0] - 2026-10-15

### App
- **Activity has a new layout.** A connected filter bar (time frame, source, category, tag, type, and Clear filters) with a summary under it: "Totals for N transactions", what is not counted, and In, Out and Net separated by dots. Search, Group by and Sort sit right above the table. The In and Out numbers are plain, and Net is red only when it is negative.
- **Export is a tab, not a popup.** It sits next to All activity and Needs review, uses the full page width with a live preview and a summary that stays in view, and you can now name the file. It starts from your current filters.
- **Groups open and close smoothly.** A group slides shut by its own height without touching its rows, the table header sticks to the top (with the whole row's shadow), and the group you are viewing sticks right under it. Groups that are all upcoming show Expected in, Expected out and Net. A group with upcoming items has an info icon on Out so far that shows what is still to come, the total out and the net.
- **New setting: first day of the week** (Sunday or Monday), in Appearance. It decides what This week and Last week mean and how Group by week works.
- **Popups fade out the way they opened,** towards the button that opened them.
- **Even spacing on every page.** Jars, Bills and Forecast had gaps that did not follow the spacing setting; all pages now match at Tight, Normal, Loose and Wide. Tabs that sit on the page background use the surface colour.
- **Home tooltips and wording.** Free to use, Available now and the budget bars are explained more clearly, an over-budget bar shows an alert callout, and a Wise account shows its currency (for example Wise (ILS), Wise (USD)). All the new text is translated to Hebrew.
- **Bills:** an irregular bill that starts to look regular (monthly, every 2 months or yearly) gets a suggestion to make it regular.
- **Releases and tests no longer run on every change** on GitHub, only when the changelog gets a new version.

### Windows app
- Includes all of the above.

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
