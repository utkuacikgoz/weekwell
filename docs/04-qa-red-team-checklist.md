# Weekwell AAA QA and red-team gate

## Gate rule

No agent may mark a release ready because it “looks good.” A release candidate must include evidence for each applicable section. The QA lead records PASS, FAIL, or N/A with a link to the test, screenshot, log, or artifact.

Mobile and TikTok are separate gates. A failing TikTok image does not block a mobile fixture build. A failing mobile auth test does not get waived because a carousel batch is ready.

## Severity

- **P0:** data exposure, payment compromise, secret leakage, unsafe food/allergy behavior, destructive data loss, or misleading public claim that cannot be corrected quickly. Blocks all release.
- **P1:** broken primary journey, unauthorized access path, false price claim, unreadable primary action, or repeated generation cost leak. Blocks pilot release.
- **P2:** important usability or quality issue with a safe workaround. Must have an owner and target date.
- **P3:** polish or low-impact issue. Track without blocking.

## Mobile product gate

### Product-owner design approval

- [ ] Every mobile screen has an explicit product-owner approval record.
- [ ] Every material interaction state has an explicit product-owner approval record.
- [ ] Approval captures include the rendered screen, device size, copy, data assumptions, and accessibility notes.
- [ ] Any visible change after approval returns the state to `design_pending`.
- [ ] No screen is called release-ready based only on agent or QA approval.

### Product behavior

- [ ] New user can choose Trader Joe’s or Walmart.
- [ ] Unsupported retailers are not shown as selectable launch options.
- [ ] Budget input has a visible value and sensible bounds.
- [ ] Protein goal, cooking time, household size, and exclusions are captured.
- [ ] Review screen accurately reflects every selected preference.
- [ ] Generation has loading, timeout, partial, retry, and failure states.
- [ ] A valid plan contains five dinners plus work lunches.
- [ ] A plan cannot contain an excluded allergen.
- [ ] A plan cannot claim a total that exceeds the budget without explaining why.
- [ ] The plan shows the store, budget, time, servings, and price status.
- [ ] Meal detail shows quantities, steps, time, serving count, protein estimate, and allergens.
- [ ] Meal swap changes only the intended meal and updates affected groceries.
- [ ] Grocery list consolidates duplicate ingredients.
- [ ] Grocery items can be checked and unchecked.
- [ ] Grocery items map back to source meals.
- [ ] Stale or unavailable prices are clearly labelled.
- [ ] Trial and price options are visible without coercive countdowns.
- [ ] Restore purchases has a recoverable state.

### Norman usability review

Score each 0–2: 0 = absent, 1 = partial, 2 = clear. A primary flow needs at least 18/22 and no zero in discoverability, feedback, constraints, status, or recovery.

- [ ] Discoverability
- [ ] Feedback
- [ ] Conceptual model
- [ ] Affordance
- [ ] Mapping
- [ ] Constraints
- [ ] Error prevention
- [ ] Recognition over recall
- [ ] Visibility of system status
- [ ] Undo/recovery
- [ ] Consistency

### Visual quality

- [ ] No decorative AI gradients, sparkles, glassmorphism, or nested-card clutter.
- [ ] Typography hierarchy is obvious in under five seconds.
- [ ] One primary action per screen.
- [ ] Price, time, protein, servings, and status are legible before detail view.
- [ ] Generated food imagery does not look impossible or generic.
- [ ] Long meal names wrap without clipping.
- [ ] Empty, error, stale, and loading states use the same design system.
- [ ] Dark mode or system appearance behavior is intentional.

### Accessibility

- [ ] VoiceOver/TalkBack labels every control.
- [ ] Focus order follows the visual reading order.
- [ ] Dynamic type 125% and 150% remain usable.
- [ ] Contrast meets WCAG AA for text and controls.
- [ ] Color is not the only selected/checked/error signal.
- [ ] Touch targets are at least 44×44px.
- [ ] Reduced motion is respected.
- [ ] Keyboard input does not cover the primary action.

