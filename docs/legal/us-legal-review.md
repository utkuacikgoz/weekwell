# US legal self-review: privacy policy, health data policy, terms, and paywall

> **Pilot scope (D-039):** no Weekwell server. Meal data, including foods left out, stays on the phone, and only Apple and RevenueCat receive subscription data under a random app id. The site is built with `"server": false`, which removes the account, email, hosting and log sections. The server-mode rows below apply once a server runs.

**This is not legal advice.** It's an engineering self-review against US laws and App Store rules, written so a lawyer can review quickly. Have a US lawyer review the texts in `site/src/` before public release. A friends-and-family TestFlight is lower risk, but it still needs the privacy policy URL.

Status key: ✅ addressed in the texts or code · ⚠️ needs a decision or confirmation · 🔎 needs a lawyer

## Publisher details (`site/site.config.json`)

Set 2026-09-26 (D-042): Belevate LLC, Delaware, hello@weekwell.pro, effective September 26, 2026. The site is on Vercel at https://weekwell.pro. The mailing address is still empty; its lines are hidden until it's set.

## Before publishing: fill in `site/site.config.json`

The site build refuses to run while any value is a TODO:
- **Company legal name.** Registering an LLC before selling subscriptions limits your personal liability.
- **Support email and privacy email.**
- **Mailing address** for privacy requests.
- **Governing-law state.**
- **Effective date.**
- **Hosting provider**: only when `"server": true` (not needed for the pilot).

## Privacy law

| Law or rule | What it requires (short) | Status |
|---|---|---|
| **CalOPPA** (California Online Privacy Protection Act) | A conspicuous privacy policy covering categories collected, sharing, how users review and change data, Do Not Track, and the effective date | ✅ |
| **CCPA/CPRA** (California) | Notice at collection, categories, purposes, retention, sale/share disclosure, rights (know, delete, correct, opt out, limit sensitive), no discrimination, 45-day response. The thresholds ($25M+ revenue, 100k+ consumers, or 50%+ revenue from selling data) likely **don't apply yet**, but the policy follows it anyway. | ✅ written to the standard · 🔎 confirm whether it applies |
| **Other state comprehensive privacy laws** (VA, CO, CT, UT, TX, OR, MT, IA, DE, NH, NJ, TN, MN, MD, IN, KY, RI, NE and others) | Similar rights plus an **appeal process**. Opt-outs for targeted ads, sale and profiling. Consent is required for sensitive data in several states. | ✅ rights and appeals offered to all US residents · ⚠️ see "sensitive data consent" |
| **Washington My Health My Data Act** (and **Nevada SB 370**, **Connecticut** consumer health data) | A separate consumer health data policy linked from the homepage; consent before collecting consumer health data; no sale without signed authorization; access, delete and withdraw rights. Applies regardless of company size, and has a private right of action in WA. | ✅ separate page linked from the site homepage · ⚠️ **consent screen needed** (below) · 🔎 whether "foods you leave out" is consumer health data |
| **Global Privacy Control** | Honor GPC as an opt-out where required (CA, CO, and others) | ✅ we don't sell or share, and the policy says GPC is honored |
| **COPPA** | No personal information from under-13s without parental consent | ✅ not directed to children, with a deletion commitment · terms require 18+ or guardian agreement |
| **CAN-SPAM** | Applies to commercial email | ✅ we send only transactional sign-in codes; any future marketing email needs an unsubscribe link and a postal address |
| **FTC Act §5** (deception) | The policy must match what the app does | ✅ written from the code: no location, contacts or photos; analytics on-device only; email stored as a keyed hash · ⚠️ keep in sync when analytics or hosting change |
| **FTC Health Breach Notification Rule** | Applies to vendors of personal health records that pull health data from multiple sources | 🔎 likely doesn't apply (we don't draw from multiple health sources); confirm |
| **State breach-notification laws** | Notify affected residents after a breach | ✅ commitment stated · ⚠️ write an incident runbook before launch |

### Sensitive data consent (action item)

Colorado, Connecticut, Virginia and others treat health-condition data as **sensitive**, which needs **opt-in consent**. Washington's MHMDA needs **consent to collect** consumer health data. **Recommendation:**
- Add one line on the "Foods to leave out" step: "Allergies can be health information. We use them only to plan your meals. [Privacy]". Adding a food counts as the affirmative choice.
- For stronger consent, add an explicit "I agree" before saving the first food.

