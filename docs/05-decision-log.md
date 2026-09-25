# Weekwell decision log

This is the lightweight record of decisions that affect product, architecture, safety, design, content, or operations. Add an entry before making a decision that is not already settled in `00-master-brief.md` or the relevant workstream brief.

## Status vocabulary

- **Proposed:** needs a product-owner decision.
- **Accepted:** approved for implementation.
- **Deferred:** intentionally out of scope.
- **Rejected:** do not build unless reopened.
- **Superseded:** replaced by a newer decision.

## Accepted decisions

### D-001 — Audience

- Status: Accepted
- Decision: Busy US professionals with fitness/high-protein goals.
- Reason: Strong overlap between the content opportunity and the app’s weekly planning problem.
- Owner: Product

### D-002 — Launch retailers

- Status: Accepted
- Decision: Trader Joe’s and Walmart.
- Reason: Trader Joe’s is strong for editorial content; Walmart supports broad US budget positioning.
- Constraint: Provider method must comply with retailer terms. No unapproved scraping.
- Owner: Product/retailer lead

### D-003 — App promise

- Status: Accepted
- Decision: “Plan my five dinners,” with practical work lunches included in the resulting week.
- Owner: Product

### D-004 — Onboarding inputs

- Status: Accepted
- Decision: Store, budget, protein goal, cooking time, household size, allergies/exclusions.
- Owner: Product/UX

### D-005 — Content angles

- Status: Accepted
- Decision: “One store, one budget, five dinners” and “five dinners for people too tired to cook.”
- Owner: Editorial

### D-006 — Content CTA sequencing

- Status: Accepted
- Decision: First CTA is save/share. Add app-download CTA only after content demand and app readiness are demonstrated.
- Owner: Editorial/Product

### D-007 — Publishing cadence

- Status: Accepted
- Decision: Daily publishing during the first experiment.
- Owner: Editorial

### D-008 — Trial and prices

- Status: Accepted
- Decision: One free week, then $4.99/week, $9.99/month, or $49.99/year.
- Constraint: No deceptive countdowns or preselected annual billing.
- Owner: Product/monetization

### D-009 — Workstream separation

- Status: Accepted
- Decision: Mobile app and TikTok carousel production are separate agent programs with separate branches, credentials, QA gates, and release cycles.
- Shared: approved facts and versioned artifacts only.
- Owner: Product/technical lead

### D-010 — Truth labels

- Status: Accepted
- Decision: Price, nutrition, inventory, and retailer claims must be labelled verified, estimated, or editorial.
- Owner: Product/security/editorial

### D-016 — Product-owner design approval

- Status: Accepted
- Date: 2026-09-24
- Workstream: mobile
- Decision: The product owner gives final approval for every mobile screen and material interaction state. Agents may propose and implement, but may not silently finalize or alter visual/interaction design.
- Required evidence: rendered screen or interactive state, target device size, copy/data assumptions, accessibility notes, and explicit approval status.
- Owner: Product owner

### D-017 — Daily TestFlight builds and App Store ownership

- Status: Accepted
- Date: 2026-09-24
- Workstream: mobile
- Decision: Mobile agents must automate a daily TestFlight build during active development and maintain the complete App Store submission pack. TestFlight success never replaces product-owner design approval, QA, security, or current Apple policy verification.
- Required evidence: commit-linked build, test summary, changelog, build health, signing/secret check, App Store metadata pack, and current policy verification.
- Owner: Mobile release engineering + QA

### D-018 — Sensory interaction approval

- Status: Accepted
- Date: 2026-09-24
- Workstream: mobile
- Decision: Animations, sounds, and haptics are first-class product behavior. The product owner approves their timing, triggers, defaults, accessibility behavior, mute/reduced-motion behavior, and device fallbacks for every material state.
- Constraint: sound is off by default; the app must work without sound or haptics; no critical information may depend on sensory effects.
- Required evidence: motion capture or timing notes, sound inventory and licenses, haptic trigger table, reduced-motion behavior, mute behavior, and device test results.
- Owner: Product owner + mobile design/QA

## Open decisions

### D-011 — Live retailer price source

- Status: Proposed. The pilot tooling is built (2026-09-25): a hand store check (`docs/price-check/README.md`). The product owner decides whether to do the check or keep labelled sample prices for the friends pilot.
- Store check rules:
  - all-or-nothing per store;
  - label "store check", as an estimate that's never verified;
  - older after 14 days, and back to sample prices after 45 days.
