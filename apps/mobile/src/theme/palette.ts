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

export const light: Palette = {
  background: '#F5F0E6', // warm paper, the page
  raised: '#FFFCF5', // the one content surface (tonight card, sheet, bottom bar)
  ink: '#1E1A15',
  inkMuted: '#5A5349',
  divider: '#E3DACB',
  control: '#8A8276', // unselected control outlines (non-text UI, 3:1 minimum)
  accent: '#2E6A48', // leaf green: primary actions, "within budget"
  onAccent: '#FFFFFF',
  accentTint: '#E2ECE2',
  warning: '#A4481A', // citrus: price attention only (stale, missing, over budget)
  warningTint: '#F6E4D4',
  placeholder: '#EAE2D4', // pressed rows, skeletons
  scrim: 'rgba(30, 26, 21, 0.4)',
};

export const dark: Palette = {
  background: '#171511', // warm near-black, not pure black
  raised: '#221F1A',
  ink: '#F3EEE5',
  inkMuted: '#B7AE9F',
  divider: '#3A342B',
  control: '#8F8677',
  accent: '#86C69C', // lighter leaf green so it reads on dark
  onAccent: '#0F2118', // dark text on the light-green button
  accentTint: '#1F3327',
  warning: '#F0A777', // lighter citrus
  warningTint: '#3A2719',
  placeholder: '#2C2822',
  scrim: 'rgba(0, 0, 0, 0.6)',
};

/** Kept for existing imports and tests: the light palette. */
export const color = light;
