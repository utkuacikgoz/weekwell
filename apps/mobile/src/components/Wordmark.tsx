import { View } from 'react-native';
import { BRAND_SUN } from '../theme/palette';
import { fonts, space } from '../theme/tokens';
import { Text } from './Text';

/** Wordmark (D-040, Bold blocks): heavy uppercase, "well" in sun yellow. */
export function Wordmark() {
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="Weekwell" testID="wordmark" style={{ marginTop: space.s }}>
      <Text variant="heading" style={{ fontFamily: fonts.display, textTransform: 'uppercase', letterSpacing: -0.6, fontSize: 22 }}>
        Week<Text variant="heading" style={{ fontFamily: fonts.display, color: BRAND_SUN, textTransform: 'uppercase', fontSize: 22 }}>well</Text>
      </Text>
    </View>
  );
}
