---
name: Money Manager
description: A private, plain-language money app for people who are not financial; English and Hebrew, phone and computer.
colors:
  accent: "#4355b9"
  accent-container: "#dee0ff"
  on-accent-container: "#0b1550"
  background: "#fbf8fd"
  accent-second: "#7b4fb8"
  on-accent: "#ffffff"
  text: "#1b1b22"
  text-muted: "#5a5865"
  money-good: "#1b7f4b"
  money-bad: "#c0392b"
  warning: "#e68a00"
  chart-1: "#4355b9"
  chart-2: "#c2185b"
  chart-3: "#e68a00"
  chart-4: "#00897b"
  chart-5: "#7cb342"
  chart-6: "#8e24aa"
  chart-7: "#546e7a"
  dark-accent: "#b9c3ff"
  dark-accent-container: "#2d3f9e"
  dark-on-accent-container: "#dee0ff"
  dark-background: "#111218"
  dark-accent-second: "#c7a6ff"
  dark-on-accent: "#0b1550"
  dark-text: "#e6e4ea"
  dark-text-muted: "#a9a7b3"
  dark-money-good: "#6fd69b"
  dark-money-bad: "#ff9c8f"
typography:
  display:
    fontFamily: "Inter, Segoe UI, Roboto, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    letterSpacing: "-1px"
  headline:
    fontFamily: "Inter, Segoe UI, Roboto, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    letterSpacing: "-0.6px"
  title:
    fontFamily: "Inter, Segoe UI, Roboto, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
  body:
    fontFamily: "Inter, Segoe UI, Roboto, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: "Inter, Segoe UI, Roboto, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  section:
    fontFamily: "Inter, Segoe UI, Roboto, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "1.1px"
  small:
    fontFamily: "Inter, Segoe UI, Roboto, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
rounded:
  tile: "12px"
  field: "14px"
  md: "16px"
  card: "22px"
  sheet: "26px"
  pill: "99px"
spacing:
  section-gap: "16px"
  heading-gap: "10px"
  card-pad: "18px 20px"
  page-pad: "24px 32px"
  phone-gutter: "16px"
  phone-section-gap: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
    padding: "10px 22px"
    height: "42px"
  button-outline:
    textColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    padding: "10px 22px"
    height: "42px"
  button-small:
    rounded: "{rounded.pill}"
    padding: "5px 13px"
    height: "32px"
  button-danger:
    textColor: "{colors.money-bad}"
    rounded: "{rounded.pill}"
  card:
    rounded: "{rounded.card}"
    padding: "18px 20px"
  card-hero:
    backgroundColor: "{colors.accent-container}"
    textColor: "{colors.on-accent-container}"
    rounded: "{rounded.card}"
  input:
    rounded: "{rounded.field}"
    padding: "10px 14px"
    height: "42px"
  tabs-picked:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  chip:
    textColor: "{colors.text-muted}"
    rounded: "10px"
    padding: "5px 11px"
  sheet:
    rounded: "{rounded.sheet}"
    width: "min(560px, 94vw)"
  icon-button:
    rounded: "50%"
    size: "44px"
---

# Design System: Money Manager

<!-- Written by the impeccable document step (task MM-26) from the app as it is today. It describes, it does not
     redesign. The source of truth is the code: when they differ, the code wins and this file gets fixed.
     Values in the frontmatter are the default look (Indigo colour set, round corners, cozy density, Inter);
     the person can change all of them in Appearance (core/theme.js). -->

## Overview

**Creative North Star: "The Calm Kitchen Table"**

A household's money laid out on one clean table: soft tinted surfaces, rounded cards, one accent colour, big clear
amounts, and plain sentences under them. Material-inspired (tonal surfaces, pill buttons, segmented tabs), quiet rather
than loud. Density is cozy; the amount is always the loudest thing in a card.

Everything is built from shared tokens (`frontend/src/styles/tokens.css`) that `core/theme.js` rewrites at run time, so
every part must work in all colour sets, light and dark, every surface style, corner style and density, in English and
Hebrew (right to left), on a computer and in the phone app.

