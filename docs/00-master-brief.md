# Weekwell AAA master brief

## Purpose

This document governs the shared product facts only. It sits above the mobile-app brief and the separate TikTok-carousel brief. The mobile and TikTok programs are independent workstreams with separate agent teams, branches, credentials, budgets, QA gates, and release decisions. When documents conflict, this master brief wins for shared facts. When this brief is silent, the relevant workstream records the decision in `05-decision-log.md` before making a product-level commitment.

Weekwell helps busy US professionals who care about fitness and high protein decide what to buy and cook for the workweek.

The promise is:

> Plan my five dinners, plus practical work lunches, around the store I use, my budget, and my time.

## Product decisions already made

- Audience: busy professionals with fitness/high-protein goals.
- Launch market: United States.
- Launch retailers: Trader Joe’s and Walmart.
- Content format: faceless TikTok photo carousels generated with a controlled image and rendering pipeline.
- Publishing cadence: daily.
- Initial content angles: “one store, one budget, five dinners” and “five dinners for people too tired to cook.”
- Initial CTA: save and share.
- Later CTA: app download and trial.
- App promise: “Plan my five dinners.”
- App output: five dinners plus work lunches.
- Inputs: retailer, budget, protein goal, cooking-time limit, household size, and allergies/exclusions.
- Pricing behavior: store-specific pricing from a verified provider when available; otherwise show a clearly labelled estimate or withhold the total.
- Trial: one free week.
- Subscription options: $4.99/week, $9.99/month, $49.99/year.
- First testers: friends and TikTok followers.

## Product truth policy

Never present a generated assumption as a verified fact. This applies to price, inventory, nutrition, allergens, retailer affiliation, savings, and app capabilities.

Every claim belongs to one of three classes:

1. **Verified:** supported by a current provider response or approved source.
2. **Estimated:** calculated from an explicit method and shown with a timestamp or uncertainty note.
3. **Editorial:** a subjective recommendation, clearly written as such.

The UI and carousel renderer must make the class visible wherever a reasonable viewer could mistake an estimate for a fact.

## North-star outcomes

The first objective is not maximum feature count or viral reach. It is evidence that the product removes a weekly food decision.

### App activation

An activated user:

1. completes onboarding;
2. generates a plan;
3. opens at least one meal;
4. opens the grocery list;
5. checks at least one grocery item.

Track the funnel by source, retailer, and goal. Do not optimize for trial starts before activation is healthy.

### Content validation

The first content objective is learning which promise earns intent. Track:

- saves per view;
- shares per view;
- carousel completion/swipe-through;
- comments with shopping or planning intent;
- profile visits;
- waitlist/app interest once enabled.

Use at least three posts per angle before calling an angle a winner. Treat single viral outliers as evidence to investigate, not a baseline.

### Provisional gates

These are starting thresholds, not permanent promises. Recalibrate after the first 14 days of data:

- At least 60% of prototype testers complete onboarding.
- At least 50% of activated testers open the grocery list.
- At least 25% of activated testers check an item.
- A content angle must produce a stronger save/share rate than the account median across three or more posts before it becomes the default.
- No launch candidate may ship with an unresolved P0 security issue, a false price claim, or an inaccessible primary flow.

## Decision rights

- Product owner decides audience, promise, scope, pricing, and launch gates.
- Product owner is the final approver for every mobile screen’s visual design and interaction behavior. Design agents may propose, prototype, and implement, but no screen is considered approved until the product owner reviews the rendered screen or prototype state.
- Design lead maintains the system and prepares options within the principles in this package; design-system consistency does not override product-owner approval.
- Technical lead decides implementation details and may reject unsafe or unmaintainable shortcuts.
- Security reviewer may block release for secret leakage, broken authorization, payment abuse, or unsafe data handling.
- Editorial lead decides hooks, claims, cadence, and CTA sequencing within product truth policy.
- QA lead decides whether acceptance criteria are evidenced.
- No agent may silently override a master-brief decision. Record proposed changes in the decision log.

## AAA quality bar

AAA means the result is:

