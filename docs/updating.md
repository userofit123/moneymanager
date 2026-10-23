---
title: Updating
description: How to update Money Manager on Windows, Linux and Docker, including Docker Desktop, Portainer, Dockhand and Watchtower. Your data is never touched by an update.
---

# Updating

**An update never touches your data.** It replaces the program, and your database, receipts and settings stay where they are. New versions and what changed are listed on the [releases page](https://github.com/userofit123/moneymanager/releases) and inside the app under **Settings → Version and updates → What's new**.

## How you find out

The app checks for a new version by itself. When there is one, it shows **Update available** in the side menu. Open **Settings → Version and updates** to see the installed version, **What's new**, **Check for updates** and, in the desktop apps, **Update automatically**.

## Mac app

It cannot update itself (that needs Apple's paid signing). **Settings → Version and updates** says when a newer one is out and opens the download page. Download the new .dmg and drag the app into **Applications**, replacing the old one.

## Android app

It does not update itself (it is not in a store). **Settings → Version and updates** shows when a newer one is ready, with a link to the download. Open the new file and install it over the old one: your servers and your lock stay.

## Windows and Linux apps

They update **themselves**:

1. A newer version is downloaded quietly in the background.
2. It installs the next time you close the app, or when you press **Restart and update**.
3. Your data stays. The same program is replaced, never a second copy.

The **⋮** menu in the desktop apps (and the tray icon) has an update line that follows the update: **Check for updates…**, then **Download update**, then **Restart and update**, and the **⋮** button shows a small dot while an update is waiting. Turn **Update automatically** off if you would rather press **Download and update** yourself. Details by system:

- **Windows:** the installer updates the existing install. Running a newer `Setup.exe` over an old one does the same. **Uninstalling keeps your data.**
- **Linux AppImage:** it replaces itself in place.
- **Linux .deb and .rpm:** they ask for your password to install the update, because they live in a system folder.

## Docker

The app shows the same notice. Images are published with every release (`ghcr.io/userofit123/moneymanager` and `ghcr.io/userofit123/moneymanager-scraper`, for amd64 and arm64), so you can update like any other Docker app.

**From a terminal**

```sh
docker compose pull && docker compose up -d
```

**Without a terminal**

- **Docker Desktop:** *Images* → the image shows **Update available** → pull, then restart the containers.
- **Portainer:** *Stacks* → your stack → **Pull and redeploy** (or turn on the stack's webhook or **Re-pull image** option to update automatically). Add `POSTGRES_PASSWORD` and `SCRAPER_KEY` as the stack's environment variables (the values from `.env`).
- **Dockhand, Watchtower and similar:** point them at the stack or the containers. They compare the image tag (`latest`) and update when it changes.

**Automatically (optional)**

A server cannot replace itself, so Docker needs a helper if you want updates with no clicks. One file adds it:

```sh
docker compose -f docker-compose.yml -f docker-compose.autoupdate.yml up -d
```

Every night at 04:00 it checks for a new release and, if there is one, updates **only** the app and the scraper (never the database; your data stays in its volumes). Change the time with `UPDATE_SCHEDULE` in `.env` (a cron time with seconds, for example `0 0 5 * * *`).

> **Warning** The helper needs access to Docker itself, which can control everything on that machine. If you prefer not to give that, update by hand, from Docker Desktop, or from Portainer instead.

**Pin a version**

Set `MM_VERSION=0.12.0` (or any version) in `.env`, then `docker compose up -d`. Remove the line to follow the newest again.

**Build from the source in this folder instead**

```sh
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

## Phones and other browsers

They use your server, so they update when the server does. If a phone seems to show an old screen after an update, close the app fully and open it again, or reload the page once.

## Desktop app in "My server" mode

The desktop app itself updates like above. The server it shows updates separately (Docker, above).

## Going back

Going back to an older version is **not supported**: a newer version may have changed how the database is laid out, and an older one cannot read that. If an update causes trouble, **restore a backup made before it** (Settings → Backup and restore, or the nightly backup on a server) on the older version. That is why a manual backup before a big jump is always a good idea.