- Question: Which compliant provider or partnership supplies Trader Joe’s and Walmart pricing for the first production pilot?
- Options: approved third-party provider, retailer partnership, manual verified importer, or estimate-only pilot.
- Required evidence: terms review, freshness behavior, location scope, cost, and failure mode.

### D-012 — Mobile technology baseline

- Status: Proposed
- Question: Expo/React Native + TypeScript or an existing repository-native stack?
- Decision rule: preserve an existing production stack if it meets mobile, security, accessibility, and release requirements. Otherwise default to Expo/React Native + TypeScript.
- Note (2026-09-23, mobile agent): the repository was empty, so the decision rule's default was applied provisionally. See D-019.

### D-013 — Authentication provider

- Status: Accepted in part (product owner, 2026-09-24): **Resend** sends the sign-in codes when a server runs. The pilot has no server (D-039), so hosting is deferred.
- Question: Which supported identity provider handles passwordless or email authentication?
- Decision:
  - **Sign-in:** the API keeps its own passwordless sign-in (6-digit code, 10-minute expiry, 5 attempts, hashed tokens) and sends the code through Resend (`RESEND_API_KEY`, `EMAIL_FROM` on a verified domain).
  - **Production:** the server refuses to start without them.
  - **Failure:** a failed send returns `503 email_unavailable`. It is never reported as sent.
- Required evidence: data residency, deletion support, rate limits, mobile SDK quality, and recovery behavior.

### D-014 — Subscription infrastructure

- Status: Accepted (product owner, 2026-09-24): **RevenueCat**.
- Question: RevenueCat or direct App Store/Google Play entitlement implementation?
- Decision:
  - **Purchases:** made through `react-native-purchases`, with entitlement `pro` and offering `default`. The product ids are `com.belevate.weekwell.{weekly,monthly,yearly}`, and the free week is Apple's introductory offer.
  - **Server:** it trusts only RevenueCat's REST view of the customer. Webhooks (checked by an Authorization header) and `POST /v1/entitlement/sync` just trigger a re-read.
  - **Mock store:** stays for the web preview and tests, and production refuses `STORE_MODE=mock`.
  - **Setup:** `apps/mobile/docs/release/revenuecat-setup.md`.
- Decision rule: choose the path with reliable server-side verification and restore behavior for the pilot.

### D-015 — Content publishing method

- Status: Proposed
- Question: Manual upload package, approved scheduler, or direct TikTok publishing integration?
- Decision rule: no automation that violates platform terms or creates deceptive engagement.

## Mobile M0/M1 implementation decisions (awaiting product-owner review)

Everything below was decided provisionally by the mobile agent to complete the first slice. Each item is implemented, reversible, and **Proposed** until the product owner accepts, changes, or rejects it.

### D-019 — Mobile stack and repository layout

- Status: Proposed
- Date: 2026-09-23
- Workstream: mobile
- Decision: npm workspaces. `packages/domain` holds the canonical Zod schemas, fixtures, and deterministic logic (the one shared package the master brief requires); `packages/domain/server` holds server-only code (webhooks, owner-scoped storage, jobs, redaction). `apps/mobile` is Expo SDK 57 + Expo Router + TypeScript.
- Options considered: separate repos per package; React Native CLI without Expo.
- Reason: D-012 decision rule (empty repository → Expo default). One schema package prevents drifting type copies.
- Security/privacy impact: server-only exports are separate and a test fails if the client imports them.
- Rollback: packages are independent; the app only depends on the public `@weekwell/domain` entry point.
- Owner: Technical lead

### D-020 — Budget bounds

- Status: Proposed
- Date: 2026-09-23
- Workstream: mobile
- Decision: Weekly budget from $30 to $400 in $5 steps, default $75. Out-of-range input is corrected with a visible explanation. The budget screen shows plain arithmetic ("about $7.50 per meal for one person").
- User impact: prevents impossible selections without blocking large households. A budget below what the plan costs is allowed and reported as "over budget" rather than hidden.
- Contracts affected: `UserPreferencesSchema`.
- Owner: Product owner

### D-021 — Sample prices and pantry staples

