# Weekwell

Plan my five dinners, plus practical work lunches, around the store I use, my budget, and my time.

This repository holds the **mobile workstream**. The TikTok carousel workstream is a separate program (D-009) and has nothing in this repository.

## Source of truth

| Doc | What it governs |
|---|---|
| [docs/00-master-brief.md](docs/00-master-brief.md) | Shared product facts. Wins on conflicts. |
| [docs/01-mobile-app-brief.md](docs/01-mobile-app-brief.md) | Mobile build brief |
| [docs/03-agent-task-packets.md](docs/03-agent-task-packets.md) | Agent assignments A0–A8 (mobile), B0–B5 (TikTok) |
| [docs/04-qa-red-team-checklist.md](docs/04-qa-red-team-checklist.md) | QA and red-team gates |
| [docs/05-decision-log.md](docs/05-decision-log.md) | Decisions. **D-019 to D-030 are Proposed and need product-owner review.** |
| [apps/mobile/docs/ux-contract.md](apps/mobile/docs/ux-contract.md) | Screen/state contract, copy glossary, a11y labels (A0) |
| [apps/mobile/docs/sensory.md](apps/mobile/docs/sensory.md) | Motion, sound, and haptics spec and approval matrix |
| [apps/mobile/docs/review/README.md](apps/mobile/docs/review/README.md) | Product-owner design review pack (all `design_pending`) |
| [apps/mobile/docs/qa/m1-release-evidence.md](apps/mobile/docs/qa/m1-release-evidence.md) | M0/M1 QA evidence and go/no-go |

`docs/02-*` (the TikTok brief) belongs to the TikTok workstream and is not stored here.

## Layout

```
packages/domain/          @weekwell/domain: the one shared schema package (A1)
  src/schemas.ts          canonical Zod schemas: preferences, meals, prices, plan, jobs
  src/catalog/            fixture ingredients (protein per unit, allergens) and 22 recipes
  src/fixtures/           sample prices (labelled, never "live") and fixture users
  src/planner.ts          deterministic fixture plan generation, feasibility checks
  src/pricing.ts          RetailerProvider interface, fixture provider, freshness, fail-closed totals
  src/grocery.ts          scaling, consolidation, meal↔item links, diffs, check reconciliation
  src/repair.ts           swap / cheaper / more protein / faster, preference-change previews
  src/model-output.ts     strict model-output contract, versioned prompt, bounded retries
  src/entitlement.ts      trial/subscription state from server time only
  src/analytics.ts        event taxonomy with strict, PII-free payloads
  src/server/             server-only: webhook verification, owner-scoped storage, jobs, redaction
apps/mobile/              Expo SDK 57 + Expo Router app
  src/app/                screens (onboarding, generating, week, meal, grocery, preferences, trial)
  src/components/         UI primitives (no nested cards; one surface)
  src/theme/              tokens: color, 4px/8px spacing, type, motion
  e2e/                    Playwright journeys, states, and visual/a11y matrix on the web build
  test/                   contrast, forbidden-copy, secret, and import-boundary checks
```

## Commands

Node 22+.

```bash
npm install
npm run check            # typecheck + lint + unit tests (domain + mobile)
npm run e2e              # export the web build and run Playwright
cd apps/mobile && npx expo start    # run the app (dev build or Expo Go)
```

Scenario switches for QA and review captures (web preview URL or dev builds only):
`?prices=sample|fresh|stale|expired|verified|partial|unavailable|bad_data`, `?generation=ok|invalid_output|timeout`, `?restore=ok|error`, `?fontScale=1.25`.

Review captures: `cd apps/mobile && CAPTURE=1 npx playwright test e2e/visual.spec.ts`.

## Status (2026-09-23)

M0 (contracts and fixtures) and M1 (usable loop on fixture data) are implemented: onboarding, the week, meal detail with swap/repair and undo, the consolidated grocery list with check/undo, preference edits with previews, and the trial/paywall with a mock entitlement.

- **Not approved.** Every screen is `design_pending` until the product owner reviews the pack.
- **Not a pilot build.** No auth or backend (D-013, D-025), no real prices (D-011, D-021), not tested on a native device, and the TestFlight workflow is disabled until Apple/EAS setup is done (D-030).

## Handoff (agent protocol)

- **Product owner:** review `apps/mobile/docs/review/README.md` and decide D-019 to D-030 (D-026, post-trial access, blocks paywall copy beyond the free week).
- **A4 (generation service):** wrap `validateModelPlan` + `generateWithRetries` + `buildPlanPrompt` behind an authenticated endpoint using `GenerationJobService`. Move the planner server-side.
- **A5 (pricing):** implement a real `RetailerProvider` once D-011 is decided. The UI copy follows quote metadata, so no screen changes are needed.
- **A6 (security):** pick an auth provider (D-013). Map `OwnerScopedStore` semantics to database RLS. Wire `verifyWebhook` to the subscription provider (D-014).
- **A7/A8 (QA/release):** native VoiceOver/TalkBack/Dynamic Type/haptics pass; set the bundle id and EAS credentials, then enable `.github/workflows/testflight-daily.yml`.
