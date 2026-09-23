import { DAY_LABEL, DAY_SHORT, type Meal } from '@weekwell/domain';
import { Pressable, StyleSheet, View } from 'react-native';
import { MIN_TOUCH, color, radius, space } from '../theme/tokens';
import { Icon } from './Icon';
import { MealArt } from './MealArt';
import { Text } from './Text';

const ingredientIds = (m: Meal) => m.ingredients.map((i) => i.ingredientId);

export function mealFacts(m: Meal): string {
  const serves = m.slot === 'lunch' ? `makes ${m.servings}` : `serves ${m.servings}`;
  return `${m.totalMinutes} min · ${m.protein.value}g protein · ${serves}`;
}

/** The front door of the week: tonight's dinner, big enough to recognise in a glance. */
export function TonightCard({ meal, label, onPress, width, compact }: { meal: Meal; label: string; onPress: () => void; width: number; compact?: boolean }) {
  return (
    <Pressable
      testID="tonight-card"
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${meal.name}. ${meal.totalMinutes} minutes, about ${meal.protein.value} grams of protein per serving, serves ${meal.servings}.`}
      accessibilityHint="Opens the recipe"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {({ pressed }) => (
        <>
          <MealArt recipeId={meal.recipeId} ingredientIds={ingredientIds(meal)} width={width} height={Math.round(width * (compact ? 0.3 : 0.46))} radius={0} />
          <View style={styles.cardBody}>
            <Text variant="label" tone="accent">{label}</Text>
            <Text variant="dish" style={{ marginTop: 2 }}>{meal.name}</Text>
            <Text variant="meta" tone="muted" style={{ marginTop: space.xs }}>
              {mealFacts(meal)}
            </Text>
            <View style={[styles.cta, pressed && { opacity: 0.7 }]}>
              <Text variant="bodyStrong" tone="accent">View recipe</Text>
              <Icon name="chevron-right" size={20} color={color.accent} />
            </View>
          </View>
        </>
      )}
    </Pressable>
  );
}

/** One day in the week list: image, day, dish, facts, and a clear trailing affordance. */
export function WeekRow({ meal, onPress, tonight, offList }: { meal: Meal; onPress: () => void; tonight?: boolean; offList?: boolean }) {
  const when =
    meal.slot === 'dinner'
      ? DAY_LABEL[meal.day]
      : `${DAY_SHORT[meal.coversDays[0] ?? 'mon']}–${DAY_SHORT[meal.coversDays[meal.coversDays.length - 1] ?? 'fri']} lunches`;
  return (
    <Pressable
      testID={`meal-${meal.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${when}${tonight ? ', tonight' : ''}: ${meal.name}. ${mealFacts(meal)}.${offList ? ' Not on your grocery list.' : ''}`}
      accessibilityHint="Opens the recipe"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <MealArt recipeId={meal.recipeId} ingredientIds={ingredientIds(meal)} width={60} radius={radius.thumb} />
      <View style={{ flex: 1 }}>
        <Text variant="caption" tone={tonight ? 'accent' : 'muted'}>
          {tonight ? `${when} · Tonight` : when}
        </Text>
        <Text variant="bodyStrong">{meal.name}</Text>
        <Text variant="meta" tone="muted">{offList ? 'Not on grocery list' : mealFacts(meal)}</Text>
      </View>
      <View style={styles.chevron}>
        <Icon name="chevron-right" size={20} color={color.inkMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: color.raised, borderRadius: radius.card, overflow: 'hidden' },
  cardPressed: { transform: [{ scale: 0.985 }], opacity: 0.94 },
  cardBody: { padding: space.m },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: MIN_TOUCH, marginTop: space.xs, marginBottom: -space.s },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m - 4, paddingVertical: space.s, paddingHorizontal: space.s, marginHorizontal: -space.s, borderRadius: radius.control, minHeight: 76 },
  rowPressed: { backgroundColor: color.placeholder },
  chevron: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: color.raised },
});