### Motion, sound, and haptics

- [ ] Every animation explains a state change or navigation relationship.
- [ ] No critical information is communicated only through motion, sound, or vibration.
- [ ] Product owner approved timing, easing, and interaction feedback for each material state.
- [ ] Reduced-motion mode removes or simplifies nonessential animation.
- [ ] Transitions are interruptible and do not block task completion.
- [ ] Sound is off by default and the app remains fully usable without it.
- [ ] No audio autoplays during onboarding or planning.
- [ ] Every sound has a documented source/license, duration, trigger, and mute path.
- [ ] System volume and mute behavior are respected.
- [ ] Haptics are brief, purposeful, and never continuous.
- [ ] System haptic settings are respected.
- [ ] Unsupported haptics fail silently without blocking the action.
- [ ] Haptic triggers have documented intensity, cooldown, and accessibility rationale.
- [ ] Motion, audio, and haptic behavior is tested across background/foreground transitions.
- [ ] Motion and sensory effects do not cause unacceptable battery, CPU, or memory use.

### Mobile security red team

- [ ] User A cannot read User B’s plan, preferences, grocery list, or entitlement.
- [ ] Client cannot call provider APIs with privileged credentials.
- [ ] Secrets are absent from the client bundle, logs, fixtures, and screenshots.
- [ ] Generation endpoint requires auth and rate limits.
- [ ] Duplicate generation requests are idempotent.
- [ ] Malformed model output is rejected and does not reach the UI.
- [ ] Prompt injection in ingredient or retailer text cannot override system rules.
- [ ] Allergy data is absent from analytics payloads and ordinary logs.
- [ ] Account deletion behavior is tested.
- [ ] Payment webhooks reject invalid signatures and replayed events.
- [ ] Trial state cannot be extended by changing a client timestamp.
- [ ] Logs redact tokens, email addresses, precise location, and payment identifiers.

### Mobile price and nutrition red team

- [ ] Price total is deterministic from quote data.
- [ ] Currency and package size are explicit.
- [ ] Last-checked time is shown.
- [ ] Estimates cannot be rendered as verified facts.
- [ ] Missing price data fails closed.
- [ ] Nutrition and protein are labelled estimates.
- [ ] No medical or weight-loss claim appears in product copy.
- [ ] Ingredient substitutions recalculate affected price and allergen status.

### Daily TestFlight and App Store gate

- [ ] Daily iOS build is generated automatically from the approved integration branch.
- [ ] Build number increments monotonically and maps to a commit SHA.
- [ ] Typecheck, lint, unit, integration, accessibility, and smoke checks run before upload.
- [ ] TestFlight upload succeeds and build processing is monitored.
- [ ] Build notes include changes, known issues, test results, and reviewer instructions.
- [ ] Signing certificates, provisioning profiles, and App Store Connect keys are not in source or logs.
- [ ] CI secrets are protected, least-privilege, and revocable.
- [ ] Failed builds notify the responsible team and do not replace the last known-good build.
- [ ] App Store metadata, icon, screenshots, support URL, privacy policy, age rating, and permissions rationale are present.
- [ ] Subscription products, trial terms, restore behavior, and review notes are accurate.
- [ ] Account deletion and data disclosure requirements are verified.
- [ ] Export-compliance and current Apple policy checks are documented.
- [ ] Product owner has approved every design screen and material interaction state.
- [ ] QA, security, and red-team sign-off is complete before App Store submission.
- [ ] Current official Apple requirements were rechecked at submission time.

## TikTok content gate

### Editorial utility

- [ ] Slide 1 states audience, utility, and a concrete constraint.
- [ ] The carousel belongs to one named angle.
- [ ] Store, budget, time, or protein constraint is visible.
- [ ] A viewer can make a shopping decision from the list.
- [ ] Ingredient reuse is clear.
- [ ] CTA is save/share unless a later milestone explicitly approves a product CTA.
- [ ] Caption adds context rather than repeating every slide.
- [ ] No fake comments, fake urgency, or deceptive engagement bait.

