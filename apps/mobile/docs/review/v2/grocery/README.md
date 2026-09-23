# Grocery list: review v2 (wave 2)

**Approval status: design_pending.** Merged overnight under the product owner's instruction; merging is not approval.

## What changed since the last review

- A real navigation bar ("‹ Week") and a serif page title.
- Progress is a bar with "2 of 21 checked".
- Rows are one check target (checkbox, name, "Need 8.1 oz · buy 2 × 6 oz bag") plus a separate price column that opens a "Used in N meals" sheet. This replaces the repeated meal-name paragraphs.
- The checked state is a filled box with a tick, muted text and strikethrough, so it doesn't rely on one cue.
- Checking an item shows "Checked Baby spinach · Undo" above the action bar for 4 seconds.
- Price uses the same `PriceStatus` component as the week screen.
- Staples are collapsed under "Assumed at home".
- "Share list" is secondary and real (the OS share sheet with unchecked items). No store handoff is shown because no deep link exists.

## States

| File | State |
|---|---|
| [01-idle.png](01-idle.png) | Idle |
| [02-pressed-row.png](02-pressed-row.png) | Row pressed |
| [03-checked-with-undo-toast.png](03-checked-with-undo-toast.png) | Two items checked, undo toast |
| [04-detail-used-in-meals.png](04-detail-used-in-meals.png) | Detail: "Used in 3 meals" sheet |
| [05-scrolled-staples-open.png](05-scrolled-staples-open.png) | Scrolled to the end, staples open |
| [06-stale-prices.png](06-stale-prices.png) | Stale prices ("older price" per item) |
| [07-missing-prices.png](07-missing-prices.png) | Missing prices: total unavailable, "No price" per item |
| [08-loading-prices.png](08-loading-prices.png) | Prices updating |
| [09-all-checked.png](09-all-checked.png) | Everything checked |
| [10-empty.png](10-empty.png) | Empty: every meal off the list |
| [11-idle-320-150.png](11-idle-320-150.png) | 320×568 at 150% text |
| [12-recording-check-undo-used-in.webm](12-recording-check-undo-used-in.webm) | Recording: check, check, undo, used-in sheet |

## Handoff

```md
Screen: Grocery list
State: idle (plus the states above)
Viewport/device: 390×844 @2x (Chromium, Expo web build); 320×568 at 150% text
What the user should understand in 5 seconds: what to buy next, and how much of the list is done
Primary action: check an item (the whole left part of each row)
Secondary actions: price column (shows the meals using the item), Share list, About this estimate (ⓘ), Check prices again (when needed), Back to Week
Motion: tick scales in over 120 ms; toast appears in place; sheets slide up
Sound: none
Haptics: light impact on check; none on uncheck or undo
Reduced-motion behavior: tick and sheets appear instantly or fade
Known limitations: "checked" count includes the "Assumed at home" items; sample prices; web rendering
Approval status: design_pending
```

## Open questions (recommendation first)

1. **Where "Used in N meals" lives.** Recommend the price column (keeps rows short). Alternatives: a second line under the name (taller rows); only in item detail.
2. **Checked items stay in place.** Recommend keeping them in place (preserves your position while shopping). Alternatives: move checked items to the bottom; add a "Hide checked" toggle.
