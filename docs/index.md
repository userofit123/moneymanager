---
title: Money Manager
description: All your bank accounts, cards and savings in one private place that only you can see. Free, self-hosted, read-only, in English and Hebrew.
---

# Money Manager

**All your money in one private place that only you can see.**

Money Manager reads your Israeli banks, credit cards, Wise and a pension you type in. It turns them into something you can understand at a glance: where your money went, which bills are coming, whether you are on track, and what the next few months probably look like.

It runs **on your own computer or server**. There is no account with us, nothing is sent to us, and it can only *read*. It can never move money or change anything at a bank.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="screenshots/home-dark.webp">
  <img alt="The Home screen: your balance, this month's income and spending, upcoming bills, budgets and jars" src="screenshots/home-light.webp">
</picture>

> **Tip** You do not need to know any financial words. Every number can be explained by pointing at it, and every page has a short guide in the **?** button.

## Why people use it

- **One place for everything.** Bank Hapoalim, Leumi, Discount, Mizrahi-Tefahot, Max, Isracard, Visa Cal, American Express, Wise and more, plus a file import for anything else.
- **It does the sorting for you.** It finds your bills, pairs transfers between your own accounts, ignores duplicates and does not count a credit card bill twice.
- **It looks ahead.** Budgets, savings jars that fill in the order you choose, a forecast, and alerts when something looks wrong.
- **It is private by design.** Your bank logins are stored encrypted on your own machine and are never shown again, not even to you.
- **It speaks your language.** English and Hebrew, right to left, on a computer or a phone.
- **No AI inside, no tracking, no ads.** Free and open source.

## Get started in three steps

1. **Install it.** The easiest way is the Windows or Linux app: one file, nothing to set up. If you have a home server, use Docker instead. [Choose how to run it →](install.md)
2. **Connect your accounts.** Pick your bank in *Settings → Connections*, type your login once, and press **Sync now**. [Your first 15 minutes →](getting-started.md)
3. **Look around.** Home shows today. Activity lists every payment. Jars, Bills and Budgets help you plan. [A tour of every screen →](tour.md)

## A closer look

<table>
<tr>
<td><picture><source media="(prefers-color-scheme: dark)" srcset="screenshots/recap-dark.webp"><img src="screenshots/recap-light.webp" alt="Recap: the month so far, told as a short story"></picture><br><sub><b>Recap.</b> The month so far, in plain words.</sub></td>
<td><picture><source media="(prefers-color-scheme: dark)" srcset="screenshots/activity-dark.webp"><img src="screenshots/activity-light.webp" alt="Activity: every payment from every account, with search and filters"></picture><br><sub><b>Activity.</b> Every payment, searchable.</sub></td>
</tr>
<tr>
<td><picture><source media="(prefers-color-scheme: dark)" srcset="screenshots/forecast-dark.webp"><img src="screenshots/forecast-light.webp" alt="Forecast: where your balance is heading over the next year"></picture><br><sub><b>Forecast.</b> Where your balance is heading.</sub></td>
<td><picture><source media="(prefers-color-scheme: dark)" srcset="screenshots/jars-dark.webp"><img src="screenshots/jars-light.webp" alt="Jars: savings goals inside your account"></picture><br><sub><b>Jars.</b> Put money aside for what matters.</sub></td>
</tr>
<tr>
<td><picture><source media="(prefers-color-scheme: dark)" srcset="screenshots/bills-dark.webp"><img src="screenshots/bills-light.webp" alt="Bills: recurring payments found automatically"></picture><br><sub><b>Bills.</b> Found automatically, predicted ahead.</sub></td>
<td><picture><source media="(prefers-color-scheme: dark)" srcset="screenshots/budgets-dark.webp"><img src="screenshots/budgets-light.webp" alt="Budgets: a monthly limit for each category"></picture><br><sub><b>Budgets.</b> Know if you are spending too fast.</sub></td>
</tr>
<tr>
<td><picture><source media="(prefers-color-scheme: dark)" srcset="screenshots/reports-dark.webp"><img src="screenshots/reports-light.webp" alt="Reports: net worth, spending by category and trends"></picture><br><sub><b>Reports.</b> Net worth, categories and trends.</sub></td>
<td><picture><source media="(prefers-color-scheme: dark)" srcset="screenshots/home-he-dark.webp"><img src="screenshots/home-he-light.webp" alt="The Home screen in Hebrew, right to left"></picture><br><sub><b>Hebrew.</b> The whole app, right to left.</sub></td>
</tr>
</table>

On a phone it looks like this, in light, dark and Hebrew:

<p align="center">
<picture><source media="(prefers-color-scheme: dark)" srcset="screenshots/mobile-home-dark.webp"><img src="screenshots/mobile-home-light.webp" alt="Home on a phone" width="220"></picture>
<picture><source media="(prefers-color-scheme: dark)" srcset="screenshots/mobile-recap-dark.webp"><img src="screenshots/mobile-recap-light.webp" alt="Recap on a phone" width="220"></picture>
<picture><source media="(prefers-color-scheme: dark)" srcset="screenshots/mobile-home-he-dark.webp"><img src="screenshots/mobile-home-he-light.webp" alt="Home on a phone, in Hebrew" width="220"></picture>
</p>

All screenshots on this site use made-up demo data.

## How you can run it

| I want… | Use | |
|---|---|---|
| The easiest way, on my Windows PC | The Windows app | [Install →](install-windows.md) |
| The same on Linux (Fedora, Ubuntu, Debian…) | The Linux app | [Install →](install-linux.md) |
| It always on, for the whole family's devices, behind my own domain | Docker on a home server | [Install →](install-docker.md) |
| It on my phone | Add it to the home screen (an app, not a store download) | [Install →](install-phone.md) |
| A desktop app that shows my home server | Windows or Linux app, "My server" mode | [Set up →](desktop-server.md) |

## Honest limits

- It only reads. If you want the strongest guarantee, use a **view-only** login at your bank when it offers one.
- Whoever can open your computer or server can open the app as you. Use a strong password and two-factor sign-in, and lock your screen. [Security →](security.md)
- The bank connections come from an open-source library that follows the banks' websites. When a bank changes its site, syncing can break until the library is updated. You can always import a file from the bank instead.
- Not built yet: split transactions, budgets that roll over, and Excel (non-CSV) import.

[Source code and releases on GitHub](https://github.com/userofit123/moneymanager)
