# Release evidence: mobile M0 + M1 (first slice, fixture data)

```md
Release: M0 contracts/fixtures + M1 usable loop (fixture build, not a pilot release)
Workstream: mobile
Commit/build: see git log on branch claude/inspiring-wozniak-1n3elp (no iOS build yet)
Reviewer: mobile agent (self-check). QA lead and product owner review still required.
Date: 2026-09-23

P0/P1 findings: none open in the fixture build. See "Blocking before pilot" for work that is not done.
Norman/usability score: 19/22 by agent self-assessment (below). Needs QA-lead scoring.
Accessibility result: PASS on the web build for labels, 44 px targets, clipping at 320–430 px and 100–150% text, and contrast. Native VoiceOver/TalkBack NOT yet tested.
Security result: contracts and tests in place (authz, webhook replay, redaction, rate limits); no backend exists yet.
Data/claim result: PASS. No total without full price coverage; every price and protein value labelled.
Performance/cost result: planner worst case ≈ 0.5 s in Node (batch, no exclusions); model cost $0 (fixture planner, no model calls).
Artifacts: apps/mobile/docs/review/screens/ (50 captures), test output below.
Known limitations: see bottom.
Decision: NO-GO for pilot (auth, backend, device testing, and design approval outstanding). GO for product-owner design review.
Follow-up owner/date: product owner (design review, D-019 to D-030); mobile A4–A8 agents.
```

## Commands run

| Command | Result |
|---|---|
| `npm run typecheck` (domain + mobile app + mobile tests) | PASS, 0 errors |
| `npm run lint` (`expo lint`) | PASS, 0 errors, 0 warnings |
| `packages/domain: vitest run` | PASS, 90 tests in 7 files |
| `apps/mobile: node --test test/*.test.ts` | PASS, 16 tests (contrast, forbidden copy, secret scan, no server imports) |
| `apps/mobile: playwright test` (web export) | PASS, 66 tests (19 journey/state + 47 visual/a11y across 4 widths × 3 text sizes) |

## Mobile product gate

| Check | Result | Evidence |
|---|---|---|
| Product-owner approval for every screen/state | **FAIL (pending)** | review/README.md: all `design_pending` |
| Choose Trader Joe’s or Walmart; no other retailers | PASS | e2e journey; `RetailerSchema` tests |
| Budget has a visible value and bounds | PASS | e2e "budget input is bounded" |
| Goal, time, household, exclusions captured | PASS | e2e review test |
| Review reflects every preference | PASS | e2e review test |
| Generation loading / timeout / retry / failure states | PASS | e2e states; captures 10, 21, 22 |
| "Partial" generation state | N/A | the fixture planner is all-or-nothing; partial prices are covered separately |
| Five dinners + work lunches | PASS | planner tests; e2e |
| No excluded allergen in a plan | PASS | exhaustive preset × time test; model-output tests |
| Over-budget total explained | PASS | e2e "over budget is stated"; capture 30 |
| Plan shows store, budget, time, servings, price status | PASS | capture 11 |
| Meal detail: quantities, steps, time, servings, protein est., allergens | PASS | capture 12 |
| Swap changes only one meal and updates groceries | PASS | repair tests; e2e swap + undo |
| Grocery consolidates duplicates | PASS | grocery tests |
| Check / uncheck, persists across reload | PASS | e2e |
| Items map back to meals | PASS | e2e |
| Stale / unavailable prices labelled | PASS | e2e; captures 25–27 |
| Trial without coercion | PASS | e2e paywall; capture 17–18 |
| Restore has a recoverable state | PASS | e2e restore; capture 32 |

## Norman self-assessment (0–2)

Discoverability 2 · Feedback 2 · Conceptual model 2 · Affordance 2 · Mapping 2 · Constraints 2 · Error prevention 2 · Recognition 1 (settings summary is one muted line) · Status 2 · Undo/recovery 1 (swap and checks undo; applying a preference change has a preview but no one-tap undo) · Consistency 1 (repair buttons compete with the primary) = **19/22**, no zeros.

## Accessibility

