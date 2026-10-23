---
title: Install on Linux
description: Money Manager for Linux as an AppImage, a .deb (Debian, Ubuntu, Mint) or an .rpm (Fedora, Red Hat, openSUSE). Its own database inside, nothing to set up.
---

# Install on Linux

The Linux app is the same app as the Windows one: the web app, the bank connector and the database, all inside. Nothing else to install and nothing to configure. Pick the file that fits your system.

## Which file?

Open the [latest release](https://github.com/userofit123/moneymanager/releases/latest) on GitHub and look under **Assets**.

| Your system | Download | Why |
|---|---|---|
| **Fedora**, Red Hat, openSUSE | the **.rpm** | Installs like any other program, with a menu entry and an icon. Updates itself. |
| **Ubuntu**, Debian, Linux Mint, Pop!_OS | the **.deb** | The same, for the Debian family. |
| Anything else, or you just want to try it | the **.AppImage** | One file that runs anywhere. Nothing is installed. |

Only 64-bit Intel and AMD computers (x86_64) are built for now.

## Fedora, Red Hat, openSUSE (.rpm)

```sh
sudo dnf install ./Money-Manager-*-linux-x86_64.rpm
```

You can also double-click the `.rpm`: **Software** opens and offers to install it.

On openSUSE use `sudo zypper install ./Money-Manager-*-linux-x86_64.rpm`. Then open **Money Manager** from your applications menu.

## Ubuntu, Debian, Mint (.deb)

```sh
sudo apt install ./Money-Manager-*-linux-amd64.deb
```

Then open **Money Manager** from your applications menu.

## Any distribution (AppImage)

```sh
chmod +x Money-Manager-*-linux-x86_64.AppImage
./Money-Manager-*-linux-x86_64.AppImage
```

> **Note** On Fedora's file manager, **double-clicking an AppImage opens the disk image mounter** (it sees a disk image), which is not an installer. Run it from a terminal as above, or right-click → **Properties → Permissions → Allow executing file as program**, then right-click → **Open With → Run**. If this is confusing, use the **.rpm** instead: it installs like any other program.

- **If it says it needs FUSE:** install the FUSE 2 library. On Fedora: `sudo dnf install fuse-libs`. On Ubuntu 22.04 and later: `sudo apt install libfuse2`.
- **Menu entry and icon:** the first time it runs, the AppImage adds itself to your applications menu with the Money Manager icon, pointing at wherever you saved the file. If you move the file, run it once from the new place and the entry follows.
- Keep the file somewhere permanent, such as `~/Applications`, not in Downloads.

## The first time you open it

1. The app asks **where your money is kept**. Choose **This computer** (its own private database). If you already run Money Manager on a server, see [Desktop app with your server](desktop-server.md).
2. **Choose a password** (at least 10 characters). You will use it every time you open the app.
3. Go to **Settings → Connections** and [connect your accounts](getting-started.md#connect-your-accounts).

## Where your data is

In `~/.config/Money Manager`: the database, your receipts and the key that protects saved bank logins.

- **Saved logins are locked with your desktop's keyring** (GNOME Keyring, KDE Wallet) when there is one. That means only your user, on this computer, can open them.
- **No keyring?** The app then keeps the key in a file in the data folder with strict permissions (the same as the Docker version), and anyone who can read that folder can read the logins. Use disk encryption in that case.
- Uninstalling the app does not delete your data.

## Closing the window

- **On GNOME (Fedora's default desktop, Ubuntu):** closing the window **quits** the app, because GNOME has no system tray to bring a hidden app back from. Automatic syncing runs only while the app is open.
- **On KDE, XFCE, Cinnamon, MATE and others with a tray:** closing the window keeps the app running in the **system tray**, so automatic syncing continues. Right-click the tray icon for **Open Money Manager**, **Switch to…**, **Open data folder** and **Quit**.
- **On any desktop** you can quit from the **⋮** menu at the left end of the title strip (or press **Alt**), or with **Ctrl+Q**.

> **Tip** Only one copy of the app runs at a time. If you start the app and an older copy is still running in the background, you will see the old one. Quit it first (tray icon, **Ctrl+Q**, or from a terminal: `pkill -f money-manager`).

## The window

The window has no separate system title bar. A slim strip in the app's own colours (light, dark, or your look) takes its place, you can drag the window by it, and the window buttons sit at its end. It follows the app's look automatically.

## Updates

- The **AppImage**, **.deb** and **.rpm** check the releases by themselves. The .deb and .rpm ask for your password to install an update, because they live in a system folder.
- Turn this off, or check by hand, in **Settings → Version and updates**.
- Your data is never touched by an update. See [Updating](updating.md).

## Wayland and X11

Both work.

## Something wrong?

See [Troubleshooting](troubleshooting.md).