- Status: Proposed
- Date: 2026-09-23
- Workstream: mobile
- Decision: Until D-011 is decided, the pilot uses fixture prices with `locationScope: 'sample'`. The UI labels them "Sample estimate. Sample prices for testing … Not checked in a store." Freshness rules don't apply to sample prices, because they were never observed at a store. Olive oil, salt and pepper, and chili powder are listed as "Assumed at home", are not priced, and are left out of the total.
- Reason: the truth policy forbids presenting generated numbers as observed prices.
- User impact: testers see realistic arithmetic that is clearly labelled as test data.
- Rollback: switch the provider scenario; the UI copy follows the quote metadata automatically.
- Owner: Product owner + retailer lead

### D-022 — Shape of work lunches

- Status: Proposed
- Date: 2026-09-23
- Workstream: mobile
- Decision: Two lunch prep blocks, Mon–Wed and Thu–Fri. Lunch servings = household servings × days covered. "3–4 people" is planned as 4 servings.
- Alternatives: lunches for adults only; one lunch block; five separate lunches.
- Contracts affected: `Plan.lunches`, `LUNCH_BLOCKS`.
- Owner: Product owner

### D-023 — Price freshness and failing closed

- Status: Proposed
- Date: 2026-09-23
- Workstream: mobile
- Decision: A quote is fresh up to 24 hours old, shown as an "Older estimate" up to 7 days, and withheld after that. A timestamp in the future is invalid. The week total is shown only when every priced item has a usable quote. Otherwise the total is hidden with an explanation, and item prices we do have stay visible. A total is "verified" only when every line is verified.
- Security/privacy impact: prevents a false total, which the QA gate rates P1.
- Contracts affected: `evaluateFreshness`, `computeShopTotal`.
- Owner: Product owner + retailer lead

### D-024 — Analytics: `grocery_list_opened` and on-device buffer

- Status: Proposed
- Date: 2026-09-23
- Workstream: mobile
- Decision: Add `grocery_list_opened` (payload: item count) because activation step 4 ("opens the grocery list") has no event in the brief's taxonomy. For the pilot, events stay in an on-device buffer with no network destination until a vendor and retention period are chosen.
- Security/privacy impact: payloads are strict schemas, so allergy values, meal text, email, and location cannot be attached.
- Owner: Product owner + analytics

### D-025 — Pilot without accounts

- Status: Proposed
- Date: 2026-09-23
- Workstream: mobile
- Decision: While D-013 is open, the app runs without sign-in. It uses a random on-device analytics id, keeps the plan, preferences, and exclusions on the device only, and "Delete my data" removes them. First-slice item 1 (auth) waits for D-013. The server-side authorization contract (`OwnerScopedStore`) and its tests are ready for the backend.
- Security/privacy impact: no personal data leaves the device. Allergy/exclusion data is deletable in one step.
- Owner: Product owner + security reviewer

### D-026 — What happens after the free week without a subscription

- Status: Proposed (needs product-owner decision)
- Date: 2026-09-23
- Workstream: mobile
- Question: Once the trial ends and the user has not subscribed, can they still view their last plan and list? Can they generate new weeks or swap meals?
- Current behavior: nothing is gated. The paywall only describes the free week, prices, and cancellation, and makes no claim about post-trial limits.
- Update 2026-09-24: implemented the M1 review's recommendation as a single policy (`apps/mobile/src/services/access.ts`). After the free week, the current plan and list stay readable; new weeks, swaps, rebuilds, and meal-replacing preference changes need a subscription. Still Proposed.
- Owner: Product owner

### D-027 — Light appearance only for the pilot

- Status: Proposed
- Date: 2026-09-23
- Workstream: mobile
- Decision: `userInterfaceStyle: light`. The app ignores system dark mode on purpose until a dark palette is designed and approved.
- Update 2026-09-24 (supersedes the above, still Proposed): the review asked for dark mode before public release. The app now follows the system appearance, resolved at launch (`automatic`). A change while the app is open applies on the next launch. Both palettes pass contrast tests.
- Owner: Product owner + design lead

### D-028 — Meal imagery placeholder

- Status: Proposed
- Date: 2026-09-23
- Workstream: mobile
- Decision: Meal rows show a neutral plate outline where the photo goes. No generated or stock imagery ships until a photography source and style are approved.
- Owner: Product owner + design lead

### D-029 — Sound and haptics defaults

