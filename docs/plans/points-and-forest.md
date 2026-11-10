# Future plan: points, levels and a growing forest

Status: planned, not started. Nothing here is built yet.

## Idea
People earn points for using the app well and for good money results. Points add up to levels. Each level grows a forest one step. Nothing is spent, nothing dies, and a bad month never takes points away.

## Points for actions (given right away, each only once per item)
- Opening the app and really using a page: 5, once a day (a tab left open does not count)
- Clearing an alert: 10, only the first time for that alert (bringing it back and clearing it again gives nothing)
- Reviewing an item that needs review: 5, once per item
- Giving a payment a category by hand: 1, no daily cap
- Adding a tag by hand: 1, no daily cap (no loss for payments without a tag)
- Any other update to your items (marking a bill, editing a payment, a budget, a jar, cleaning up): 1 for each item changed, once a day per item, no daily cap
- Making a sorting rule: 10, once per rule
- Automatic categories and tags give nothing; the rule that made them already did
- Every payment this month has a category: 50, once a month
- Setup, once ever: first bank linked 100 (and a level up); first budget, jar, cash or pension 50 each. Kept even if the item is deleted later.

## Points for the month (shown "on the way" during the month, counted when it ends)
Based on the share of income, not the plain amount, so earning more does not mean more points.
- Money kept: 10 per 1% of the month's income kept, up to 30% (300 points)
  - Example: earned 10,000, kept 1,500 → 15% → 150 points
- Kept more than last month: 5 per 1% better
- Each category that spent less than last month: 2 per 1% less, up to 50 per category
- Each budget that stayed under its limit: 20
- A bad month earns less, never minus

## How much
- Typical month about 600 points; bad month about 250; excellent about 1,000
- No daily or weekly caps on points for actions: each action earns its points
- Values live in one table so they are easy to tune

## Levels
- Points needed: level 2 at 100, then 250, 450, 700… (each step needs 50 more than the last)
- New people go up about one level a month; after a year about one every 2–3 months
- Levels never go down
- Level up shows a short moment with what grew

## The forest
- Levels 1–3: seed, sprout, small tree
- Levels 4–10: more trees, bushes, flowers
- Levels 11–20: animals (birds, a deer), then a stream
- Level 20 and up: seasons, sunrise, rare animals
- Unlocks are only nice extras (forest items, extra color looks), never anything the app needs

## Where it shows
- A badge on every screen: very top of the side column on the computer, top bar on the phone
- Shows both level and points, for example "Level 4 · 520", with a thin bar to the next level
- Clicking it opens a quiet full page: everything else hidden, a "Back to the app" button where the badge was, the plant or forest in the middle, the stats under it:
  - level and points to the next level
  - points this month so far
  - month points on the way
  - the last few things that earned points
  - a short "How to earn points" list
- Can be turned off in Settings

## Look of the forest
- Flat, layered drawings in code (SVG): real shapes, soft shading and light, gentle movement (swaying leaves, a bird, slow clouds)
- Light mode is day, dark mode is night with fireflies
- Grows on a hill so it looks complete at every level
- Sharp on every screen, works offline, tiny in size

First step when work starts: a sample page with 5 stages (seed, sprout, young tree, small grove, full forest), day and night, phone and computer size, for approval before building.

If the drawings are not good enough: look for a free art pack whose rules allow a public open project (Kenney, which needs no credit; or checked packs from OpenGameArt or itch.io) and compare the best two or three. Mixing packs looks patched together, so one pack with all stages is preferred.

## Keeping it honest
- Each earned point is saved under the item it came from, so nothing earns twice
- Action points are saved in the same change as the action, so Undo also removes them
- Daily visits, setup and month results are saved quietly, with no change-history line

## Build steps (one commit each)
1. Calculations (`lib/points.js`) with tests
2. Saving earned points, once per item
3. Points for actions
4. Month points and the "on the way" preview
5. Badge on every screen and the forest page
6. Setting to turn it off
7. English and Hebrew texts and tooltips, changelog in both languages