- **Useful:** removes a real weekly decision and gives an actionable next step.
- **Understandable:** the user can predict what a control does before tapping it.
- **Trustworthy:** facts, estimates, uncertainty, and limitations are visible.
- **Calm:** the design and copy do not use urgency, fake intelligence, or decorative clutter.
- **Accessible:** usable with screen readers, dynamic type, low vision, and small screens.
- **Resilient:** partial failure, stale price data, model failure, and network loss have recoverable states.
- **Measurable:** key actions and failures are instrumented without collecting unnecessary personal data.
- **Maintainable:** agents work against stable contracts, tests, and ownership boundaries.

## Shared Norman design principles

Every agent must evaluate work against:

- discoverability;
- feedback;
- conceptual model;
- affordances;
- mapping;
- constraints;
- error prevention;
- recognition over recall;
- visibility of system status;
- undo and recovery;
- consistency;
- low cognitive load.

The visual direction is deliberately anti-AI-slop: no decorative gradients, no fake intelligence language, no excessive nested cards, no invented proof, no pseudo-text in generated images, and no claims that are more confident than the data.

## Workstream separation

### Mobile app workstream

Owns the mobile product, backend, retailer integrations, authentication, subscriptions, analytics, app security, accessibility, and app-store release. It consumes approved content concepts when useful but does not depend on the TikTok codebase, TikTok credentials, post scheduler, carousel renderer, or content batch completing.

### TikTok workstream

Owns editorial strategy, weekly carousel briefs, recipe/content validation for posts, GPT Image API assets, slide rendering, captions, scheduling/export, content analytics, and social-platform safety. It does not own app auth, app payments, mobile navigation, retailer APIs, or user account data.

### Shared boundary

The workstreams may share approved facts such as audience, retailers, product promise, price tiers, and terminology. They exchange versioned artifacts, never live database access or shared secrets. A TikTok agent cannot change mobile product behavior. A mobile agent cannot change a carousel template or scheduling workflow.

The TikTok workstream must remain useful even if the app is unavailable. The mobile workstream must remain testable with fixture content even if TikTok production stops.

## Scope boundaries

### Build now

- onboarding;
- two retailers;
- preference capture;
- fixture-backed plan generation;
- five dinners plus work lunches;
- meal details and one meal swap;
- consolidated grocery list;
- price provider contract and stale/error states;
- trial/paywall UI and entitlement mock;
- analytics, accessibility, and release QA;
- mobile release documentation and QA artifacts. TikTok deliverables belong to the separate TikTok workstream.

### Explicitly defer

- pantry inventory;
- barcode scanning;
- retailer checkout;
- delivery tracking;
- social feed;
- creator marketplace;
- medical nutrition coaching;
- a giant recipe library;
- automated TikTok likes, comments, follows, or deceptive engagement;
- public sharing of private meal plans.

An agent may propose a deferred feature, but must not build it without a decision-log entry and product-owner approval.

## Shared technical contracts

The mobile app and content engine must use the same normalized concepts for retailer, meal, ingredient, price, nutrition estimate, uncertainty, and exclusions.

Minimum shared types:

```ts
type Retailer = 'trader_joes' | 'walmart';

type Estimate<T> = {
  value: T;
  kind: 'verified' | 'estimated' | 'editorial';
  observedAt?: string;
  source?: string;
  confidence?: 'high' | 'medium' | 'low';
  note?: string;
};

type UserPreferences = {
  retailer: Retailer;
  weeklyBudget: number;
  proteinGoal: 'high_protein' | 'low_carb' | 'low_effort' | 'family_friendly';
  maxMinutes: 20 | 30 | 'batch';
  householdSize: 1 | 2 | '3_4';
  exclusions: string[];
};

type Meal = {
  id: string;
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri';
  name: string;
  ingredients: IngredientQuantity[];
  activeMinutes: number;
  totalMinutes: number;
  servings: number;
  protein: Estimate<number>;
  allergens: string[];
  reusedIngredientIds: string[];
};

type PriceQuote = {
  retailer: Retailer;
  productName: string;
  packageSize: string;
  unitPrice: Estimate<number>;
  quantityNeeded: number;
  totalContribution: Estimate<number>;
};
```