- Status: Proposed
- Date: 2026-09-23
- Workstream: mobile
- Decision: No sounds are used at all. Haptics are on by default and can be turned off with a "Vibration" setting; the full vocabulary is in `apps/mobile/docs/sensory.md`.
- Owner: Product owner (D-018)

### D-030 — iOS phone-only and app identifiers

- Status: Proposed (tablet); Accepted (identifiers, 2026-09-24)
- Date: 2026-09-23, updated 2026-09-24
- Workstream: mobile
- Decision: `ios.supportsTablet: false` for the pilot. Identifiers from the product owner: bundle id `com.belevate.weekwell`, Apple team `9D78WTZAD8`, App Store Connect app `6815542789` (set in `app.json` and `eas.json`). Still open before the daily TestFlight workflow runs: EAS project link (`eas init`), EAS signing credentials and App Store Connect API key, `EXPO_TOKEN` secret, `TESTFLIGHT_ENABLED` variable.
- Owner: Product owner + release engineering

## Overnight autonomous-run decisions (2026-09-24)

The product owner asked for waves to be built and merged overnight. Every item below is **Proposed**, and the full list with alternatives is in `06-autonomous-run-log.md`.

### D-031 — Rebuild under budget

- Status: Proposed
- Date: 2026-09-24
- Workstream: mobile
- Decision: When the week is over budget, the price status offers "Rebuild under budget". A sheet previews how many meals change and the new estimate, says honestly if even the cheapest week is still over, and the change can be undone. Generation never refuses an over-budget plan (per the M1 review recommendation).
- Contracts affected: `generateUnderBudgetPlan` (domain).
- Owner: Product owner

### D-032 — One price status component and copy

- Status: Proposed
- Date: 2026-09-24
- Workstream: mobile
- Decision: One component with a fixed layout (headline, one detail line, info button, one action only when needed) replaces the per-state warnings. Copy follows the M1 review recommendations, except sample data says "sample prices, Sep 20" instead of "price checked" (truth policy). Full caveats live in the "About this estimate" sheet.
- Supersedes: the price table in `apps/mobile/docs/ux-contract.md`.
- Owner: Product owner

### D-033 — Meal visuals are ingredient illustrations for the pilot

- Status: Proposed (updates D-028)
- Date: 2026-09-24
- Workstream: mobile
- Decision: Each meal shows a top-down plate illustration generated from its real ingredients, in one style (flat colour, top-left light, no text). Photography can replace the component later without layout changes.
- Owner: Product owner + design lead

### D-034 — App icon and splash

- Status: Proposed
- Date: 2026-09-24
- Workstream: mobile
- Decision: The icon is a top-down plate (rice, chicken, broccoli) from the meal illustration system on a warm tile, with no text. The same plate on paper (light) or near-black (dark) is the splash. Replaces the Expo template placeholders.
- Owner: Product owner + design lead

## Design audit corrections (2026-09-24)

The product owner's design audit asked for a correction pass before any further polish. Every entry below is **Proposed** until the next design review.

### D-035 — Compact bottom bar and one price location

- Status: Proposed
- Date: 2026-09-24
- Workstream: mobile
- Decision: The bottom bar holds one primary action, plus the price chip on the week screen ("$73 · sample est.", tap for About this estimate). States that need attention (over budget, older prices, unavailable, partial) become one neutral notice in the content with one next step. Over budget reads "Estimated total $X · $Y over your $Z target", with "Rebuild under $Z" first. The grocery list has no bar: Share moves to the top bar, and the total sits under the title. "Sample" appears only in the chip and the About sheet. The swap result is a banner at the top of the meal, and the bar keeps only Keep swap and Undo.
- Reason: The audit's P0 and P1 items: the bar used about 27–41% of a 320px screen at 150% text.
- Guard: `apps/mobile/e2e/footer.spec.ts` fails if the last row ends under the bar, if the bar is over 20% of the height at 390×844 or 32% at 320×568 with 150% text, or if the page scrolls sideways.
- Owner: Product owner

### D-036 — Type rules for narrow screens, large text, and long names

- Status: Proposed
- Date: 2026-09-24
- Workstream: mobile
- Decision: Under 360pt wide, the serif steps down (title 28 → 24, dish 20 → 18). Serif text stops growing at 130%, while body text follows the system setting up to 220%. Use one serif title per screen. Dish names are never truncated; they wrap. The week screen drops the "Your week, well fed." headline, so tonight's dish is the one primary statement, and a small "Weekwell" wordmark replaces it.
- Guard: the `/review/type?review=1` specimen, checked in `footer.spec.ts` at 320px and 150% (longest catalogue name plus a 96-character stress name, with no clipping).
- Owner: Product owner

