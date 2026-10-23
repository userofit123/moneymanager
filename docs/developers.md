---
title: For developers
description: Run the tests, build the app and the desktop installers, make a release, regenerate the screenshots and this site. How the folders fit together.
---

# For developers

Money Manager is open source. This page is for people who want to change it or build it themselves.

## The folders

| Path | What |
|---|---|
| `frontend/` | The app (Vue 3, Vite, vue-i18n): pages, texts in English and Hebrew (`src/locales`), PWA files (`public/`). Built into `frontend/dist`, which the server serves. |
| `server/` | Node API, migrations, auth, encryption, scheduler, exchange rates, imports, tests |
| `scraper/` | A separate service with Chromium and a pinned `israeli-bank-scrapers` |
| `android/` | The Android app (Kotlin): the app's own screens in a web view, a local proxy to the server, the server list, the app lock |
| `desktop/` | The Windows and Linux apps (Electron): the launcher, the server list and the packaging |
| `docs/` | This documentation (and the original specs), screenshots |
| `scripts/` | `bump.mjs` (new version), `screenshots.mjs` (the images), `build-site.mjs` (this site) |
| `egress/` | The allow-list proxy used by Docker strict mode |

## Run the tests

```sh
cd server && npm install
DB_DRIVER=pglite PGLITE_DIR=memory:// npm test                    # server tests, no Postgres needed
# or: createdb money_test && DATABASE_URL=postgres://money:money@localhost/money_test npm test

(cd scraper && npm ci && node --test)                              # needs a Chromium; uses a fake bank
(cd frontend && npm ci && npm test && npm run build)               # the app: tests, then the build the server serves
(cd desktop && node --test)                                        # the desktop shell's server list and launcher
(cd android && ./gradlew testDebugUnitTest)                        # the Android app's server list and fit check (needs JDK 17 and the Android SDK)
```

The frontend tests also check that **every text exists in Hebrew**. Saved expected results live in `frontend/test/fixtures`; after an intended change, rewrite them with `UPDATE_SAVED=1` and read the diff.

## Run it while you work (Docker)

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

This runs the app from your folder. Edits in `frontend/` show at once (hot reload). Edits in `server/src` need `docker compose -f docker-compose.yml -f docker-compose.dev.yml restart app`.

## Demo data

`node src/cli.js demo` (in `server/`, or `docker compose exec app node src/cli.js demo`) loads made-up data into an **empty** database. Everything in the screenshots comes from it.

## Build the desktop apps

```sh
cd desktop && npm install
npm run dist          # Windows installer (on Windows)
npm run dist:linux    # AppImage, .deb and .rpm (on Linux; the .rpm needs `rpm` installed)
npm run dist:mac      # .dmg (on a Mac; not signed: ad-hoc only, so each Mac approves it once)
```

The server and scraper dependencies ship under the name `app_modules`, because the package builder skips folders named `node_modules`. The app renames them on first start, or runs from a copy in the data folder when its own folder is read-only (an AppImage). The workflow does all of this on GitHub's machines. See `desktop/README.md`.

## Keeping the app and the server compatible

The desktop and Android apps show their own screens with a server's data. They use the server only when they fit, by **API level** (not by version):

- `server/src/apilevel.js`: `API_LEVEL` is what the server offers, `API_MIN` the oldest app level it still understands. Both are shown in `/api/auth/status`.
- `desktop/compat.js`: `APP.level` is what the screens speak, `APP.minServer` the oldest server level they work with.

**When you change what the screens ask of the server** (a new request they depend on, a changed answer), raise `API_LEVEL` in the server and `minServer` in the app, in the same change. **When the server stops accepting what older screens send**, raise `API_MIN`. Everything else (new fields the old side can ignore, fixes) needs no change. Servers 0.12.1 to 0.12.4 do not say their level: the apps treat them as level 1.

## Build the Android app

```sh
(cd frontend && npm ci && npm run build)
node scripts/android-assets.mjs        # copies the built screens and the texts into android/app/src/main/assets
cd android && ./gradlew assembleDebug  # app/build/outputs/apk/debug/
```

A release build is signed with a key kept in four repository secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`). **Keep a copy of the key file and its password somewhere safe: a phone only accepts an update signed with the same key.** `android/.../Compat.kt` holds the same API-level pair as `desktop/compat.js`; a test keeps them equal.

## Make a release

Releases are automatic.

1. `node scripts/bump.mjs minor` (or `patch` or `major`). It adds a new section at the top of `CHANGELOG.md` and `CHANGELOG.he.md` and sets the version in `desktop/` and `server/`.
2. Fill in both changelog sections, in plain words, in English **and** Hebrew.
3. Merge to `main`. The **Release** workflow runs the tests, tags the version, builds the Windows installer, the Linux packages and the Android APK, publishes the Docker images and creates the GitHub release with the changelog as notes. Installed apps and the Docker version see it.

Running **Run workflow** by hand builds the installers without publishing anything, to try it.

## Regenerate the screenshots

They come from the demo data, in light and dark, English and Hebrew, computer and phone.

```sh
cd server && DB_DRIVER=pglite PGLITE_DIR=/tmp/money-demo/db DATA_DIR=/tmp/money-demo PORT=18600 HOST=127.0.0.1 \
  SCHEDULER=0 AUTO_DEMO_SEED=1 SCRAPER_KEY=x node src/index.js
node scripts/screenshots.mjs http://127.0.0.1:18600           # all of them (or add a word to keep only some, e.g. "recap")
```

It needs Puppeteer (`cd scraper && npm ci`) and a Chromium (`CHROME=/path/to/chrome`).

## This documentation site

The pages are the Markdown files in `docs/`, listed in `docs/site.json`. A small script turns them into the site:

```sh
npm ci --prefix scripts/site
node scripts/build-site.mjs        # writes _site/
```

The **Pages** workflow builds and publishes it on every change to `docs/`. Use `<picture>` with a dark `<source>` for screenshots, as the existing pages do.

## The scraper library

`israeli-bank-scrapers` is pinned in `scraper/package.json` on purpose. When a bank changes its site and syncing breaks, bump it, rebuild the scraper image (`docker compose build scraper`) and retry. The desktop apps get the new version with the next release.

## House rules

Plain wording in English and Hebrew, no financial jargon, Hebrew and right-to-left checked on every change, no real bank data anywhere in the repository, and a changelog entry in both languages with every change. They are in `CLAUDE.md`.
