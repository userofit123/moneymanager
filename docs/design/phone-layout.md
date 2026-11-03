# Phone layout guide (round 2)

**Every phone page is the computer page, adapted.** Same blocks, same order, same content, icons, colours, badges and
charts; only the layout changes for one column and a finger. Nothing phone-only (no opening sentence, no extra rows),
nothing missing. Drop a computer item only when it truly cannot work on a phone, and then give its phone form.
Home (`phone/screens/HomeScreen.vue`) is the reference: compare it with `views/Home.vue` side by side.

Method per page: screenshot the computer page, list its blocks, build each with the parts below, reuse the computer's
numbers (`pagelogic/`, `lib/`) and icons (`glyphIcon`, `brandIcon`), then compare both screenshots (en+he, light+dark).

## The computer's building blocks on the phone

| Computer | Phone | Where |
|---|---|---|
| Section heading `h2` (small grey spaced capitals) with "All →" | `ListGroup` heading: same look, link "All" with a chevron. `bare` = no card (the slot brings its own) | `.ph-group-h` |
| `.card` | `.ph-card`, or `ListGroup pad` (content) / `ListGroup` (rows) | `.ph-group-b` |
| Amount card (`.card .lbl .val`): icon, name, chip, big amount, line under, sparkline; `.hero` highlighted | `AmountCard` (`icon`, `label`, `chip`, `value`, `sub`, `spark`, `hero`, `@tap`; slots `label`, `sub`, `foot`) | `.ph-acard` |
| KPI row (4 cards) | `AmountCard`s in a 2-column grid; the highlighted one and one without a chart across the full width | `.ph-home-kpis` |
| Grid of many cards (accounts) | `SwipeCards`: 3+ cards slide sideways (next one peeks, snaps); 1–2 stack | `.ph-swipe` |
| Donut + legend | `DonutChart` (ring above, legend rows below, tap = pick) | `.ph-donut` |
| Bars (`.bar`, with `u` marker) | the same `.bar` markup (computer CSS), `display: block` | |
| Badges (▲/▼ %) | pill with a chevron turned up/down, same colours (green = good) | `.ph-home-bd` |
| Tabs in a heading (`BaseTabs`) | `Segmented`, full width in `ListGroup`'s `top` slot | |
| Rows of a list (bills, activity) | `ListRow` inside `ListGroup`; letter tile = rounded square in the category colour | |
| Line chart with hover readout | same SVG and grid; touch/drag shows the day's value in the heading line | |
| Steps with − and = (money flow) | step tiles in 2 columns, the result tile highlighted; a wide column chart becomes one bar per step | |

## Rules

- **Hover tooltip** → the same text on a tap (`explain(tip)`, a sheet). A card or row that had a tooltip is tappable.
- **Wide table** → one row per line (`ListRow`: name and second line at the start, amount at the end); columns that
  do not fit go into the second line or the item's own screen. Never scroll a table sideways.
- **Toolbars and filters** → `Segmented` for 2–4 views, `SearchField`, `ChipBar` for filters, rare actions in the top
  bar's ⋯ (`ActionSheet`). The computer's floating buttons (ideas, alerts, add) are top-bar icons.
- **Two columns of blocks** → one column, in the computer's reading order (left column first, then right, as
  `CardColumns` lists them).
- Top bar, large title with `SyncLine`, tab bar, pull to sync and sheets stay as they are.

## Spacing and type

Side margin `--p-gut` (16px, 20px from 400px). Between sections `--p-gap` (32px); heading to card 10px; inside a card
16px; tiles 8–12px apart. Section heading 12.5px/650 spaced capitals (`--tx2`; Hebrew 14px, no spacing). Amount card:
name 13px, amount 28px (hero 34px, half-width 24px), line under 13px. Row title 16px, second line 13px. Amounts use
`.ph-amt` (tabular, left to right in Hebrew). Tap targets 44px. Every rule starts with `html.phone`; logical sides only.

