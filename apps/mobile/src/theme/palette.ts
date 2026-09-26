/**
 * Color palettes (no React Native imports so they can be contrast-tested in Node).
 * Warm paper, deep ink, one leaf green for actions and status, one citrus
 * accent for price attention. Dark mode keeps the same roles, inverted.
 */
export type Palette = {
  background: string;
  raised: string;
  ink: string;
  inkMuted: string;
  divider: string;
  control: string;
  accent: string;
  onAccent: string;
  accentTint: string;
  warning: string;
  warningTint: string;
  placeholder: string;
  scrim: string;
};

/**
 * Look L2 "Bold blocks" (product owner pick, 2026-09-25, D-040): a deep green
 * ground, white type, the main action as a white block, and full-width colour
 * bands for the days of the week. Sun yellow is the attention colour.
 */
export const light: Palette = {
  background: '#1F5C40', // deep leaf green, the page
  raised: '#184A33', // sheets, the bottom bar, cards
  ink: '#FFFFFF',
  inkMuted: '#D3E4DA',
  divider: '#3C7458',
  control: '#A9C9B8', // unselected control outlines (non-text UI, 3:1 minimum)
  accent: '#FFFFFF', // the white block: primary actions, links, selected choices
  onAccent: '#173F2D', // text on the white block
  accentTint: '#2C6B4D', // selected choice fill
  warning: '#F6C453', // sun yellow: price attention and destructive actions
  warningTint: '#2F4F2A',
  placeholder: '#2A6749', // pressed rows, skeletons
  scrim: 'rgba(8, 24, 16, 0.55)',
};

export const dark: Palette = {
  background: '#0F2A1E', // the same green, at night
  raised: '#15372A',
  ink: '#F2F7F3',
  inkMuted: '#B5CABD',
  divider: '#2C4F3E',
  control: '#8FB3A0',
  accent: '#F2F7F3',
  onAccent: '#0F2A1E',
  accentTint: '#1F4634',
  warning: '#F6C453',
  warningTint: '#2E3A1C',
  placeholder: '#1D4232',
  scrim: 'rgba(0, 0, 0, 0.6)',
};

/** Day bands: one full-width colour per dinner, in week order. White text passes 4.5:1 on each. */
export const BANDS_LIGHT = ['#A83E28', '#1B6480', '#735400', '#6B3F8E', '#26704F'] as const;
export const BANDS_DARK = ['#7E2E1E', '#154E64', '#5A4200', '#51306C', '#1D573D'] as const;

/** The yellow half of the wordmark. */
export const BRAND_SUN = '#F6C453';

/** Kept for existing imports and tests: the light palette. */
export const color = light;
