# Mobile UX contract (A0)

> **Partly superseded (2026-09-24):** screens, copy, and the price table were revised after the design review. The current behavior is described in the v2 review packs (`review/v2/*/README.md`) and D-031 to D-034. The state and accessibility principles below still apply.

Status: **design_pending**. Nothing here is final until the product owner approves it (D-016).
Reference viewport: 390 × 844. Verified at 320, 375, 390, and 430 px wide and at 100/125/150% text.

The app is organized around three nouns: **the week**, **the shop** (grocery list), and **meals**. Don't use "workspace", "intelligence", "magic", or "optimization".

## Screen inventory

| # | Route | Purpose | Primary action | States |
|---|---|---|---|---|
| 1 | `/onboarding` | Promise plus what you'll get | Start | — |
| 2 | `/onboarding/store` | Trader Joe’s or Walmart only | Continue (disabled until chosen) | empty, selected |
| 3 | `/onboarding/budget` | Slider + editable number + −/+ | Continue | corrected-input note |
| 4 | `/onboarding/goal` | One of four goals (default: High protein) | Continue | — |
| 5 | `/onboarding/time` | 20 min / 30 min / batch (default: 30) | Continue | — |
| 6 | `/onboarding/household` | 1 / 2 / 3–4 (default: 1) | Continue | — |
| 7 | `/onboarding/exclusions` | None, presets, custom words | Continue | custom term unknown, **conflict** |
| 8 | `/onboarding/review` | Every choice; tap a line to edit | Plan my five dinners (disabled on conflict) | conflict |
| 9 | `/generating` | Visible progress steps | — | running, **invalid output**, **timeout**, **conflict** |
| 10 | `/week` | Tonight, total, budget fit, week summary, meals | Open grocery list · n of m checked | sample, fresh, **stale**, **hidden (unavailable)**, **hidden (partial)**, verified, **over budget**, meal off list |
| 11 | `/meal/[id]` | Quantities, steps, times, protein est., allergens, reuse | Swap this meal | swapped (undo), repair unavailable, off list |
| 12 | `/grocery` | By store section; qty, price, source meals | Share list | loading, checked, all checked, empty, missing price |
| 13 | `/preferences` | Edit any input; preview before applying | Apply changes | preview, **blocked**, delete confirm |
| 14 | `/trial` | Free week, exact prices, cancelling, restore | Start free week (disabled until a plan is chosen **and** entitlement is known) | loading, error, none, trial, active, expired, trial used, restore: restored / nothing / failed |

"Edit" from review opens a step with `?edit=1`; its button becomes "Save and go back".

## The five questions on the week screen (no scrolling at 390 × 844)

| Question | Where |
|---|---|
| What am I eating tonight? | "Tonight" row (Mon–Fri) or "Next up: Monday" on weekends |
| What does the week cost? | Large total plus truth label (Sample estimate / Estimate / Older estimate / Checked price / Total hidden) |
| Does it fit my budget? | Line under the total: "Fits your $75 budget, about $2 to spare." / "About $12 over your $40 budget…" |
| Protein and time? | "Dinners take 15–25 minutes · about 40g protein each (estimated)" |
| Where do I shop? | Store name in the header, plus budget, goal, time, household, and exclusion count |

## Price states (D-021, D-023)

| Provider result | Label | Total | Detail copy |
|---|---|---|---|
| Sample fixture | SAMPLE ESTIMATE | shown | "Sample prices for testing, written Sep 20. Not checked in a store." |
| Estimate ≤ 24 h | ESTIMATE | shown | "Checked 2 hours ago. Prices can change in store." |
| Estimate ≤ 7 days | OLDER ESTIMATE | shown | "Checked 3 days ago. Prices may have changed since then." |
| All lines verified | CHECKED PRICE | shown | "Store prices checked 1 hour ago. Prices can change in store." |
| Any line missing / invalid / > 7 days | INCOMPLETE PRICES | **hidden** | "We could not price 3 of 21 items at Walmart, so we are not showing a total…" |
| Provider down / timeout | NO PRICE CHECK | **hidden** | "We could not verify prices for Walmart right now. Your plan is still available, but totals are hidden until the price check completes." |

