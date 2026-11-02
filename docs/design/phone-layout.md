# Phone layout guide

The phone app (`frontend/src/phone`) is one calm column that reads like the computer version: the same colours, the
same card (a raised surface with a hairline), plain headings. Every screen uses the same skeleton, spacing and parts,
so a person learns it once. Sizes live in `phone/styles/tokens.css`; use the variables, never new numbers.

## Page skeleton (top to bottom)

1. **Top bar** (`PhoneScreen`): Back with the name of the screen under it, or on a tab's first screen the level pill.
   At the end up to two icon buttons (`IconButton`, slot `actions`) plus `?` (the guide) added by the frame.
2. **Large title** (`.ph-title`, 32px): the screen's name. It moves into the bar as the page scrolls.
   A sync line (`SyncLine`) may sit under it (slot `sub`).
3. **The one answer**: `HeroSentence`, a plain sentence with its amounts large ("₪4,210 is free to use until the 1st.")
   and at most one "How is this worked out?" link. Detail screens (an account, a jar, a bill, a transaction) use their
   centred heading instead (icon, the amount, the name).
4. **Controls** that change the whole page, directly under the answer: `Segmented` (2–4 views), then `SearchField`,
   then `ChipBar` (filters).
5. **Sections**: each one a `ListGroup` with a heading, one card, and an optional note under it.

`.ph-content` stacks the parts with `--p-gap` (32px) between them. A screen never adds its own outer margins.

## Spacing

| What | Size | Variable |
|---|---|---|
| Side margin of the page | 16px (20px from 400px wide) | `--p-gut` |
| Between sections | 32px (24px inside a sheet) | `--p-gap` |
| Section heading to its card | 10px | `--p-head` |
| Inside a card | 16px | `--p-pad` |
| Small steps | 4 8 12 16 24 32 | `--p-s1` … `--p-s6` |
| Smallest tap target | 44px | `--p-hit` |

Nothing touches the screen edge except a chip row scrolling sideways (it fades out at the edge).

## Type

| Role | Size / line | Weight |
|---|---|---|
| Large title | 32 / 38 | 700 (Hebrew 600) |
| Opening sentence / its amounts | 22 / 30, amounts 34 / 40 | 500 / 700 |
| Section heading (`ListGroup` title) | 19 / 24 | 650, sentence case, never capitals |
| Row title, body | 16 / 22 | 500 |
| Second line, notes, labels (`.ph-meta`) | 13 / 18 | 400, `--tx2` |
| Small number in a tile | 20 / 26 | 600 |

Amounts use `AmountText` or `.ph-amt` (tabular figures, left to right in Hebrew).

## Parts and their classes

- **Card**: `.ph-group-b` (inside `ListGroup`) or `.ph-card` for content that is not rows. Surface `--p-surf`, 1px
  `--p-card-line`, radius 16px. One card style everywhere; no shadows on cards, no gradients, no coloured backgrounds
  except a warning box.
- **Section**: `<ListGroup title note more pad>`. `more` puts a "See all" link at the end of the heading line.
  `pad` gives the card 16px inside, for a chart, a sentence or a form. Slot `top` holds a control or an empty state.
- **List row**: `<ListRow>`. Icon tile 40px (`.ph-tile`, colour by `tone`), title, second line, value or amount at the
  end, chevron when it opens a screen (`link`). One line 52px high, two lines 60px. Hairlines start after the icon.
- **Number tiles**: `StatTile` inside `.ph-stats` (two columns, equal height, 12px apart). Use them for 2 or 4 numbers,
  never 3.
