# Weekwell agent task packets

## How to use this file

These are bounded assignments for multiple Claude Code agents. The mobile and TikTok sections are separate programs. Do not combine them into one team, branch, deployment, credential set, or release gate.

Every agent starts by reading:

1. `00-master-brief.md`;
2. the brief for its own workstream;
3. the current repository README and status;
4. the latest `05-decision-log.md`.

Every agent must return a written handoff with files changed, tests, screenshots/artifacts, assumptions, risks, and next action.

## Shared agent contract

Before implementation, post:

```md
Objective:
Workstream: mobile | tiktok
Owned files/directories:
Dependencies:
Assumptions:
Acceptance checks:
Stop conditions:
```

After implementation, post:

```md
Completed:
Files changed:
Commands/tests run:
Artifacts:
Contract changes:
Known risks:
Handoff:
```

Agents may not:

- change another agent’s owned files without coordination;
- add credentials to source, logs, images, or fixtures;
- silently change product decisions;
- bypass a failed security or QA gate;
- merge directly to production;
- expand deferred scope because the implementation is convenient.

## Workstream A: mobile app

### Mobile A0 — product and UX contract

**Objective:** Turn the mobile brief into an implementable screen and state contract.

**Owns:** `mobile/docs/`, UX maps, screen inventory, copy, state diagrams, acceptance criteria.

**Must define:**

- onboarding states;
- loading, empty, stale, partial, timeout, and error states;
- meal-detail and meal-swap behavior;
- grocery-item state transitions;
- trial/paywall and restore states;
- accessibility labels;
- copy glossary and forbidden phrases.

**Do not own:** mobile components, retailer adapters, payment code, or TikTok files.

**Acceptance:** another agent can implement each screen without inventing behavior.

### Mobile A1 — shared domain schemas and fixtures

**Objective:** Create canonical typed schemas and deterministic fixtures.

**Owns:** `packages/domain/` or the repository’s equivalent shared types and fixture files.

**Must include:**

- user preferences;
- meals and ingredient quantities;
- price quotes and estimate metadata;
- grocery items and meal links;
- generation job states;
- entitlement states;
- analytics event names;
- fixture users for valid, allergy-conflict, stale-price, and failed-generation cases.

**Acceptance:** invalid model output, missing price metadata, unsupported retailer, and cross-user data are rejected by tests.

### Mobile A2 — design system and UI primitives

**Objective:** Replace generic AI-card styling with a calm, accessible mobile system.

**Owns:** design tokens, typography, spacing, buttons, fields, rows, sheets, banners, status labels, and visual snapshots.

**Must prove:**

- 320/375/390/430px layouts;
- dynamic type at 125% and 150%;
- touch targets at least 44px;
- keyboard and screen-reader labels;
- no clipped text or unreachable primary actions;
- use of hierarchy rather than nested cards.

**Acceptance:** design review passes the Norman rubric and visual snapshots show intentional spacing, clear affordances, and restrained decoration.

**Approval gate:** every screen and material interaction state must be shown to the product owner for explicit approval. Do not mark a screen final based only on an internal design-agent review.

**Sensory requirements:** define motion tokens, duration/easing rules, reduced-motion variants, sound inventory, mute behavior, haptic vocabulary, cooldowns, and a product-owner approval matrix. No decorative motion, autoplay audio, or unexplained vibration.

### Mobile A3 — onboarding and plan experience

**Objective:** Implement the first useful loop: onboarding → plan → meal detail → grocery list.

**Owns:** onboarding screens, plan screen, meal detail, grocery checklist, navigation, and local state.

**Must support:**

- Trader Joe’s and Walmart only;
- budget, goal, time, household, and exclusions;
- five dinners plus work lunches;
- meal open, swap, and undo;
- grocery check and undo;
- visible price kind and timestamp;
- fixture-backed loading and failure states.

**Acceptance:** a new user completes the loop in under two minutes with no hidden required knowledge.

**Approval gate:** provide product-owner review captures for onboarding, plan, meal detail, meal swap, grocery list, loading, error, stale-price, and personalization states before handoff.

**Sensory handoff:** include motion recordings or timing notes, sound triggers, haptic triggers, reduced-motion behavior, mute behavior, and device fallbacks for every state.

### Mobile A4 — plan-generation service

**Objective:** Implement safe, bounded generation orchestration.

**Owns:** generation job API, prompts, schema validation, retries, idempotency, cost limits, and plan repair.

**Must enforce:**

- structured output;
- bounded retries and timeouts;
- deterministic budget arithmetic;
- allergy/exclusion checks;
- ingredient reuse validation;
- trace IDs without personal data;
- no invented price values.

**Acceptance:** malformed output, prompt injection, timeout, and duplicate-job tests pass.

### Mobile A5 — retailer and price adapters

**Objective:** Provide a terms-compliant price interface for Trader Joe’s and Walmart.

**Owns:** provider interface, adapters, caching, timestamps, confidence, fallback UI data, and provider tests.

**Must not:** scrape a retailer in violation of terms, expose provider credentials, or call estimates “live” without evidence.

**Acceptance:** verified, estimated, stale, unavailable, and conflicting price states are distinguishable in the API and UI.

### Mobile A6 — auth, subscriptions, and security

**Objective:** Secure user data and trial/entitlement behavior.

**Owns:** auth, session handling, database authorization, trial state, purchase restoration, webhook verification, rate limits, deletion, and audit logging.

**Must test:**

- unauthorized plan access;
- user A attempting to access user B;
- webhook replay and invalid signature;
- trial abuse;
- generation flooding;
- log redaction;
- account deletion.

**Acceptance:** no P0/P1 security findings remain open for pilot.

### Mobile A7 — analytics and release QA

