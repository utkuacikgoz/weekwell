# Submission checklist

Tick these off in order. The text to paste is in [`app-store-pack.md`](app-store-pack.md).

## 1. Money (App Store Connect → Business)
- [ ] Paid Apps agreement accepted.
- [ ] Bank account and tax forms completed. Subscriptions can't be bought until these show **Active**.

## 2. Subscriptions (App Store Connect → your app → Monetization → Subscriptions)
- [ ] Subscription group "Weekwell" created.
- [ ] `com.belevate.weekwell.weekly` at $4.99 for 1 week, `…monthly` at $9.99 for 1 month, and `…yearly` at $49.99 for 1 year.
- [ ] On each one: an introductory offer of **Free, 1 week, new subscribers**.
- [ ] On each one: a display name, a description and a review screenshot.
- [ ] Users and Access → Integrations → **In-App Purchase** key generated and the `.p8` file downloaded.

## 3. RevenueCat (app.revenuecat.com; details in `revenuecat-setup.md`)
- [ ] Project "Weekwell" with an App Store app for `com.belevate.weekwell`, and the In-App Purchase key uploaded.
- [ ] The three products imported.
- [ ] Entitlement **`pro`** created, with all three products attached.
- [ ] Offering **`default`** marked current, with Weekly, Monthly and Annual packages.
- [ ] The public iOS key (`appl_…`) added to GitHub as the secret **`REVENUECAT_IOS_KEY`**.
- [ ] Run **Actions → TestFlight daily → Run workflow** to build with real purchases.

## 4. Test on your iPhone (TestFlight build with the key above)
- [ ] Settings → App Store → Sandbox Account: signed in with a sandbox Apple ID (created under Users and Access → Sandbox).
- [ ] Onboarding end to end: setup sentence, then your week, then Plan my week.
- [ ] Start the free week. The paywall reads "Free for 7 days, then $49.99 a year."
- [ ] Subscription renews. In the sandbox a week is a few minutes.
- [ ] Cancel in Settings. Access continues until the period ends, then the app is read-only.
- [ ] Restore purchases works after deleting and reinstalling the app.
- [ ] Cancelling the Apple purchase sheet shows no error.
- [ ] Accessibility: VoiceOver on the week, meal and grocery screens.
- [ ] Accessibility: the largest text size (Settings → Accessibility → Display & Text Size).
- [ ] Accessibility: Reduce Motion (the building screen shows all dinners at once).
- [ ] The terms and privacy links on the paywall open weekwell.pro.

## 5. Listing (App Store Connect → your app → the iOS version)
- [ ] Name, subtitle, promotional text, description and keywords pasted.
- [ ] 6.9" screenshots uploaded (6 images, in order). Add the 6.5" set if asked.
- [ ] Support, marketing and privacy policy URLs set. Terms link included in the description.
- [ ] Category Food & Drink. Age rating questionnaire answered (4+).
- [ ] App Privacy questionnaire answered: Purchases and User ID, not linked, no tracking.
- [ ] Export compliance: "None of the algorithms".
- [ ] App Review notes pasted. No demo account needed.
- [ ] The three subscriptions added to this version under **In-App Purchases and Subscriptions**. Apple reviews them together the first time.
- [ ] Build selected: the newest TestFlight build that has the RevenueCat key.

## 6. Submit
- [ ] **Add for Review**, then **Submit**.
- [ ] Choose manual release, so you pick the launch moment after approval.

## Optional
- [ ] External TestFlight for friends first: TestFlight → External Testing → add a group. It needs Beta App Review, plus the test information and feedback email (hello@weekwell.pro).
- [ ] Meal photos (22), to replace the illustrations (D-038).
- [ ] One-time price check at a real store, instead of labelled sample prices (D-011, `docs/price-check/`).
