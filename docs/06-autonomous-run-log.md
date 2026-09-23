# Autonomous run log (mobile)

Started 2026-09-24. The product owner asked the mobile agent to keep building and merging PRs wave by wave overnight, using placeholders and samples where needed, and not to stop until the app is complete.

**Rules for this run**

- Every screen stays `design_pending`. Merged does not mean approved. The product owner can reject any wave; each wave is one PR, so it can be reverted on its own.
- Every decision the product owner hasn't made is recorded here and in `05-decision-log.md` as **Proposed**.
- Placeholders and samples are always labelled as such in the UI and docs. Nothing is presented as verified.
- Each wave must pass typecheck, lint, unit tests, and E2E before merging.
- Base branch: `main`, created at `6348dde` (the M1 baseline the product owner reviewed).

## Feedback being applied

- `Design correction brief` (2026-09-24): one decision per screen, 16/13/12 type floors, meaningful meal visuals, one concise price treatment, fewer containers, "Keep swap / Undo".
- `M1 design review feedback` (2026-09-24): six core screens first, one price-state component, real navigation, a 4-step onboarding, "Start cooking" primary, repair actions behind "More changes", "Copy/Share list" honesty, "Rebuild under budget", read-only after trial, dark mode before public release.

## Waves

| Wave | Scope | Status |
|---|---|---|
| 1 | Design tokens v2, ingredient illustrations, price-status component, week plan screen, rebuild under budget | merged (see PR) |
| 2 | Grocery list | merged (see PR) |
| 3 | Meal detail, cooking steps, swap (Keep swap / Undo), "More changes" | merged (see PR) |
| 4 | Onboarding in 4 steps, welcome, generating | planned |
| 5 | Preferences, paywall, read-only after trial, delete data | planned |
| 6 | System dark mode | planned |
| 7 | Backend service (auth placeholder, plans, generation jobs, prices, entitlements, deletion) and API client | planned |
| 8 | Release pack (App Store metadata placeholders, privacy, review notes) and final QA | planned |

## Decisions taken without product-owner input

| # | Decision | Why | Alternatives |
|---|---|---|---|
| R-1 | Meal visuals are ingredient illustrations drawn from each recipe (the brief's third option) | No approved photo source; the network is restricted; generated photos can't be reviewed overnight | Curated licensed photos; generated photos after a style review |
| R-2 | Inter for UI text; platform serif (Georgia) for the page title and dish names | Feedback: no licensed serif yet; Inter (OFL, free) makes captures match phone rendering | System sans only |
| R-3 | Sample prices say "Sample prices from Sep 20" instead of "Price checked Sep 20" | The truth policy forbids saying sample numbers were checked; the rest of the recommended copy is used as written | Use "Price checked" once a real feed exists (D-011) |
| R-4 | Price sits in the week screen's bottom bar, next to "Open grocery list" | The correction brief moved price out of the first-viewport content; the original brief still wants cost visible without scrolling | Line under the title; grocery screen only |
| R-5 | "Rebuild under budget" picks the lowest sample-cost week that fits exclusions and time, with preview and undo (D-031) | The review recommended the action; it should never silently change meals | Swap only the most expensive meal; raise-budget prompt |
| R-6 | On short screens or at large text, the bottom bar shows only the price headline and the hero image is shorter | At 320px/150% the bar took 40% of the screen | Hide price entirely at large text |
| R-7 | Grocery: the price column doubles as the "Used in N meals" button; checked items stay in place; 4-second undo toast after checking | Keeps rows about 64px tall and in shopping order | Second-line meal link; move checked to bottom |
| R-8 | New cooking mode (`/cook/[id]`): one step at a time, large text, no timers | The review made "Start cooking" the primary action, so it has to lead somewhere useful | Scroll to steps; inline timers |
| R-9 | The swap decision (Keep swap / Undo) lives in the meal screen's bottom bar | Can't be missed, and sits in the thumb zone | Top banner; pre-swap confirmation sheet |