**Objective:** Prove the app is usable, observable, and releasable.

**Owns:** analytics validation, end-to-end tests, accessibility checks, performance budget, device matrix, smoke tests, and release report.

**Acceptance:** output includes test results, screenshots, known limitations, and explicit go/no-go recommendation.

**Sensory QA:** test reduced motion, sound off, system volume changes, mute settings, haptic settings, unsupported haptics, interrupted transitions, background/foreground changes, and battery/performance impact.

### Mobile A8 — daily TestFlight and App Store release engineering

**Objective:** Automate a trustworthy daily iOS build and maintain submission readiness.

**Owns:** CI/CD, build numbers, signing integration, TestFlight upload, build notifications, release notes, crash/launch smoke checks, rollback, and the App Store submission pack.

**Daily build requirements:**

- run on the protected release branch or approved integration branch;
- install dependencies from the lockfile;
- run typecheck, lint, unit tests, integration tests, and accessibility smoke checks;
- build an iOS artifact with a monotonically increasing build number;
- upload to TestFlight automatically;
- attach changelog, commit SHA, test summary, and known issues;
- notify the team on success or failure;
- never upload a build with unresolved P0/P1 findings.

**Signing and secret requirements:**

- use managed signing or a secret manager;
- keep certificates, provisioning profiles, and App Store Connect keys out of Git and logs;
- use least-privilege API keys and rotate them;
- document how to revoke a compromised credential;
- do not print environment variables in CI output.

**App Store submission pack:**

- app name, subtitle, description, keywords, category, and support URL;
- privacy policy URL and current privacy/data disclosures;
- app icon and required screenshot sizes;
- age rating and content questionnaire;
- subscription products, trial terms, pricing, restore behavior, and review notes;
- permission rationale strings;
- account deletion and data-export behavior;
- demo credentials or review instructions when required;
- export-compliance answers;
- accessibility and crash-smoke evidence;
- current Apple policy verification record.

**Acceptance:** one daily TestFlight build can be traced to a commit, test report, changelog, and reviewer-visible build. App Store submission is blocked until the product owner approves every design screen and the QA/security gates pass.

## Workstream B: TikTok carousel engine

This workstream is independent from the mobile app. It does not use mobile credentials or deploy to the mobile backend.

### TikTok B0 — editorial strategy and experiment design

**Objective:** Turn the content brief into a seven-post weekly experiment.

**Owns:** calendar, angle mix, hooks, captions, CTAs, experiment variables, comment taxonomy, and learning report template.

**Must enforce:**

- first CTA is save/share;
- no app-download CTA without explicit milestone approval;
- at least three comparable posts before declaring an angle winner;
- no fake engagement bait;
- clear estimate language for prices.

**Acceptance:** the week has a hypothesis, controlled variables, and a metric plan.

### TikTok B1 — content data and validation

**Objective:** Create validated structured meal/carousel briefs.

**Owns:** content schemas, recipe normalization, ingredient reuse, allergen checks, protein/time estimates, price arithmetic, claims, and source metadata.

**Must reject:** missing quantities, unsupported nutrition claims, duplicate shopping items, stale prices without labels, or retailer claims without source.

**Acceptance:** a brief can be rendered without an agent guessing missing facts.

### TikTok B2 — image direction and asset safety

**Objective:** Generate coherent food imagery with GPT Image API and safe asset handling.

**Owns:** image prompts, seeds/variants, crop directions, rejected-image reasons, asset storage, and metadata cleanup.

**Must reject:** pseudo-text, logos, watermarks, distorted utensils, impossible food, private data, copied creator likeness, or misleading packaging.

**Acceptance:** every approved image has a prompt, source/generation metadata, safe crop, and alt text.

### TikTok B3 — deterministic slide renderer

**Objective:** Render accurate, legible 1080×1350 carousels from structured briefs.

**Owns:** templates, typography, slide sequencing, layout, price labels, CTA slides, alt text, overflow checks, and exports.

**Must enforce:**

- code-rendered text and numbers;
- safe margins;
- readable phone-size type;
- consistent slide count;
- no nested-card visual clutter;
- deterministic rerender of one affected slide.

**Acceptance:** rendered files pass pixel/dimension checks and human phone-size review.

### TikTok B4 — export, scheduling, and analytics

**Objective:** Produce reviewable publishing packages and a weekly learning report.

**Owns:** PNG bundle, captions, alt text, hashtags, post IDs, schedule metadata, metric ingestion, experiment table, and cost report.

**Must not:** automate deceptive engagement or publish without approval state.

**Acceptance:** each post can be traced from published asset back to source brief, prices, image metadata, and approval.

### TikTok B5 — brand safety and security review

**Objective:** Red-team each batch before publication.

**Owns:** secret scan, prompt-injection test, copyright/likeness check, claims check, food-safety check, disclosure check, and final approval gate.

**Acceptance:** no unresolved P0/P1 issue and every rejection has a written reason.

## Integration and handoff rules

### What may cross workstreams

- approved product promise;
- approved retailer names;
- approved pricing tiers;
- approved terminology;
- approved meal concepts or recipes;
- aggregate, privacy-safe performance insights.

### What must never cross directly

- mobile auth tokens;
- user profiles, allergies, or private plans;
- payment data;
- retailer credentials;
- TikTok credentials;
- scheduler tokens;
- unapproved source assets;
- private analytics rows.

Use exported versioned artifacts or aggregate reports for collaboration.

## Merge order

Mobile: A0 → A1 → A2 → A3/A4/A5 → A6 → A7 → A8.

TikTok: B0 → B1/B2 → B3 → B4 → B5.

The tracks may run in parallel. Do not block a TikTok batch on mobile implementation or block mobile testing on TikTok output.
