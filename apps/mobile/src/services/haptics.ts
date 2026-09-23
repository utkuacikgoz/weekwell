/**
 * Haptic vocabulary (D-018). Brief, purposeful, never continuous.
 * Respects the in-app setting; unsupported platforms fail silently.
 *
 * | Trigger                 | Pattern              | Cooldown |
 * |-------------------------|----------------------|----------|
 * | Choice selected         | selection            | 80 ms    |
 * | Grocery item checked    | impact light         | 80 ms    |
 * | Plan ready / swap saved | notification success | 80 ms    |
 * | Recoverable error       | notification warning | 80 ms    |
 *
 * Unchecking an item has no haptic: the visual change is the feedback.
 */
import * as Haptics from 'expo-haptics';

const COOLDOWN_MS = 80;
let last = 0;
let enabled = true;

export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

function fire(run: () => Promise<void>) {
  const now = Date.now();
  if (!enabled || now - last < COOLDOWN_MS) return;
  last = now;
  run().catch(() => {
    // Unsupported device or web: no-op by design.
  });
}

export const haptic = {
  selection: () => fire(() => Haptics.selectionAsync()),
  check: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
