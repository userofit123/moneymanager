# Money Manager

Self-hosted, read-only personal finance hub: Bank Hapoalim, Max, Isracard, Wise and a manual pension, with categories, bills, budgets, jars, alerts, reports and a forecast. No AI in the core. Requirements: [`docs/finance_app_spec_final.md`](docs/finance_app_spec_final.md) and [`docs/spec-addendum-v1.1-missing-money.md`](docs/spec-addendum-v1.1-missing-money.md). Plain-language overview: [`docs/app_explained.md`](docs/app_explained.md). Security details: [`docs/SECURITY.md`](docs/SECURITY.md).

## Start it (laptop or server)
```sh
git pull
./setup.sh                      # creates .env with random secrets (once)
docker compose up -d --build
```
Open **http://localhost:8787**. The first visit asks you to choose a password. Then:

1. **Settings → Security**: turn on two-factor sign-in (recommended).
2. **Settings → Connections**: enter your Wise token and bank logins, **Save**, then **Test connection** (last 30 days, nothing is saved). Test one source at a time. After two failed logins in a row a source locks itself; fix the login, then **Unlock**.
3. **Sync now** (or wait; it syncs every 8 hours). The first sync of a bank imports up to a year of history.
4. Settings → **App and data**: import a Wise statement CSV or a bank/card CSV, update the pension balance.
5. Settings → Alerts: add your ntfy address for background alerts.
6. Save the encryption key in your password manager: `docker compose exec app cat /data/app.key`.

Try it first with fake data instead: `docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d --build` (empty database only).

It restarts by itself after a reboot (keep Docker Desktop set to start at login). Data lives in Docker volumes, so rebuilds keep it; `docker compose down -v` deletes it.

### On the home server
Use the same steps, then add the proxy file so Caddy can reach it, and set `TRUST_PROXY=1` in `.env`:
```sh
docker compose -f docker-compose.yml -f docker-compose.proxy.yml up -d --build
```
Point a Caddy block at `app:8080` (or `127.0.0.1:8787`) and open `https://rhs.taile6739f.ts.net:PORT` over Tailscale. 9008 is reserved for n8n. Schedule `backup.sh` (nightly, optional rsync to the Dell server via `BACKUP_DEST`).

## Forgot something
| Problem | Fix |
|---|---|
| Forgot the app password | `docker compose exec app node src/cli.js set-password` |
| Lost the authenticator | `docker compose exec app node src/cli.js disable-2fa` |
| A source says Locked | Fix the login in Settings → Connections, then Unlock |
| Port 8787 is taken | set `APP_PORT=9000` in `.env`, `docker compose up -d` |
| Logs | `docker compose logs -f app` (or `scraper`) |

## Layout
| Path | What |
|---|---|
| `web/` | The UI and PWA files |
| `server/` | Node API, Postgres migrations, auth, encryption, scheduler, FX, imports, balance-gap engine, tests |
| `scraper/` | Separate container with Chromium and a pinned `israeli-bank-scrapers` |
| `docker-compose*.yml` | main stack, demo data, proxy network |
| `docs/` | Specs, security model, design images |

## How data flows
- The UI loads `GET /api/state` and saves edits with `PUT /api/state`. If a sync changed data in between, the server answers 409 and the UI reloads.
- Sync: Wise balances via API, bank/card transactions via the scraper, then dedupe (never imported twice), conversion at the transaction date's rate (stored on the row), category rules (never overwriting manual ones), transfer pairing, balance snapshots and gaps.
- **Missing money** (addendum v1.1): a balance that moved without a transaction becomes a gap in Activity → Needs review. Clear it by adding the transaction, importing the Wise CSV (merges with hand-entered rows), recording a small charge as a fee, or marking it reviewed with a note. There is no ignore button.
- Alerts: shown in the app; sync failures, new gaps and gaps older than 3 days are also pushed to your ntfy address.

## Develop
```sh
cd server && npm install
createdb money_test
DATABASE_URL=postgres://money:money@localhost/money_test npm test      # 26 tests
```

## Status against the spec
Built: schema, API, persistence, login and 2FA, encrypted write-only credentials, lock-out guard, scraper service, Wise API and CSV, bank CSV import, dedupe and merge, rules, transfers, gaps, FX, documents, scheduler, ntfy alerts, PWA, Docker, backup, 26 server tests.

Not verified or not built:
- **The scrapers and the Wise token have not been run against the real services** (no credentials were available). Expect to adjust once you test them. Hapoalim one-time codes are not supported.
- Bills, budgets, forecast and most alert rules still calculate in the browser from the loaded data, so they have no server-side tests yet.
- Hebrew right-to-left, split transactions, budget rollover, planned one-off items, matching card bills paid from the bank, and a PIN lock for the installed phone app (all open questions in the spec).
- Bank CSV import is CSV only (no Excel files).
