import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dark, light, type Palette } from '../src/theme/palette.ts';

function lum(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
export function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x! + 0.05) / (y! + 0.05);
}

// WCAG AA: 4.5:1 for text, 3:1 for non-text UI such as control outlines.
function pairs(color: Palette): Array<[string, string, string]> {
  return [
  ['ink on background', color.ink, color.background],
  ['muted on background', color.inkMuted, color.background],
  ['accent text on background', color.accent, color.background],
  ['warning text on background', color.warning, color.background],
  ['on-accent text on accent button', color.onAccent, color.accent],
  ['ink on raised', color.ink, color.raised],
  ['muted on raised', color.inkMuted, color.raised],
  ['warning on warning tint', color.warning, color.warningTint],
  ['ink on accent tint', color.ink, color.accentTint],
  ['ink on pressed row', color.ink, color.placeholder],
  ['muted on pressed row', color.inkMuted, color.placeholder],
  ['ink on disabled button', color.ink, color.divider],
  ['white on destructive button', color.onAccent, color.warning],
  ['accent on selected choice tint', color.accent, color.accentTint],
  ['ink on raised surface', color.ink, color.raised],
  ];
}

for (const [mode, color] of [['light', light], ['dark', dark]] as const) {
  for (const [name, fg, bg] of pairs(color)) {
    test(`${mode}: text contrast ≥ 4.5: ${name}`, () => {
      assert.ok(contrast(fg, bg) >= 4.5, `${name} is ${contrast(fg, bg).toFixed(2)}:1`);
    });
  }
  test(`${mode}: control outlines ≥ 3:1 against the background`, () => {
    assert.ok(contrast(color.control, color.background) >= 3, `${contrast(color.control, color.background).toFixed(2)}:1`);
    assert.ok(contrast(color.accent, color.background) >= 3);
  });
}
