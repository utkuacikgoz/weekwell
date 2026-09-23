# Claude Code build brief: Weekwell mobile app

Read this brief with [00-master-brief.md](00-master-brief.md), [03-agent-task-packets.md](03-agent-task-packets.md), [04-qa-red-team-checklist.md](04-qa-red-team-checklist.md), and [05-decision-log.md](05-decision-log.md). This is the **mobile workstream only**. TikTok carousel production is a separate program with separate agents, credentials, branches, and release gates.

## How to use this brief

This is the source of truth for a team of Claude Code agents building the first real Weekwell mobile app. The agents should inspect the existing prototype and repository before changing anything. Work in small, reviewable commits. Preserve working behavior while replacing the visual language.

The product is a mobile app for busy US professionals who care about fitness and high protein but do not want to decide what to cook every week.

The core promise is:

> Plan my five dinners, plus practical work lunches, around the store I actually use, my budget, and my time.

The launch retailers are Trader Joe’s and Walmart. The initial acquisition channel is daily faceless TikTok carousels. The first CTA is save/share; app-download CTAs come after content demand is demonstrated.

## Non-negotiable decisions

- Mobile-first product. Optimize for one-handed use and a 390px-wide reference viewport.
- Initial stores: Trader Joe’s and Walmart.
- User inputs: store, weekly budget, protein goal, cooking-time limit, household size, and allergies/exclusions.
- Plan output: five dinners plus work lunches.
- Price output: store-specific estimates with a visible “last checked” timestamp and a clear estimate disclaimer until a verified retailer feed exists.
- Trial: one free week.
- Subscription options: $4.99/week, $9.99/month, and $49.99/year.
- Initial testers: friends and TikTok followers.
- Do not claim that the app has live inventory, exact prices, nutrition certification, or medical safety unless the system has verified evidence for that claim.

## Product problem

The current prototype proves the basic interaction loop, but its visual language is too close to generic AI-generated SaaS: excessive rounded cards, decorative gradients, vague “smart” copy, fake-feeling imagery, and too many competing containers.

The production app should feel like a calm, well-edited utility. It should reduce decisions, show its work, and make the next action obvious.

## Design direction: useful, quiet, physical

Use Dieter Rams-style restraint and Norman-style usability. The app should feel closer to a good grocery notebook, a premium cookbook index, or a well-designed transit app than to a colorful AI dashboard.

### Norman principles to apply explicitly

1. **Discoverability:** Every primary action must be visually obvious without instruction. Do not hide the grocery list, price, or next meal behind an abstract icon.
2. **Feedback:** Every tap must produce an immediate state change: selected store, checked item, changed budget, saved meal, loading plan, or visible error.
3. **Conceptual model:** The app is organized around a week, a shop, and meals. Use those nouns consistently. Avoid “workspace,” “intelligence,” “magic,” and “optimization.”
4. **Affordances:** Buttons should look pressable; rows that open details should have a clear trailing affordance; sliders should look adjustable; checkboxes should look checkable.
5. **Mapping:** Budget controls should visibly affect the estimated shop total. Meal days should map to the week order. The grocery list should map ingredients back to meals.
6. **Constraints:** Only show supported stores. Prevent impossible budget selections. Surface allergy conflicts before plan generation. Disable purchase actions until entitlement state is known.
7. **Error prevention:** Validate structured meal plans, duplicate ingredients, missing quantities, unsupported allergens, and price timestamps before rendering a plan.
8. **Recognition over recall:** Keep store, budget, protein target, and time visible in the plan header. Do not make the user remember their settings.
9. **Visibility of system status:** Show “Building your week,” “Price checked 2 hours ago,” “3 of 12 items checked,” and subscription status in plain language.
10. **Recovery and undo:** Allow a meal to be swapped, a preference to be edited, and a grocery item to be unchecked. Never trap the user in a generated plan.
11. **Consistency:** Use the same wording and layout patterns across onboarding, plan, grocery list, and paywall. Do not change button meaning by screen.
12. **Good mapping and low cognitive load:** Default to the most useful answer. Ask only for information that changes the plan.

### Visual rules

- No hero gradients, glassmorphism, floating blobs, neon green AI accents, or decorative sparkles.
- Avoid putting every element inside a card. Use spacing, typography, dividers, and a single strong surface hierarchy.
- Use one warm off-white background, one dark ink color, one green utility accent, and one restrained warning/accent color.
- Use a readable serif or humanist display face only for short headings. Body copy must use a highly legible sans serif.
- Use a 4px baseline grid, 8px spacing scale, and 44px minimum touch targets.
- Use real editorial food imagery or restrained generated food imagery with consistent light, crop, and color. No floating ingredients, fake UI screenshots, or impossible food.
- No invented badges such as “AI recommended,” “smart pick,” or “perfect match.”
- Make price, cooking time, servings, and protein legible before the user opens details.
- Prefer one strong primary action per screen.
- Use motion only to explain state change: sheet rise, checklist confirmation, plan loading. No decorative loops.

