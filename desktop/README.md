# Money Manager for Windows

The same app as the Docker version, as one installer. Nothing to set up: install, open, create a password, connect your accounts.

- **What is inside:** the web app, the bank scraper (with its own browser) and the database (PostgreSQL running inside the app). Nothing runs in Docker.
- **Where your data is:** `%APPDATA%\Money Manager` (database, receipts, the encryption key for saved logins). Only this computer has it. Closing the window keeps the app running in the system tray so automatic sync continues; right-click the tray icon to quit or open the data folder.
- **Saved logins:** encrypted in the database. The key is stored protected by Windows (DPAPI), so it only opens for that Windows user on that computer; a copied data folder can't be read elsewhere. If it can't be unlocked, the app tells you and you enter the logins again.
- **Updates:** the app checks the public releases repository `moneymanager-releases` (this code repository can stay private), downloads a newer version quietly and installs it when you restart. An update replaces the installed app (same program, same data, one copy). Running a newer `Setup.exe` over an old install does the same. Uninstalling keeps your data.
- **Docker version:** unchanged. It still uses a PostgreSQL server; this build sets `DB_DRIVER=pglite` to use the in-process one.

## Building it

Needs Windows (or the GitHub workflow in `.github/workflows/windows-desktop.yml`, which runs on a Windows machine at GitHub).

1. `server`: `npm ci --omit=dev`; `scraper`: `npm ci --omit=dev` with `PUPPETEER_CACHE_DIR=desktop/chrome` set (this downloads the browser into the installer).
2. `desktop`: `npm install`, then `npm run dist` → `desktop/dist/Money Manager Setup x.y.z.exe`.
3. To ship an update: bump `version` in `desktop/package.json`, push a tag `vX.Y.Z`. The workflow builds and publishes the release; installed apps pick it up.

The installer is not code-signed, so Windows SmartScreen shows "More info → Run anyway" the first time. A code-signing certificate removes that.

## One-time setup for updates (private code repository)
Installed apps can't log in to a private repository, so installers are published to a separate public repository that holds only the finished installers.
1. On GitHub create an empty **public** repository named `moneymanager-releases` under the same account (if you name it differently, change `repo` in `desktop/package.json`).
2. Create a personal access token (fine-grained) limited to that repository with **Contents: Read and write**.
3. In this repository: Settings → Secrets and variables → Actions → New secret named `RELEASES_TOKEN`, value = the token.
4. Push a tag (`git tag v0.1.0 && git push origin v0.1.0`). The workflow builds and publishes the release there.
