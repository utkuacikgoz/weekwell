import { Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH, color, space } from '../theme/tokens';
import { haptic } from '../services/haptics';
import { Text } from './Text';

type Props = {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
  /** radio for single choice, checkbox for multiple. */
  mode?: 'radio' | 'checkbox';
  testID?: string;
};

/**
 * A full-width choice row. Selection is shown by the control shape (filled
 * dot / tick), a heavier label, and the accessibility state; never by color alone.
 */
export function ChoiceRow({ label, detail, selected, onPress, mode = 'radio', testID }: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole={mode}
      aria-checked={selected}
      aria-selected={selected}
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      onPress={() => {
        haptic.selection();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.placeholder }]}
    >
      <View style={[mode === 'radio' ? styles.radio : styles.box, selected && styles.controlOn]}>
        {selected ? mode === 'radio' ? <View style={styles.dot} /> : <Text variant="label" tone="onAccent" style={styles.tick}>✓</Text> : null}
      </View>
      <View style={styles.text}>
        <Text variant={selected ? 'bodyStrong' : 'body'}>{label}</Text>
        {detail ? <Text variant="meta" tone="muted">{detail}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TOUCH + 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.m - 4,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: color.divider,
  },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: color.control, alignItems: 'center', justifyContent: 'center', marginRight: space.m },
  box: { width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: color.control, alignItems: 'center', justifyContent: 'center', marginRight: space.m },
  controlOn: { borderColor: color.accent, backgroundColor: color.accent },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.onAccent },
  tick: { fontSize: 15, lineHeight: 18 },
  text: { flex: 1 },
});
