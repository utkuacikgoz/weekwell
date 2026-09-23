# Preferences, paywall, and after the free week: review v2 (wave 5)

**Approval status: design_pending.** Merged overnight under the product owner's instruction; merging is not approval.

## What changed since the last review

- **Preferences** use the same groups as setup (Store and budget, Your week, Foods to leave out), plus Feedback and Your data. The "What will change" preview and **Apply changes** / **Keep my current plan** sit in the bottom bar and only appear once something has changed.
- **Delete my data** opens a confirmation sheet with one destructive button ("Delete everything") and Cancel.
- **Paywall:**
  - Value comes first (three outcomes).
  - Nothing is preselected.
  - Every plan shows its billed price, and monthly and yearly also show the per-week equivalent (monthly ≈ $2.31/week, yearly ≈ $0.96/week; straight arithmetic).
  - The yearly saving is shown as truthful arithmetic.
  - The footer says when billing starts.
  - Restore purchases is always visible.
  - The test-build note is now a small caption.
- **After the free week (D-026, the review's recommendation):** the current plan and grocery list stay available. "Plan a new week", swaps, rebuilds, and preference changes that replace meals open a "Your free week has ended" sheet with **See plans** / **Not now**. The paywall then offers **Subscribe** (mock purchase in this build). The whole policy lives in `src/services/access.ts`.
- **New: "Plan a new week"** on the week screen. It goes to the setup review with the current preferences, then builds a fresh week.

## States

| File | State |
|---|---|
| [01-preferences-idle.png](01-preferences-idle.png) | Preferences |
| [02-preferences-change-preview.png](02-preferences-change-preview.png) | Change preview ("Changing to Walmart may change 20 prices.") |
| [03-preferences-blocked.png](03-preferences-blocked.png) | Blocked change (not enough meals) |
| [04-delete-confirm-sheet.png](04-delete-confirm-sheet.png) | Delete confirmation sheet |
| [05-paywall-idle.png](05-paywall-idle.png) | Paywall, nothing selected |
| [06-paywall-selected.png](06-paywall-selected.png) | Monthly selected, billing line |
| [07-trial-active.png](07-trial-active.png) | Free week started |
| [08-restore-failed.png](08-restore-failed.png) | Restore failed (recoverable) |
| [09-week-after-trial.png](09-week-after-trial.png) | Week after the free week (read-only) |
| [10-locked-sheet.png](10-locked-sheet.png) | "Your free week has ended" sheet |
| [11-subscribe-after-trial.png](11-subscribe-after-trial.png) | Paywall after the free week: Subscribe |
| [12-paywall-320-150.png](12-paywall-320-150.png) | 320×568 at 150% text |

## Handoff

```md
Screen: Preferences / Paywall / Locked sheet
State: see table
Viewport/device: 390×844 @2x (Chromium, Expo web build); 320×568 at 150% text
What the user should understand in 5 seconds: Preferences: what will change before it changes. Paywall: what you get, what it costs, when you're charged.
Primary action: Apply changes (only when something changed) / Start free week or Subscribe (disabled until a plan is chosen and the subscription state is known)
Secondary actions: Keep my current plan, Delete my data, Vibration, Restore purchases, See plans / Not now
Motion: sheets slide up; nothing else moves
Sound: none
Haptics: selection on each choice; success when the free week or a subscription starts; warning on failure
Reduced-motion behavior: sheets fade
Known limitations: purchases, restore, and the trial are a mock (clearly captioned); the App Store cancellation wording must be verified at submission
Approval status: design_pending
```

## Open questions (recommendation first)

1. **D-026 read-only after the free week.** Recommend it as built. Alternatives: fully gated (paywall on open); everything free during the pilot.
2. **Per-week equivalents.** Recommend showing them (the same unit makes plans comparable). Alternative: billed price only.
