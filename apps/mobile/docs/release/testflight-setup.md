# Automated TestFlight: one-time setup (D-017, D-030)

After this setup, `.github/workflows/testflight-daily.yml` builds and uploads a TestFlight build every weekday at 10:00 UTC, and whenever you run it by hand. Every step is in a browser; you don't need a Mac or the CLI.

These identifiers are already set: bundle id `com.belevate.weekwell`, Apple team `9D78WTZAD8`, App Store Connect app `6815542789`.

1. **Create the Expo project.** On expo.dev, sign up, then **Create project** named `weekwell`. Send the **project ID** and **account (owner) name**. They go into `app.json` under `expo.owner` and `expo.extra.eas.projectId`. That's the same result as running `eas init`.
2. **Give GitHub an Expo token.** On expo.dev, go to **Account settings → Robot users**, create a robot with the Developer role, and create a token for it. In GitHub, go to repo **Settings → Secrets and variables → Actions → New repository secret** and save it as `EXPO_TOKEN`.
3. **Create an App Store Connect API key.** In App Store Connect, go to **Users and Access → Integrations → App Store Connect API → +** and choose the App Manager role. Download the `.p8` file (you can only download it once) and note the Key ID and Issuer ID.
4. **Give the key to Expo and GitHub.**
   - On expo.dev, open **project → Credentials → iOS**, add it as the App Store Connect API key, and let EAS manage the distribution certificate and provisioning profile.
   - Add three GitHub secrets: `ASC_API_KEY_P8` (the whole contents of the `.p8` file), `ASC_KEY_ID` and `ASC_ISSUER_ID`.
5. **Set the app's environment variables on expo.dev.** Under **Environment variables** for the production environment, add `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (see `revenuecat-setup.md`), plus `EXPO_PUBLIC_API_URL` once the API is hosted.
6. **Switch it on.** In GitHub, go to **Settings → Secrets and variables → Actions → Variables** and add `TESTFLIGHT_ENABLED` = `true`. Then go to **Actions → TestFlight daily → Run workflow**.
7. **Add testers.** In App Store Connect, go to **TestFlight → Internal Testing**, create a group, and add yourself. Install the TestFlight app on your iPhone.

Notes:
- Each run uses EAS build minutes. To build less often, change the `cron` line in the workflow.
- The workflow was written without access to current Expo docs. If the first run asks for credentials anyway, run `npx eas-cli credentials -p ios` once on any computer, then rerun the workflow.
- External testers (friends outside your team) need Beta App Review, test information, a feedback email and a privacy policy URL (see the site under `site/`).