**Key Characteristics:**
- One accent (`--acc`) plus a second accent (`--acc2`) used only in background glows and charts.
- Surfaces are the background mixed with a little text colour (`--s1`, `--s2`) with a hairline border (`--ol`).
- Green means good for your money, red means bad; never decoration.
- Large tabular numbers (`.val`, `.num`), small grey labels (`.lbl`, `.sm`).
- Generous rounding: cards 22px, windows 26px, buttons and tabs fully round.

## Colors

Tonal, Material-style roles from six base colours per colour set (`ATM` in `core/theme.js`); everything else is mixed
from them with `color-mix()`. Components use the variables only, never a colour typed in by hand.

### Primary
- **Accent** (`--acc`): main buttons, the picked tab, links, focus, the active menu item, card hover glow.
- **Accent container** (`--accc`) with **on accent container** (`--onc`): the hero card (`.card.hero`) gradient and its text.
- **On accent** (`--on`): text and icons on the accent.

### Secondary
- **Second accent** (`--acc2`): only inside the background glows (`--bg-*`) and in some charts (`--exp`). Never on buttons or text.

### Neutral
- **Background** (`--bg`): the page; also the inside of windows (`.sheet`).
- **Surface 1** (`--s1` = 3% text into background; 5% in dark): cards, fields, menus, toasts.
- **Surface 2** (`--s2` = 7%; 10% in dark): the track behind tabs (`.seg`), pressed rows.
- **Hairline** (`--ol` = 11% text; 13% in dark): every card, field and row border.
- **Text** (`--tx`) and **muted text** (`--tx2`): labels, second lines, section headings, dates.
- **Scrim** (`--scrim`, `#0007`): the dim layer behind windows.

### Meaning colours
- **Good** (`--pos`) and **bad** (`--neg`): money in / money out, under / over budget, success / error toasts.
- **Warning** (`--warn`): needs attention but not wrong.
- **Money in / out in charts** (`--inc` = accent, `--exp` = chart-2 mixed with the second accent).
- **Category and chart colours** (`--c0`..`--c6`, `CP` in `core/theme.js`): one per category or series, in order.
- **Help guide colours** (`--hg1`..`--hg5`): only the page guide's sections (`styles/components/help.css`).

