# Money Manager for Windows

The same app as the Docker version, as one installer. Nothing to set up: install, open, create a password, connect your accounts.

- **What is inside:** the web app, the bank scraper (with its own browser) and the database (PostgreSQL running inside the app). Nothing runs in Docker.
- **Where your data is:** `%APPDATA%\Money Manager` (database, receipts, the encryption key for saved logins). Only this computer has it. Closing the window keeps the app running in the system tray so automatic sync continues; right-click the tray icon to quit or open the data folder.
- **Saved logins:** encrypted in the database. The key is stored protected by Windows (DPAPI), so it only opens for that Windows user on that computer; a copied data folder can't be read elsewhere. If it can't be unlocked, the app tells you and you enter the logins again.
- **Updates:** the app checks this repository's GitHub releases, downloads a newer version quietly and installs it when you restart. An update replaces the installed app (same program, same data, one copy). Running a newer `Setup.exe` over an old install does the same. Uninstalling keeps your data.
- **Docker version:** unchanged. It still uses a PostgreSQL server; this build sets `DB_DRIVER=pglite` to use the in-process one.

## Building it

Needs Windows (or the GitHub workflow in `.github/workflows/windows-desktop.yml`, which runs on a Windows machine at GitHub).

1. `server`: `npm ci --omit=dev`, then rename its `node_modules` folder to `app_modules` (the installer builder skips folders named `node_modules`; the app renames it back on first start). Same for `scraper`. The workflow does this.
   Originally: `server`: `npm ci --omit=dev`; `scraper`: `npm ci --omit=dev` with `PUPPETEER_CACHE_DIR=desktop/chrome` set (this downloads the browser into the installer).
2. `desktop`: `npm install`, then `npm run dist` → `desktop/dist/Money Manager Setup x.y.z.exe`.
3. To ship an update: bump `version` in `desktop/package.json`, push a tag `vX.Y.Z`. The workflow builds and publishes the release; installed apps pick it up.

The installer is not code-signed, so Windows SmartScreen shows "More info → Run anyway" the first time. A code-signing certificate removes that.

## Releasing an update
Automatic: `node scripts/bump.mjs minor`, fill in the new section of `CHANGELOG.md`, merge to `main`. The **Release** workflow (`.github/workflows/release.yml`) runs the tests, tags `vX.Y.Z`, builds the installer and publishes the GitHub release, using that version's changelog section as the release notes.

Installed apps check this repository's latest release (it must be public). In the app: **Settings → App and data → Version and updates** shows the installed version, "Check for updates", "What's new" (the changelog), and an **Update automatically** switch (on by default). A newer version also shows as a notice in the sidebar. With the switch on, the update downloads by itself and installs the next time the app is closed; with it off, you press Download and update.
