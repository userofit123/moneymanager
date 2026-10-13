# Security model

What protects your data, and what does not.

## Sign-in
- One user. First visit asks you to choose a password (10+ characters). It is stored only as a scrypt hash.
- Optional two-factor sign-in (TOTP, any authenticator app). The 2FA secret is stored encrypted.
- Sessions are random tokens in an `HttpOnly`, `SameSite=Strict` cookie (`Secure` when served over HTTPS). Only a hash of the token is stored. Default lifetime 14 days; "Sign out everywhere" ends all of them. Changing the password signs out every other device.
- Five wrong passwords from one address, or thirty overall, block sign-in for 15 minutes.
- Every `/api` call needs a valid session. Calls that change data also need a custom header (on top of `SameSite=Strict`). The page itself is public but contains no data.
- Forgot the password: `docker compose exec app node src/cli.js set-password`. Lost the phone with 2FA: `docker compose exec app node src/cli.js disable-2fa`.

## Credentials for Wise, Hapoalim, Max, Isracard
- Entered in Settings → Connections. Stored with AES-256-GCM. The key is in `/data/app.key` (a Docker volume, mode 600) or `APP_KEY`, **not in the database**, so a database dump alone reveals nothing.
- Write-only: the API never returns them, not even to you. To change one, enter it again.
- Sent to the scraper container per request over a private network, kept only in memory there, and never written to disk or logs. Error messages are scrubbed of credential values before they are stored or shown.
- **Lock-out guard:** two failed logins in a row (three for Wise) lock a source. No automatic retries until you unlock it, so a bank never locks your account for you. Saving new credentials also unlocks.
- Read-only by design: the scrapers only read, and the Wise token should be created with read-only permissions.

## The remembered-device profile
- **Verify this device** keeps a browser profile per bank in the `scraperprofiles` Docker volume. It holds the bank's cookies, including the "this device is trusted" marker and possibly a live session. Treat it like a credential: with your password and that profile, a bank may let someone in without a code.
- It is not in `backup.sh`, it is never sent to the browser, and it is wiped when you remove the bank's credentials in Settings → Connections (or with `docker volume rm`).
- The live view shows the bank's pages (including your balances) only to a signed-in session, only while a verification window is open, and the window closes itself after 10 idle minutes. "Type my password" sends the saved value from the server to the scraper; the page never receives it.

## Network
- The database is on an internal Docker network, reachable only from the app. The scraper is reachable only from the app and is the only container that talks to the banks. Nothing is published except the app, bound to `127.0.0.1` by default.
- Serve it to other devices through Tailscale or the home network, with HTTPS (Caddy). Never expose it to the open internet. Set `TRUST_PROXY=1` behind Caddy so cookies are marked `Secure`.
- Response headers: strict Content-Security-Policy (no external scripts, no framing), `nosniff`, no referrer.

## Backups and the key
- The in-app backup (Settings → Backup and restore) never contains bank logins, the Wise token, `app.key`, the app password, 2FA secrets or notification links. It can be protected with a password you choose (AES-256-GCM, key from scrypt). Restoring replaces the data and leaves the connections as they are.
- `backup.sh` dumps the database and documents. It does **not** include `app.key`. Keep that in your password manager: `docker compose exec app cat /data/app.key`. Without it a restored database works, but you must re-enter the bank logins.
- Documents (receipts, invoices) are stored unencrypted on the `appdata` volume. Use disk encryption on the host.

## Read-only: what is and is not guaranteed
- **In the code:** the app only calls the scraper's `scrape()` (log in, read accounts and transactions). The scraper service has no endpoint for anything else, the app has no screen or API that sends an instruction to a bank, and the Wise client only issues GET requests (balances, statements).
- **At the bank:** your login is a normal full login. A bank cannot tell "the scraper" from you, so *technically* anything holding those credentials could do more than read. The protection is the code above, the encrypted write-only storage, and the container isolation, not a permission at the bank.
- **Where the bank can enforce it, use it:** create the Wise token with read-only permissions (Wise enforces that). Ask your bank and card companies whether they offer a view-only web user; if one exists, use its credentials here. Turn on the banks' own login and transfer alerts, and any online-transfer limits, so an unexpected action is noticed.

## Where data can go (audit of every outbound connection)
| From | To | What is sent |
|---|---|---|
| app | `api.frankfurter.dev` | currency and date range only (exchange rates) |
| app | `api.wise.com` | your Wise token, read requests |
| app | your ntfy address | alert text (account names, amounts). Only addresses on your own network or Tailscale are allowed; a public address such as ntfy.sh is refused unless you set `ALLOW_PUBLIC_NTFY=1` |
| app | scraper container (private network) | bank credentials for one login |
| scraper | the banks | the login and read requests |
Nothing else: no analytics, telemetry, error reporting, fonts or CDN scripts. The page's Content-Security-Policy (`connect-src 'self'`) stops the browser page from sending data anywhere but your own server, and the service worker never caches `/api/` data. The browser inside the scraper has its update, sync and metrics pings switched off.

**Strict mode (recommended once the scrapers work):** `docker compose -f docker-compose.yml -f docker-compose.strict.yml up -d --build`. The scraper then has no internet route at all; its browser can only reach the bank domains through an allowlist proxy that refuses everything else, refuses names that resolve to private addresses, and logs refused host names (`docker compose logs egress`). Test one login in strict mode before relying on it, because bank pages sometimes load helper scripts from other domains.

## Not covered
- A compromised host or Docker daemon can read everything the app can.
- The screen of an unlocked device with a live session shows your data; there is no separate app PIN yet.
- Without strict mode, the scraper container can reach the whole internet. The app container also has internet access (it needs rates, Wise and ntfy) and is limited only by its code, which the audit above lists.
- One-time codes (SMS) are not supported by the scraper for Hapoalim, Max or Isracard; use CSV import for a source whose bank insists on them.
