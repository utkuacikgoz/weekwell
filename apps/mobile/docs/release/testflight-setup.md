# Automated TestFlight: one-time setup (D-041)

After this setup, `.github/workflows/testflight-daily.yml` builds the app on GitHub's Mac runner with Xcode and uploads it to TestFlight. It runs every weekday at 10:00 UTC when there are new commits, and whenever you run it by hand. **You don't need an Expo account, a Mac, or the command line.** Every step is in a browser.

These identifiers are already set: bundle id `com.belevate.weekwell`, Apple team `9D78WTZAD8`, App Store Connect app `6815542789`.

## 1. Create an App Store Connect API key (5 minutes)

1. Open [App Store Connect](https://appstoreconnect.apple.com) and go to **Users and Access → Integrations → App Store Connect API**.
2. If asked, click **Request Access**, then accept.
3. Under **Team Keys**, click **+** (Generate API Key).
   - **Name:** `GitHub TestFlight`
   - **Access:** **Admin**. Xcode needs this to create the signing certificate for you. A lower role usually fails at the signing step.
4. Click **Generate**, then **Download API Key**. You get a file named `AuthKey_XXXXXXXXXX.p8`. **You can download it only once**, so keep it somewhere safe.
5. Note two values on the same page:
   - **Key ID**: in the key's row, for example `2X9R4HXF34`.
   - **Issuer ID**: above the table, a long id with dashes.

## 2. Give the key to GitHub

In GitHub, open the **weekwell** repo, then **Settings → Secrets and variables → Actions**.

On the **Secrets** tab, click **New repository secret** three times:

| Name | Value |
|---|---|
| `ASC_API_KEY_P8` | The whole contents of the `.p8` file. Open it in a text editor and copy everything, including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines. |
| `ASC_KEY_ID` | The Key ID. |
| `ASC_ISSUER_ID` | The Issuer ID. |

Optional:
- Secret `REVENUECAT_IOS_KEY`: RevenueCat's public iOS key (starts `appl_`, see `revenuecat-setup.md`). Without it, the build uses the test store and nobody is charged.
- Variable `SITE_URL`: the address of the privacy and terms site. The paywall links to it.

## 3. Switch it on and run it

1. On the **Variables** tab, click **New repository variable**: name `TESTFLIGHT_ENABLED`, value `true`.
2. Go to **Actions → TestFlight daily → Run workflow → Run workflow**.
3. A build takes about 20–40 minutes. When the run is green, Apple processes the build for another 5–30 minutes, and it appears in App Store Connect under **TestFlight**.

## 4. Install it on your phone

1. In App Store Connect, open **TestFlight → Internal Testing**, click **+**, create a group (for example "Me"), and add yourself.
2. Install the **TestFlight** app from the App Store on your iPhone and sign in with the same Apple ID. The build appears there.
3. The first build may show **Missing Compliance**. The app already declares no special encryption (`usesNonExemptEncryption: false`), so this should clear by itself. If not, answer "None of the algorithms mentioned above".

## If the run fails

Send me the link to the failed run. I can read its log and fix the workflow. The likely first-run issues:
- **A signing error** such as "No signing certificate" or "requires a development team": check that the key's access is **Admin**.
- **"The bundle version must be higher"**: an earlier upload used a higher build number. I'll add an offset.

## Notes

- **Cost:** GitHub bills Mac minutes at 10× the Linux rate on private repos. The free plan includes 2,000 minutes a month, so a 30-minute build uses about 300 of them. The workflow skips days with no new commits to save minutes. To build only by hand, delete the `schedule:` lines.
- **External testers** (friends outside your team) need Beta App Review, test information, a feedback email and a privacy policy URL (see `site/`).
- **Expo account:** not needed. `eas.json` is kept only in case you ever want Expo's build service instead.
- **Unverified:** the workflow was written without a Mac or an Apple account to test against. The first run is the real test.
