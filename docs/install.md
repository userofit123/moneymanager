---
title: Choose how to run it
description: Windows app, Linux app, Docker on a home server, or your phone. How to pick, and what each one means for where your data lives.
---

# Choose how to run it

Money Manager is one app that you can run in a few ways. They all look and work the same. What changes is **where your data lives** and **how much you have to set up**.

## The short answer

- **Just you, on one computer?** Use the [Windows](install-windows.md) or [Linux](install-linux.md) app. One file, nothing to set up. Your data stays on that computer.
- **You have a home server or a NAS, and want to use it from several devices?** Use [Docker](install-docker.md). Then open it from any browser, add it to your [phone](install-phone.md), or use the desktop app in [My server mode](desktop-server.md).
- **You only want to look around first?** Start the Docker version with made-up demo data. It takes two minutes. [See how](install-docker.md#just-want-to-look-around).

## Side by side

| | Windows or Linux app | Docker on a server | On your phone |
|---|---|---|---|
| **Set up** | Run one file | A few commands, once | Open your server's address, then "Add to home screen" |
| **Where your data is** | On that computer | On the server | On the server (the phone keeps a read-only copy) |
| **Works without internet** | Yes, fully, and you can edit | The last data opens read-only | The last data opens read-only |
| **Collects bank data by itself** | While the app is running (it stays in the tray when you close the window) | Always, even when nothing is open | Uses your server |
| **Several devices at once** | No (one computer) | Yes | Yes |
| **Updates** | Automatic | One command, or from Docker Desktop, Portainer and similar | Updates with the server |

> **Note** Phones cannot collect bank data on their own, because that needs a browser that logs in to your bank, which a phone cannot run in the background. That is why the phone uses your server.

## Can I use more than one?

Yes, and they do not interfere. Each has its own data. The desktop app can even **switch between its own private database and one or more of your servers**. See [Desktop app with your server](desktop-server.md).

## What you need from your bank

Nothing special. You type the same username and password you use on the bank's website, once, in *Settings → Connections*. They are saved encrypted and are never shown again. If your bank offers a **view-only** login, use that one: it is the safest choice.

## Next

[Your first 15 minutes →](getting-started.md)
