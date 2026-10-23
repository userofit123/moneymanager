---
title: The Mac app
description: Install Money Manager on a Mac. The first time you open it you approve it once, because it is not signed with a paid Apple account.
---

# The Mac app

The Mac app is the same as the Windows and Linux apps: your data stays on your Mac, with the bank connector built in, or it shows the data of your own server ([Desktop app with your server](desktop-server.md)).

> **Note** It is not signed with a paid Apple developer account, so macOS asks you to approve it once. Nothing is wrong with the file. The steps are below.

## Install

1. Open the [latest release](https://github.com/userofit123/moneymanager/releases/latest) and download the **.dmg** that fits your Mac:
   - **arm64** for a Mac with an Apple chip (M1 or newer).
   - **x64** for an older Mac with an Intel chip. (Apple menu → About This Mac shows which you have.)
2. Open the .dmg and drag **Money Manager** into **Applications**.

## Open it the first time

macOS says the app "cannot be opened" or "is damaged". It is not damaged, it is only not signed.

1. Try to open Money Manager once, then press **Done**.
2. Open **System Settings → Privacy & Security**, scroll to the bottom and press **Open Anyway** next to Money Manager. Type your Mac password.
3. Open the app again. From now on it opens like any other app.

On an older macOS you can instead right-click the app and choose **Open**.

## Updating

The Mac app cannot update itself (that needs the paid signing). **Settings → Version and updates** and the **Money Manager** menu tell you when a newer one is out, and open the download page. Download the new .dmg and drag the app into **Applications** again, replacing the old one. Your data stays.

## Good to know

- This app is built by an automatic process on GitHub and has not been tried on every Mac. If it does not open, tell us what it says in [GitHub issues](https://github.com/userofit123/moneymanager/issues).
- The browser works too: open your server's address in Safari and choose **File → Add to Dock**.
