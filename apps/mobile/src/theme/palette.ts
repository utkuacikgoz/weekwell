/**
 * Color palette (no React Native imports so it can be contrast-tested in Node).
 * Warm paper, deep ink, one leaf green for actions and status, one citrus
 * accent for price attention. Dividers are rare.
 */
export const color = {
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
} as const;
