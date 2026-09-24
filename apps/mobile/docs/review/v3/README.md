# Design review pack v3 (after the 2026-09-24 design audit)

**Every screen here is `design_pending`.** It replaces v2 for review. Nothing is approved until the product owner records a decision (D-016).

- **Captures:** Chromium rendering of the Expo web build at 390×844 (2×). Each family also has a capture at 320×568 with 150% text, and `.webm` recordings where the v2 pack had them. Regenerate with `REVIEW=1 npx playwright test e2e/review-*.spec.ts --project=local` in `apps/mobile`.
- **Layout gate:** `e2e/footer.spec.ts` checks every screen with a bottom bar at 390 and at 320 with 150% text. The last row must end above the bar; the bar must stay under 20% of the height (390) or 32% (320 at 150%); and nothing may scroll sideways. It also checks a long-name type specimen.
- **Data:** fixture recipes and **sample prices**, not store prices.
- **Still unchecked:** native iOS rendering, VoiceOver, Dynamic Type, haptics, and keep-awake all need a TestFlight pass.

## What changed from v2 (audit item → change)

| Audit | Change | Decision |
|---|---|---|
| P0.1 Footer covers content | The bar sits beside the scroll view, never on top of it. The gate proves the last row scrolls fully above the bar. | D-035 |
| P0.2 Bottom-action footprint | One action per bar. The week total is a small chip ("$78 · sample est.") that opens About this estimate. Grocery has no bar, and Share is in the top bar. The swap result is a banner, with only Keep/Undo in the bar. | D-035 |
| P1.3 Food art | **Photography chosen (D-038).** The pipeline is built: the app switches to photos when all 22 are present, and the photos themselves are still to come. See [food/](food/README.md). | D-038 |
| P1.4 Typography | The serif steps down under 360pt and caps at 130%. There's one serif title per screen. The "Your week, well fed." headline is gone, so tonight's dish is the primary statement. Long names are tested. | D-036 |
| P1.5 Identity | A quiet "Week*well*" wordmark in the serif, with "well" in leaf green, at the top of the week screen. | D-036 (proposed) |
| P1.6 Budget onboarding | $60 / $80 / $100 / Custom, with the stepper only for Custom and no slider. "Who’s eating?" asks about people. | D-037 |
| P1.7 Paywall | A value statement, three short benefits, two plan cards with per-week prices, weekly as a smaller option, one CTA, and a compact renewal disclosure. | D-037 |
| P1.8 Over budget | Neutral wording: "Estimated total $130 · $90 over your $40 target". "Rebuild under $40" comes first; "Change setup" is second; neither is red. | D-035 |
| P2 Sample prices | "Sample" appears only in the price chip and the About sheet. | D-035 |
| P2 Share | Uses the system share sheet on a phone. The web preview copies the list and says "List copied", or says sharing isn't available. | — |
| P2 Price refresh | Loading shows a skeleton chip and "updating…". Older, unavailable and partial prices each show a notice with a retry. | D-035 |
| P2 Cooking mode | A timer taken from the step's time, keep-awake while cooking, and "Continue cooking · step N" on the week and recipe screens after leaving by accident. | — |
| P2 Dark mode | Captures of every price state, the over-budget notice, and the cooking timer in dark mode. | D-027 |

## Handoff by screen

The format for each row is: 5-second understanding · primary · secondary · motion / sound / haptics / reduced motion · known limitations. The approval status is `design_pending` for all of them.

| Screen · states · captures | 5-second understanding | Primary / secondary | Motion · sound · haptics · reduced motion | Known limitations |
|---|---|---|---|---|
| **Week**: idle, pressed, scrolled, About sheet, loading, unavailable, older, over budget, rebuild sheet, rebuilt with undo, weekend, 320/150 · [week/](week/) | Tonight's dinner, and what the week costs | Open grocery list / tonight's recipe, the price chip, Change setup | Sheet slide, undo banner fade · no sound · success haptic on rebuild · fades become instant | Plates are v2 art until food art is approved |
| **Grocery**: idle, pressed row, checked with undo, used-in sheet, staples open, older, missing, loading, all checked, empty, 320/150 · [grocery/](grocery/) | What to buy, and how far through I am | Check items / Share, used-in meals | Checkbox fill 120ms · no sound · light haptic on check · instant | Share uses the web clipboard fallback in captures |
| **Meal**: idle, pressed, scrolled, nutrition and more changes, swap pending, kept, undone, nothing else fits, off list, 320/150 · [meal/](meal/) | What this dish is and how long it takes | Start cooking / Swap this meal, More changes | Banner fade · no sound · success on swap · instant | Swap banner scrolls to the top on purpose |
| **Cooking**: step 1, step 3, timer offered, timer running, continue cooking · [meal/](meal/) 10–15 | The step to do now | Next step / Back, Start N min timer, Pause, Cancel | None · no sound (D-018) · success haptic when time's up · — | No notification when the app is closed: the timer shows "Time’s up" when you come back. A step with two times ("5–6 minutes per side… rest 5 minutes") offers the first. |
| **Onboarding**: welcome, store/budget empty, pressed, selected, custom, your week, foods to leave out, review, conflicts, generating, timeout, 320/150 · [onboarding/](onboarding/) | One question per step | Continue / Back | Progress bar step · no sound · selection haptic · instant | — |
| **Account and paywall**: preferences (idle, preview, blocked, delete), paywall (idle, selected, trial active, restore failed, after trial, locked, subscribe, 320/150) · [account/](account/) | What I'd pay and when | Start free week / plan cards, Or pay weekly, Restore purchases | — · no sound · selection haptic · — | Mock store (D-014). The renewal wording still needs an App Store guideline check. |
| **Dark mode**: core screens plus every price state and the cooking timer · [dark/](dark/) | Same as light | Same as light | Same as light | Follows the system setting at launch (D-027) |
| **Meal photos**: coverage page · `/review/food?review=1` | Which recipes still need a photo | — | — | 0 of 22 photos so far; screens use the plates until all 22 are in |

## Open questions for the product owner

1. ~~Food art direction~~: decided as photography (D-038). Still open: the sourcing method. Recommendation: generated stills from `assets/meals/prompts.json`, each checked by a person. Alternatives: a commissioned shoot, or a mix, starting with generated stills and moving to a shoot before public release.
2. **Price chip wording.** Recommendation: "sample est.". Alternatives:
   - "sample price" (longer; may wrap at 320);
   - "estimate" with the sample note only in the sheet. This weakens the truth policy, so it isn't recommended.
3. **Paywall plan set.** Recommendation: yearly and monthly as cards, with weekly as a small option (keeps D-008). Alternatives:
   - drop weekly from the paywall entirely (changes D-008);
   - three equal cards (the v2 layout, which the audit found dense).
