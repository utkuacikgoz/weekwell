import { Pressable, StyleSheet, View } from 'react-native';
import { haptic } from '../services/haptics';
import { REMINDER_HOURS, WEEKDAYS } from '../services/reminders';
import { MIN_TOUCH, color, space } from '../theme/tokens';
import { Text } from './Text';

/** Seven round day buttons, Sunday first (D-047 SD2/NU3). */
export function DayStrip({ value, onChange }: { value: number; onChange: (day: number) => void }) {
  return (
    <View style={styles.days} accessibilityRole="radiogroup" accessibilityLabel="Shopping day">
      {WEEKDAYS.map((d, i) => {
        const on = i === value;
        return (
          <Pressable
            key={d}
            accessibilityRole="radio"
            aria-checked={on}
            accessibilityLabel={d}
            onPress={() => {
              haptic.selection();
              onChange(i);
            }}
            style={({ pressed }) => [styles.day, on && styles.dayOn, pressed && { opacity: 0.8 }]}
            testID={`shopping-day-${i}`}
          >
            <Text variant="bodyStrong" tone={on ? 'onAccent' : 'ink'}>{d.charAt(0)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Morning / midday / evening as one segmented bar. `showTimes`: "9 AM" instead of "Morning". */
export function TimeBar({ value, onChange, showTimes = false }: { value: number; onChange: (hour: number) => void; showTimes?: boolean }) {
  return (
    <View style={styles.seg} accessibilityRole="radiogroup" accessibilityLabel="Reminder time">
      {REMINDER_HOURS.map((h) => {
        const on = h.hour === value;
        return (
          <Pressable
            key={h.hour}
            accessibilityRole="radio"
            aria-checked={on}
            accessibilityLabel={`${h.label}, ${h.time}`}
            onPress={() => {
              haptic.selection();
              onChange(h.hour);
            }}
            style={({ pressed }) => [styles.segItem, on && styles.segOn, pressed && { opacity: 0.8 }]}
            testID={`shopping-hour-${h.hour}`}
          >
            <Text variant="label" tone={on ? 'onAccent' : 'ink'}>{showTimes ? h.time : h.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  days: { flexDirection: 'row', justifyContent: 'space-between', gap: space.xs },
  // Flexes to fit: 44 pt or more from 375 pt wide (every current iPhone); never overflows narrower.
  day: { flex: 1, maxWidth: 52, aspectRatio: 1, borderRadius: 999, borderWidth: 1.5, borderColor: color.divider, alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: color.accent, borderColor: color.accent },
  seg: { flexDirection: 'row', borderWidth: 1.5, borderColor: color.accent },
  segItem: { flex: 1, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: color.accent },
});
