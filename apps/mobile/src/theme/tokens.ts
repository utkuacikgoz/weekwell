import { Platform } from 'react-native';
/**
 * Weekwell design tokens (A2). Status: design_pending until product-owner
 * approval (D-016). One warm background, one ink, one green utility accent,
 * one restrained warning accent. No gradients, no decorative color.
 */
export { color } from './palette';

/** 4px baseline, 8px scale. */
export const space = { xs: 4, s: 8, m: 16, l: 24, xl: 32, xxl: 48 } as const;

export const MIN_TOUCH = 44;
export const radius = { control: 12, card: 16, thumb: 12, pill: 999 } as const;

/**
 * UI sans: Inter (OFL, bundled, loaded in the root layout) so phone and review
 * captures match. Serif: the platform serif, per product-owner guidance
 * (2026-09-24): no licensed display face until the layout is approved.
 */
export const fonts = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Times New Roman", serif' }) as string,
} as const;

/**
 * Type scale from the design correction brief (2026-09-24):
 * 28/32 page title · 20/24 section title · 16/22 body · 13/18 secondary · 12/16 metadata.
 * Serif only for the page title and dish names. Sentence case everywhere.
 */
export const type = {
  display: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 38 },
  title: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 32 },
  dish: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 24 },
  heading: { fontFamily: fonts.sansSemiBold, fontSize: 20, lineHeight: 24 },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.sansSemiBold, fontSize: 16, lineHeight: 22 },
  meta: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.sansMedium, fontSize: 12, lineHeight: 16 },
  total: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 32 },
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
