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

## Network
- The database is on an internal Docker network, reachable only from the app. The scraper is reachable only from the app and is the only container that talks to the banks. Nothing is published except the app, bound to `127.0.0.1` by default.
- Serve it to other devices through Tailscale or the home network, with HTTPS (Caddy). Never expose it to the open internet. Set `TRUST_PROXY=1` behind Caddy so cookies are marked `Secure`.
- Response headers: strict Content-Security-Policy (no external scripts, no framing), `nosniff`, no referrer.

## Backups and the key
- `backup.sh` dumps the database and documents. It does **not** include `app.key`. Keep that in your password manager: `docker compose exec app cat /data/app.key`. Without it a restored database works, but you must re-enter the bank logins.
- Documents (receipts, invoices) are stored unencrypted on the `appdata` volume. Use disk encryption on the host.

## Not covered
- A compromised host or Docker daemon can read everything the app can.
- The screen of an unlocked device with a live session shows your data; there is no separate app PIN yet.
- The scraper container can reach the whole internet, not only bank domains (Docker cannot filter by domain without a proxy).
- Hapoalim one-time codes are not supported by the scraper; use CSV import for it if the bank insists.