| Check | Result | Evidence |
|---|---|---|
| Every control labelled | PASS (web) | visual.spec "controls without a label" |
| Focus / reading order | Not verified | needs VoiceOver/TalkBack pass on device |
| 125% / 150% text usable | PASS (web simulation) | 320@150 captures |
| Contrast AA | PASS | test/contrast.test.ts (lowest text pair 5.11:1, warning on warning tint; control outlines 3.42:1) |
| Not color-only | PASS | truth labels are text; checks use fill + tick + line-through + aria-checked |
| 44 × 44 targets | PASS (web) | visual.spec |
| Reduced motion | Implemented, not device-tested | `useReducedMotion`, stack animation off |
| Keyboard doesn't cover the primary action | Implemented (KeyboardAvoidingView), not device-tested | — |

## Mobile security red team

| Check | Result | Evidence |
|---|---|---|
| User A can't read B's data | PASS (contract) | server.test "owner-scoped storage"; no backend yet |
| No privileged provider credentials in client | PASS | none exist; test forbids server imports in the client |
| No secrets in bundle, source, fixtures | PASS | copy.test secret scan; `.gitignore` covers keys/profiles |
| Generation auth + rate limits | PASS (contract) | server.test jobs; endpoint not built |
| Duplicate requests idempotent | PASS | 20 concurrent → 1 generation |
| Malformed model output rejected | PASS | model-output tests; e2e failure state |
| Prompt injection in ingredient/retailer text | PASS | sanitizing + flagging tests; untrusted text never becomes an instruction |
| Allergy data absent from analytics and logs | PASS | analytics + redaction tests |
| Account deletion | PASS (local) | e2e delete; `deleteAllFor` test |
| Webhook invalid signature / replay | PASS | server.test (found and fixed a replay-store clock bug) |
| Trial can't be extended by client clock | PASS | entitlement tests |
| Log redaction | PASS | redaction test |

## Price and nutrition red team

All PASS: deterministic totals, explicit package size and USD, last-checked shown, estimates never rendered as verified, missing data fails closed, protein labelled estimated, no medical/weight-loss claims (source + rendered-text scans), and substitutions recompute prices and allergens.

## Adversarial cases covered

Injection in product name ✓ · fake allergy exemption in steps ✓ · extra fields / missing quantities ✓ · zero / negative / extreme price ✓ · 10× time limit ✓ · duplicate ingredients in different units ✓ · 20 concurrent retries ✓ · replayed webhook ✓ · client trial dates ✓ · $40 budget for 3–4 people ✓ · stale prices ✓ · every exclusion selected ✓ · large text ✓ · swap after checking groceries ✓. **Not covered:** 70-character meal name (the catalog maximum is 52; wrapping is verified up to that), network loss mid-generation on device, signed asset URL expiry (no assets yet).

## Bugs found and fixed during QA

1. Webhook replay store pruned by wall clock while expiry came from the injected clock, so replays could be accepted (security).
2. Selected/checked state didn't reach web screen readers (`accessibilityState` → `aria-checked`).
3. Budget field pushed the "+" stepper off-screen; exclusion "Add" overflowed at 320 px / 150%.
4. Deep links and reloads bounced to onboarding before stored state loaded.
5. Vibration switch touch target was 40 × 20.
6. Swap confirmation appeared off-screen (no feedback).

## Blocking before a friends pilot (M3)

- Product-owner approval of all screens and sensory states (D-016, D-018).
- D-013 auth, and a backend using `OwnerScopedStore` semantics with database RLS.
- D-011 price source (or explicit acceptance of a sample-price pilot).
- Native device pass: VoiceOver, TalkBack, Dynamic Type, haptics, reduced motion, keyboard.
- A8: bundle id, Apple team, EAS project, and secrets, before the daily TestFlight workflow can run (see `.github/workflows/testflight-daily.yml`).

## Known limitations

- Web-rendered captures, not iOS. Fonts and native controls differ.
- The planner runs on-device (≈0.5 s worst case in Node; slower on low-end phones). It should move server-side with A4.
- Recipes and quantities are fixture content without a food-safety/editorial review.
- Analytics are buffered on-device only (D-024).
- `npm audit --omit=dev`: 0 high/critical; 13 moderate entries from two root advisories, both transitive through Expo SDK 57 with no non-breaking fix: `uuid` (via `xcode`, build tooling only, not in the app bundle) and `decode-uri-component` (via expo-router → `query-string`, **in the app bundle**: a crafted deep link could hang URL parsing on the device; low impact, track for the next Expo patch). CI fails on high or above.
