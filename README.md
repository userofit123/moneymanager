# Money Manager

Self-hosted, read-only personal finance hub: Bank Hapoalim, Max, Isracard, Wise and a manual pension, with categories, bills, budgets, jars, alerts, reports and a forecast. No AI in the core. Requirements: [`docs/finance_app_spec_final.md`](docs/finance_app_spec_final.md) and [`docs/spec-addendum-v1.1-missing-money.md`](docs/spec-addendum-v1.1-missing-money.md). Plain-language overview: [`docs/app_explained.md`](docs/app_explained.md).

## Layout
| Path | What |
|---|---|
| `web/` | The UI (the original demo, now loading and saving through the API) and PWA files |
| `server/` | Node API, Postgres migrations, scheduler, FX rates, Wise and CSV import, balance-gap engine, tests |
| `scraper/` | Separate container with Chromium and `israeli-bank-scrapers` (Hapoalim, Max, Isracard) |
| `docker-compose.yml` | db + app + scraper |
| `docs/` | Specs and design images |

## Run it on the server
```sh
cp .env.example .env && chmod 600 .env        # set POSTGRES_PASSWORD, SCRAPER_KEY, WISE_TOKEN
mkdir -p secrets /mnt/data/finance/{postgres,documents}
cp secrets.example.json secrets/bank_credentials.json && chmod 600 secrets/bank_credentials.json
docker compose up -d --build db app           # add the scraper after testing one source (see below)
```
Add a Caddy block pointing at `127.0.0.1:APP_PORT`, then open `https://rhs.taile6739f.ts.net:PORT` over Tailscale. To try the screens with sample data on an empty database: set `ALLOW_DEMO_SEED=1` and `curl -X POST localhost:9010/api/demo/seed`.

Backups: `backup.sh` dumps Postgres and syncs documents to the Dell server.

## Develop
```sh
cd server && npm install
createdb money && createdb money_test
DATABASE_URL=postgres://money:money@localhost/money ALLOW_DEMO_SEED=1 SCHEDULER=0 npm start   # http://localhost:8080
npm test                                                                                      # uses money_test
```

## How data flows
- The UI loads `GET /api/state` (assembled from the tables) and saves edits with `PUT /api/state` (400 ms debounce). If a sync changed data in the meantime the server answers 409, the UI reloads and asks you to repeat the last change.
- Sync (every 8 h and "Sync now"): Wise balances via API, bank/card transactions via the scraper, then dedupe (never imported twice), conversion at the rate of the transaction's date (stored on the row), category rules (never overwriting manual ones), transfer pairing, balance snapshots and gaps.
- **Missing money** (addendum v1.1): a balance that moved without a transaction becomes a gap in Activity → Needs review. Clear it by adding the transaction, importing the Wise CSV (merges with hand-entered rows), recording a small charge as a fee, or marking it reviewed with a note. There is no ignore button.
- Documents are stored under `DOCS_DIR`. Exchange rates come from Frankfurter and are cached in the database.
- The service worker caches the app shell only, never `/api/` data.

## Scraper test plan (spec section 9)
One source at a time, last 30 days, check balance and first rows, delete the credentials afterwards, stop after two failures. The service never retries a failed login. Fix the server's DNS first.

## Status
Done: schema (all spec tables), API, persistence, FX, documents, Wise API and CSV, scraper service, dedupe and merge, rules, transfers, gaps, scheduler, PWA, Docker, backup script, server tests (`server/test`).

Not done yet or open (spec open questions):
- Scrapers and the Wise token are untested against the real services.
- App password or 2FA, PIN lock for the phone app.
- Background alerts: the ntfy URL is stored, but only the in-app test sends today.
- Hebrew right-to-left, split transactions, budget rollover, planned one-off items, card-bill matching (question 8).
- Bills, budgets, forecast and alert logic still run in the browser on the loaded data, not as server code with their own tests.
