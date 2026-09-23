import { Pressable, StyleSheet, View } from 'react-native';
import { haptic } from '../services/haptics';
import { MIN_TOUCH, color, radius, space } from '../theme/tokens';
import { Icon } from './Icon';
import { Text } from './Text';

export type Option<T> = { value: T; label: string; detail?: string; testID?: string };

/**
 * A group of equal choices. Selection is shown by fill, a tick, bold text, and
 * aria-checked — never color alone. `columns` lays options out in a grid.
 */
export function ChoiceGroup<T extends string | number>({ label, options, value, onChange, columns = 3 }: { label: string; options: Option<T>[]; value: T; onChange: (v: T) => void; columns?: number }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.group}>
      <Text variant="label" style={{ marginBottom: space.s }}>{label}</Text>
      <View style={styles.grid}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              testID={o.testID}
              accessibilityRole="radio"
              aria-checked={selected}
              accessibilityLabel={o.detail ? `${o.label}. ${o.detail}` : o.label}
              onPress={() => {
                haptic.selection();
                onChange(o.value);
              }}
              style={({ pressed }) => [styles.option, { width: `${100 / columns}%` }, pressed && styles.pressed]}
            >
              <View style={[styles.inner, selected && styles.innerOn]}>
                <Text variant="bodyStrong" tone={selected ? 'accent' : 'ink'} style={{ paddingRight: space.m }}>{o.label}</Text>
                {selected ? (
                  <View style={styles.tick}>
                    <Icon name="check" size={14} color={color.onAccent} strokeWidth={3} />
                  </View>
                ) : null}
                {o.detail ? <Text variant="meta" tone="muted">{o.detail}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: space.l },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space.xs },
  option: { padding: space.xs },
  inner: { minHeight: MIN_TOUCH + 8, justifyContent: 'center', borderRadius: radius.control, borderWidth: 1.5, borderColor: color.divider, backgroundColor: color.raised, paddingHorizontal: space.m - 4, paddingVertical: space.s },
  innerOn: { borderColor: color.accent, borderWidth: 2, backgroundColor: color.accentTint },
  tick: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
});
