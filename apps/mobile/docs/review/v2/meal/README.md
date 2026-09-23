# Meal detail, swap, and cooking mode: review v2 (wave 3)

**Approval status: design_pending.** Merged overnight under the product owner's instruction; merging is not approval.

## What changed since the last review

- Starts with the dish: illustration, "Wednesday dinner", title, then a facts row (total, hands-on, protein est., servings).
- **Start cooking** is the primary action. It opens a new cooking mode with one step at a time in large text, progress, a "Next" preview, and Back / Next step.
- "On your grocery list" is a checkbox row near the top (reversible).
- Ingredients have a quantity column and "Also in …" reuse notes. Steps are numbered with generous spacing.
- Nutrition and allergens are a collapsed disclosure; the summary line is "Protein estimate · contains dairy · check package labels".
- "Swap this meal" sits after the recipe. Cheaper, more protein, and quicker are behind "More changes".
- **Swap flow:** the page scrolls up to the new meal, and the bottom bar shows the decision ("Swapped to X · 9 grocery items changed · was Y") with **Keep swap** (primary) and **Undo** (secondary). Either choice gets a short confirmation toast.
- **Error:** when no other meal fits, the swap button is disabled with the reason. If a repair finds nothing, a warning toast explains why.

## States

| File | State |
|---|---|
| [01-idle.png](01-idle.png) | Idle |
| [02-pressed-start-cooking.png](02-pressed-start-cooking.png) | Start cooking pressed |
| [03-scrolled-ingredients-steps.png](03-scrolled-ingredients-steps.png) | Scrolled: ingredients and steps |
| [04-detail-nutrition-and-more-changes.png](04-detail-nutrition-and-more-changes.png) | Nutrition and More changes expanded |
| [05-swap-pending.png](05-swap-pending.png) | Swap pending: Keep swap / Undo |
| [06-swap-kept.png](06-swap-kept.png) | After Keep: toast "Swap kept · grocery list updated" |
| [07-swap-undone.png](07-swap-undone.png) | After Undo: toast "Swap undone" |
| [08-error-no-other-meal-fits.png](08-error-no-other-meal-fits.png) | Error: no other meal fits (20 min, no eggs) |
| [09-off-grocery-list.png](09-off-grocery-list.png) | Meal taken off the grocery list |
| [10-cooking-step-1.png](10-cooking-step-1.png) | Cooking mode, step 1 |
| [11-cooking-step-3.png](11-cooking-step-3.png) | Cooking mode, last step (Done) |
| [12-idle-320-150.png](12-idle-320-150.png) | 320×568 at 150% text |
| [13-recording-open-swap-keep-cook.webm](13-recording-open-swap-keep-cook.webm) | Recording: open, swap, keep, start cooking |

## Handoff

```md
Screen: Meal detail (+ cooking mode)
State: idle (plus the states above)
Viewport/device: 390×844 @2x (Chromium, Expo web build); 320×568 at 150% text
What the user should understand in 5 seconds: what this dish is, how long it takes, and that "Start cooking" walks them through it
Primary action: Start cooking (normal) / Keep swap (right after a swap)
Secondary actions: grocery-list checkbox, Nutrition and allergens, Swap this meal, More changes, Undo (after a swap), Back to Week
Motion: page scrolls to top after a swap; toasts appear in place; disclosures open instantly; stack push to cooking mode
Sound: none
Haptics: success on swap; warning when no replacement exists
Reduced-motion behavior: no navigation animation; everything else is already instant
Known limitations: cooking mode has no timers or keep-awake yet; illustration instead of a photo
Approval status: design_pending
```

## Open questions (recommendation first)

1. **Cooking mode scope.** Recommend step-by-step only for the pilot. Alternatives: add inline timers from the step text; keep the screen awake while cooking.
2. **Where the swap decision lives.** Recommend the bottom bar (next to the thumb, and it can't be missed). Alternatives: an inline banner at the top; a confirmation sheet before swapping.