- **Segmented**: `Segmented` (the computer's tab row): a grey track with the picked choice as a raised pill. Full width.
- **Chips**: `ChipBar` for filters; a chip that is on is tinted and has ×.
- **Search**: `SearchField`, 44px high, card surface.
- **Buttons**: `.ph-btn` (filled, the screen's one main action), `.ph-btn.tonal` (second), `.ph-btn.plain` (quiet, on
  a card), `.block` for full width. `.ph-link` for text links. Icon buttons `IconButton` (44px).
- **Progress**: `ProgressBar` (6px) and `ProgressRing`; warning and over use `warn` / `neg`.
- **Empty state**: `EmptyState` (icon in a soft circle, one line, one sentence, the action that fills it). Inside a
  section put it in the `top` slot, not in a card of its own.
- **Loading / errors**: `SkeletonRows` inside the card; `LoadError` with Try again.
- **Sheets (popups)**: `PhoneSheet` (handle, 20px title with a round Close, scrolling body, footer for the buttons).
  `size="fit"` grows with its content; `large` for forms and long lists. Choices: `ActionSheet` and `PickerSheet`.
  Computer forms opened on the phone get `cls="ph-adopt"` (styled in `adopted.css`).
- **Toasts**: a compact dark bar (light in dark mode) just above the tab bar; the icon tells the kind; Undo in the
  app's colour. Placed by the shell; screens never move them.
- **Tab bar**: five tabs, the open one's icon in a pill, counts as red badges. Nearly opaque, so content behind it
  never shows through.

## Light, dark, Hebrew

- Page: `--bg` on every screen (no glow). Cards `--p-surf`; in dark mode they are lifted 6% and the hairline is softer.
  Sheets use `--p-sheet-bg` (a step above the page in dark mode).
- Colours only from the app's tokens (`--acc`, `--accc`, `--pos`, `--neg`, `--warn`, `--tx`, `--tx2`), so every
  Appearance look works.
- Hebrew: logical sides only (`inline-start/end`, `padding-inline`). Icons that point somewhere use `PIcon dir`.
  Amounts stay left to right. Check every screen in both languages and both modes at 390px and 360px.
- Every rule starts with `html.phone` (the test enforces it).

## Main problems seen per screen (for the screen helpers)

- **Home**: number tiles have uneven heights and long labels wrap to 2–3 lines; put them in `.ph-stats`; the "enough
  for about 2 months" line floats between sections.
- **Activity**: the "503 transactions / not counted" lines and the month headings are a third text style; month
  heading with its own chevron and totals is busy; rows carry a badge line ("Likely bill") that makes them uneven.
- **Jars**: the first card mixes a sentence, a bar, rows and a button; "Keep untouched" is a lone card with a long note;
  the Jars/Goals switch sits far down the page.
- **Bills**: the two tiles at the top have long notes of uneven length; rows' second line mixes "Due in" and "Monthly".
- **More**: fine; keep as the model for grouped lists.
- **Recap**: the step timeline uses its own cards, warning box and big numbers; align to the card and type scale.
- **Accounts**: section headings by kind are fine; the "no credentials" dot line is cramped.
- **Budgets**: suggested budgets put a field and two buttons in every row, very dense; the two top tiles differ in
  colour (one filled with accent).
- **Reports**: the "Net worth" pill-menu at the top, the chart card and the range switch below it look like three
  different styles; four tiles below.
- **Forecast**: "Based on the last" heading with a small (i) and the switch under it; the chart card has a heading
  above it outside the card.
- **Alerts**: alert rows are 4–6 lines tall with a text Dismiss link inside; needs a shorter row and the action
  moved (swipe or row menu).
- **Categories**: the totals card, the range switch, search and sort button stack up before the list.
- **Settings and its sections**: computer forms inside cards; fields, notes and Save buttons need the sheet/form style
  from `adopted.css`.
- **Account / Jar / Bill / Transaction (pushed)**: centred headings are good; detail rows use small grey labels
  of different sizes; button rows at the bottom of cards are crowded.
- **Add sheet**: fine; tiles now carry the card hairline.
- **Help sheet**: topic chips are cut off at the edge without a fade; long text needs more space between parts.
- **Computer forms in a sheet** (add a budget): fine; check field heights match `SearchField` (44px).