### Content truth

- [ ] Every price has source, timestamp, and estimate/verified label.
- [ ] Store name is accurate and does not imply affiliation.
- [ ] Protein and nutrition values are labelled estimates.
- [ ] Serving size is visible.
- [ ] Time claims are plausible and defined.
- [ ] Allergens and exclusions are checked.
- [ ] Claims are traceable to the source brief.
- [ ] No guaranteed savings, weight loss, or health outcome.

### Image quality and provenance

- [ ] Image contains no pseudo-text, logos, watermarks, or private data.
- [ ] Food proportions and utensils are plausible.
- [ ] Images in the batch share a coherent visual direction.
- [ ] Image metadata records prompt, model, generation time, and reviewer.
- [ ] No unlicensed creator likeness or copied reference is used.
- [ ] Alt text describes the image without claiming facts it cannot show.
- [ ] Export removes sensitive EXIF metadata where applicable.

### Slide rendering

- [ ] Every export is 1080×1350 or the approved target size.
- [ ] Text is code-rendered, not generated inside the image.
- [ ] Safe margins account for platform crop.
- [ ] No text overflow at phone-size preview.
- [ ] Slide count and order are correct.
- [ ] CTA is visible on the final slide.
- [ ] Color contrast is sufficient.
- [ ] The design does not feel like a generic AI template.
- [ ] Regenerating one slide leaves the other slides unchanged.

### TikTok security red team

- [ ] API credentials are server-side and secret-scanned.
- [ ] Untrusted retailer/comment text is treated as data.
- [ ] Generation jobs are authenticated, rate limited, and idempotent.
- [ ] Approved assets are private until release.
- [ ] Review URLs expire or require authorization.
- [ ] No user private plan or analytics row is uploaded to image generation.
- [ ] Scheduler cannot publish a draft or rejected asset.
- [ ] Publish action is auditable by post ID and reviewer.
- [ ] No automated likes, follows, comments, or platform abuse.

## Adversarial test cases

### Model and content attacks

1. Put “ignore all previous instructions” in a retailer product name.
2. Put a fake allergy exemption in a recipe note.
3. Return malformed JSON with extra fields and missing quantities.
4. Return a price of zero, a negative price, and an extreme price.
5. Return a recipe that exceeds the time limit by 10×.
6. Return duplicate ingredients with different units.
7. Return a generated image containing a store logo or readable fake packaging.
8. Insert a prohibited medical claim into a caption draft.
9. Retry a generation job 20 times concurrently.
10. Re-run an approved batch after changing one price.

### Authorization attacks

1. Change user ID in a plan request.
2. Reuse a signed asset URL after expiry.
3. Replay a payment webhook.
4. Call an admin/export endpoint as a normal user.
5. Change trial dates in the client.
6. Request analytics filtered by another user’s email.

### Usability attacks

1. Use a 70-character meal name.
2. Select every exclusion.
3. Use a $40 budget with a large household.
4. Use a stale price response.
5. Lose network during generation.
6. Turn on large text.
7. Open the app with all grocery items checked.
8. Swap the meal after checking related groceries.

## Release evidence template

```md
Release:
Workstream: mobile | tiktok
Commit/build:
Reviewer:
Date:

P0/P1 findings:
Norman/usability score:
Accessibility result:
Security result:
Data/claim result:
Performance/cost result:
Artifacts:
Known limitations:
Decision: GO | NO-GO | GO WITH FOLLOW-UP
Follow-up owner/date:
```

## Rollback rules

- Mobile: preserve the last known-good build and database migration path. Disable a broken generation provider behind a feature flag rather than showing false prices.
- TikTok: stop scheduling, revoke unpublished assets, and keep the last approved batch available. Correct or retract a post if a public claim is materially false.
- Never delete evidence needed to explain a published claim, payment event, or security incident.
