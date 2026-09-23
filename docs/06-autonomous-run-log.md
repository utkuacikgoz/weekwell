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
| 4 | Onboarding in 4 steps, welcome, generating | merged (see PR) |
| 5 | Preferences, paywall, read-only after trial, delete data, Plan a new week | merged (see PR) |
| 6 | System dark mode (resolved at launch) | merged (see PR) |
| 7a | API service: auth, plans, generation jobs, prices, entitlements + webhooks, export, deletion | merged (see PR) |
| 7b | App API client, sign-in, sync (only when an API URL is configured) | merged (see PR) |
| 8 | Release pack (App Store draft, privacy policy draft, store screenshots), icon/splash, final QA | merged (see PR) |

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
| R-10 | Setup is 4 steps (Store and budget / Your week / Foods to leave out / Review) with button-group choices | Implements the review's recommended sequence | Keep one question per screen |
| R-11 | Read-only after the free week, per the review's recommendation for D-026; one policy module | The recommendation was explicit; one place to change | Fully gated; free pilot |
| R-12 | Added "Plan a new week" (week screen → setup review → generate) and a mock "Subscribe" purchase path | Without them there was no way to start next week or recover from an expired trial | — |
| R-13 | Dark mode is resolved at launch rather than switching live | Live switching needs every stylesheet to read the theme at render time; too wide a refactor overnight | Full theme-hook refactor |
| R-14 | API on Hono + Node 22; pilot storage SQLite (`node:sqlite`); Postgres + RLS migration written for later | D-013 undecided; SQLite needs no native build; the same method signatures map to Postgres | Supabase now; Fastify |
| R-15 | Passwordless email codes with opaque session tokens; emails, codes, and tokens stored only as HMACs | No auth provider chosen (D-013); keeps PII minimal | Magic links; Sign in with Apple |
| R-16 | The access policy (`canChangePlan`) moved to the domain package and is enforced by the API | "Payment entitlement must be verified server-side" (stop condition) | Client-only gating |
| R-17 | The app talks to the API only when built with `EXPO_PUBLIC_API_URL`; otherwise it stays fully on-device | Keeps the pilot usable with no backend while making the connected mode real and tested | Always require the API |
| R-18 | Sign-in is asked for once, right before the first plan ("Save your week") | Doesn't block setup; the plan needs an account to be saved | Sign in first |
| R-19 | App icon and splash drawn from the meal illustration system (D-034); Face ID usage string disabled | Template placeholders can't ship; the app doesn't use Face ID | Commissioned icon |
