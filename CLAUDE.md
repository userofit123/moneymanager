# Money Manager: rules for working on this project

A finance app for people who are **not** financial and don't know financial terms. Read these rules before every change.

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