This screen is `design_pending`, so the product owner should approve the wording.

## Subscriptions (auto-renewal)

| Law or rule | Requirement | Status |
|---|---|---|
| **App Store Review Guideline 3.1.2** | The paywall shows the title, length, price and, per period, the renewal terms, **plus working links to the privacy policy and terms of use (EULA)** in the app and in the App Store listing | ✅ price, period, free week and renewal on the paywall · ✅ the terms and privacy links appear once `EXPO_PUBLIC_SITE_URL` is set · ⚠️ add both URLs to App Store Connect |
| **California Automatic Renewal Law** (amended 2024, in force July 2025) and similar laws in NY, VA, CO, IL and others | Clear and conspicuous terms before purchase; affirmative consent; an acknowledgment with cancellation info; easy online cancellation; notice before a free trial converts (CA requires notice 3–21 days before a trial of more than 31 days; our trial is 7 days); annual reminders for some plans | ✅ terms section 4 (capitalised disclosure, how to cancel) · ✅ paywall charge line · ⚠️ Apple sends the purchase receipt; confirm whether Apple's emails satisfy the acknowledgment for in-app purchases · 🔎 confirm yearly-plan reminder duties |
| **FTC "click-to-cancel"** (Negative Option Rule) | A federal court vacated it in July 2025, but ROSCA still applies: clear disclosure, express consent, a simple way to cancel | ✅ cancellation through Apple's settings, linked from support |

## Terms of use

| Item | Status |
|---|---|
| Allergy and food-safety disclaimer, "not medical advice" | ✅ section 2, also in-app (nutrition sheet) |
| Price estimates and no retailer affiliation (trademark use is nominative) | ✅ section 3 and site footer · 🔎 confirm retailer names are fine in the App Store listing |
| Apple's minimum EULA terms (Apple not responsible; third-party beneficiary; export) | ✅ section 7 |
| Limitation of liability, warranty disclaimer, indemnity | ✅ sections 8–10, with state-law carve-outs · 🔎 review caps for consumer enforceability |
| **Arbitration / class-action waiver** | ⚠️ **deliberately left out**: courts in your state first, plus small claims. A lawyer can add arbitration if you want it, but it brings consumer-notice duties and mass-arbitration risk. |
| Age: 18+ or guardian agreement | ✅ · 🔎 confirm against the App Store age rating (4+) |

## Operational commitments the policy makes (make sure they're true)

- Security logs are deleted after **30 days**, and deleted data is gone from backups within **35 days**. **Set these in hosting** (D-013).
- Privacy requests are answered within **45 days** via the privacy email. Someone must monitor it.
- Sessions last **30 days**, and sign-in codes expire after **10 minutes**. Both already hold in the API code.
- Service providers: Resend, RevenueCat, Apple and the host. **Sign or accept each provider's data processing terms** (DPA).
- Any new analytics destination, crash reporter or advertising SDK **requires updating the policy first**, as well as the App Store privacy label.

## App Store privacy "nutrition label" (App Store Connect → App Privacy)

**Pilot (no server, D-039):** only the RevenueCat SDK sends data off the device:
- **Purchases → Purchase history:** app functionality; not linked to identity; not tracking.
- **Identifiers → User ID:** RevenueCat's random app user id; app functionality; not linked to identity; not tracking.
- Nothing else. Meal data and foods left out stay on the device, so they aren't "collected" in Apple's sense.

**With a server,** this follows the texts above; confirm it at submission:
- **Contact info → Email address:** app functionality; linked to the user; not used for tracking. (It's sent to deliver the code, and a keyed hash is stored.)
- **Health & fitness → Health:** "foods you leave out" (allergies). App functionality; linked to the user when signed in; not tracking. 🔎 decide whether Apple's "Health" category applies; declaring it is the conservative choice.
- **Purchases → Purchase history:** app functionality; linked to the user; not tracking.
- **Identifiers → User ID:** app functionality; linked; not tracking.
- **Tracking:** none, so no App Tracking Transparency prompt.