### D-037 — Budget presets, "Who’s eating?", and a two-card paywall

- Status: Proposed
- Date: 2026-09-24
- Workstream: mobile
- Decision:
  - **Budget:** the step offers $60, $80 and $100 plus Custom. The −/+ field appears only for Custom, and the slider is removed. The default is now $80 (was $75), so it matches a preset. The explanation says who the estimate is for, and in onboarding it says that household size comes next.
  - **People:** the question reads "Who’s eating?", with the answers "Just me", "Two of us" and "3–4 people". Preferences asks "How many people?".
  - **Paywall:** one value statement, three one-line benefits, and two plan cards (yearly and monthly), each with the per-week equivalent. Weekly stays available as a smaller "Or pay weekly" option, so all three D-008 prices remain. It has one primary action. The auto-renew disclosure is one compact paragraph. Restore purchases is a quiet link. Nothing is preselected (D-008).
- Open: the renewal wording still needs a check against the current App Store Review Guidelines before submission.
- Owner: Product owner

### D-038 — Meal imagery: editorial photography

- Status: Accepted (product owner, 2026-09-24: "go with photography")
- Date: 2026-09-24
- Workstream: mobile
- Decision:
  - **Style:** meal imagery is editorial food photography: one 4:3 master per recipe, cropped to a 16:9 hero and a 1:1 thumbnail, in one consistent style (the brief is in `apps/mobile/src/photos/brief.ts`).
  - **No mixing:** the app switches from the illustrated plates to photos only when all 22 recipes have a valid photo.
  - **Release gate:** `npm run photos -- --check`.
- Open:
  - **Sourcing:** generated stills (recommended) or a commissioned shoot. The prompts for all 22 are in `apps/mobile/assets/meals/prompts.json`.
  - **Checks for generated stills:** a person checks every still against the ingredient list, and the About sheet and store listing call them illustrative.
- Superseded: the refined-illustration direction (B) board was removed from the code. Its captures remain in `apps/mobile/docs/review/v3/food/` for reference.
- Owner: Product owner

### D-039 — Friends pilot runs without a Weekwell server

- Status: Accepted (product owner, 2026-09-24: "skip the server for the pilot")
- Date: 2026-09-24
- Workstream: mobile
- Decision: the pilot build is **on-device only**.
  - **Build setting:** leave `EXPO_PUBLIC_API_URL` unset in EAS. There are no accounts, no sync and no sign-in email, and plans, preferences, foods left out and grocery lists stay on the phone.
  - **Subscriptions:** RevenueCat works client-side. The app reads access from the RevenueCat SDK, and no webhook or secret key is needed. The paid-access rule (D-026) is enforced in the app only.
  - **Privacy texts:** the site is built with `"server": false` (`site/site.config.json`), so the privacy policy, health data policy, terms and support page describe the no-server pilot.
- Kept, not deleted:
  - **Unused code:** the API (`apps/api`), Resend sign-in (D-013) and the RevenueCat webhook stay in the repo, tested but not deployed.
  - **Future hosting:** Fly.io was recommended; Render works too with the Postgres migration, which is untested.
- Revisit when: accounts and sync across devices are wanted, server-side access enforcement is needed, or the pilot grows beyond friends.
- Turning the server on later:
  1. host the API with `STORE_MODE=revenuecat` and Resend;
  2. set `EXPO_PUBLIC_API_URL`;
  3. set `"server": true` and `hostingProvider` in the site config, and republish the policies before the build ships;
  4. update the App Store privacy label.
- Owner: Product owner

## Decision entry template

```md
### D-XXX — Short title

- Status: Proposed | Accepted | Deferred | Rejected | Superseded
- Date:
- Workstream: shared | mobile | tiktok
- Question:
- Decision:
- Options considered:
- Reason:
- User impact:
- Security/privacy impact:
- Cost/operational impact:
- Contracts affected:
- Rollback:
- Owner:
- Review date:
```

## Change discipline

If a decision affects both workstreams, update this file first. If it affects only one, record it under that workstream and do not create an unnecessary dependency in the other program.
