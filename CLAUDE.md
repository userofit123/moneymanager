# Money Manager: rules for working on this project

A finance app for people who are **not** financial and don't know financial terms. Read these rules before every change.

## Rules for every change
- **Hebrew always.** Any change to the app (feature, fix, text, screen) also gets its Hebrew text, and you check the Hebrew right-to-left layout. Never ship English only.
  - Old app: Hebrew lives in `web/he-text.js`, `web/he-rules.js`, `web/help-he.js`.
  - New Vue app: `frontend/src/locales/en.json` and `he.json`. The test `npm test` in `frontend/` fails when a text is missing in Hebrew.
- **Changelog, both languages, at the same time as the change:** `CHANGELOG.md` (English) and `web/changelog-he.md` (Hebrew).
- **The new Vue app must look and behave exactly like the existing app.** Same colors, fonts, spacing, components, animations and behavior. When unsure, read how the old app does it (`web/css/app.css`, `web/js/`) and copy that. Hebrew works the same way: `<html>` stays left to right with class `he` (so scrollbars stay on the right), and `html.he body { direction: rtl }` flips the content. Never put `dir="rtl"` on `<html>`.
- **Very plain wording**, in English and Hebrew. No financial jargon. If a term is needed, explain it in simple words or in a tooltip.
- **Design:** clean, modern, Material-inspired. Match the existing look (spacing, colors, components, icons) before adding anything new. Reuse components. Right-to-left must work: icons and chevrons mirror correctly.
- **Tooltips never show the question-mark (help) cursor.** Use the normal or pointer cursor.
- Other threads may work in the same folder: touch only the files your task needs and commit only your own changes.
- Push, merge and release only after R approves.

## Folder layout
| Path | What |
|---|---|
| `web/` | The current app (plain JS, CSS, one page) and PWA files. Still the main app. |
| `frontend/` | The new app: Vue 3 + Vite + vue-i18n. Built into `web/app/` and served at `/app/`. |
| `server/` | Node API, migrations, scheduler, tests |
| `scraper/` | Bank scraper service |
| `desktop/` | Windows app (Electron) |
| `docs/`, `scripts/` | Guides and helper scripts |

## Run and test
Test site: https://money.local (rebuild with all three compose files):
```sh
docker compose -f docker-compose.yml -f docker-compose.proxy.yml -f docker-compose.dev.yml up -d --build
```
- Dev mode runs the app from this folder. `web/` edits show on refresh. `server/src` edits: restart the `app` container. `frontend/` edits hot-reload at https://money.local/app/ (a `vite` container runs the Vite dev server; the app forwards `/app/` to it).
- Server tests: `cd server && DB_DRIVER=pglite PGLITE_DIR=memory:// npm test`
- Frontend tests (translations): `cd frontend && npm test`. Build: `npm run build`.
- Check every UI change in English and Hebrew, at phone and desktop widths.
- If a change does not show, assume stale served files: restart the container and compare served files with the files on disk.

## Build and release
- `server/Dockerfile` first builds `frontend/` with Vite, then copies the result into `web/app`, so the published image serves the finished app.
- CI (`.github/workflows/release.yml`) runs server tests and the frontend tests and build; the Windows installer job builds `frontend/` first.
- Releases: new top version in `CHANGELOG.md` on `main` (see README).
