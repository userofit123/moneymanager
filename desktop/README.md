# Money Manager for Windows and Linux

The same app as the Docker version, as one installer. Nothing to set up: install, open, create a password, connect your accounts.

- **What is inside:** the web app, the bank scraper (with its own browser) and the database (PostgreSQL running inside the app). Nothing runs in Docker.
- **Where your data is:** `%APPDATA%\Money Manager` (database, receipts, the encryption key for saved logins). Only this computer has it. Closing the window keeps the app running in the system tray so automatic sync continues; right-click the tray icon to quit or open the data folder.
- **Saved logins:** encrypted in the database. The key is stored protected by Windows (DPAPI), so it only opens for that Windows user on that computer; a copied data folder can't be read elsewhere. If it can't be unlocked, the app tells you and you enter the logins again.
- **Updates:** the app checks this repository's GitHub releases, downloads a newer version quietly and installs it when you restart. An update replaces the installed app (same program, same data, one copy). Running a newer `Setup.exe` over an old install does the same. Uninstalling keeps your data.
- **Docker version:** unchanged. It still uses a PostgreSQL server; this build sets `DB_DRIVER=pglite` to use the in-process one.

## Local or remote server

The window shows one Money Manager at a time. On the first run (a new computer) the app asks which:

- **This computer:** the app's own database, scraper and server run inside it (everything above).
- **My server:** the address of a Money Manager you run elsewhere (Docker on a home server, for example). The app then runs nothing itself and just opens that address.

Change it any time from the **Server** menu (press Alt) or the tray icon → *Switch to*, or *Servers…* to add or remove one. Notes:

- Switching deletes nothing. Each server keeps its own data. Moving data between them is the app's backup and restore.
- Each remote server gets its own browser session, so logins and the offline copy never mix. The desktop-only controls (update, backup folder) are not given to a remote server's page.
- Only one is open at a time. The local database and scraper run only while *This computer* is the open one, so automatic sync stops while a remote server is open.
- A server whose certificate this computer does not know (a home server with its own) is accepted only after you confirm its fingerprint; that exact certificate is then remembered for that server.
- Offline, a remote server shows the last saved copy read-only (needs https, as for the web app). If the server does not answer at start, the app offers to try again or pick another.
- The list is `servers.json` in the data folder. An install that already has data (from before the list existed) stays on *This computer* without asking.

## Building it

Needs Windows (or the GitHub workflow in `.github/workflows/release.yml`, which runs on a Windows machine at GitHub).

1. `server`: `npm ci --omit=dev`, then rename its `node_modules` folder to `app_modules` (the installer builder skips folders named `node_modules`; the app renames it back on first start). Same for `scraper`. The workflow does this.
   Originally: `server`: `npm ci --omit=dev`; `scraper`: `npm ci --omit=dev` with `PUPPETEER_CACHE_DIR=desktop/chrome` set (this downloads the browser into the installer).
2. `desktop`: `npm install`, then `npm run dist` → `desktop/dist/Money-Manager-Setup-x.y.z.exe`.
3. To ship an update: bump `version` in `desktop/package.json`, push a tag `vX.Y.Z`. The workflow builds and publishes the release; installed apps pick it up.

The installer is not code-signed, so Windows SmartScreen shows "More info → Run anyway" the first time. A code-signing certificate removes that.

## Releasing an update
Automatic: `node scripts/bump.mjs minor`, fill in the new section of `CHANGELOG.md`, merge to `main`. The **Release** workflow (`.github/workflows/release.yml`) runs the tests, tags `vX.Y.Z`, builds the installer and publishes the GitHub release, using that version's changelog section as the release notes.

Installed apps check this repository's latest release (it must be public). In the app: **Settings → App and data → Version and updates** shows the installed version, "Check for updates", "What's new" (the changelog), and an **Update automatically** switch (on by default). A newer version also shows as a notice in the sidebar. With the switch on, the update downloads by itself and installs the next time the app is closed; with it off, you press Download and update.

## Linux

The same app, built from the same code. Each release has three files:

| File | For | Install |
|---|---|---|
| `Money-Manager-x.y.z-linux-x64.AppImage` | any Linux | `chmod +x` it and run it (needs FUSE 2: on Fedora `sudo dnf install fuse-libs`) |
| `Money-Manager-x.y.z-linux-x64.deb` | Debian, Ubuntu, Mint | `sudo apt install ./file.deb` |
| `Money-Manager-x.y.z-linux-x64.rpm` | Fedora, Red Hat, openSUSE | `sudo dnf install ./file.rpm` |

- **Where your data is:** `~/.config/Money Manager`. Closing the window keeps the app in the tray so automatic sync continues (on a desktop with no tray, such as plain GNOME, start the app again to bring the window back).
- **Saved logins:** locked with the desktop keyring (GNOME Keyring or KWallet) when there is one. Without a keyring the app keeps the key in a file in the data folder, as the Docker version does.
- **Updates:** the AppImage, .deb and .rpm check the releases like the Windows app does; the .deb and .rpm ask for your password to install.
- **Building:** `npm run dist:linux` in `desktop/` on Linux (the .rpm needs `rpm` installed). The workflow does the same on a Linux machine at GitHub, after the Windows job.
