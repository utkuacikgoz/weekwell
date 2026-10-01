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
  - **Purchases:** made through `react-native-purchases`, with entitlement `pro` (renamed `weekwell_pro_pro` in D-051) and offering `default`. The product ids are `com.belevate.weekwell.{weekly,monthly,yearly}`, and the free week is Apple's introductory offer.
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
- Decision: `ios.supportsTablet: false` for the pilot. Identifiers from the product owner: bundle id `com.belevate.weekwell`, Apple team `9D78WTZAD8`, App Store Connect app `6815542789` (set in `app.json` and `eas.json`). Still open before the daily TestFlight workflow runs: EAS project link (`eas init`), EAS signing credentials and App Store Connect API key, `EXPO_TOKEN` secret, `TESTFLIGHT_ENABLED` variable. (Superseded by D-041: no EAS, no `EXPO_TOKEN`.)
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

### D-040 — Screen designs picked by the product owner

- Status: Accepted (product owner, 2026-09-25, via the screen picker `docs/review/weekwell-screen-picks.html`)
- Date: 2026-09-25
- Workstream: mobile
- Decision: one pick per screen, built in this order.
  - **Overall look:** L2 Bold blocks. Green ground, white action blocks, Bricolage Grotesque ExtraBold uppercase titles and dish names, square corners, full-bleed coloured day bands, sun-yellow "well" in the wordmark.
  - **Welcome:** WE1 photo mosaic (already built).
  - **Setup 1, store and budget:** SB3, fill in the sentence ("I shop at [store] and spend about [$80] a week").
  - **Setup 2, goal, time, people:** YW1, three chip groups (already built).
  - **Setup 3, foods to leave out:** FL2, a switch list.
  - **Setup 4, review:** RV1, summary rows with Edit. The button reads **"Plan my week"**.
  - **Building your week:** GN3, dinners appear one by one.
  - **Your week:** HM1, Tonight card and week list (already built).
  - **Meal:** MD2, Ingredients and Steps tabs.
  - **Swapping:** SW2, choose from three, each with time and price change.
  - **Cooking:** CK3, all steps, current one highlighted.
  - **Grocery list:** GL1, by aisle with prices (already built).
  - **Price and budget:** PR5, cost on every dinner (picked 2026-09-26 from PR1–PR7).
    - Every meal shows its share of the estimated total: each grocery item's cost is split across the meals that use it, in proportion to how much each uses (`mealCostShares`). Shares add up to the total.
    - A budget line reads "$130 this week · $90 over your $40", with "Rebuild under $40".
    - When over budget, the priciest dinners get "Swap, save about $X", which opens the cheaper swaps.
    - Price truth: no total means no shares. Savings numbers come from sample package prices, so they show only when the total is a sample estimate (otherwise the link reads "Swap for a cheaper dinner"). The swap sheet's price deltas follow the same rule.
  - **Free week and plans:** PW2, one recommended plan (yearly) with "See other plans". Yearly is now chosen up front, which **replaces D-037's "nothing preselected"**. To keep the choice honest, the charge line above the button always states the exact price ("Free for 7 days, then $49.99 a year."), and the monthly and weekly prices show beside "See other plans" before it's opened.
  - **Preferences:** ST2, a settings list with sub-screens.
- Built: all picks above except PR1, which stays until the owner reviews PR4–PR7. Swapping uses `swapOptions()` in the domain; the first choice always equals the old single swap. Settings keep one screen with in-place sub-screens, so a pending change survives moving between them and is applied once.
- Guardrails kept: the D-036 layout gate (bar height, no sideways scroll, 150% text), 4.5:1 text contrast on every band (tested), and the price-truth rules.
- Rollback: the theme lives in `src/theme/palette.ts` and `tokens.ts`; each screen change is its own commit.
- Owner: Product owner

### D-041 — TestFlight without Expo: Xcode on GitHub's Mac runner

- Status: Accepted (product owner, 2026-09-26: "I don't need an Expo token setup, I need TestFlight")
- Date: 2026-09-26
- Workstream: mobile
- Decision: `.github/workflows/testflight-daily.yml` no longer uses EAS. On `macos-latest` it:
  1. runs the gate (typecheck, lint, tests);
  2. generates the iOS project with `expo prebuild`;
  3. sets the build number to the run number;
  4. archives with Xcode automatic signing, using an App Store Connect API key (`-allowProvisioningUpdates`);
  5. exports with `destination: upload`, which sends the build straight to App Store Connect.
