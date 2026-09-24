import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH, color, radius, space } from '../theme/tokens';
import { Text } from './Text';

type Props = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'quiet';
  disabled?: boolean;
  busy?: boolean;
  accessibilityHint?: string;
  testID?: string;
};

/** Pressable-looking buttons: filled primary, outlined secondary, underlined quiet text. */
export function Button({ label, onPress, kind = 'primary', disabled, busy, accessibilityHint, testID }: Props) {
  const inactive = disabled || busy;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      aria-disabled={!!inactive}
      aria-busy={!!busy}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        kind === 'primary' && styles.primary,
        kind === 'secondary' && styles.secondary,
        kind === 'quiet' && styles.quiet,
        inactive && kind !== 'quiet' && styles.disabled,
        pressed && !inactive && styles.pressed,
      ]}
    >
      <View style={styles.row}>
        {busy ? <ActivityIndicator color={kind === 'primary' ? color.onAccent : color.ink} style={{ marginRight: space.s }} /> : null}
        <Text
          variant="bodyStrong"
          tone={inactive && kind === 'primary' ? 'ink' : kind === 'primary' ? 'onAccent' : kind === 'quiet' ? 'accent' : 'ink'}
          style={[kind === 'quiet' && styles.quietText, inactive && kind === 'quiet' && { color: color.inkMuted }]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: MIN_TOUCH + 8, borderRadius: radius.control, justifyContent: 'center', alignItems: 'center', paddingHorizontal: space.m },
  primary: { backgroundColor: color.accent },
  secondary: { borderWidth: 1.5, borderColor: color.ink, backgroundColor: 'transparent' },
  quiet: { minHeight: MIN_TOUCH, paddingHorizontal: space.xs, alignSelf: 'flex-start' },
  quietText: { textDecorationLine: 'underline' },
  disabled: { backgroundColor: color.divider, borderColor: color.divider },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  row: { flexDirection: 'row', alignItems: 'center' },
});
