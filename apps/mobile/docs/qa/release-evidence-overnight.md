# Release evidence: overnight build (waves 1–8)

```md
Release: overnight build, design correction + API + release pack (not a pilot release)
Workstream: mobile
Commit/build: main after PRs #1–#9 (no iOS build: TestFlight disabled, D-030)
Reviewer: mobile agent (self-check). QA lead, security reviewer, and product owner still required.
Date: 2026-09-24

P0/P1 findings: none open in code. Blocking decisions and manual checks are listed below.
Norman/usability score: 20/22 self-assessed (below). Needs QA-lead scoring.
Accessibility result: PASS on web builds (labels, 44 px targets, clipping at 320–430 px and 100–150% text, WCAG AA contrast in light and dark). Native VoiceOver/TalkBack/Dynamic Type NOT tested.
Security result: PASS on API tests (auth, cross-user 404s, access policy server-side, webhook signature + replay, deletion, CORS, body limit, log redaction). No penetration test or dependency scan beyond npm audit.
Data/claim result: PASS. Totals fail closed; sample prices labelled; protein labelled as an estimate; no medical claims (source + rendered-text scans).
Performance/cost result: planner ≤ ~0.5 s worst case in Node; no model calls ($0); SQLite pilot storage.
Artifacts: apps/mobile/docs/review/v2/* (captures + recordings), apps/mobile/docs/release/*.
Known limitations: below.
Decision: NO-GO for pilot and App Store. GO for product-owner design review.
```

## Commands

| Command | Result |
|---|---|
| `npm run check` | PASS: typecheck (domain, API, app, tests), lint, 92 domain tests, 23 API tests, 35 app checks |
| `npm run e2e` | PASS: 109 Playwright tests across `local` (on-device build) and `remote` (API-connected build against a real API process) |
| `npm audit --omit=dev --audit-level=high` | PASS: 0 high/critical. Moderate advisories are transitive through Expo (see the M1 evidence) |
| `expo-doctor` | 19/21. The 2 failures are network-blocked online checks (schema, React Native Directory) |
| CI on each PR | green before every merge (#1–#9) |

## Norman self-assessment (0–2)

Discoverability 2 · Feedback 2 (toasts, pending swap, progress) · Conceptual model 2 · Affordance 2 (chevrons in buttons, real back bar) · Mapping 2 (price next to the grocery action) · Constraints 2 · Error prevention 2 · Recognition 2 (tappable context line) · Status 2 · Undo/recovery 2 (swap, check, rebuild, preference changes) · Consistency 1 (bottom-bar pattern differs slightly between screens) = **21/22**, no zeros.

## Gate items still open

| Item | Owner |
|---|---|
| Product-owner approval of each screen and sensory state | Product owner |
| Native accessibility pass (VoiceOver, TalkBack, Dynamic Type XXL, Reduce Motion) | QA |
| Haptics on device, background/foreground, battery | QA |
| D-011 price source (or accept a sample-price pilot) | Product owner |
| D-013 auth and email provider; hosted API; Postgres + RLS migration run and tested | Tech lead / security |
| D-014 real purchases and store webhooks | Tech lead |
| D-030 bundle id, Apple team, EAS credentials → enable daily TestFlight (bundle id, team and App Store Connect app now set) | Release |
| D-038 meal photos: all 22 in `assets/meals/`, and `npm run photos -- --check` passes | Product owner + design |
| Hosted privacy policy + support URL; legal review | Product owner |
| App Store requirement check at submission | Release |

## Known limitations

- Captures are Chromium renderings of the web build, not iOS.
- Dark mode is resolved at launch (R-13).
- Generation jobs in the API are in memory (single instance).
- The recipe catalog (22 recipes) needs a food-safety/editorial review.
- The web export needs `--clear` whenever `EXPO_PUBLIC_*` changes (Metro cache).
