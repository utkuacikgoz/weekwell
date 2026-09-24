import { View } from 'react-native';
import { color, fonts } from '../theme/tokens';
import { Text } from './Text';

/**
 * Quiet identity (design audit 2026-09-24, design_pending): the name set in
 * the serif, with "well" in the leaf green. No logo lock-up yet.
 */
export function Wordmark() {
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="Weekwell" testID="wordmark">
      <Text variant="heading" style={{ fontFamily: fonts.serif, letterSpacing: -0.2 }}>
        Week<Text variant="heading" style={{ fontFamily: fonts.serif, color: color.accent, fontStyle: 'italic' }}>well</Text>
      </Text>
    </View>
  );
}
