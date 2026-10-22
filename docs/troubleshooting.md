# Troubleshooting a scraper

## The bank texted you a code during a login
Hapoalim does this on a device it does not recognise. The scraper library cannot type a one-time code itself, but you can make the scraper's browser a device the bank recognises:
1. Settings → Connections → the bank → **Verify this device**.
2. A live view of the scraper's browser opens (it can only open that bank's own websites). Click the page to focus a field. Use "Type my user code / password" to fill your saved login without it passing through this page, type the code in the box and **Send**, and tick the bank's "remember this device" option if it has one.
3. When you reach your account, press **Done**, then **Test connection**.

The browser profile is kept per connection (a Docker volume, or in the Windows data folder), so later automatic syncs should not ask again. If the bank still asks every time, use its CSV/Excel export (Settings → App and data). If it starts asking again, repeat the steps. The app pauses a source as soon as it sees a code page, so it never keeps triggering SMS messages.

## `TIMEOUT: waiting for redirect…`
The login page did not move on after the login was typed. It is not necessarily a wrong password. Check, in this order:
1. Log in to the bank's site yourself in a normal browser. Look for a captcha, a one-time code, an expired password, a terms or update notice, or a locked account. Fix that first.
2. Turn on diagnostics: set `SCRAPER_DEBUG=1` in `.env`, run `docker compose up -d`, then **Unlock** and **Test connection** once.
3. Copy out the screenshot of where it got stuck: `docker compose cp scraper:/debug/max.png .` (use `hapoalim.png` or `isracard.png` for the others). Set `SCRAPER_DEBUG=0` again afterwards.
4. Bank sites change: update the scraper library (`scraper/package.json`), rebuild (`docker compose build scraper`), and retry. Wait a while between attempts and never retry in a loop. Two failures lock the source on purpose.
