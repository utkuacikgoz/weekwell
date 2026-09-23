# Week plan screen: review v2 (wave 1)

**Approval status: design_pending.** This was merged overnight under the product owner's instruction to keep building; merging is not approval. It replaces the rejected M1 week screen (`../../screens/11-*`).

## What changed since the last review

- **Tokens:** type scale is now 28/32 title, 20/24 section, 16/22 body, 13/18 secondary, 12/16 metadata. Labels are sentence case (no all-caps). Palette is warm paper, deep ink, leaf green, and a citrus accent for price attention only. Radii are 12 and 16.
- **Fonts:** Inter for UI text (bundled so captures match the phone); platform serif (Georgia) for the page title and dish names.
- **Meal visuals:** ingredient illustrations drawn from each recipe's real ingredients replace the empty circles (gallery: `/review/art?review=1`).
- **Layout:** tonight's dinner is the front door. The week list has large rows and a clear chevron button. Lunches sit below the fold.
- **Price:** one price-status component in the bottom bar, next to the grocery action it describes. Full caveats moved to an "About this estimate" sheet.
- **New action:** "Rebuild under budget" with a preview sheet and an Undo confirmation.
- **Navigation:** the context line (store, budget, goal, time, people) is one tappable row that opens preferences.

## States

| File | State |
|---|---|
| [01-idle.png](01-idle.png) | Idle, Wednesday, sample prices, within budget |
| [02-pressed-tonight.png](02-pressed-tonight.png) | Tonight card pressed (scale 0.985, slight fade) |
| [03-scrolled.png](03-scrolled.png) | Scrolled: rest of the week and work lunches |
| [04-detail-about-estimate.png](04-detail-about-estimate.png) | Detail: About this estimate sheet |
| [05-loading-prices-updating.png](05-loading-prices-updating.png) | Loading: prices updating (previous total stays visible) |
| [06-error-price-unavailable.png](06-error-price-unavailable.png) | Error: price unavailable, plan still usable |
| [07-stale-prices.png](07-stale-prices.png) | Stale: "$73 last checked 3 days ago" + Check prices again |
| [08-over-budget.png](08-over-budget.png) | Over budget + Rebuild under budget |
| [09-detail-rebuild-sheet.png](09-detail-rebuild-sheet.png) | Rebuild preview sheet |
| [10-rebuilt-with-undo.png](10-rebuilt-with-undo.png) | After rebuild: confirmation with Undo |
| [11-weekend-next-up.png](11-weekend-next-up.png) | Weekend: "Next up · Monday" |
| [12-idle-320-150.png](12-idle-320-150.png) | 320×568 at 150% text: compact bottom bar and hero |
| [13-recording-plan-recipe-grocery.webm](13-recording-plan-recipe-grocery.webm) | Recording: plan → recipe → back → scroll → estimate sheet → grocery list |

Tapping into the recipe and grocery list still shows the M1 design; those are waves 2 and 3.

## Handoff

```md
Screen: Week plan
State: idle (plus the states above)
Viewport/device: 390×844 @2x (Chromium, Expo web build); 320×568 at 150% text
What the user should understand in 5 seconds: what's for dinner tonight, and that the week fits the budget
Primary action: Open grocery list (persistent bottom bar)
Secondary actions: View recipe (tonight card), any day row, Edit (context line), About this estimate (ⓘ), Check prices again / Rebuild under budget (only when needed), Try a free week
Motion: press feedback is immediate (card scale 0.985, row tint); sheets slide up; stack push/pop
Sound: none
Haptics: none on this screen (rebuild success uses the shared success haptic)
Reduced-motion behavior: sheets fade instead of sliding; navigation has no animation
Known limitations: illustrations stand in for photography (R-1); web rendering, not iOS; sample prices
Approval status: design_pending
```

## Copy and data assumptions

| Copy | Data |
|---|---|
| "$73 estimated at Trader Joe's" | Sum of whole-package fixture prices |
| "Within your $75 budget · sample prices, Sep 20" | Fixture prices are samples, so "checked" is never used (R-3) |
| "Price unavailable right now" / "Total unavailable" | Provider down / some items unpriced; no total is shown |
| "$90 over your $40 budget" | Estimate minus budget |
| "36g protein" | Per-serving estimate from ingredient averages; the footnote says "Protein estimate · check package labels" |

## Open questions (recommendation first)

1. **Hero illustration vs photo.** Recommend keeping illustrations for the pilot. Alternatives: licensed stock photography with one colour grade; generated photos after a style board is approved.
2. **Price in the bottom bar vs under the title.** Recommend the bottom bar (it sits next to the action it's about). Alternatives: a line under the title; only on the grocery screen.
3. **Tonight shown twice (card + list row marked "Tonight").** Recommend keeping both so the week order stays complete. Alternatives: leave it out of the list; collapse the list to the other four days.