## Motion

Every page moves the same way, with the steps in `phone/styles/components.css` (shared motion): `ph-up` (a block
fades up; blocks and cards one after another with a small delay each), `ph-fade`, `ph-fill` (a bar fills by width),
`ph-grow`/`ph-growx` (columns or bars scale in), `ph-height` (small month bars grow), `ph-draw` (a line draws in),
`ph-wipe` (a chart is uncovered from the start side), `ph-rise` (columns uncovered upwards), `ph-pop` (dots, circles),
`ph-ring` (a ring turns into place), `ph-arc` (a ring's arc fills). A page's file only says which of its parts use
which step; it never defines its own copy (Recap's scroll-in steps are its own). Everything tapped gives a little
under the finger (`scale(.97)`), the computer's hover. Each page turns its motion off with `prefers-reduced-motion`.

## What is built (round 2)

All pages and pushed screens follow the computer's page block by block: Recap, Home, Activity and a transaction,
Jars and a jar, Bills and a bill, Forecast (tabs); Accounts and an account, Budgets, Reports, Alerts, Categories
and a category, Settings and each section (from More). More lists the computer's side menu without the tab bar's
pages. Windows (`components/forms/`, ask, ⋯ menus, sign-in, forgot password, recovery key) open as phone sheets or
cards with the computer's layout. Reports reuses the computer's `styles/pages/reports.css`; it only adds to what the
computer already loads on its own Reports page, so a window resized from phone to computer looks the same as a fresh
computer load.

## Plan per page

- **Activity**: computer toolbar (search, filters, group/sort) → `SearchField` + `ChipBar` + ⋯; the table → month bands
  with `ListRow`s (letter tile, name, category · date, amount); totals per month in the band.
- **Recap** (done): the computer's zig-zag path of circles → one route down the start side (circle, then the part beside
  it); the plain parts at the end centred as on the computer; sums always open as the same stack of gradient cards.
- **Accounts**: totals cards → `AmountCard` grid; each bank group → section with `brandIcon` rows and balances;
  cards → `AmountCard` with this-month bar and badge.
- **Jars**: summary cards → `AmountCard`s; jar cards → `SwipeCards` of jar cards (ring, amount, goal bar) or a list
  when many; free-to-use card as on the computer.
- **Bills**: summary tiles → `AmountCard`s; the bills table → `ListRow`s grouped as on the computer (due date, amount,
  badge for overdue/changed); calendar strip as a swipe row.
- **Budgets**: month total card → hero `AmountCard`; each budget → the computer's line (name, spent / limit, `.bar`
  with today marker); tabs → `Segmented`.
- **Reports**: chart picker → `Segmented`/sheet; each chart full width in a `ListGroup pad`; KPI cards → `AmountCard`s;
  table → rows.
- **Forecast** (done): the four balance cards → `AmountCard`s (the year highlighted); the computer's chart at the
  phone's width with the month read out above it; the sum tiles one under the other, their signs on the seams; the
  table → one card of lines (name and amount, then month bars and trend), the column picked with `Segmented`, a line
  opens in place; jar cards → `SwipeCards`; Years ahead → its tiles, choices and chart in one card.
- **Alerts**: the computer's alert cards (severity dot, title, text, actions) → rows with the dot; actions in the
  alert's sheet.
- **Categories**: category cards/table → `ListRow`s with the letter tile and colour, month amount and bar.
- **Settings**: the computer's sidebar → the Settings list; each section's cards → `ListGroup pad` cards, same order.
- **More**: the computer's sidebar items not in the tab bar, as `ListRow`s with the same icons.
- **Pushed screens** (account, jar, bill, category, transaction): the computer's window/side panel → a screen with
  the same header block (icon, amount, name) and the same sections.
- **Popups**: the computer's forms (`components/forms/`) open as `PhoneSheet` (`cls="ph-adopt"`), same fields and order.