- Credentials: only the App Store Connect API key, with the Admin role, stored as three GitHub secrets. There is no Expo account or token, and no certificate or profile to handle by hand.
- Cost: Mac minutes. Scheduled runs are skipped when there have been no commits in the last day.
- Supersedes: the EAS path in D-017 and D-030. `eas.json` stays in case EAS is wanted later.
- Risk: unverified until the first run. Signing through the API key is the likeliest point of failure; the fix path is in `testflight-setup.md`.
- Owner: Product owner

### D-042 — Public site on Vercel at weekwell.pro

- Status: Accepted (product owner, 2026-09-26: "do setup for Vercel, weekwell.pro domain is purchased and connected")
- Date: 2026-09-26
- Workstream: shared
- Decision:
  - **Hosting:** Vercel serves the static site built from `site/` at https://weekwell.pro. `vercel.json` sets the build (`node site/build.mjs`, no dependency install), clean URLs (`/privacy`, `/terms`, `/health-data`, `/support`), security headers and a strict content security policy. An `ignoreCommand` skips deploys when nothing under `site/` changed.
  - **Replaced:** the GitHub Pages workflow (`site.yml`) is removed.
  - **Pages:** a landing page in the Bold blocks look, plus the existing privacy, consumer health data, terms and support pages, a 404 page, a sitemap and robots.txt.
  - **Publisher details:** Belevate LLC, Delaware law, hello@weekwell.pro for support and privacy, effective September 26, 2026. The postal address is optional: its lines appear only once `mailingAddress` is set.
  - **App:** the legal links default to https://weekwell.pro (`EXPO_PUBLIC_SITE_URL` still overrides it).
- Still owed: a lawyer's review of the texts (`docs/legal/us-legal-review.md`), a working inbox for hello@weekwell.pro, and the mailing address.
- Owner: Product owner

### D-043 — Faster, fewer CI and TestFlight runs

- Status: Accepted (product owner, 2026-09-26: "shard the builds, they take so long; make sure we don't do unnecessary runs")
- Date: 2026-09-26
- Workstream: shared
- Decision:
  - **CI (`ci.yml`), only what changed:** a `changes` job reads the diff. Docs-only changes run nothing more. The app and API checks run only when their code or shared config changes, and the site build only when `site/` changes.
  - **CI, cancel superseded runs:** a newer push to the same PR cancels the older run.
  - **CI, shard the browser tests:** the web app is exported once and shared as an artifact. The browser tests run as 3 parallel shards, split per test (`fullyParallel` for the on-device project), with Playwright's browser cached. Locally each shard takes about 2 minutes, against about 7 for the whole suite in one run.
  - **CI on main:** a push to main runs only the fast checks and the site build, because the browser tests already ran on the PR.
  - **TestFlight, gate on Linux:** the typecheck, lint and tests run on Linux, where minutes cost a tenth of Mac minutes.
  - **TestFlight, skip unchanged days:** a scheduled run builds only when app code changed in the last day; docs and tests don't count.
  - **TestFlight, cache and trim:** CocoaPods are cached, and Xcode's index store is turned off for the archive.
- Owner: Product owner

### D-044 — Landing page redesign and brand mark

- Status: Accepted (product owner, 2026-09-27: "works but it is not AAA class; also there's no favicon")
- Date: 2026-09-27
- Workstream: shared
- Decision:
  - **Brand mark:** a white "W" in Bricolage Grotesque ExtraBold on Weekwell green, with a sun-yellow bar. It's rendered to `favicon.ico` (16, 32 and 48 px), the PNG favicons, a 180 px Apple touch icon, 192 and 512 px icons and a web manifest. The old favicon was the app icon's plate art shrunk to 48 px, which was unreadable in a browser tab.
  - **Share image:** a 1200×630 card (`og.jpg`) with the headline and a real app screen, used for link previews.
  - **Landing page:** built from real screens of the app, captured from the web build by `apps/mobile/e2e/site-shots.spec.ts` (run with `SITE_SHOTS=1`). The sections are:
    - a hero with two phones;
    - a numbers strip;
    - how it works in three steps, each with its screen;
    - three feature sections (swap, cooking mode, foods left out);
    - pricing;
    - an FAQ that works without JavaScript (`details`);
    - a closing call to action.
  - **No JavaScript,** so the strict content security policy stays. On phones the header shows only the wordmark and "Join the beta".
- Follow-up: re-run the screenshot spec when the app's screens change, so the site shows the current app.
- App icon: replaced by the W mark on 2026-09-27 at the owner's request ("yep change app icon too"). The iOS icon is square and opaque, and iOS rounds the corners. The splash shows a white W on the green background. The Android adaptive icon puts the W in the middle 62% on green, plus a monochrome version. All are generated by the same spec (`app icons`).
- Owner: Product owner

### D-045 — TestFlight feedback: paywall, budget, onboarding copy

