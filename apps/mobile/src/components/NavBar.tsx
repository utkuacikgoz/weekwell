import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH, color, radius, space } from '../theme/tokens';
import { Icon } from './Icon';
import { Text } from './Text';

/**
 * Standard navigation bar: a large back button that names where it goes,
 * and an optional trailing action. The page title sits below it in content.
 */
export function NavBar({ backLabel, onBack, right }: { backLabel: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <View style={styles.bar}>
      <Pressable
        testID="nav-back"
        accessibilityRole="button"
        accessibilityLabel={`Back to ${backLabel}`}
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        style={({ pressed }) => [styles.back, pressed && { backgroundColor: color.placeholder }]}
      >
        <Icon name="chevron-left" size={22} color={color.accent} />
        <Text variant="bodyStrong" tone="accent">{backLabel}</Text>
      </Pressable>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { minHeight: MIN_TOUCH + 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: -space.s },
  back: { minHeight: MIN_TOUCH, flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: space.xs, paddingRight: space.m - 4, borderRadius: radius.control },
});
