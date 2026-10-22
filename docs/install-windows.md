---
title: Install on Windows
description: Download one installer, open Money Manager, choose a password and connect your accounts. Everything stays on your computer.
---

# Install on Windows

The Windows app is the easiest way to start. It is one installer. Inside it are the app, the bank connector and the database, so there is **nothing else to install and nothing to configure**.

## What you need

- Windows 10 or 11 (64-bit).
- About 1 GB of free space (the bank connector carries its own browser).
- Your internet connection, only to talk to your banks, to check for updates and to get exchange rates.

## Install

1. Open the [latest release](https://github.com/userofit123/moneymanager/releases/latest) on GitHub.
2. Under **Assets**, download **Money-Manager-Setup-x.y.z.exe**.
3. Run it. There is no wizard: it installs for your user (no administrator password needed) and opens the app.
4. In the app, **choose a password** (at least 10 characters). You will use it every time you open the app.
5. Open **Settings → Connections** and [connect your accounts](getting-started.md#connect-your-accounts).

> **Note** Windows may say **"Windows protected your PC"** or **"unknown publisher"** the first time. The installer is not code-signed, because a signing certificate costs money. Choose **More info → Run anyway**. You can compare the file with the one on the GitHub release page if you want to be sure.

## The first time you open it

The app asks **where your money is kept**:

- **This computer** is the default. The app keeps its own private database on your computer.
- **My server** is for people who already run Money Manager on a home server. See [Desktop app with your server](desktop-server.md).

If you are not sure, choose **This computer**. You can change your mind later.

## Where your data is

Everything is in `%APPDATA%\Money Manager` (you can paste that into the Windows Explorer address bar). It holds the database, your receipts and the key that protects saved bank logins. Nothing is sent anywhere except to your own banks.

- The key for saved logins is protected by your **Windows account**. If you copy the data folder to another computer or another Windows user, the saved logins cannot be opened there and the app asks you to type them again. This is on purpose.
- **Uninstalling keeps your data.** Delete the folder yourself if you want it gone.

## Closing the window does not close the app

The app keeps running in the **system tray** (near the clock), so automatic syncing continues. Right-click the icon for:

- **Open Money Manager**
- **Switch to** (if you use [more than one server](desktop-server.md))
- **Open data folder**
- **Quit**

## Updates

The app checks for new versions by itself, downloads them quietly and installs them the next time you close it. You can turn that off or check by hand in **Settings → Version and updates**, which also shows **What's new**. Your data is never touched by an update. More in [Updating](updating.md).

## Something wrong?

See [Troubleshooting](troubleshooting.md). The most common one is a bank that asks for a one-time code: use **Verify this device** once.