- Status: Accepted
- Date: 2026-09-27
- Workstream: mobile
- Question: The owner's first TestFlight pass (build 7) found a weak paywall, a budget field the keyboard covered, a $400 budget cap, misaligned choice boxes, a link that left the app, and copy below the bar.
- Decision:
  - **Paywall.** All three plans are always visible (yearly chosen, "Save 58%"). Personal line ("Your Walmart week is planned"), outcome-led benefits, a Today → trial-end timeline ("Cancel before then and you pay nothing"), and a "Cancel anytime, in two taps" block. During the free week a sun-yellow countdown ("5 days left") and **Manage or cancel**, which opens Apple's own sheet (RevenueCat `showManageSubscriptions`) or, in test builds, cancels renewal. Urgency is honest: real dates, real prices, no fake timers or scarcity (App Review 3.1.2, 5.6).
  - **Week screen.** "Try a free week" link replaced by a sun-yellow offer card.
  - **Budget.** Cap raised from $400 to $2,000 a week (`BUDGET_MAX`). The sheet rises above the keyboard, the iOS number pad gets a Done bar, a valid amount applies as it's typed, and the duplicate label is gone.
  - **Onboarding.** Step label is "Step 2 of 4" (the headline names the step). Choice boxes in a row share one height. Review answers are colour-band cards. "How we use this" (foods left out) is an in-app sheet instead of the website.
  - **Toast.** Positioned from the measured footer height; iOS ignored the percentage offset and put it behind the main button.
- Reason: Owner feedback on build 7.
- Security/privacy impact: None. The health-data summary stays in the app; the full policy is still named.
- Rollback: Revert the PR.
- Owner: Product owner

### D-046 — Faster CI

- Status: Accepted
- Date: 2026-09-27
- Workstream: shared
- Question: CI took about 4.5 minutes per PR; the owner asked for it to be as fast as possible.
- Decision:
  - No shared build-web job. Each E2E shard exports both web builds in parallel with installing Chromium (the Playwright cache never hit on PR branches).
  - 3 Playwright workers per 4-core runner.
  - Visual audit at the 5 width × text-size combinations that bound the layout (320@100, 320@150, 390@100, 390@125, 430@100) instead of all 12.
- Reason: The critical path had three sequential waits (build job, browser install, tests).
- Rollback: Restore the build-web job and the full matrix.
- Owner: Product owner

### D-047 — Nearest store and shopping-day reminder

- Status: Accepted
- Date: 2026-09-27
- Workstream: mobile
- Question: The owner's original idea: share your location, Weekwell finds your store and nudges you to go shopping.
- Decision:
  - **Find my nearest store.** On the store step and on the shopping-day screen, the person taps it. The app asks for When In Use location once, and searches Apple Maps (MKLocalSearch, in a local Expo module `modules/store-search`) for Trader Joe's and/or Walmart within about 25 miles. It saves only the nearest store's name, street and distance on the phone. If no chain was picked yet, the chain it found fills the sentence. A Directions link opens Apple Maps.
  - **Shopping day.** "When do you shop?" (a card on the week screen, a row in Settings, and a link on the grocery list). The person picks a day and a time: morning, midday or evening. One weekly local notification says "It’s shopping day. Your Walmart list is ready: 23 items, about $86. Walmart Supercenter on Main St is 1.2 mi away." It is rescheduled whenever the list, total or store changes, and tapping it opens the grocery list.
  - **Owner picks (2026-09-27, from three options each):**
    - ST1: a store card under the setup sentence.
    - NU3: a one-time "Your week is ready. When do you shop?" sheet after the first plan, with a day strip, a time bar and "Not now". After that it lives on the grocery list and in Settings.
    - SD2: the shopping-day screen leads with a lock-screen preview of the exact reminder.
    - GR3: a map strip on the grocery list. MapKit snapshot, store, distance, drive time (worked out once when the store is found) and a Go button.
    - NT3: a food-first reminder, "This week starts with sheet-pan chicken fajitas" / "Grab 24 items at Trader Joe’s (1.8 mi), about $78, and dinner’s sorted till Friday."
  - **Purpose strings:** Info.plist has `NSLocationWhenInUseUsageDescription`, plus `NSMotionUsageDescription` saying Weekwell never uses motion data. App Store Connect rejected build 9 without the motion string (ITMS-90683), because expo-location's binary references CoreMotion APIs. The "Always" location strings stay off.
  - **Not done:** an arrival alert near the store. It needs Always location, draws App Review scrutiny, and costs battery.
