# App Store submission pack (draft)

**Status: NOT ready to submit.** Every field below is a draft. App Store requirements must be re-checked against Apple's current documentation at submission time (D-017); nothing here was verified against live Apple docs, which this environment can't reach. Submission also needs product-owner approval of every screen, QA and security sign-off, and the open items at the bottom.

## Identity

| Field | Draft | Status |
|---|---|---|
| App name | Weekwell | needs trademark/name-availability check |
| Subtitle (≤30) | Five dinners, one grocery list | draft |
| Bundle ID | com.belevate.weekwell (team 9D78WTZAD8, ASC app 6815542789) | set (D-030) |
| Primary category | Food & Drink | draft |
| Secondary category | Health & Fitness | draft; confirm this doesn't imply medical claims |
| Age rating | 4+ (no objectionable content) | answer the current questionnaire at submission |
| Price | Free with in-app subscriptions | per D-008 |

## Description (draft)

> Plan your five weeknight dinners, plus practical work lunches, around the store you use, your budget, and your time.
>
> Pick Trader Joe's or Walmart, set a weekly budget, choose what matters most (high protein, low effort, low carb, or family friendly), and leave out any foods you don't eat. Weekwell plans five dinners and two lunch preps, then combines everything into one grocery list grouped by aisle, with estimated prices.
>
> • Swap any meal. Only that meal changes, and you can undo.
> • Check items off as you shop.
> • Step-by-step cooking mode.
> • Clear price labels: estimates are always called estimates.
>
> Prices are estimates and can change in store. Protein values are estimates from typical ingredient values and aren't medical or dietary advice. Weekwell isn't affiliated with Trader Joe's or Walmart.

**Keywords (≤100 chars, draft):** meal plan,weekly dinners,grocery list,high protein,meal prep,budget meals,work lunches

## Screenshots

Drafts at 6.9" (1320×2868) in `screenshots/`, rendered from the web build. **Replace them with captures from a real device before submission** (native fonts, status bar, controls). Confirm which display sizes Apple currently requires.

| File | Caption (draft) |
|---|---|
| 01-plan-my-five-dinners.png | Plan my five dinners |
| 02-your-week.png | Tonight first, the whole week below |
| 03-recipe.png | Everything you need to cook it |
| 04-grocery-list.png | One list, grouped by aisle |
| 05-cooking-mode.png | One step at a time |

## Subscriptions (D-008)

| Product | Price | Trial | Status |
|---|---|---|---|
| Weekly | $4.99 / week | 1 week free (introductory offer) | create in App Store Connect |
| Monthly | $9.99 / month | 1 week free | create in App Store Connect |
| Yearly | $49.99 / year | 1 week free | create in App Store Connect |

- One subscription group. Restore purchases is visible on the paywall.
- The paywall states: free for 7 days, then the price, charged when the free week ends unless cancelled, with cancellation through App Store settings at least 24 hours before the end. **Verify this wording against current App Store guidance.**
- The in-app purchase is currently a **mock** (D-014 open). Real StoreKit/RevenueCat integration and server-side receipt/webhook verification (the API already verifies signed webhooks) are required before submission.

## Privacy

- Privacy policy: draft in `privacy-policy-draft.md`. It needs legal review and a hosted URL (**open**).
- Support URL: **open** (needs a hosted page and contact address).
- App Privacy details (draft answers, verify against the current questionnaire):
  - **On-device build:** no data collected. Everything stays on the device, and analytics events are buffered on-device only (D-024).
  - **API-connected build:** email address (account; stored only as a keyed hash), user content (meal plans and preferences, including foods to leave out, linked to the account), identifiers (account id). Not used for tracking, not sold, not shared with third parties.
- Account deletion: in-app, Preferences → Delete my account (API build) / Delete my data (on-device build). Deletes the account and all owned rows server-side (tested).
- Data export: `GET /v1/export` exists. An in-app entry point is **open**.

## Review notes (draft)

> Weekwell plans five dinners and two lunch preps from a fixed recipe catalog, with estimated grocery prices. To test: tap Get started, choose Trader Joe's, keep the defaults, and tap Plan my five dinners. [API build: sign in with the demo email below; the code arrives by email.] Prices shown are estimates. No account is needed in the on-device build.

Demo account: **open** (needed only for the API build).

## Export compliance

`ios.usesNonExemptEncryption: false` in `app.json`: the app only uses encryption provided by the OS (HTTPS). **Confirm the current export-compliance questionnaire answers at submission.**

## Permissions

The app requests no device permissions (no camera, location, contacts, notifications, or tracking), so no permission rationale strings are needed. `expo-secure-store` would add a Face ID usage string by default; it's disabled (`faceIDPermission: false`) because the app doesn't use Face ID. Re-check the generated Info.plist before submission.

## Accessibility evidence

- Automated: every control labelled; touch targets ≥44 pt; no clipped text at 320–430 pt widths and 100–150% text; WCAG AA contrast for both light and dark palettes (see the E2E and contrast tests).
- **Open:** a manual VoiceOver pass, Dynamic Type at the largest sizes, and Reduce Motion on a real device.

## Open before submission

1. Product-owner approval of every screen and sensory state (D-016, D-018).
2. D-041: add the App Store Connect API key as three GitHub secrets, then set `TESTFLIGHT_ENABLED` (see `testflight-setup.md`; no Expo account needed).
3. D-014 real purchases (StoreKit/RevenueCat) and store webhooks.
4. D-013 auth provider and email delivery (API build), plus a hosted API.
5. D-011 price source, or explicit acceptance of labelled sample prices.
6. Hosted privacy policy and support URL; legal review.
7. Device screenshots; manual accessibility pass; current Apple requirements check.