## Primary user journey

### First run

1. Welcome: “Plan my five dinners.” Explain the result in one sentence.
2. Choose store: Trader Joe’s or Walmart. Do not show unsupported stores as disabled choices.
3. Set weekly grocery budget with a slider plus editable numeric value.
4. Choose the main goal: High protein, Low effort, Low carb, or Family friendly.
5. Choose cooking time: 20 minutes, 30 minutes, or batch cooking.
6. Choose household size: 1, 2, or 3–4 people.
7. Choose exclusions: no exclusions, dairy-free, gluten-free, nut-free, or custom exclusions.
8. Show a review screen summarizing choices. Make every field editable before generation.
9. Generate the plan with visible progress and a short explanation of what is happening.

### Generated week

The first screen after generation must answer five questions without scrolling:

- What am I eating tonight?
- What does the week cost?
- Does it fit my budget?
- How much protein and time does it represent?
- Where do I shop?

Use a compact week header, a prominent total, and meal rows. Each row shows day, dish name, cooking time, protein, servings, and a small image.

### Meal details

Opening a meal shows:

- ingredients and exact quantities;
- step-by-step instructions;
- total time and active time;
- protein estimate and serving count;
- which ingredients are reused elsewhere;
- a “swap this meal” action;
- a “add to grocery list” state that is visible and reversible.

Nutrition must be labelled as an estimate. Do not present medical or dietary advice.

### Grocery list

The list is grouped by store section, not by recipe. Every item shows quantity, estimated price, and the meals that use it. Users can check items off, undo a check, and open the source meals.

The list header shows total estimated cost, last price check, and count checked. A “start shopping” button should be a useful handoff, not a fake checkout. If retailer linking is not implemented, say “Open store” only when a real deep link exists.

### Personalization and plan repair

The user can edit one preference without losing the plan. After an edit, show exactly what will change before regenerating. For example: “Changing to Walmart may change 4 prices and 2 ingredients.”

Plan repair actions:

- Swap meal
- Make it cheaper
- Increase protein
- Reduce cooking time
- Remove an allergen

The app should preserve checked grocery items when possible and explain items that changed.

### Trial and paywall

Do not interrupt the first useful plan with a paywall. Let the user inspect the plan and grocery list first. The trial surface should explain:

- one week free;
- what remains included during the trial;
- exact prices after the trial;
- cancellation behavior;
- the current selected plan;
- a restore-purchases action.

Price cards must not use manipulative countdowns, fake scarcity, hidden fees, or preselected annual billing. The annual option may be visually recommended only if the savings calculation is truthful and visible.

## Copy system

Tone: direct, warm, specific, and useful. Write like a capable friend who plans groceries well.

Use:

- “Your week is ready.”
- “$57 estimated at Trader Joe’s.”
- “18 minutes · 42g protein · serves 1.”
- “Swap this meal.”
- “Checked 2 hours ago.”
- “Prices can change in store.”

Avoid:

- “Let AI transform your lifestyle.”
- “Your personalized culinary journey.”
- “Magic meal intelligence.”
- “Perfectly optimized.”
- “Guaranteed savings.”
- “Clean eating” as a moral claim.

Every error should explain what happened and what to do next. Example: “We could not verify prices for Walmart right now. Your plan is still available, but totals are hidden until the price check completes.”

## Retailer and pricing architecture

Create a provider interface rather than coupling product code to a single retailer:

```ts
interface RetailerProvider {
  retailer: 'trader_joes' | 'walmart';
  searchProducts(input: ProductSearchInput): Promise<ProductMatch[]>;
  getPrice(productId: string, location?: LocationHint): Promise<PriceQuote>;
  getProductDeepLink(productId: string): Promise<string | null>;
}
```

Required price fields:

- retailer;
- product name and normalized ingredient;
- package size;
- unit price and estimated quantity needed;
- currency;
- location scope;
- observed-at timestamp;
- confidence level;
- source/provider name.

Never let an LLM invent a price. The plan generator may choose among verified product matches, but the price service owns price values.

If live pricing is unavailable, render a clearly labelled estimate or withhold the total. Do not silently fabricate real-time data.

## AI boundaries

Use the model for meal-plan composition, ingredient reuse, recipe wording, and substitutions. Use deterministic code for:

