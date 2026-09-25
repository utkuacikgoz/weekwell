import { Appearance, Platform } from 'react-native';
import { dark, light } from './palette';
/**
 * Weekwell design tokens (A2). Status: design_pending until product-owner
 * approval (D-016). One warm background, one ink, one green utility accent,
 * one restrained warning accent. No gradients, no decorative color.
 */
/**
 * Appearance follows the system setting at launch (D-027 update). A change
 * while the app is open applies on the next launch; the web preview reloads.
 */
export const scheme: 'light' | 'dark' = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
export const color = scheme === 'dark' ? dark : light;

/** 4px baseline, 8px scale. */
export const space = { xs: 4, s: 8, m: 16, l: 24, xl: 32, xxl: 48 } as const;

export const MIN_TOUCH = 44;
/** Bold blocks (D-040): square blocks; only thumbnails and pills keep a curve. */
export const radius = { control: 0, card: 0, thumb: 6, pill: 999 } as const;

/**
 * UI sans: Inter (OFL, bundled, loaded in the root layout) so phone and review
 * captures match. Serif: the platform serif, per product-owner guidance
 * (2026-09-24): no licensed display face until the layout is approved.
 */
export const fonts = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  /** Display face for titles, dish names and totals (D-040): Bricolage Grotesque ExtraBold (OFL, bundled). */
  display: 'BricolageGrotesque_800ExtraBold',
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Times New Roman", serif' }) as string,
} as const;

/**
 * Type scale from the design correction brief (2026-09-24):
 * 28/32 page title · 20/24 section title · 16/22 body · 13/18 secondary · 12/16 metadata.
 * Serif only for the page title and dish names. Sentence case everywhere.
 */
export const type = {
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, textTransform: 'uppercase' as const, letterSpacing: -0.5 },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, textTransform: 'uppercase' as const, letterSpacing: -0.4 },
  dish: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24, textTransform: 'uppercase' as const, letterSpacing: -0.2 },
  heading: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24 },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.sansSemiBold, fontSize: 16, lineHeight: 22 },
  meta: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.sansMedium, fontSize: 12, lineHeight: 16 },
  total: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32 },
} as const;
export type TypeVariant = keyof typeof type;

/**
 * Narrow widths and large text (design audit 2026-09-24). The serif is an
 * accent, so it grows less than body text and steps down on small phones:
 * - under 360pt wide, serif sizes step down (title 28 → 24, dish 20 → 18, display 32 → 26);
 * - serif variants stop growing at 130% of their size; body text follows the
 *   system setting up to 220%;
 * - one serif title per screen, and titles are never truncated: long dish
 *   names wrap at the smaller size instead (fixture test: longest recipe name).
 */
export const NARROW_WIDTH = 360;
export const SERIF_MAX_SCALE = 1.3;
export const BODY_MAX_SCALE = 2.2;
export const narrowType: Partial<Record<TypeVariant, { fontSize: number; lineHeight: number }>> = {
  display: { fontSize: 26, lineHeight: 30 },
  title: { fontSize: 24, lineHeight: 28 },
  total: { fontSize: 24, lineHeight: 28 },
  dish: { fontSize: 18, lineHeight: 22 },
};
export const isSerif = (v: TypeVariant) => v === 'display' || v === 'title' || v === 'dish' || v === 'total';

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
