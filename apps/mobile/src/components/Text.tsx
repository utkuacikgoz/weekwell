import { createContext, useContext, type ReactNode } from 'react';
import { Platform, Text as RNText, useWindowDimensions, type TextProps } from 'react-native';
import { BODY_MAX_SCALE, NARROW_WIDTH, SERIF_MAX_SCALE, color, isSerif, narrowType, type as typeScale, type TypeVariant } from '../theme/tokens';

/**
 * Native platforms apply the user's Dynamic Type / font size automatically.
 * On the web preview only, `fontScale` simulates 125% / 150% for visual QA.
 */
const FontScaleContext = createContext(1);
export function FontScaleProvider({ scale, children }: { scale: number; children: ReactNode }) {
  return <FontScaleContext.Provider value={Platform.OS === 'web' ? scale : 1}>{children}</FontScaleContext.Provider>;
}

type Props = TextProps & { variant?: TypeVariant; tone?: 'ink' | 'muted' | 'accent' | 'warning' | 'onAccent' };

const toneColor = { ink: color.ink, muted: color.inkMuted, accent: color.accent, warning: color.warning, onAccent: color.onAccent };

export function Text({ variant = 'body', tone = 'ink', style, ...rest }: Props) {
  const simulated = useContext(FontScaleContext);
  const { width } = useWindowDimensions();
  const serif = isSerif(variant);
  const base = typeScale[variant];
  const sized = width < NARROW_WIDTH && narrowType[variant] ? { ...base, ...narrowType[variant] } : base;
  // Web preview only: mirror the native cap so captures match a phone.
  const scale = serif ? Math.min(simulated, SERIF_MAX_SCALE) : simulated;
  return (
    <RNText
      {...rest}
      maxFontSizeMultiplier={serif ? SERIF_MAX_SCALE : BODY_MAX_SCALE}
      style={[sized, { color: toneColor[tone], fontSize: sized.fontSize * scale, lineHeight: sized.lineHeight * scale }, style]}
    />
  );
}
