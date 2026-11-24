# Product

<!-- impeccable:product-schema 1 -->

<!-- Written by the impeccable init step (task MM-26) from CLAUDE.md, the code and the plans in docs/plans/.
     No interview was possible (run by a helper with no way to ask); every fact below comes from those files.
     The rules themselves live in CLAUDE.md: this file only points to them. -->

## Platform

web

One Vue 3 app, served as a website (self-hosted in Docker, works offline as an installed web app), and shipped inside
the Windows, Linux and Android apps (`desktop/`). On a phone it switches to its own phone layout (`frontend/src/phone/`,
`html.phone`), built from the computer's blocks.

## Users

People who are **not** financial and don't know financial terms, looking after their own household money in Israel:
Israeli banks and cards, Wise, cash and pension. They open the app to see where the money went, what bills are coming,
how much is set aside and whether the month will end well. They read English or Hebrew (equally), on a phone or a
computer (equally), often briefly and in passing.

## Product Purpose

One private place for all your money, gathered automatically, that works things out for you (categories, repeating
bills, transfers between your own accounts, budgets, jars, a forecast, alerts) and explains it in plain words.
Success: the person understands their money without learning any finance words, and trusts every number they see.

## Positioning

Self-hosted and private: bank logins are stored encrypted and never shown again, the data stays on the person's own
server or computer. It only reads: it never moves money or changes anything at a bank.

## Operating Context

- Data comes in from bank scrapers (`scraper/`) on a schedule, plus things the person adds by hand.
- Pages: Home, Recap, Activity, Bills, Budgets, Jars, Forecast, Alerts, Accounts, Categories, Reports, Settings (`frontend/src/routes.js`).
- Every page has its own help (`frontend/src/help/`).
- Coming next: a Taxes and reports page for freelancers (`docs/plans/freelance-reports.md`).

## Capabilities and Constraints

- Every change goes through `data.change()`: it is saved, written in the change history and can be undone ("Saved" with Undo).
- Works offline with the last data.
- Texts live only in `frontend/src/locales/` (English and Hebrew); saved English texts are shown in Hebrew through `tx()`.
- The Hebrew "you" forms follow the profile's gender (`core/heGender.js`).
- Full rules for code, texts and layout: [CLAUDE.md](CLAUDE.md).

## Brand Commitments

- Name: Money Manager. Logo: a coin, optionally with a currency mark (`core/symbols.js`, `public/icon-source.svg`).
- Voice: very plain words, short sentences, no financial jargon (a needed term is explained in the same text or a
  tooltip), never "we"/"our". Every text goes through the writer skill (`.claude/skills/writer/SKILL.md`) in both languages.
- Look: clean, modern, Material-inspired; the person picks the colours and style in Appearance. See [DESIGN.md](DESIGN.md).

## Evidence on Hand

- No real bank data, names or amounts anywhere in the repo, docs or screenshots; made-up ones only
  (`scripts/privacy-check.mjs` blocks names from the local database).
- No testimonials, customers or statistics exist; never invent them.

## Product Principles

1. **Trust comes first.** Nothing is lost or changed without the person seeing it; every change is in the history and can be undone.
2. **Same amount everywhere.** A number is rounded once and reused: a tile, its tooltip, its table and other pages show the identical amount.
3. **Plain words, named exactly.** Name each thing after what it is for, and name screen parts exactly ("the **Bills** list", never "the box below").
4. **English and Hebrew are equal.** Every change ships with its Hebrew and is checked right to left.
5. **Phone and computer are equal.** Phone pages reuse the computer's blocks, icons, colours and charts, adapted to the phone.

## Accessibility & Inclusion

- Right to left: `<html>` stays left to right with class `he`; `html.he body { direction: rtl }` flips the content.
  Styles use logical sides (start/end) only; icons with a direction mirror.
- Open/close arrows are always thin chevrons; tooltips never show the help (question-mark) cursor.
- Tooltips are short and formatted: a title line, then 1-3 short lines or bullets, bold leads.
- Tap targets at least 44px on the phone; phone fields at least 16px text (no zoom on iPhone).
- Motion respects `prefers-reduced-motion`; light and dark both work in every look.
