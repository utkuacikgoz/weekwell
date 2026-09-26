import { Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH, color, space } from '../theme/tokens';
import { haptic } from '../services/haptics';
import { Text } from './Text';

type Props = {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
  /** radio for single choice, checkbox for multiple, switch for on/off settings (D-040 FL2). */
  mode?: 'radio' | 'checkbox' | 'switch';
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
      {mode === 'switch' ? null : (
        <View style={[mode === 'radio' ? styles.radio : styles.box, selected && styles.controlOn]}>
          {selected ? mode === 'radio' ? <View style={styles.dot} /> : <Text variant="label" tone="onAccent" style={styles.tick}>✓</Text> : null}
        </View>
      )}
      <View style={styles.text}>
        <Text variant={selected ? 'bodyStrong' : 'body'}>{label}</Text>
        {detail ? <Text variant="meta" tone="muted">{detail}</Text> : null}
      </View>
      {/* The thumb's side and the fill both show the state, not color alone. */}
      {mode === 'switch' ? (
        <View style={[styles.track, selected && styles.trackOn]}>
          <View style={[styles.thumb, selected && styles.thumbOn]} />
        </View>
      ) : null}
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
  track: { width: 52, height: 32, borderRadius: 16, borderWidth: 2, borderColor: color.control, padding: 3, marginLeft: space.m, justifyContent: 'center' },
  trackOn: { backgroundColor: color.accent, borderColor: color.accent },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: color.control },
  thumbOn: { alignSelf: 'flex-end', backgroundColor: color.onAccent },
});
