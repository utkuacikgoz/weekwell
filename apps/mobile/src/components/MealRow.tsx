import { DAY_LABEL, DAY_SHORT, mealMetaLine, type Meal } from '@weekwell/domain';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH, color, space } from '../theme/tokens';
import { Text } from './Text';

export function mealWhen(meal: Meal): string {
  if (meal.slot === 'dinner') return `${DAY_LABEL[meal.day]} dinner`;
  const first = meal.coversDays[0];
  const last = meal.coversDays[meal.coversDays.length - 1];
  return `${first ? DAY_SHORT[first] : ''}–${last ? DAY_SHORT[last] : ''} lunches`;
}

/**
 * Placeholder where the dish photo will go. Real editorial photography needs
 * product-owner approval (open design question in the review pack).
 */
export function MealThumb({ size = 56 }: { size?: number }) {
  return (
    <View style={[styles.thumb, { width: size, height: size }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <View style={[styles.plate, { width: size * 0.62, height: size * 0.62, borderRadius: size }]} />
    </View>
  );
}

export function MealRow({ meal, label, onList = true, emphasis }: { meal: Meal; label: string; onList?: boolean; emphasis?: boolean }) {
  const meta = mealMetaLine(meal);
  return (
    <Pressable
      testID={`meal-${meal.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${meal.name}. ${meta}.${onList ? '' : ' Not on your grocery list.'}`}
      accessibilityHint="Opens the recipe"
      onPress={() => router.push(`/meal/${meal.id}` as Href)}
      style={({ pressed }) => [styles.row, emphasis && styles.emphasis, pressed && { backgroundColor: color.placeholder }]}
    >
      <MealThumb size={emphasis ? 72 : 56} />
      <View style={styles.text}>
        <Text variant="label" tone="muted">{label.toUpperCase()}</Text>
        <Text variant={emphasis ? 'title' : 'heading'}>{meal.name}</Text>
        <Text variant="meta" tone="muted">{meta}</Text>
        {!onList ? <Text variant="meta" tone="warning">Not on grocery list</Text> : null}
      </View>
      <Text variant="title" tone="muted" importantForAccessibility="no">›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: MIN_TOUCH + 28, flexDirection: 'row', alignItems: 'center', paddingVertical: space.m - 4, borderBottomWidth: 1, borderBottomColor: color.divider, gap: space.m - 4 },
  emphasis: { paddingVertical: space.m },
  thumb: { backgroundColor: color.placeholder, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  plate: { borderWidth: 1.5, borderColor: color.control },
  text: { flex: 1, gap: 2 },
});