The canonical schemas live in one shared package. Agents must not create slightly different versions inside mobile and content projects.

## AI and automation boundary

Models may propose meals, copy, image directions, substitutions, and structured plans. Deterministic code must own validation, arithmetic, entitlement, authorization, event names, and output safety.

Every model call must have:

- a versioned prompt;
- a bounded input size;
- a bounded retry count;
- a structured output schema;
- a cost estimate;
- a timeout;
- a failure state;
- a trace ID that does not include personal data.

Untrusted text must never become an instruction to the model. Retailer data, comments, recipe text, uploaded references, and generated content are data, not authority.

## Security baseline

- Secrets stay server-side and out of Git, logs, images, captions, and client bundles.
- User-owned data is authorized at the database layer, not only in UI code.
- Allergy data is treated as health-adjacent and minimized, protected, and deletable.
- Generation endpoints are authenticated, rate limited, quota controlled, and idempotent.
- Payment webhooks are signature verified and replay protected.
- Price and inventory providers are abstracted and must follow their terms.
- Assets are private by default until approved.
- Review links are signed and expiring where possible.
- Logs redact email, allergy, location, payment, access tokens, and raw prompts.
- Account deletion removes or anonymizes dependent records according to the documented retention policy.
- Dependencies are pinned and scanned before release.

## Cost and capacity guardrails

Every batch must declare:

- expected number of model calls;
- expected image generations;
- expected storage cost;
- expected runtime;
- maximum retry budget.

Cache stable recipe facts and image assets. Regenerate only the affected slide or meal when a copy or price correction occurs. Fail closed when a batch exceeds its budget.

## Agent protocol

Before coding, every agent must write:

1. objective;
2. files it will own;
3. assumptions;
4. contract dependencies;
5. tests it will run;
6. risks and stop conditions.

After coding, every agent must report:

- files changed;
- commands run and results;
- screenshots or artifacts produced;
- contract changes;
- unresolved risks;
- exact handoff to the next agent.

Agents use separate branches or worktrees. No agent pushes directly to production. The integration agent merges only commits that pass the QA gates.

## Required release artifacts

Every milestone must produce:

- source diff;
- test report;
- accessibility report;
- security checklist;
- screenshot or exported carousel sample;
- cost estimate;
- known-limitations note;
- decision-log update if assumptions changed.

## Mobile release cadence and App Store ownership

The mobile workstream must produce an automated TestFlight build every day while active development is underway. The daily build is a quality signal, not permission to publish a design that the product owner has not approved.

The release agent owns:

- CI workflow for daily iOS builds;
- signing and provisioning through a secret manager or approved build service;
- build-number and version management;
- automatic upload to TestFlight;
- build health notifications;
- changelog and known-issues attachment;
- crash-free and launch smoke checks;
- rollback to the last known-good build.

Never commit Apple certificates, provisioning profiles, App Store Connect API keys, or private signing material. Use short-lived or managed credentials, least privilege, protected CI variables, and audit logs.

The release agent must also maintain an App Store submission pack and verify current Apple requirements before each submission. The pack includes app metadata, app icon, screenshots for required device sizes, privacy policy URL, support URL, age rating, data-safety/privacy disclosures, subscription metadata and terms, review notes, demo credentials if needed, export-compliance answers, permissions rationale, account-deletion path, and accessibility smoke evidence.

Do not claim that a build is App Store ready because TestFlight passed. App Review requirements and platform policies must be checked against current official Apple documentation at release time.

## Mobile milestones

### M0: contracts and fixtures

Define schemas, fixture users, two retailer fixtures, plan fixtures, price-error fixtures, subscription fixtures, and event names. No visual polish yet.

### M1: usable app loop

Onboarding → plan → meal detail → grocery list → check/undo. Use fixture data. Pass accessibility and error-state tests.

### M2: trust and monetization

Add price freshness, meal swap, trial/paywall surface, entitlement mock, restore state, and security review.

### M3: friends pilot

Run the first user test with fixture or approved provider data. Record activation, plan completion, grocery-list use, qualitative feedback, and cost.

