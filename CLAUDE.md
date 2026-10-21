# Money Manager: rules for working on this project

A finance app for people who are **not** financial and don't know financial terms. Read these rules before every change.

## Goals
- **One private place for all your money:** Israeli banks and cards, Wise, cash and pension, gathered automatically, self-hosted (Docker) or as a Windows app.
- **It only reads.** It never moves money or changes anything at a bank. Bank logins are stored encrypted and never shown again.
- **It works things out for you:** categories, repeating bills, transfers between your own accounts, budgets, jars (money set aside), a forecast and alerts, explained in plain words.
- **Anyone can use it:** plain language, English and Hebrew equally, phone and computer equally, works offline with the last data.
- **Trust comes first:** every change is in the change history and can be undone; nothing is lost or changed without the person seeing it.

## Rules for every change
- **Hebrew always.** Any change to the app (feature, fix, text, screen) also gets its Hebrew text, and you check the Hebrew right-to-left layout. Never ship English only.
  - Texts live in `frontend/src/locales/` (`en.json`, `he.json`, and per page/section in `pages/` and `settings/`). `npm test` in `frontend/` fails when a text is missing in Hebrew.
  - English text that comes from saved data or the server (change history, server messages, built-in category and bank names) is shown in Hebrew through the dictionary in `frontend/src/core/heDict.js` (`tx()` in `core/heText.js`).
- **Changelog, both languages, at the same time as the change:** `CHANGELOG.md` (English) and `CHANGELOG.he.md` (Hebrew).
- **Right to left:** `<html>` stays left to right with class `he` (so scrollbars stay on the right), and `html.he body { direction: rtl }` flips the content. Never put `dir="rtl"` on `<html>`. Styles use logical properties (start/end), never fixed left/right.
- **Very plain wording**, in English and Hebrew. No financial jargon. If a term is needed, explain it in simple words or in a tooltip.
- **Design:** clean, modern, Material-inspired. Match the existing look (spacing, colors, components, icons) before adding anything new. Reuse components and shared modules. Right-to-left must work: icons and chevrons mirror correctly.
- **Tooltips never show the question-mark (help) cursor.** Use the normal or pointer cursor.
- Other threads may work in the same folder: touch only the files your task needs and commit only your own changes.
- Push, merge and release only after R approves.

## Code standards (frontend)
- **Vue 3 `<script setup>`, plain JavaScript (ES modules).** Match the surrounding code; keep files focused. Short comments in plain English that say what and why (never where code came from).
- **Where code goes:**
  - `views/` pages (one per menu item; bigger pages get a folder, like `views/settings/`). A page shows things and handles clicks; it does not hold calculations.
  - `components/` parts used in more than one place (`Base*` for the basic building blocks; `forms/` for add/edit windows, opened with `openForm()`; `shell/` for the app frame; `tx/` for the transaction window).
  - `lib/` calculations with no screen and no Vue: they take the data and give back numbers or lists. Easy to test.
  - `core/` app-wide behaviour: saving (`stores/data.js`), the clock, preferences, theme, tooltips, drop-downs, windows, Escape, toasts, the upkeep after each change.
  - `locales/` every text: `en.json`/`he.json` for shared texts, `pages/<page>.<lang>.json` and `settings/<section>.<lang>.json` per page or section.
- **Data changes** only through `data.change((S) => { ...; return [[action, detail, undo?]] })`: it saves, writes the change history (English, shown in Hebrew through `tx()`), shows "Saved" with Undo and runs the upkeep. Server calls go through `data.api()` or `core/http.js`, never `fetch` directly.
- **Today's date** comes from `core/clock.js` (`now`), never `new Date()` in a page, so tests can fix the day.
- **Texts are never written in code.** Use `t("key")`; plurals as `"one | many"`. Numbers and money go through `format.js` and dates through `dates.js`.
- **Reuse before adding:** windows are `BaseSheet`/`BaseDialog`, confirmations `ask()`, tooltips `data-tip`, menus `PopMenu`, amounts `MoneyInput`. Never copy a helper into a page.
- **Styles:** use the shared classes and the color/size variables (`styles/tokens.css`); logical properties (start/end) only; a component's own styles live in its `<style>` block.
- **Tests** (`frontend/test`, Node's test runner): add one for every calculation in `lib/` and for bug fixes. Results that are long to write by hand are kept in `test/fixtures` (`matchesSaved()` in `test/golden.js`); after an intended change, rewrite them with `UPDATE_SAVED=1` and check the diff. `npm run lint` must pass.

## File and folder rules
- Files: components and pages in PascalCase (`BudgetForm.vue`), modules in camelCase (`undoPatch.js`), tests `<topic>.test.js`.
- A new page: a `views/<Name>.vue`, an entry in `routes.js`, its texts in `locales/pages/<name>.en.json` and `.he.json`, its help in `help/`.
- Built or downloaded files are never committed (`frontend/dist`, `node_modules`). Secrets stay in `.env` (template: `.env.example`).

## Folder layout
| Path | What |
|---|---|
| `frontend/` | The app: Vue 3 + Vite + vue-i18n. `src/` code, `src/locales/` texts, `public/` icons, fonts, pdf.js, manifest and service worker (`sw.js`). Built into `frontend/dist`, which the server serves at `/`. |
| `server/` | Node API, migrations, scheduler, tests; serves the built app (`WEB_DIR`) |
| `scraper/` | Bank scraper service |
| `desktop/` | Windows app (Electron); ships `frontend/dist` as its `web` folder |
| `docs/`, `scripts/` | Guides and helper scripts |

## Run and test
Test site: https://money.local (rebuild with all three compose files):
```sh
docker compose -f docker-compose.yml -f docker-compose.proxy.yml -f docker-compose.dev.yml up -d --build
```
- Dev mode runs the app from this folder: a `vite` container runs the Vite dev server and the app forwards every page and file to it, so `frontend/` edits hot-reload at https://money.local. `server/src` edits: restart the `app` container.
- Server tests: `cd server && DB_DRIVER=pglite PGLITE_DIR=memory:// npm test`
- App tests: `cd frontend && npm test` (logic, texts in both languages, layout rules; saved expected results live in `frontend/test/fixtures`). Build: `npm run build`.
- Check every UI change in English and Hebrew, at phone and desktop widths.
- If a change does not show, assume stale files: restart the containers, and in the browser unregister the service worker or hard-reload.

## Build and release
- `server/Dockerfile` first builds `frontend/` with Vite, then copies `frontend/dist` into the image as `/app/web`, so the published image serves the finished app.
- CI (`.github/workflows/release.yml`) runs the server tests and the app tests and build; the Windows installer job builds `frontend/` first.
- Releases: new top version in `CHANGELOG.md` and `CHANGELOG.he.md` on `main` (`node scripts/bump.mjs`, see README).
