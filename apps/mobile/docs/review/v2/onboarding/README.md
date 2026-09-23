# Welcome, setup, and generating: review v2 (wave 4)

**Approval status: design_pending.** Merged overnight under the product owner's instruction; merging is not approval.

## What changed since the last review

- **Setup is 4 steps instead of 8:** Store and budget → Your week (goal, time, people) → Foods to leave out → Review and build.
- **Progress in words:** "Step 2 of 4 · Your week" with a thin bar. The back button names the previous step.
- **Choices are button groups:** a 2×2 grid for goal, 3 across for time and people. Selection is shown by fill, border, a tick badge, and `aria-checked`.
- **Review:** three tappable summary rows ("Change"), and **Plan my five dinners** is the one primary action. Conflicts show here before generation.
- **Welcome:** three dish illustrations, the promise, and three outcome lines.
- **Generating:** the same step list with icons, plus the error copy.
- "Allergies" is now framed as "Any foods to leave out?".

## States

| File | State |
|---|---|
| [01-welcome.png](01-welcome.png) | Welcome |
| [02-store-budget-empty.png](02-store-budget-empty.png) | Step 1, nothing chosen (Continue disabled) |
| [03-pressed-store.png](03-pressed-store.png) | Store option pressed |
| [04-store-budget-selected.png](04-store-budget-selected.png) | Step 1, store chosen |
| [05-your-week.png](05-your-week.png) | Step 2, goal, time and people |
| [06-foods-to-leave-out.png](06-foods-to-leave-out.png) | Step 3 |
| [07-review.png](07-review.png) | Step 4, review and build |
| [08-foods-conflict.png](08-foods-conflict.png) | Conflict shown while choosing |
| [09-review-conflict.png](09-review-conflict.png) | Conflict on review; Plan is disabled |
| [10-generating.png](10-generating.png) | Generating (in progress) |
| [11-error-timeout.png](11-error-timeout.png) | Error: timeout, Try again |
| [12-store-budget-320-150.png](12-store-budget-320-150.png) | 320×568 at 150% text |
| [13-your-week-320-150.png](13-your-week-320-150.png) | 320×568 at 150% text |
| [14-recording-setup-to-plan.webm](14-recording-setup-to-plan.webm) | Recording: full setup to plan |

## Handoff

```md
Screen: Welcome + setup (4 steps) + generating
State: each step idle and selected, conflict, generating, error
Viewport/device: 390×844 @2x (Chromium, Expo web build); 320×568 at 150% text
What the user should understand in 5 seconds: this takes four quick answers and ends in a planned week
Primary action: Get started → Continue ×3 → Plan my five dinners
Secondary actions: back (names the previous step), Change on each review row, budget −/+ and slider, Add exclusion
Motion: stack push between steps; the progress bar updates in place
Sound: none
Haptics: selection tick on each choice; success when the plan is ready; warning on generation failure
Reduced-motion behavior: steps switch without animation
Known limitations: the budget slider is the web implementation in captures; native iOS slider styling differs
Approval status: design_pending
```

## Open questions (recommendation first)

1. **Combine Store and budget.** Recommend keeping them together (both are "the shop"). Alternatives: separate steps; ask for budget on the review screen only.
2. **Defaults on Your week** (High protein, 30 min, 1 person). Recommend keeping them preselected, since they match the audience. Alternative: require an explicit choice for each.
