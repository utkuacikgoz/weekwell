# Motion, sound, and haptics (A2 sensory spec)

Status: **design_pending** (D-018). Each row needs product-owner approval together with its screen.

## Motion

| Token | Where | Duration / easing | Purpose | Reduced motion |
|---|---|---|---|---|
| `navigation` | Push/pop between week, meal, list, onboarding steps | Platform default (~250 ms) | Shows where you went and how to get back | `animation: 'none'`: instant |
| `check` | Grocery checkbox tick | 120 ms ease-out scale 0→1 | Confirms the item is checked | Instant; the checked state is also shown by the fill, line-through, and `aria-checked` |
| `progressStep` | Generation steps | Spinner on the active step only | Shows the system is working | Spinner stays (it's a status indicator); nothing else moves |
| `banner` | Swap banner | Appears in place; the page scrolls to top | Makes the result of the action visible | Instant |

No decorative loops, parallax, bouncing cards, or motion that delays a task. Every transition can be interrupted (standard navigation back gesture).

## Sound

Weekwell plays **no sounds** (D-029). There are no audio files, no autoplay, and no alert-like tones. The inventory is empty on purpose. Adding a sound needs an entry here (source, licence, duration, loudness, trigger, mute path) and a decision-log entry.

## Haptics

Implemented in `src/services/haptics.ts`. They respect the in-app **Vibration** setting (default on) and the OS system haptics setting (iOS haptic engine), and fail silently on devices or platforms without support (web, simulators).

| Trigger | Pattern | Intensity | Cooldown | Why |
|---|---|---|---|---|
| Choice selected (onboarding, preferences, paywall) | `selectionAsync` | lightest | 80 ms | Confirms a selection change |
| Grocery item checked | `impactAsync(Light)` | light | 80 ms | Physical "tick" while shopping one-handed |
| Grocery item unchecked | none | — | — | The visual change is enough; avoids noise |
| Plan ready / meal swapped / trial started | `notificationAsync(Success)` | medium | 80 ms | Marks the end of a longer action |
| Recoverable error (generation failed, no replacement, restore failed) | `notificationAsync(Warning)` | medium | 80 ms | Draws attention to on-screen error text |

Never continuous or repeated. No information is conveyed only by haptics: each trigger has a visible state change and a screen-reader-visible state.

## Approval matrix

| State | Visual | Timing | Sound | Haptic | Reduced motion | Mute | Status |
|---|---|---|---|---|---|---|---|
| Onboarding selection | screens 02–08 | instant | none | selection | same | n/a | design_pending |
| Generation | 10, 21, 22 | spinner | none | success / warning | same | n/a | design_pending |
| Grocery check | 14, 15 | 120 ms | none | light impact | instant | n/a | design_pending |
| Meal swap + undo | 12, 13 | instant + scroll | none | success | same | n/a | design_pending |
| Paywall / trial start | 17, 18, 31, 32 | instant | none | success / warning | same | n/a | design_pending |

## Not yet tested (needs a device)

Haptics on physical iPhone / Android, OS reduce-motion on device, background/foreground mid-transition, low-battery / low-power mode, and battery/CPU impact. The web preview can't exercise these. They are listed in the QA evidence as open items.
