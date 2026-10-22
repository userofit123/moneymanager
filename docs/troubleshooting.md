---
title: Troubleshooting
description: Fixes for the common problems: forgotten password, a bank that asks for a one-time code, a login that times out, numbers that look wrong, phone notifications, the desktop apps and Docker.
---

# Troubleshooting

Find your problem below. Most are one step.

## Quick answers

| Problem | Fix |
|---|---|
| Forgot the app password (Docker) | `docker compose exec app node src/cli.js set-password` |
| Lost the authenticator phone (Docker) | `docker compose exec app node src/cli.js disable-2fa` |
| A source says **Locked** | Fix the login in **Settings → Connections**, then press **Unlock** |
| The bank wants a one-time code | **Settings → Connections → Verify this device** (below) |
| Port 8787 is taken | Set `APP_PORT=9000` in `.env`, then `docker compose up -d` |
| See what the app says | `docker compose logs -f app` (or `scraper`) |
| Windows says "unknown publisher" | **More info → Run anyway**. The installer is not code-signed. |
| The AppImage says it needs FUSE | Fedora: `sudo dnf install fuse-libs`. Ubuntu: `sudo apt install libfuse2` |

## Passwords and sign-in

**Forgot the password.** On Docker: `docker compose exec app node src/cli.js set-password`. The Windows and Linux apps have no reset command: if you forget the password, install fresh, choose a new one and restore a backup (**Settings → Backup and restore**). Backups never contain passwords or bank logins, so you type the bank logins again.

**Lost the phone with the authenticator.** On Docker: `docker compose exec app node src/cli.js disable-2fa`, then set it up again.

**Signed out on every device.** Changing your password signs out all other devices. **Sign out everywhere** (Settings → Security) does it on purpose, for a lost device.

**"Too many attempts".** Five wrong passwords from one address, or thirty overall, block sign-in for 15 minutes. Wait, then try again.

## The bank asks for a one-time code

Some banks (Hapoalim, for one) text you a code on a device they do not recognise. The scraper cannot type a one-time code itself, but you can make its browser **a device the bank recognises**:

1. **Settings → Connections →** the bank **→ Verify this device**.
2. A live view of the scraper's browser opens (it can only open that bank's own websites). Click the page to focus a field. Use **Type my user code / password** to fill your saved login without it passing through this page, type the code in the box and press **Send**, and tick the bank's **remember this device** option if it has one.
3. When you reach your account, press **Done**, then **Test connection**.

The browser profile is kept per connection (a Docker volume, or in the desktop app's data folder), so later automatic syncs should not ask again. If the bank still asks every time, use its CSV or Excel export instead (**Settings → Import and export**). If it starts asking again, repeat the steps. The app pauses a source as soon as it sees a code page, so it never keeps triggering text messages.

## "TIMEOUT: waiting for redirect…" or a login that gets stuck

The login page did not move on after the login was typed. It is **not necessarily a wrong password**. Check, in this order:

1. **Log in to the bank's site yourself** in a normal browser. Look for a captcha, a one-time code, an expired password, a terms or update notice, or a locked account. Fix that first.
2. **Turn on diagnostics** (Docker): set `SCRAPER_DEBUG=1` in `.env`, run `docker compose up -d`, then press **Unlock** and **Test connection** once.
3. **Copy out the screenshot** of where it got stuck: `docker compose cp scraper:/debug/max.png .` (use `hapoalim.png` or `isracard.png` for the others). Set `SCRAPER_DEBUG=0` again afterwards.
4. **Bank sites change.** Update the scraper library (`scraper/package.json`), rebuild (`docker compose build scraper`) and retry. Wait a while between attempts and never retry in a loop. **Two failures lock the source on purpose**, so the bank never locks your account.

## A source says "Locked"

That is the protection working: after **two failed logins in a row** (three for Wise) the app stops trying, so your bank never locks your account. Fix the login (or the reason above), then press **Unlock**. Saving new credentials also unlocks.

## The numbers look wrong

| What you see | Usually because |
|---|---|
| **A balance with no matching payments** | A balance moved without a transaction. It appears in **Activity → Needs review → Balance changes with no transaction**. Add the payment, import the missing statement, or mark it reviewed with a note. |
| **Spending looks double** | Check that the credit card is connected, so the bank's card bill is recognised as a **card payment** and left out. You can add a text under **Settings → Automatic sorting → Card payments**. |
| **A transfer counted as spending** | It was not paired. In **Needs review**, confirm it as a transfer. |
| **Income missing from the forecast** | Income that arrived in **one month only** counts as a one-off and is left out. In two or more months it counts as recurring. See [Forecast](tour.md#forecast-where-you-are-heading). |
| **Wise income missing** | Same rule, and check that the Wise account is counted in reports (**Accounts → the account → Details**). |
| **Foreign currency totals look odd** | Amounts are converted at the rate of the transaction's date and kept on the row. Rates come from the European Central Bank each day. |
| **Last month is missing** | The first sync reads only the history period you chose. Press **Import history** on the connection to read further back, once. |

## Notifications and the phone

- **No "Install app" button.** The address is not `https://`, or you are in a private window. See [On your phone](install-phone.md).
- **Phone notifications do nothing.** Open the app from the **home screen icon** (not a browser tab), turn on **Settings → Notifications → Phone push** again and press **Send a test**. On iPhone you need iOS 16.4 or newer.
- **The same alerts again and again.** Update to the latest version. Older versions repeated urgent alerts every time the app opened.
- **I never get any.** Check the kind is on in **Settings → Which alerts**.

## The desktop apps

- **"Where is your money kept?" appears again.** It only appears when the app has no saved choice. Choose **This computer**, or your server.
- **A "Read-only file system" error when opening "This computer" on Linux.** Fixed in 0.12.0. Update the AppImage to the latest release.
- **The server does not answer.** The app asks whether to **try again**, **choose another server**, or quit. Check the address and that the server is on. See [Desktop app with your server](desktop-server.md).
- **"Unknown security certificate".** Your server uses its own certificate. Check that the fingerprint is the one you expect, and press **Trust** to accept it for that server only.
- **The window has no title bar.** That is the new design: the strip at the top is draggable and the window buttons are at its end.
- **Saved logins cannot be opened after copying the data folder.** On purpose: the key is tied to your Windows account (or Linux keyring). Type the logins again.
- **I opened the app and it is an old version.** An older copy is still running in the background, and only one copy runs at a time. Quit it (tray icon, **Ctrl+Q**, or `pkill -f money-manager` in a terminal) and start the app again. From 0.12.1 on GNOME, closing the window quits the app.

## Docker

- **Where is my data?** In Docker volumes. `docker compose down` keeps them. `docker compose down -v` **deletes** them.
- **Can't reach it from another device.** The app listens on this machine only by default. See [Use it from your other devices](install-docker.md#use-it-from-your-other-devices).
- **Lost the key.** `docker compose exec app cat /data/app.key` shows it. Without it a restored database works, but you type the bank logins again.
- **Everything is slow after turning on Glass.** Switch **Appearance → Surface** back to **Solid**. Glass is the heaviest effect for the graphics card.

## Still stuck?

- Open **Settings → Error log**. It lists what went wrong and when.
- Search or ask in [GitHub issues](https://github.com/userofit123/moneymanager/issues). Please **leave out** names, balances, account numbers and bank logins.
