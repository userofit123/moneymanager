---
title: Alerts and notifications
description: What Money Manager alerts you about, how to choose which ones, and how to get them on your phone, in ntfy, Telegram or a webhook, even when the app is closed.
---

# Alerts and notifications

The app watches your data and tells you when something needs a look. You decide **what** it tells you about and **where** it tells you.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="screenshots/alerts-dark.webp">
  <img alt="The Alerts page: each alert with its urgency, the numbers, when it appeared, and Open and Dismiss buttons" src="screenshots/alerts-light.webp">
</picture>

## What you can be alerted about

Bills due soon or overdue · a bill's price changed · a budget almost used or over · a card charge much higher than last month · a large payment · transfers and duplicates to review · a balance that changed with no payment to explain it · a source that is out of date · uncategorized payments · a forecast that goes below zero · income without a document · a jar that ran out · payments that look like they came from a jar.

The most urgent come first: an overdue bill or a budget that is already over, then a bill due soon, then price changes, large payments and uncategorized items.

Each alert shows **when it first appeared**. **Open** takes you to the right place (the bill, the budget, the payment). **Dismiss** hides it, and a dismissed alert does not come back unless it is a new one. The **History** tab lists every alert that ever appeared, when it went away, and whether it resolved by itself or you dismissed it.

## Choose which alerts you get

**Settings → Which alerts** has one switch for each kind. Turn one off and it stops showing and stops being sent. Some have limits you can change:

| Setting | What it does | Starts at |
|---|---|---|
| Card charge higher by (%) | Warn when a card this month is more than this percent above last month | 10 |
| Large transaction from (₪) | Warn about any payment this big in the last 7 days | ₪5,000 |
| Bill reminder (days before) | Warn this many days before a bill | 3 |
| Budget warning level (%) | Warn when a budget is this much used | 80 |

Dismissed one by mistake? **Show dismissed alerts again** brings them back.

## Get them outside the app: Settings → Notifications

Alerts always show inside the app. When the app is closed, the **server** can send them to the places you turn on.

### Phone push (the easiest)

On your phone, open the app from the home screen icon over `https://` and go to **Settings → Notifications → Phone push → Turn on for this device**. Press **Send a test** to check. Setup details are in [On your phone](install-phone.md#phone-notifications).

Each alert is sent to a device **once**. Refreshing or reopening the app does not repeat alerts you were already told about. If an alert goes away and comes back later, you are told again.

### ntfy

[ntfy](https://ntfy.sh) is a free notification service you can run on your own server. Type your topic address and press **Send test to ntfy**.

> **Note** For privacy, only addresses on your own network or Tailscale are accepted. A public address such as `ntfy.sh` is refused unless you set `ALLOW_PUBLIC_NTFY=1` in `.env`, because the alert text contains account names and amounts.

### Telegram

1. In Telegram, talk to **@BotFather** and create a bot. Copy its **bot token**.
2. Send any message to your new bot, then open `https://api.telegram.org/bot<token>/getUpdates` in a browser and find your **chat id**.
3. In **Settings → Notifications → Telegram**, paste both and press **Save**. The status turns **On**. **Send a test** checks it. **Remove** turns it off.

### Webhook

A webhook sends alerts to Discord, Slack, Home Assistant, n8n and similar. Paste the **Webhook address** and press **Save**. **Send a test** and **Remove** work the same way.

## What gets sent in the background

Besides your alert kinds, the server also pushes: **sync failures**, **new missing-money gaps** and gaps **older than 3 days**. Each distinct problem is sent **once**, not at every sync.

> **Warning** Telegram and webhooks send the alert text, **including account names and amounts**, over the internet to that service. Turn them on only if you are fine with that.
