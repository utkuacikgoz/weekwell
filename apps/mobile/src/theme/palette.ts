/**
 * Color palette (no React Native imports so it can be contrast-tested in Node).
 * One warm background, one ink, one green utility accent, one warning accent.
 */
export const color = {
  background: '#F7F4EE', // warm off-white, the only page surface
  raised: '#FFFDF9', // bottom action bar and inputs only
  ink: '#1D1B18',
  inkMuted: '#58534B', // 6.9:1 on background
  divider: '#DCD5C8',
  control: '#8A8378', // unselected control outlines, 3.4:1 (non-text UI minimum 3:1)
  accent: '#2F6B45', // green utility accent: primary buttons, checks, "fits budget"
  onAccent: '#FFFFFF',
  accentTint: '#E3EDE5',
  warning: '#9A4A12', // restrained warning: stale prices, over budget, errors
  warningTint: '#F5E6D6',
  placeholder: '#E8E1D5',
} as const;
