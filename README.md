<div align="center">

# Money Manager

**Your accounts, cards and savings in one private place that only you can see.**

Self-hosted and read-only. It reads your Israeli banks, credit cards, Wise and a hand-entered pension, and turns them into bills, budgets, savings jars, reports, alerts and a forecast. It can never move money.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/home-dark.webp">
  <img alt="Money Manager home screen" src="docs/screenshots/home-light.webp" width="900">
</picture>

</div>

## Contents
[What it does](#what-it-does) · [Install](#install) · [First steps](#first-steps) · [Updating](#updating) · [Screenshots](#screenshots) · [Security](#security-in-short) · [Help](#help) · [For developers](#for-developers)

## What it does
- **Reads your money, never touches it.** Bank Hapoalim, Leumi, Discount, Mercantile, Mizrahi-Tefahot, Otsar Hahayal, Union, First International, Massad, Yahav, Max, Isracard, Visa Cal, American Express, Wise, plus CSV import for anything else.
- **Several logins at one company.** Two Wise accounts, or two sets of cards? Add each login with a nickname. Several cards under one login each get their own account and balance.
- **Does the sorting for you.** Categories and tags with rules, bills found automatically, transfers between your own accounts paired, duplicates ignored, card payments not counted twice.
- **Plans ahead.** Budgets, savings jars that fill in priority order, a forecast, and alerts when something looks off (also to ntfy, Telegram or a webhook).
- **Reports.** Net worth over time, spending by category, income against expenses, top merchants.
- **Missing-money detection.** If a balance moves without a transaction, it shows up in *Needs review* until you explain it.
- **Looks the way you like.** Light, dark or automatic; ten-plus colour atmospheres or your own colour; glass, outline, raised or solid surfaces; density and spacing; English and Hebrew (right-to-left).
- **No AI in the core**, no accounts with us, nothing sent anywhere except to your own banks.

## Install
There are two ways to run the same app. Pick one.

### Windows (easiest): one installer
1. Open the [latest release](../../releases/latest) and download **Money-Manager-Setup-x.y.z.exe**.
2. Run it, open **Money Manager**, choose a password, connect your accounts.

Everything is stored on that computer (`%APPDATA%\Money Manager`). Nothing runs in Docker and there is nothing to configure. Windows may say "unknown publisher" the first time because the installer is not code-signed: choose **More info → Run anyway**. Closing the window keeps the app in the system tray so automatic syncing continues. Details: [`desktop/README.md`](desktop/README.md).

### Docker (for a laptop or home server)
Needs Docker (Docker Desktop on Windows and Mac).
```sh
git clone https://github.com/userofit123/moneymanager.git
cd moneymanager
./setup.sh                      # creates .env with random secrets, once
docker compose up -d --build
```
Open **http://localhost:8787** and choose a password. It restarts by itself after a reboot, and your data lives in Docker volumes, so rebuilding keeps it (`docker compose down -v` deletes it).

**Just want to look around?** Start it with made-up data instead (empty database only, never use for real data):
```sh
docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d --build
```

<details>
<summary>On a home server behind Caddy or Tailscale</summary>

Add the proxy file so Caddy can reach it, and set `TRUST_PROXY=1` in `.env`:
```sh
docker compose -f docker-compose.yml -f docker-compose.proxy.yml up -d --build
```
Point a Caddy block at `app:8080` (or `127.0.0.1:8787`). The app also backs itself up every day (Settings → Backup and restore): your data without any bank logins, into `/data/backups` in the app volume. To keep them elsewhere, link a host folder in `docker-compose.yml` (see the commented `backups` line) and type its path in the setting. `backup.sh` is still there for a full database dump (optional rsync via `BACKUP_DEST`).

**Strict mode** lets the scraper reach only your banks:
```sh
docker compose -f docker-compose.yml -f docker-compose.strict.yml up -d --build
```
If a login then times out, `docker compose logs egress` lists hosts it refused; add only ones you recognise to `EGRESS_ALLOW` in `.env`.
</details>

## First steps
1. **Settings → Security**: turn on two-factor sign-in (recommended).
2. **Settings → Connections**: pick your bank or card in *Add a connection*, enter the login, **Save**, then **Test connection** (reads the last 30 days, saves nothing). Test one at a time. After two failed logins in a row a source locks itself so a bank never locks you out; fix the login, then **Unlock**.
3. If a bank sends a one-time code, press **Verify this device** once (see [Troubleshooting](docs/TROUBLESHOOTING.md)).
4. **Sync now** (or wait: it syncs on its own, every 8 hours by default). The first sync reads the history you chose; **Import history** reads further back later.
5. Optional: import a bank or card **CSV** or a **Wise statement** (Settings → App and data), set your pension balance, and add alerts (Settings → Alerts).
6. Docker only: save the encryption key in your password manager: `docker compose exec app cat /data/app.key`.

Only the accounts you connect or import appear in the app. Nothing is pre-filled.

## Updating
- **Windows app:** it checks this repository's releases by itself, shows *Update available* in the sidebar and downloads it quietly. Your data stays. Turn that off, or check by hand, in Settings → App and data → *Version and updates* (which also shows the changelog).
- **Docker:** the app shows the same notice with the commands to run:
```sh
git pull
docker compose up -d --build
```

## Screenshots
Light and dark, desktop and phone. Made from the demo data (`docs/screenshots`, regenerate with `scripts/screenshots.mjs`).

<table>
<tr>
<td><picture><source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/activity-dark.webp"><img src="docs/screenshots/activity-light.webp" alt="Activity"></picture><br><sub>Activity: search, filter, group</sub></td>
<td><picture><source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/reports-dark.webp"><img src="docs/screenshots/reports-light.webp" alt="Reports"></picture><br><sub>Reports: net worth, spending, trends</sub></td>
</tr>
<tr>
<td><picture><source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/jars-dark.webp"><img src="docs/screenshots/jars-light.webp" alt="Jars"></picture><br><sub>Jars: savings that fill by priority</sub></td>
<td><picture><source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/bills-dark.webp"><img src="docs/screenshots/bills-light.webp" alt="Bills"></picture><br><sub>Bills: found automatically</sub></td>
</tr>
<tr>
<td><picture><source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/budgets-dark.webp"><img src="docs/screenshots/budgets-light.webp" alt="Budgets"></picture><br><sub>Budgets</sub></td>
<td><picture><source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/forecast-dark.webp"><img src="docs/screenshots/forecast-light.webp" alt="Forecast"></picture><br><sub>Forecast</sub></td>
</tr>
<tr>
<td><picture><source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/glass-dark.webp"><img src="docs/screenshots/glass-light.webp" alt="Glass surfaces"></picture><br><sub>Glass surfaces with a mesh background</sub></td>
<td><picture><source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/settings-dark.webp"><img src="docs/screenshots/settings-light.webp" alt="Settings"></picture><br><sub>Settings → Connections</sub></td>
</tr>
<tr>
<td align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/appearance-dark.webp"><img src="docs/screenshots/appearance-light.webp" alt="Appearance" width="300"></picture><br><sub>Appearance</sub></td>
<td align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/mobile-home-dark.webp"><img src="docs/screenshots/mobile-home-light.webp" alt="On a phone" width="240"></picture> <picture><source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/mobile-activity-dark.webp"><img src="docs/screenshots/mobile-activity-light.webp" alt="On a phone" width="240"></picture><br><sub>On a phone (installable as an app)</sub></td>
</tr>
</table>

## Security in short
- **Read-only.** It only reads balances and transactions. No code in the app can start a transfer, payment or approval.
- **Logins are encrypted** (AES-256-GCM), write-only (the screen can save a password but never read it back), and scrubbed from every log and error message. On Windows the key is protected by your Windows account.
- **Stays on your machine.** The Windows app listens only on that computer. The bank scraper runs in its own container (Docker) or process (Windows).
- **"Verify this device" only loads your bank's own websites.**
- Two failed logins pause a source so a bank never locks your account.

The full audit is in [`docs/SECURITY.md`](docs/SECURITY.md). **Honest limits:** whoever can open your computer or server can use the app as you, so lock your screen and use a strong password and two-factor sign-in. For the strongest guarantee, use a view-only login at your bank if it offers one.

## Help
| Problem | Fix |
|---|---|
| Forgot the app password | `docker compose exec app node src/cli.js set-password` |
| Lost the authenticator | `docker compose exec app node src/cli.js disable-2fa` |
| A source says Locked | Fix the login in Settings → Connections, then Unlock |
| The bank wants a one-time code | Settings → Connections → **Verify this device** |
| Port 8787 is taken | set `APP_PORT=9000` in `.env`, then `docker compose up -d` |
| Logs | `docker compose logs -f app` (or `scraper`) |

More: [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) (scraper problems), [`docs/HOW_IT_WORKS.md`](docs/HOW_IT_WORKS.md) (how bills, jars, budgets, the forecast and sync behave), [`docs/app_explained.md`](docs/app_explained.md) (plain-language overview), [`CHANGELOG.md`](CHANGELOG.md).

## For developers
```sh
cd server && npm install
DB_DRIVER=pglite PGLITE_DIR=memory:// npm test                          # server tests, no Postgres needed
# or: createdb money_test && DATABASE_URL=postgres://money:money@localhost/money_test npm test
(cd ../scraper && npm ci && node --test)                                # needs a Chromium; uses a fake bank
```
| Path | What |
|---|---|
| `web/` | The UI (one page) and PWA files |
| `server/` | Node API, migrations, auth, encryption, scheduler, FX, imports, tests |
| `scraper/` | Separate service with Chromium and a pinned `israeli-bank-scrapers` |
| `desktop/` | The Windows app (Electron) |
| `docs/` | Specs, security, guides, screenshots |
| `scripts/` | `bump.mjs` (new version), `screenshots.mjs` (README images) |

**Releases are automatic.** `node scripts/bump.mjs minor` (or `patch` / `major`) adds a section to `CHANGELOG.md` and sets the version everywhere. Fill it in and merge to `main`: the **Release** workflow runs the tests, tags the version, builds the Windows installer and publishes the GitHub release with the changelog as notes.

**Demo data:** `node src/cli.js demo` (in `server/`, or `docker compose exec app node src/cli.js demo`) loads made-up data into an empty database.

**Scraper library:** `israeli-bank-scrapers` is pinned in `scraper/package.json`. When a bank changes its site and syncing breaks, bump it, rebuild the scraper image (`docker compose build scraper`), and retry. The Windows app gets the new version with the next release.

## Status
Built: schema, API, persistence, login and 2FA, encrypted write-only credentials, lock-out guard, scraper service, Wise API and CSV, bank CSV import, dedupe and merge, rules, transfers, gaps, FX, documents, scheduler, alerts, PWA, Docker, Windows app with automatic updates, backup, Hebrew.

Not verified: **the scrapers and the Wise token have been tested against fake services only**, not the real banks, so expect to adjust once you try your own. Hapoalim one-time codes need **Verify this device**. Not built: split transactions, budget rollover, Excel (non-CSV) import.