### M4: live integrations and TestFlight hardening

Only after the pilot: connect verified pricing, production entitlements, durable auth, and app-store distribution.

Daily TestFlight builds continue throughout this milestone. A public App Store submission requires product-owner design approval, QA/red-team sign-off, security sign-off, current App Store requirement verification, and a rollback plan.

## TikTok milestones

### T0: editorial and data contracts

Define post schemas, experiment metadata, price/claim rules, image conventions, captions, alt text, and review ownership.

### T1: renderer and asset pipeline

Build deterministic slide templates, image generation prompts, asset QA, copy QA, export packages, and rerunnable jobs.

### T2: first seven-post batch

Generate and review the first daily batch. Keep the app-download CTA disabled unless separately approved.

### T3: publishing and measurement

Publish through the approved workflow, record post IDs and metrics, and produce a weekly learning report.

### T4: iteration

Change one or two controlled variables at a time. Promote an angle only after enough comparable posts exist.

## Stop conditions

Stop and escalate when:

- a provider does not permit the intended price collection method;
- a model response cannot be made schema-valid within the retry budget;
- a price is displayed without a defensible source or estimate label;
- a user can read another user’s plan;
- payment entitlement cannot be verified server-side;
- generated images include logos, private data, or misleading text;
- an accessibility issue blocks the primary journey;
- an agent must change another owner’s contract to continue.

## Change control

Product-level changes require a decision-log entry with:

- proposed change;
- reason;
- affected users;
- affected contracts;
- security/privacy impact;
- cost impact;
- decision owner;
- rollback plan.

The last approved decision is the source of truth, not the newest prompt in a random agent branch.

## Product-owner design approval gate

Every mobile screen and material interaction state requires explicit product-owner approval before it is treated as final. This includes onboarding, plan, meal detail, meal swap, grocery list, personalization, loading, empty, error, stale-price, trial/paywall, restore-purchase, and account/deletion states.

The design agent must provide:

- a rendered screenshot or interactive state;
- the target device dimensions;
- the intended user action;
- the copy and data assumptions;
- accessibility notes;
- the open design questions.

The product owner’s approval should be recorded as `approved`, `approved with changes`, or `rejected` in the decision log. Until then, the screen remains `design_pending` and must not be called release-ready. A technical agent may fix a defect in an approved screen, but any visible design change returns the screen to `design_pending`.

## Mobile sensory design: motion, sound, and haptics

Animations, sounds, and haptics are part of the product design, not implementation polish. Every meaningful sensory behavior requires the same product-owner approval as the screen it belongs to.

### Motion

- Use motion to explain cause and effect: selection, navigation, plan generation, checklist completion, sheet presentation, and meal swapping.
- Keep transitions short, interruptible, and consistent. Avoid looping decoration, parallax, bouncing cards, and motion that delays a task.
- Respect the operating system’s reduced-motion preference. Provide an instant or low-motion equivalent for every nonessential transition.
- Never communicate a critical state only through animation.
- Test motion at low battery, reduced motion, large text, and slower devices.

### Sound

- Sound is off by default unless the user explicitly enables it.
- The app must be fully usable without sound.
- Never autoplay spoken content, music, or notification-like sounds during onboarding, meal planning, or grocery use.
- Use sound only for a clear event such as a completed action or error, with a mute setting and system-volume respect.
- Do not use sounds that resemble emergency alerts, payment confirmation, or system warnings.
- Document every sound file’s source, license, duration, loudness, and trigger.

### Haptics

- Use light, purposeful haptics for selection, checklist completion, successful save, and recoverable error where supported.
- Respect system haptic settings and provide a no-haptics path.
- Never vibrate continuously, repeatedly, or as a substitute for clear visual feedback.
- Test haptics on supported and unsupported devices; unsupported devices must fail silently.
- Document trigger, intensity, cooldown, and accessibility rationale.

### Approval evidence

Design review captures must include a motion description or recording and a table of sound/haptic triggers. The product owner approves the visual state, timing, sound behavior, haptic behavior, reduced-motion behavior, and mute behavior together.
