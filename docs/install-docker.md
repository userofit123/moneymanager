---
title: Install with Docker (home server)
description: Run Money Manager on a home server, NAS or always-on computer with Docker. Reach it from every device, keep it syncing around the clock, update it from one place.
---

# Install with Docker (home server)

This is the way to run Money Manager if you want it **always on**, for **several devices**, on a computer that is never switched off: a home server, a NAS that runs Docker, a Raspberry Pi, or an old PC in a cupboard.

Three small programs run in Docker, and you do not have to think about them: the **app** (what you see), the **database** and the **scraper** (the part that logs in to your banks).

## What you need

- A computer that can run **Docker** with **Docker Compose** (Docker Desktop on Windows and Mac, Docker Engine on Linux, or your NAS's Docker app). Intel/AMD or ARM (a Raspberry Pi 4 or newer works).
- About 2 GB of free disk space and 1 GB of free memory.
- `git`, or you can download the repository as a ZIP file.

## Install

```sh
git clone https://github.com/userofit123/moneymanager.git
cd moneymanager
./setup.sh              # creates the settings file (.env) with random secrets, once
docker compose up -d    # downloads the app and the scraper and starts everything
```

Open **http://localhost:8787** in your browser and **choose a password** (at least 10 characters).

That is the whole installation. It starts again by itself after a reboot, and your data lives in Docker volumes, so it survives updates.

> **Warning** `docker compose down -v` deletes your data. Use plain `docker compose down` to stop it.

### Save your key (important)

Your bank logins are encrypted with a key that lives in the app's volume, **not in the database**. Copy it into your password manager now:

```sh
docker compose exec app cat /data/app.key
```

Without the key, a restored backup still works, but you would have to type the bank logins again.

## Use it from your other devices

By default the app listens **only on the machine it runs on** (`BIND=127.0.0.1`), which is the safe choice. There are two good ways to reach it from other devices.

### Option 1: your home network (simple)

In the `.env` file set `BIND=0.0.0.0`, then run `docker compose up -d`. Open `http://<server-address>:8787` from any device on your home network.

> **Warning** Use `BIND=0.0.0.0` only on a network you trust, and never expose the port to the internet. Without HTTPS a phone cannot install the app or get notifications. For that, use option 2.

### Option 2: HTTPS with Caddy or Tailscale (recommended)

HTTPS is needed to **add the app to a phone's home screen** and for **phone notifications**.

- **Tailscale** (easy, private): install Tailscale on the server and your devices, then publish the app with Tailscale's `serve` feature. You get a private `https://…ts.net` address that works from anywhere you are signed in to Tailscale.
- **Caddy** (your own domain): add the proxy file so Caddy can reach the app, and tell the app a proxy is in front:

  ```sh
  # in .env:  TRUST_PROXY=1
  docker compose -f docker-compose.yml -f docker-compose.proxy.yml up -d
  ```

  and point a Caddy block at it:

  ```
  money.example.com {
      reverse_proxy app:8080
  }
  ```

Never expose it directly to the open internet. If you want it reachable away from home, use Tailscale or a VPN.

## Just want to look around?

Start it with **made-up demo data** instead. This is for an empty install only. Never use it for your real data.

```sh
docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d --build
```

Then open http://localhost:8787 and choose any password.

## Safer connection to the banks (strict mode)

Strict mode lets the scraper reach **only your banks**, nothing else on the internet:

```sh
docker compose -f docker-compose.yml -f docker-compose.strict.yml up -d --build
```

Turn it on once your bank connections work. If a login then times out, `docker compose logs egress` lists hosts it refused. Add only ones you recognise to `EGRESS_ALLOW` in `.env`.

## Backups

- The app backs itself up **every day** (Settings → Backup and restore): your data without any bank logins, into `/data/backups` in the app volume. You can protect backups with a password.
- To keep backups somewhere else (a NAS folder, an external drive), link a host folder in `docker-compose.yml` (see the commented `backups` line) and type its path in Settings.
- `./backup.sh` dumps the database and documents. It does **not** include the key, so keep the key in your password manager (see above).

## Settings you may want (the `.env` file)

| Setting | What it does | Default |
|---|---|---|
| `APP_PORT` | The port on the server | `8787` |
| `BIND` | `127.0.0.1` = this machine only, `0.0.0.0` = your network | `127.0.0.1` |
| `TRUST_PROXY` | Set to `1` when Caddy or another proxy is in front | `0` |
| `HISTORY_DAYS` | How far back the first import of a bank goes | `365` |
| `SESSION_DAYS` | How long you stay signed in on a device | `14` |
| `SCRAPER_DEBUG` | `1` saves a screenshot when a bank login gets stuck | `0` |
| `MM_VERSION` | Pin a version instead of the newest | newest |

After changing `.env`, run `docker compose up -d`.

## Updating

To update **by itself**, add the optional helper: `docker compose -f docker-compose.yml -f docker-compose.autoupdate.yml up -d`. Otherwise, from a terminal: `docker compose pull && docker compose up -d`. Or from Docker Desktop, Portainer, Dockhand or Watchtower, without a terminal. All the ways are in [Updating](updating.md).

## Stop, restart, remove

```sh
docker compose stop            # stop, keep everything
docker compose up -d           # start again
docker compose logs -f app     # watch what the app says (or: scraper)
docker compose down            # remove the containers, keep your data
docker compose down -v         # remove the containers AND your data. No way back.
```

## Next

[Your first 15 minutes →](getting-started.md)
