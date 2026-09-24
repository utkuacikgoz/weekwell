# Weekwell

Plan my five dinners, plus practical work lunches, around the store I use, my budget, and my time.

This repository holds the **mobile workstream**: the app, its shared domain package, and the pilot API. The TikTok carousel workstream is a separate program (D-009) and has nothing here.

## Status (2026-09-24, after the overnight build)

The app is built end to end, **but nothing is approved and it is not ready to submit.**

- **Design:** every screen was corrected after the 2026-09-24 design audit and is `design_pending`. Start with [review pack v3](apps/mobile/docs/review/v3/README.md). The food-art direction is waiting on a decision: see [food/README](apps/mobile/docs/review/v3/food/README.md).
- **Decisions:** D-019 to D-037 in [the decision log](docs/05-decision-log.md) are Proposed, and so is every item in [the overnight run log](docs/06-autonomous-run-log.md).
- **Release:** go/no-go and the remaining blockers are in [the release evidence](apps/mobile/docs/qa/release-evidence-overnight.md) and [the App Store pack](apps/mobile/docs/release/app-store-pack.md).

| Area | State |
|---|---|
| Setup (4 steps), week, meal, cooking mode, grocery list, swap/undo, preferences, paywall, read-only after trial, dark mode | built, `design_pending` |
| Pricing | sample prices, clearly labelled (D-011 open) |
| Accounts and sync | built into the pilot API; the app uses it only when built with `EXPO_PUBLIC_API_URL` |
| Purchases | mock (D-014 open) |
| TestFlight | workflow ready but disabled; bundle id and App Store Connect app set, EAS link and credentials still needed (D-030) |

## Source of truth

| Doc | What it governs |
|---|---|
| [docs/00-master-brief.md](docs/00-master-brief.md) | Shared product facts. Wins on conflicts. |
| [docs/01-mobile-app-brief.md](docs/01-mobile-app-brief.md) | Mobile build brief |
| [docs/03-agent-task-packets.md](docs/03-agent-task-packets.md) | Agent assignments |
| [docs/04-qa-red-team-checklist.md](docs/04-qa-red-team-checklist.md) | QA and red-team gates |
| [docs/05-decision-log.md](docs/05-decision-log.md) | Decisions |
| [docs/06-autonomous-run-log.md](docs/06-autonomous-run-log.md) | What the overnight run decided without the product owner |
| [apps/mobile/docs/review/README.md](apps/mobile/docs/review/README.md) | Design review packs (v3 current) |
| [apps/mobile/docs/sensory.md](apps/mobile/docs/sensory.md) | Motion, sound, haptics |
| [apps/mobile/docs/release/](apps/mobile/docs/release/) | App Store pack, privacy policy draft, draft store screenshots |
| [apps/api/README.md](apps/api/README.md) | API endpoints and security notes |

## Layout

```
packages/domain/   @weekwell/domain: canonical schemas, recipe/price fixtures, planner, pricing,
                   swaps, entitlement + access policy, analytics taxonomy, model-output contract;
                   /server: webhook verification, owner-scoped store, jobs, log redaction
apps/mobile/       Expo SDK 57 + Expo Router app (on-device by default; API-connected when configured)
apps/api/          Hono on Node 22: auth, plans, jobs, prices, entitlements, webhooks, export, deletion
```

## Commands

Node 22+.

```bash
npm install
npm run check                       # typecheck + lint + unit tests (domain, API, app checks)
npm run e2e                         # build both web variants and run Playwright (local + API-connected)
cd apps/mobile && npx expo start    # run the app on-device (no backend needed)
cd apps/api && npm run dev          # run the API (dev sign-in codes returned in responses)
EXPO_PUBLIC_API_URL=http://localhost:8787 npx expo start   # app connected to a local API
```

Review and QA switches (web preview only): `?prices=sample|fresh|stale|expired|verified|partial|unavailable|bad_data`, `?generation=ok|invalid_output|timeout`, `?restore=ok|error`, `?entitlement=none|trial|active|expired`, `?today=mon…sun`, `?priceDelay=ms`, `?fontScale=1.25`.

Review captures: `REVIEW=1 npx playwright test e2e/review-*.spec.ts --project=local` in `apps/mobile`.

## Handoff

- **Product owner:** review the six core screens and the state families in the review index, then accept, change, or reject D-019 to D-033 and R-1 to R-19.
- **Before a friends pilot:** decide D-011 (prices), D-013 (auth and email provider; host the API), D-014 (purchases), D-030 (EAS credentials and TestFlight); do a native device pass (VoiceOver, Dynamic Type, haptics, reduced motion).