- schema validation;
- allergy and exclusion checks;
- budget arithmetic;
- nutrition arithmetic where possible;
- duplicate ingredient consolidation;
- price calculation;
- subscription entitlement;
- analytics event naming.

Require structured JSON output validated with Zod or equivalent. Reject and retry malformed output with a bounded retry count. Keep model prompts versioned. Store the prompt/model/version metadata needed to reproduce a plan without storing unnecessary personal data.

Do not let user-provided text override system rules. Treat recipe text, retailer text, uploaded images, and scraped descriptions as untrusted input. Defend against prompt injection and malicious ingredient names.

## Suggested technical architecture

Default to Expo + React Native + TypeScript + Expo Router unless the repository already has an established mobile stack. Use a typed API boundary and a server-side database. A reasonable default is:

- Mobile: Expo, React Native, TypeScript, Expo Router, React Query, Zod.
- Backend: TypeScript service with Postgres or Supabase, provider adapters, job queue for generation, and server-side entitlement checks.
- Auth: passwordless/email or a supported identity provider. Never store raw passwords.
- Payments: RevenueCat or equivalent for App Store/Google Play entitlements, with server-side webhook verification.
- Observability: structured logs, error tracking, latency metrics, generation failure metrics, and privacy-safe analytics.

Do not add a new framework without explaining why the existing repository cannot support the requirement.

## Data model requirements

Minimum entities:

- `User`
- `UserPreference`
- `Retailer`
- `PriceQuote`
- `Ingredient`
- `Meal`
- `Plan`
- `PlanMeal`
- `GroceryItem`
- `MealGroceryLink`
- `SubscriptionEntitlement`
- `GenerationJob`
- `AnalyticsEvent`

Every user-owned row must have an owner identifier and database-level access control. Store only the minimum data needed. Allergies are sensitive health-adjacent data; document retention and deletion behavior.

## Security requirements

- Keep API keys, retailer credentials, payment secrets, signing keys, and model credentials server-side.
- Use environment variables and secret managers. Never commit `.env`, tokens, generated credentials, or provider responses containing secrets.
- Validate all client input on the server. Client-side validation is only a UX improvement.
- Use row-level authorization for plans, preferences, grocery lists, and entitlements.
- Verify subscription webhooks with signatures and protect against replay.
- Make generation jobs idempotent and rate limited. A user must not be able to create unlimited expensive model calls.
- Enforce per-user and per-IP quotas with clear error states.
- Redact personal data and allergy details from logs. Never log payment data or access tokens.
- Sanitize retailer names, product text, recipe text, and generated HTML/Markdown before rendering.
- Use dependency scanning, lockfiles, pinned versions, and a documented update process.
- Add account deletion and data export paths before public launch.
- Add abuse controls for prompt flooding, scraping, and referral manipulation.
- Use HTTPS, secure cookies, CSRF protection where applicable, and strict CORS.
- Do not expose internal provider IDs or model prompts in the mobile client.

## Accessibility and quality bar

- VoiceOver/TalkBack labels for every control.
- Dynamic type support without clipped content.
- Contrast at WCAG AA minimum.
- Do not rely on color alone for selected, checked, warning, or price states.
- Minimum 44x44 touch targets.
- Respect reduced-motion settings.
- Support offline viewing of the current plan and grocery list with clear stale-data status.
- Empty, loading, partial, timeout, and error states for every network surface.

## Analytics

Define an event taxonomy before instrumenting:

- `onboarding_started`
- `store_selected`
- `preferences_completed`
- `plan_generation_started`
- `plan_generation_succeeded`
- `plan_generation_failed`
- `meal_opened`
- `meal_swapped`
- `grocery_item_checked`
- `grocery_list_shared`
- `trial_viewed`
- `trial_started`
- `paywall_viewed`
- `subscription_started`
- `subscription_restored`
- `subscription_cancelled`

Do not send allergy values, raw meal text, email addresses, or precise location in analytics. Use anonymous IDs and documented retention.

## Testing requirements

Unit tests:

- budget arithmetic;
- price quote freshness and confidence;
- ingredient consolidation;
- allergy/exclusion filtering;
- meal swap preservation;
- entitlement state transitions;
- structured model-output validation.

Integration tests:

- onboarding to generated plan;
- retailer provider fallback;
- plan regeneration after preference edits;
- grocery list persistence and undo;
- trial and entitlement webhook handling;
- account deletion.

End-to-end tests:

- a new user can build a plan in under two minutes;
- a user can find tonight’s meal in under five seconds;
- a user can check off and undo a grocery item;
- a user can inspect pricing caveats;
- a user cannot see another user’s plan;
- a failed price check does not create a false total.

