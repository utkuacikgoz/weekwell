# Product-owner design review

- **Current:** [v2/week](v2/week/README.md) (wave 1), [v2/grocery](v2/grocery/README.md) (wave 2), [v2/meal](v2/meal/README.md) (wave 3), [v2/onboarding](v2/onboarding/README.md) (wave 4), [v2/account](v2/account/README.md) (wave 5), [v2/dark](v2/dark/README.md) (wave 6). Later waves add their own folders under `v2/`.
- **Rejected (kept for reference only):** the M1 inventory below and `screens/`. Rejected 2026-09-24 in the design correction brief.

---

# Product-owner design review pack: M1 (first slice)

**Every screen below is `design_pending`.** Nothing is approved until the product owner records `approved`, `approved with changes`, or `rejected` for it in `docs/05-decision-log.md` (D-016). Any visible change after approval returns the screen to `design_pending`.

- Captures: Chromium rendering of the Expo web build, 390 × 844 at 2× (reference) and 320 × 568 at 150% text (worst case). Native iOS rendering (fonts, switch, slider, safe areas) will differ slightly and needs a TestFlight check.
- Data: fixture recipes and **sample prices** (not store prices). Regenerate with `CAPTURE=1 npm run e2e` in `apps/mobile`.
- Accessibility evidence for every capture: `e2e/visual.spec.ts` checks for no clipped text, a reachable primary action, controls ≥ 44 × 44 with labels, and no forbidden copy.
- Motion, sound, and haptics for each state: see `../sensory.md`.

| Screen / state | Capture (390) | Capture (320 @150%) | Intended user action | Status |
|---|---|---|---|---|
| Welcome | [01](screens/01-welcome@390w-100.png) | [01](screens/01-welcome@320w-150.png) | Start | design_pending |
| Store (empty) | [02](screens/02-store-empty@390w-100.png) | [02](screens/02-store-empty@320w-150.png) | Choose a store | design_pending |
| Store (selected) | [03](screens/03-store-selected@390w-100.png) | [03](screens/03-store-selected@320w-150.png) | Continue | design_pending |
| Budget | [04](screens/04-budget@390w-100.png) | [04](screens/04-budget@320w-150.png) | Set budget | design_pending |
| Goal | [05](screens/05-goal@390w-100.png) | [05](screens/05-goal@320w-150.png) | Pick one goal | design_pending |
| Cooking time | [06](screens/06-time@390w-100.png) | [06](screens/06-time@320w-150.png) | Pick a limit | design_pending |
| Household | [07](screens/07-household@390w-100.png) | [07](screens/07-household@320w-150.png) | Pick size | design_pending |
| Exclusions | [08](screens/08-exclusions@390w-100.png) | [08](screens/08-exclusions@320w-150.png) | Leave foods out | design_pending |
| Exclusions: conflict | [23](screens/23-exclusions-conflict@390w-100.png) | — | Follow a suggested fix | design_pending |
| Review | [09](screens/09-review@390w-100.png) | [09](screens/09-review@320w-150.png) | Plan my five dinners | design_pending |
| Review: conflict | [24](screens/24-review-conflict@390w-100.png) | — | Edit a choice | design_pending |
| Generating | [10](screens/10-generating@390w-100.png) | — | Wait | design_pending |
| Error: timeout | [21](screens/21-error-timeout@390w-100.png) | — | Try again | design_pending |
| Error: invalid output | [22](screens/22-error-invalid-output@390w-100.png) | — | Try again | design_pending |
| Week (sample prices) | [11](screens/11-week@390w-100.png) | [11](screens/11-week@320w-150.png) | Open tonight’s meal / grocery list | design_pending |
| Week: fresh estimate | [28](screens/28-week-estimate-fresh@390w-100.png) | — | — | design_pending |
| Week: verified | [29](screens/29-week-verified@390w-100.png) | — | — | design_pending |
| Week: stale prices | [25](screens/25-week-stale-prices@390w-100.png) | — | — | design_pending |
| Week: prices unavailable | [26](screens/26-week-prices-unavailable@390w-100.png) | — | — | design_pending |
| Week: partial prices | [27](screens/27-week-prices-partial@390w-100.png) | — | — | design_pending |
| Week: over budget | [30](screens/30-week-over-budget@390w-100.png) | — | Make it cheaper | design_pending |
| Meal detail | [12](screens/12-meal-detail@390w-100.png) | [12](screens/12-meal-detail@320w-150.png) | Cook / swap | design_pending |
| Meal swapped (undo) | [13](screens/13-meal-swapped@390w-100.png) | [13](screens/13-meal-swapped@320w-150.png) | Undo or keep | design_pending |
| Meal off grocery list | [34](screens/34-meal-off-list@390w-100.png) | — | Add back | design_pending |
| Grocery list | [14](screens/14-grocery@390w-100.png) | [14](screens/14-grocery@320w-150.png) | Check items | design_pending |
| Grocery: items checked | [15](screens/15-grocery-checked@390w-100.png) | [15](screens/15-grocery-checked@320w-150.png) | Uncheck / share | design_pending |
| Grocery: missing prices | [27b](screens/27b-grocery-prices-partial@390w-100.png) | — | — | design_pending |
| Preferences: change preview | [16](screens/16-preferences-preview@390w-100.png) | [16](screens/16-preferences-preview@320w-150.png) | Apply or keep | design_pending |
| Delete my data (confirm) | [33](screens/33-delete-confirm@390w-100.png) | — | Delete / cancel | design_pending |
| Paywall | [17](screens/17-trial@390w-100.png) | [17](screens/17-trial@320w-150.png) | Choose a plan | design_pending |
| Paywall: plan selected | [18](screens/18-trial-selected@390w-100.png) | [18](screens/18-trial-selected@320w-150.png) | Start free week | design_pending |
| Trial active | [31](screens/31-trial-active@390w-100.png) | — | — | design_pending |
| Restore failed | [32](screens/32-restore-failed@390w-100.png) | — | Try again | design_pending |

Not captured yet: loading spinner before stored data loads (brief), "all items checked", empty list, and entitlement error. These states are implemented and covered by code paths but have no capture.

## Copy and data assumptions

- Prices are fixture numbers labelled "Sample estimate" (D-021). Protein comes from per-ingredient averages and is always labelled "(est.)".
- Store names are used as plain text only. There are no logos and nothing implies affiliation.
- Recipes are a 22-recipe fixture catalog. Steps were written for this build and need a food-safety/editorial pass.

## Open design questions for the product owner

1. **Meal imagery (D-028).** The rows use a neutral plate placeholder. What should the photography source and style be?
2. **Serif headings.** They use the platform serif (Georgia on iOS/web). Should we license a specific display face?
3. **Week header density.** Store, budget, goal, time, and household sit on one muted line. Is that enough recognition, or should each be its own editable row?
4. **Meal-detail actions.** "Swap this meal" is primary, and three repair actions are outlined buttons. Should the repair actions move behind a "More changes" disclosure?
5. **Share list** is the grocery primary action because no retailer deep link exists. Is that the right handoff for the pilot?
6. **Over-budget handling.** Right now we say how much over and suggest "Make it cheaper". Should generation refuse, or offer a one-tap "Rebuild under budget"?
7. **Post-trial access (D-026).** What stays available after the free week?
8. **Light appearance only (D-027).** Is that acceptable for the pilot?
