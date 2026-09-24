# RevenueCat setup (D-014)

The code expects the setup below. The names must match exactly, because they're constants in `packages/domain/src/revenuecat.ts`.

## 1. App Store Connect (app 6815542789)

1. **Agreements:** accept the Paid Apps agreement and add bank and tax details. Subscriptions don't work until you do.
2. Go to **Monetization → Subscriptions** and create one subscription group, for example "Weekwell".
3. Create three auto-renewable subscriptions in that group:

   | Product ID | Duration | Price (D-008) |
   |---|---|---|
   | `com.belevate.weekwell.weekly` | 1 week | $4.99 |
   | `com.belevate.weekwell.monthly` | 1 month | $9.99 |
   | `com.belevate.weekwell.yearly` | 1 year | $49.99 |

4. On **each** product, add an **introductory offer** of 1 week free, for new subscribers. This is the "free week". Apple decides who is still eligible, and the paywall reads that.
5. **Keys:** under **Users and Access → Integrations → In-App Purchase**, generate an In-App Purchase key and download the `.p8`. RevenueCat needs it for StoreKit 2.

## 2. RevenueCat dashboard

1. Create a project named Weekwell, then add an **App Store** app with bundle id `com.belevate.weekwell`, and upload the In-App Purchase key (`.p8`, Key ID, Issuer ID).
2. **Products:** import the three products.
3. **Entitlement:** create one with identifier **`pro`** and attach all three products.
4. **Offering:** create **`default`** and mark it current. Add three packages: Weekly → weekly, Monthly → monthly, Annual → yearly.
5. **API keys:**
   - **Public iOS SDK key** (starts `appl_`): on expo.dev, under **Environment variables** (production), add it as `EXPO_PUBLIC_REVENUECAT_IOS_KEY`. It's safe to ship in the app, but keep it out of Git.
   - **Secret API key** (starts `sk_`): this goes on the **API server only**, as `REVENUECAT_SECRET_KEY`. Never put it in the app.
6. **Webhook:** under **Integrations → Webhooks**, add one:
   - **URL:** `https://<your API host>/v1/webhooks/revenuecat`.
   - **Authorization header:** a long random value, for example `Bearer ` followed by 32+ random characters. Set the same exact value on the server as `REVENUECAT_WEBHOOK_AUTH`.
   - Send a **test event**; the server answers 200 and ignores it.

## 3. API server environment

```
STORE_MODE=revenuecat
REVENUECAT_SECRET_KEY=sk_...
REVENUECAT_WEBHOOK_AUTH=Bearer <same value as in RevenueCat>
```

## How it works

- **Buying:** on the phone, "Start free week" and "Subscribe" both buy the chosen package. The App Store applies the free week if you're eligible. Cancelling the Apple sheet shows no error.
- **Accounts:** signed-in users are identified to RevenueCat by their Weekwell user id, so purchases follow the account.
- **Server:** a webhook only tells the server *who* changed. The server then re-reads that customer from RevenueCat's REST API and stores the result. A forged, duplicated or out-of-order event can't grant access, and a RevenueCat outage returns 502 so the webhook is retried. Right after a purchase, the app calls `POST /v1/entitlement/sync` so access is updated immediately.
- **Access rule (D-026):** read-only after the free week without a subscription. The API enforces it.
- **Mock store:** the web preview, the tests, and builds without `EXPO_PUBLIC_REVENUECAT_IOS_KEY` keep the mock store.

## Test before release

Use **Sandbox** Apple IDs (App Store Connect → Users and Access → Sandbox). TestFlight builds use the sandbox automatically, with renewals sped up (a week renews in minutes). Check each of these:
- the free week starts;
- it converts to paid;
- cancelling keeps access until the end of the period;
- after expiry the app is read-only;
- Restore purchases works on a second device;
- cancelling the purchase sheet shows no error.

Not verified here: this container can't reach the RevenueCat or Apple docs. The SDK calls come from the installed package's type definitions (react-native-purchases 10.x). The REST endpoint is `GET /v1/subscribers/{app_user_id}`; confirm it in RevenueCat's API docs before launch.