The truth label is always text. Color reinforces it and is never the only signal.

## Grocery item state transitions

```
unchecked ──tap──▶ checked (light haptic, 120 ms fill; line-through + muted text; aria-checked=true)
checked   ──tap──▶ unchecked (no haptic; immediate)
meal swapped / preferences applied:
  item still needed, same amount   → keeps its check
  item still needed, new amount    → keeps its check; swap banner says "n checked items now need a different amount"
  item no longer needed            → removed; banner says "n items you'd checked are no longer needed"
meal taken off the list            → its ingredients leave the list; the meal row shows "Not on grocery list"
```
Checks are stored on the device and survive a reload or offline launch.

## Meal swap and repair

- Actions: Swap this meal · Make it cheaper · Increase protein · Reduce cooking time. Each is disabled with a reason when no candidate exists ("This is already the quickest option that fits.").
- Only the chosen meal changes. Its day, and every other meal, stay the same.
- After a change: the page scrolls to the top and shows a banner "Swapped to X. Was: Y. n grocery items changed." with **Undo** and **Keep**. Undo restores the exact previous plan.
- "Remove an allergen" = add an exclusion in Preferences, which replaces only the conflicting meals (with a preview).

## Preference edits

Changing anything shows a preview before applying, for example "Changing to Walmart may change 21 prices." or "2 meals will change, 5 ingredients will change." The preview lists affected meals. If the change leaves too few meals, it is blocked with the reason and the current plan is kept. "Keep my current plan" discards the edit.

## Generation failure copy

| Code | Title | Body | Actions |
|---|---|---|---|
| exclusion_conflict | Not enough meals for a full week | "With these exclusions and 20 minutes, we can only plan 4 of 5 dinners and 0 of 2 lunches." + fixes | Change my choices |
| invalid_output | We couldn’t build a plan that passed our checks | Nothing was saved and your choices are unchanged. | Try again · Change my choices |
| timeout | Building your week took too long | Check your connection and try again. Your choices are saved. | Try again · Change my choices |
| rate_limited | Too many plans in a short time | Wait a few minutes, then try again. | Try again |

## Paywall rules

- Never shown during onboarding or before the first plan. It's reached from "Try a free week" at the bottom of the week screen.
- No plan is preselected. The footer states the exact charge for the selected plan: "Free for 7 days, then $9.99 per month unless you cancel."
- Yearly saving shown as arithmetic: "$69.89 less than paying monthly for a year ($119.88), about 58% less."
- No countdowns, scarcity, or badges. The "Test build" notice stays until real purchases exist.

## Copy glossary

| Use | Not |
|---|---|
| week, meals, dinner, lunch prep, grocery list, store | workspace, dashboard, journey |
| estimated, sample, checked 2 hours ago | live, real-time, exact |
| Swap this meal | Regenerate, re-roll |
| Leave out / exclusions | Restrictions, diet rules |
| Protein (est.) | Macros certified, nutritionist-approved |

Forbidden phrases are enforced in source and in rendered screens (`src/forbidden.ts`, `test/copy.test.ts`, `e2e/visual.spec.ts`).

## Accessibility labels (pattern)

- Meal row: "Wednesday: Chicken sausage and white bean skillet. 20 minutes · 36g protein · serves 1." Hint: "Opens the recipe".
- Grocery item (checkbox): "Baby spinach, need 8.1 oz. $4.58, 2 × 6 oz bag." Hint: "Double tap to check off".
- Price summary: one element reading headline, label, detail, and budget line together.
- Budget steppers: "Increase budget to $80". Input: "Weekly grocery budget in dollars".
- Selection uses `aria-checked` (radio, checkbox, switch); disabled uses `aria-disabled`.
