---
title: The Android app
description: Install the Money Manager app on an Android phone, point it at your own server, and lock it with your fingerprint, face or screen lock.
---

# The Android app

The Android app is the same Money Manager, as a real app: its own screens are inside the app, and it reads **your data from your own server** ([Docker install](install-docker.md)). Compared with [adding the web page to the home screen](install-phone.md) it adds:

- **An app lock.** Ask for your fingerprint, face or the phone's screen lock when the app opens. The app is also hidden in the list of recent apps.
- **A list of servers.** Keep more than one (home, a test copy) and switch between them.
- **A check that the app and the server fit.** If they do not, the app says so in plain words instead of showing a broken page.
- **It opens with the last data you saw** when the server cannot be reached.

> **Note** A phone cannot collect bank data by itself. The server does that, and the app shows the result.

## Install

1. On the phone, open the [latest release](https://github.com/userofit123/moneymanager/releases/latest) and download **Money-Manager-x.y.z.apk**.
2. Open the file. Android asks to allow installing apps from this source (your browser or files app): allow it **for this one install**.
3. Open **Money Manager**.

The app is not in an app store, so it does not update itself. **Settings → Version and updates** tells you when a newer one is ready and links to the download. Installing it over the old one keeps your servers and your lock.

## Connect it to your server

1. On the first screen choose **Connect to my server**, type a name and the address (for example `money.home` or `https://192.168.1.5:8443`) and save.
2. If your server uses its own certificate, the app shows its fingerprint. Check it is the one you expect and press **Trust**. It is accepted for that server only.
3. Sign in as you would in a browser.

Later, **Settings → Server** in the app lets you add, switch or remove servers.

## Lock the app

Open **Settings → Security → App lock** (under *Your data*), turn it on and choose when it asks again: every time you leave, half a minute, 1 minute or 5 minutes. It uses whatever the phone has (fingerprint, face, PIN or pattern). The phone needs one of them set up first.

## Alerts as phone notifications

Turn on **Settings → Notifications → Show alerts as notifications** and allow notifications when the phone asks. The app asks your server for new alerts about every 15 minutes, also when it is closed, and shows each one as a notification. **Send a test** shows one at once. This needs your server on 0.12.6 or newer, and it does not use Google or any outside service. For instant alerts you can also use ntfy, Telegram or a webhook ([Alerts and notifications](alerts-notifications.md)).

## What it does not do yet

- **Saving a file** (an export) is not supported in the app yet. Use the web page for that.

## When the app and the server do not fit

Apps and servers fit by **API level**, not by version, so most updates never matter. When they do not fit, the app asks you to update whichever is older. See [Updating](updating.md).
