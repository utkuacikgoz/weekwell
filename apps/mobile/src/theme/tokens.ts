/**
 * Weekwell design tokens (A2). Status: design_pending until product-owner
 * approval (D-016). One warm background, one ink, one green utility accent,
 * one restrained warning accent. No gradients, no decorative color.
 */
import { Platform } from 'react-native';

export { color } from './palette';

/** 4px baseline, 8px scale. */
export const space = { xs: 4, s: 8, m: 16, l: 24, xl: 32, xxl: 48 } as const;

export const MIN_TOUCH = 44;
export const radius = { control: 6, pill: 999 } as const;

const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Times New Roman", serif' });
const sans = Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' });

/** Serif only for short headings; body copy is sans. Line heights sit on the 4px grid. */
export const type = {
  display: { fontFamily: serif, fontSize: 30, lineHeight: 36, fontWeight: '400' as const },
  title: { fontFamily: serif, fontSize: 22, lineHeight: 28, fontWeight: '400' as const },
  heading: { fontFamily: sans, fontSize: 17, lineHeight: 24, fontWeight: '600' as const },
  body: { fontFamily: sans, fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyStrong: { fontFamily: sans, fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  meta: { fontFamily: sans, fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  label: { fontFamily: sans, fontSize: 13, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.4 },
  total: { fontFamily: serif, fontSize: 40, lineHeight: 44, fontWeight: '400' as const },
} as const;
export type TypeVariant = keyof typeof type;

/**
 * Motion tokens (D-018). Motion only explains a state change. Every duration
 * collapses to 0 when the OS reduce-motion setting is on.
 */
export const motion = {
  check: { durationMs: 120, easing: 'ease-out', purpose: 'Checkbox fills to confirm an item is checked.' },
  progressStep: { durationMs: 180, easing: 'ease-out', purpose: 'Next generation step appears as it starts.' },
  banner: { durationMs: 160, easing: 'ease-out', purpose: 'Swap/undo banner appears after the change.' },
  navigation: { durationMs: 250, easing: 'platform default', purpose: 'Push/pop between week, meal, and list.' },
} as const;