### Named Rules
**The Variables Only Rule.** No hex in a component or page style; use a token or a `color-mix()` of tokens, so all 18 colour sets, Custom and dark mode keep working.
**The Money Colour Rule.** Green and red carry a meaning (good / bad for the person's money) and are used for nothing else.

## Typography

**Body Font:** Inter (with Segoe UI, Roboto, system-ui). Other choices in Appearance (`FONTS` in `core/theme.js`):
serif, "Rounded" (Nunito for Latin, Rubik for Hebrew, `styles/base.css`), mono.

**Character:** One neutral sans for everything; weight and size do the work, not a second family.

### Hierarchy
- **Display / amount** (600, 32px `--fs-val`, -1px tracking, tabular figures): the big amount in a card (`.val`); the currency sign is `small` at .55em.
- **Headline** (600, 30px `--fs-h1`): the page name in `PageHeader`.
- **Title** (600, 16px `--fs-lg`): window titles, card titles that need weight.
- **Body** (400, 14px `--fs`): rows, fields, buttons (buttons 600).
- **Label** (500, 13px): the small title line of a card (`.lbl`), the date under the page name (`.sub`).
- **Section heading** (600, 12px, 1.1px tracking, capitals, `--tx2`): `h2` between blocks.
- **Small** (12.5px `--fs-sm`, `--tx2`): notes and second lines (`.sm`). Smallest: 11px `--fs-xs`.

### Named Rules
**The Tabular Rule.** Every amount uses tabular figures (`.num`, `.val`, `td.am`) and goes through `format.js`; in Hebrew amounts stay left to right.

## Layout

- **App frame** (`styles/layout.css`, `components/shell/`): a sticky menu rail on the start side (`nav`, 88px, `AppNav.vue`)
  and the page (`main`, max 1320px, padding 24px 32px 90px). Wider rules at 1180px and 1600px.
- **Page** (`views/<Page>.vue`): `PageHeader` (page name + today's date, `header` margin-bottom 22px), then
  `<section class="view on" id="...">` with blocks. Example: `views/Bills.vue`, `views/Jars.vue`.
- **Blocks**: number cards in a grid (`.grid` gap 16px; `.g4` min 220px, `.g3` min 260px, `.g2` two columns),
  cards of different heights in `CardColumns.vue` (`.ccols`), section headings `h2` between them.
- **Spacing**: between blocks `--spg` (16px), heading to block `--hg` (10px). Appearance changes the space between
  blocks (`data-spc`), inside cards (`data-den`: compact / cozy / roomy) and in the menu (`data-nsp`), all in `styles/theme.css`.
- **Right to left**: `<html>` stays left to right with class `he`; `html.he body { direction: rtl }`. Logical properties
  (start/end) only; a fixed side only where it must be, marked `/* fixed side */`.
- **Phone app** (`frontend/src/phone/`, every rule under `html.phone`): its own frame (`PhoneApp.vue`, `TabBar.vue`, top bar,
  large title with `SyncLine`), one column, side margin `--p-gut` 16px (20px from 400px), 32px between sections, 16px
  inside a card, 44px tap targets. Sizes in `phone/styles/tokens.css`; which computer block becomes which phone block in
  `docs/design/phone-layout.md`. The computer's windows and forms show in the phone through `phone/styles/adopted.css`.

## Elevation & Depth

Mostly flat: depth comes from tonal surfaces (`--s1` on `--bg`) and hairlines. Shadows appear only on things that float
(menus, windows, toasts) or as a response to hover. Appearance adds surface styles (`styles/theme.css`): solid
(default), outline (transparent cards, 1.5px border), raised (soft shadow), glass (frosted, `body.glass`).

### Shadow Vocabulary
- **Pop** (`--shadow-pop`: `0 14px 34px -12px rgba(0,0,0,.5)`): small floating parts.
- **Window** (`--shadow-sheet`: `0 30px 80px -20px #000a`): `BaseSheet` / `BaseDialog` and the phone's sheets.
- **Menu** (`0 18px 40px -16px rgba(0,0,0,.45)`): `PopMenu` (`.cmenu`).
- **Toast** (`0 14px 34px -14px rgba(0,0,0,.4)`).
- **Card hover** (`0 14px 34px -16px var(--acc)` with a 3px lift): clickable cards only (`.card.click`).

### Named Rules
**The Flat At Rest Rule.** A card has no shadow at rest; only clickable cards lift on hover.

## Shapes

Soft and round. `--r` 22px cards and tables, `--r-md` 16px groups and toasts, 14px fields and menus, `--r-sm` 12px tooltips
and tiles, 10px chips, `--r-sheet` 26px windows, `--pill` 99px buttons, tabs and badges, 50% icon buttons. Appearance
corner styles (`data-rad`): round (default), soft (`--r` 14px), sharp (`--r` 5px), applied to every shape at once.

## Components

Use the shared part; never copy one into a page. Styles are in `styles/components/<name>.css`, loaded in cascade order
by `styles/index.css` (the order matters).

| Need | Use | Where |
|---|---|---|
| A button | `BaseButton` (`filled` main action, `outline` other actions, `danger` removes, `size="small"` in rows; `busy` spinner) | `components/BaseButton.vue`, `buttons.css` |
| A round icon button | `.ib` (44px, 21px stroke icon) | `buttons.css` |
| A card / number tile | `BaseCard` (`.card`; `hero` = accent card at the top, `clickable` lifts, `warn` red edge); `.lbl` title, `.val` amount | `components/BaseCard.vue`, `cards.css` |
| Cards of uneven height | `CardColumns` | `components/CardColumns.vue` |
| A pick-one row ("This month / Last month") | `BaseTabs` (`.seg`, picked = accent pill) | `components/BaseTabs.vue`, `tabs.css` |
| A list of transactions | `TxRows` (`.txl`, `.txi` rows: 12px gap, hairline between rows) | `components/TxRows.vue`, `tx-list.css` |
| Section rows (Settings, Accounts, Categories) | `.ss`, `.ssh`, `.ssb`, `.sfoot` | `sections.css` |
| Chips, tags, badges, dots | `.chip`, `.tag`, `.badge`, `.dot`, `.sev` | `chips.css`, `tags.css` |
| A window | `BaseSheet` (grows from the button that opened it; Escape, outside click and Back close it; `xw` wider) | `components/BaseSheet.vue`, `sheets.css` |
| A window with a title and buttons | `BaseDialog` | `components/BaseDialog.vue` |
| An add/edit form | `components/forms/*Form.vue`, opened with `openForm()` | `core/forms.js`, `forms.css` |
| A yes/no question | `ask(title, text, run, { danger, yes })` | `core/ask.js`, `components/AskPop.vue` |
| A ⋯ menu | `PopMenu` (`.cmenu`; on the phone an action sheet) | `components/PopMenu.vue`, `menus.css` |
| A drop-down list | `select` with the app's own list | `core/dropdown.js`, `dropdowns.css` |
| An amount box | `MoneyInput` (thousands separators while typing) | `components/MoneyInput.vue` |
| Fields | `.fld` (label 12px over the field); inputs 42px high, 14px corners, `--s1`; switch `.tg`; option cards `.opt` | `forms.css` |
| A message after a change | toast ("Saved" with Undo; `.err`, `.info`, `.alert`); top end corner on a computer | `core/toast.js`, `toasts.css` |
| A tooltip | `data-tip="..."` (or `v-tip`): title line, `label\tvalue` rows, `**bold**`, `++in++`, `~~out~~`, `• ` lists; `.tinfo` (i) button. Normal or pointer cursor, never the help cursor | `core/tooltip.js`, `tooltips.css` |
| A sentence with bold names and amounts | `EmText` | `components/EmText.vue` |
| A part that slides open | `SlideOpen` (260ms) or `<details class="fold">` | `components/SlideOpen.vue`, `styles/base.css` |
| Charts | `LineChart`, `YearsChart`; bars `.bar` | `components/charts/`, `charts.css` |
| The transaction window | `TxWindow` | `components/tx/`, `tx-window.css` |
| Phone blocks | `ListGroup`, `ListRow`, `AmountCard`, `Segmented`, `ChipBar`, `SearchField`, `PhoneSheet`, `ActionSheet`, `EmptyState` | `phone/components/` |

### Icons
- Line icons on a 24×24 grid, `stroke: currentColor`, no fill, stroke 1.8-2, round caps and joins, drawn inline as `<svg>`.
- Menu icons: `icon` in `routes.js`. Phone icons: `phone/icons.js` (direction icons get class `dir` and mirror in Hebrew).
- The logo and app icon: a coin with an optional currency mark (`core/symbols.js`).

### Open / close arrow
One thin chevron (`M6 9l6 6 6-6`), pointing down when open and to the end side when closed (`.fold > summary::after`,
`styles/base.css`). Never a filled triangle or ▾ / ▸.

### Motion
Easing `--ease` (`cubic-bezier(.2,.8,.2,1)`); hovers .12-.2s; windows grow from their button and fade out; phone motion
tokens `--p-ease`, `--p-t-sheet` 300ms, `--p-t-push` 320ms. Every animation has a `prefers-reduced-motion` fallback.

### Looks (Appearance)
`core/theme.js` + `components/AppearancePanel.vue` + `styles/theme.css`: light / dark / auto; 18 colour sets (`ATM`) or
Custom; page backgrounds (`--bg-glow` default, mesh, diagonal, spot, aurora, horizon, duo, corners, sweep, flat) and
textures; surface style; corners; density; spacing; font; menu style; saved looks for light and dark.

## Do's and Don'ts

### Do:
- **Do** match a neighbour page (Bills, Jars) first: the same card, heading and spacing as the sibling blocks.
- **Do** use tokens (`--acc`, `--s1`, `--ol`, `--r`, `--spg`) and the shared classes; check light and dark, and at least one other colour set.
- **Do** use logical properties (`margin-inline-start`, `inset-inline-end`); mirror direction icons in Hebrew.
- **Do** check every screen in English and Hebrew, at phone and computer width.
- **Do** build phone screens from the computer's blocks, adapted (`docs/design/phone-layout.md`).

### Don't:
- **Don't** type a hex colour, a fixed `left`/`right`, or `dir="rtl"` on `<html>`.
- **Don't** use a filled triangle or text arrow for open/close, or `cursor: help` on anything with a tooltip.
- **Don't** add a new kind of window, menu, tooltip or amount box; use `BaseSheet`/`BaseDialog`, `PopMenu`, `data-tip`, `MoneyInput`.
- **Don't** use the second accent or the green/red money colours as decoration.
- **Don't** give a resting card a shadow.
