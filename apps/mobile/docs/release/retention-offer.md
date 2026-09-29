# Cancel-screen offer (D-050, RM3)

When a subscriber taps **Cancel Subscription** in Settings, Apple shows a Confirm Cancellation sheet. With this set up, weekly and monthly subscribers see:

> **Special offer: next month for $4.99**
> Half price on your next month, then $9.99 a month. Cancel anytime.
> *Weekwell Monthly — 1 month for $4.99, then $9.99/month* **[Redeem]**

Yearly subscribers (and everyone, whenever our endpoint doesn't answer) see the default message instead: **Your week is already planned** / Five dinners and one grocery list, sorted every week.

Nothing changes in the app itself. It's configured through Apple's Retention Messaging API and one endpoint on the website: `POST https://weekwell.pro/api/apple/retention` (`api/apple/retention.mjs`). The endpoint checks that each request is signed by Apple (the certificate chain must end in Apple Root CA G3), then answers with the offer, signed with our In-App Purchase key. It stores nothing.

Retention messages show on iOS 15.1 or later.

## What the account holder sets up

1. **Get API access.** The Retention Messaging API is invite-only. The Account Holder requests access on the API's page on developer.apple.com. Until Apple grants it, the setup script's calls return 404.
2. **Create the offer** in App Store Connect. Go to the app, then Subscriptions → Weekwell Monthly (`com.belevate.weekwell.monthly`) → Promotional Offers → Create:
   - Reference name: `Stay – half-price month`
   - Offer identifier: `stay_half_month`
   - Type: **Pay as you go**, $4.99, for **1 month**, in all territories you sell in

   The price in the message text is fixed ($4.99, then $9.99). If you change the offer or the monthly price, change `MESSAGES.offer` in `api/_lib/retention.mjs` too, and upload the new message under a new id.
3. **Create an In-App Purchase key.** Go to Users and Access → Integrations → In-App Purchase → Generate. Download the `.p8` file (you can only download it once) and note the Key ID and the Issuer ID. If you already made one for RevenueCat, you can reuse it.
4. **Set these Vercel environment variables** on the weekwell.pro project (Production), then redeploy:

   | Name | Value |
   |---|---|
   | `APPLE_APP_APPLE_ID` | App Store Connect → App Information → Apple ID (digits) |
   | `APPLE_IAP_KEY_ID` | Key ID from step 3 |
   | `APPLE_IAP_ISSUER_ID` | Issuer ID from step 3 |
   | `APPLE_IAP_PRIVATE_KEY` | Contents of the `.p8` file, including the BEGIN/END lines |
   | `RETENTION_OFFER_ID` | `stay_half_month` |

   Until all five are set, the endpoint answers 503 and Apple shows the default message.

## Turn it on: sandbox first, then production

Run these on your own computer, from the repo, with the same key in your shell:

```bash
export APPLE_IAP_KEY_ID=... APPLE_IAP_ISSUER_ID=...
export APPLE_IAP_PRIVATE_KEY="$(cat ~/Downloads/SubscriptionKey_XXXXXXXXXX.p8)"

# Sandbox
node scripts/retention-setup.mjs sandbox messages
node scripts/retention-setup.mjs sandbox defaults
node scripts/retention-setup.mjs sandbox url https://weekwell.pro/api/apple/retention
# Subscribe with a sandbox account on a TestFlight build, then use that subscription's
# original transaction id (RevenueCat → customer → transactions):
node scripts/retention-setup.mjs sandbox perf-test 2000000XXXXXXXXX
node scripts/retention-setup.mjs sandbox perf-result <requestId from the line above>   # must pass

# Production (messages start PENDING; Apple reviews them)
node scripts/retention-setup.mjs production messages
node scripts/retention-setup.mjs production status        # wait until both are APPROVED
node scripts/retention-setup.mjs production defaults
node scripts/retention-setup.mjs production url https://weekwell.pro/api/apple/retention
```

To test on a device, sign in with a sandbox account, subscribe to Monthly, then open Settings → your name → Subscriptions → Weekwell → Cancel Subscription. You should see the offer.

## Known limit

Nothing stops someone from cancelling every month to get the half-price month again: the endpoint has no database to remember who already had it. If that starts to cost real money, add a small store (for example Vercel KV) keyed by the original transaction id, and send the default message to anyone who got the offer in the last 12 months.

## Turn it off

Delete `RETENTION_OFFER_ID` in Vercel and redeploy. The endpoint then answers 503, and Apple falls back to the default message (no offer).