- Privacy: The location stays on the phone and goes to Apple Maps for the search; Weekwell never stores or receives it. The privacy policy says so. App Privacy doesn't change (location isn't collected). No push entitlement: a config plugin strips the one expo-notifications adds.
- Testing: The web preview has no Apple Maps search. `?nearby=found|denied|none` fakes the search result in tests; everything else is real. The Swift module compiles only in the TestFlight build.
- Rollback: Remove the plugins and module; the stored `shopping` field is ignored.
- Owner: Product owner

### D-048 — After cooking: the week, ticked off

- Status: Accepted
- Date: 2026-09-28
- Workstream: mobile
- Question: Done in cooking mode went back to the recipe just cooked, which is a dead end.
- Decision: The owner picked CD2 of three options. Done returns to the week (`router.dismissTo('/week')`). The dinner is marked cooked (stored per plan and reset with a new plan): "✓ Cooked", struck through, photo faded. "This week · 2 of 5 cooked" appears in the header, and a toast says "Nice. Next up: <dinner> tomorrow." (or "on <day>", or "That’s every dinner this week.").
- Rollback: Revert; the stored `cooked` field is ignored.
- Owner: Product owner

### D-049 — Paywall: your week is the pitch; food list in three ticks

- Status: Accepted
- Date: 2026-09-29
- Workstream: mobile
- Question: The paywall and the food-list sheet were too wordy. The owner asked for the paywall to lead with visuals.
- Decision: For the paywall the owner picked PV1 of three visual options. The person's own five dinners appear as colour bands at the top, with a sun badge on Monday's line ("7 days free", "N days left" or "Free week over"). Below them: "Keep weeks like this." and three compact plan rows (name, Save 58% on yearly, billed price). The benefit list, timeline and cancel card are removed. The billed price, trial terms, auto-renew, Restore, Terms and Privacy stay (guideline 3.1.2); the per-week figure moves to the spoken label. For the food-list sheet the owner picked FL1: three ticked lines and no web link.
- Rollback: Revert the PR.
- Owner: Product owner

### D-050 — Cancel screen: a half-price month to stay

- Status: Accepted
- Date: 2026-09-29
- Workstream: mobile
- Question: Apple's Confirm Cancellation sheet showed nothing from Weekwell. The owner picked RM3 of three options (the others were an image of the week, and three bullets).
- Decision: Weekly and monthly subscribers who tap Cancel are offered a promotional offer on the monthly plan: "Special offer: next month for $4.99. Half price on your next month, then $9.99 a month. Cancel anytime." Yearly subscribers see the default text message ("Your week is already planned"). Apple also shows the default whenever our endpoint doesn't answer. The endpoint is a dependency-free Vercel function next to the site (`POST /api/apple/retention`), because the pilot has no API server (D-039). It verifies Apple's JWS against a pinned Apple Root CA G3 fingerprint, rejects requests for other apps and requests older than 5 minutes, signs the offer as a V2 JWS with the In-App Purchase key, and stores nothing. `scripts/retention-setup.mjs` uploads the messages, sets the defaults and URL, and runs Apple's performance test. The privacy policy now says Apple sends us the transaction number and language when someone opens the cancel sheet.
- Owner setup: Retention Messaging API access, the `stay_half_month` offer, an In-App Purchase key, and five Vercel env vars (`apps/mobile/docs/release/retention-offer.md`).
- Known limit: without a database, the same person can get the offer again at each cancellation.
- Rollback: Remove `RETENTION_OFFER_ID` in Vercel; the default message remains.
- Owner: Product owner

### D-051 — RevenueCat Paywall and Customer Center

- Status: Accepted
- Date: 2026-10-01
- Workstream: mobile
- Question: The owner asked for RevenueCat's Paywall and Customer Center, and set up the entitlement `weekwell_pro_pro` and Test Store products (`weekly`, `monthly`, `yearly`) in RevenueCat.
- Decision: In builds with a RevenueCat key, `/trial` shows RevenueCat's paywall (`react-native-purchases-ui`, pinned to the same 10.10.2 as `react-native-purchases`) to anyone who needs a plan: no plan, the free week is over, or the free week won't renew. The owner designs it in the RevenueCat dashboard on the `default` offering. After a purchase or restore, the app re-reads access, records the analytics event, and returns to where the person came from. People on the free week or a plan still see the status screen, and its "Manage or cancel" now opens RevenueCat's Customer Center, falling back to Apple's manage sheet if that fails. The web preview and tests keep the built-in PV1 paywall (D-049), because RevenueCat's UI doesn't run there. The entitlement id is now `weekwell_pro_pro`, and Test Store product ids map to the same plans as the App Store ones. Superseded: the PV1 paywall in store builds.
- Rollback: Revert the PR; RevenueCat's dashboard keeps the paywall and Customer Center unused.
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
