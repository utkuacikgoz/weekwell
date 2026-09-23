/**
 * Language the product must not use (mobile brief: copy system; QA gate:
 * no medical or weight-loss claims, no coercive urgency). Plain module with
 * no imports so tests can load it directly. Disclaimers such as
 * "not medical advice" are allowed; claims are not.
 */
export const FORBIDDEN_PHRASES: RegExp[] = [
  /\bAI\b/u,
  /magic/iu,
  /intelligen/iu,
  /optimi[sz]/iu,
  /perfect/iu,
  /guarantee/iu,
  /clean eating/iu,
  /smart pick/iu,
  /culinary journey/iu,
  /transform your/iu,
  /workspace/iu,
  /only \d+ left|limited time|ends in|hurry|act now/iu,
  /lose weight|weight loss|burn fat|\bcures?\b|detox/iu,
];