Visual tests:

- reference phone widths 320, 375, 390, and 430;
- dynamic type at 100%, 125%, and 150%;
- light mode and system dark mode if supported;
- long meal names, long allergy names, empty lists, and price errors;
- no clipped bottom sheets or unreachable primary actions.

## Daily TestFlight and App Store release

The mobile team must automate a TestFlight build every day during active development. Each build must run from the approved integration branch, use locked dependencies, increment its build number, run typecheck/lint/unit/integration/accessibility/smoke checks, upload to TestFlight, and attach the commit SHA, changelog, test summary, and known issues.

Keep Apple signing certificates, provisioning profiles, and App Store Connect API keys in managed secrets only. Never print or commit them. Failed builds must notify the team and preserve the last known-good build.

The release agent owns the App Store submission pack: metadata, icon, required screenshots, privacy policy, support URL, age rating, data disclosures, subscription/trial terms, restore behavior, review notes, demo credentials when needed, export-compliance answers, permission rationale, account deletion, accessibility evidence, and current Apple policy verification. TestFlight success alone is not App Store readiness. Product-owner approval of every design screen, QA sign-off, security sign-off, and current Apple requirement review are required before submission.

## Motion, sound, and haptics

Treat sensory behavior as part of the approved product design. Use motion to explain navigation, loading, selection, completion, and recovery. Keep it short, interruptible, and disabled or simplified under reduced-motion settings. Do not use decorative loops or motion as the only way to communicate information.

Sound is off by default. The app must work completely without audio. Never autoplay music, speech, or alert-like sounds. Every sound must have a documented source/license, duration, trigger, volume behavior, and mute path.

Haptics should be brief and purposeful for actions such as selection, checklist completion, save, and recoverable error. Respect system settings, provide silent fallback, and document intensity and cooldown. No continuous vibration.

Every screen review must include sensory states: timing/easing, reduced-motion version, sound triggers, mute behavior, haptic triggers, and unsupported-device behavior. These require product-owner approval before release.

## Multi-agent execution plan

Use separate worktrees or branches. Agents must not edit another agent’s owned files without coordination.

### Agent A: product and UX

Owns user flows, screen inventory, copy, empty/error states, and acceptance criteria. Delivers a short UX decision log before implementation.

### Agent B: design system and mobile UI

Owns tokens, typography, component primitives, layout, accessibility, and visual regression snapshots. Must remove generic AI-card patterns and prove the screens at reference widths.

### Agent C: plan-generation domain

Owns schemas, meal-plan composition, ingredient reuse, allergy validation, structured model output, and deterministic budget logic. No payment or retailer credentials.

### Agent D: retailer and pricing

Owns the `RetailerProvider` interface, Trader Joe’s/Walmart adapters, freshness/confidence rules, caching, fallback states, and price tests. Do not scrape or violate retailer terms.

### Agent E: subscriptions and security

Owns auth, entitlement state, trial rules, purchase restoration, webhook verification, authorization, rate limits, secret handling, deletion, and audit logging.

### Agent F: QA and release

Owns test matrix, accessibility checks, device-size checks, threat-model review, performance budget, daily TestFlight automation, App Store submission pack, release checklist, and final smoke test.

Recommended merge order: domain schemas → design system → screens → provider adapters → subscriptions/security → analytics → QA hardening.

## Definition of done

The build is ready for the first friends/TikTok test when:

- a new user can produce a five-dinner plus lunch plan;
- the app clearly distinguishes estimates from verified prices;
- Trader Joe’s and Walmart are the only selectable launch retailers;
- the grocery list consolidates ingredients and maps items back to meals;
- a user can edit preferences and repair the plan;
- the trial/paywall copy is explicit and non-manipulative;
- no secrets reach the client bundle or logs;
- accessibility and error-state checks pass;
- tests cover price failure, allergy conflict, malformed model output, unauthorized access, and webhook replay;
- the UI looks calm, legible, and intentional at phone size;
- the app has no decorative AI language, fake proof, or unsupported product claim.

## First implementation slice

Build this before adding social features, barcode scanning, pantry tracking, delivery checkout, or a large recipe library:

1. Auth and onboarding.
2. Trader Joe’s/Walmart selection.
3. Preference capture.
4. Deterministic fixture-backed plan generation.
5. Five dinners plus two lunch blocks.
6. Ingredient-consolidated grocery list.
7. Price quote interface with fixture provider and stale/error states.
8. Meal swap with one replacement.
9. Trial/paywall UI with entitlement mock.
10. Analytics and QA instrumentation.

Do not build the full backend before validating that people complete onboarding, open meals, check grocery items, and return to the app.
