import { DAY_LABEL, DAY_SHORT, type Meal } from '@weekwell/domain';
import { Pressable, StyleSheet, View } from 'react-native';
import { BANDS_DARK, BANDS_LIGHT } from '../theme/palette';
import { MIN_TOUCH, color, radius, scheme, space } from '../theme/tokens';
import { Icon } from './Icon';
import { MealImage } from './MealImage';
import { Text } from './Text';

export const BANDS = scheme === 'dark' ? BANDS_DARK : BANDS_LIGHT;

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
          <MealImage recipeId={meal.recipeId} ingredientIds={ingredientIds(meal)} width={width} height={Math.round(width * (compact ? 0.3 : 0.46))} radius={0} />
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
/** `band`: the row's position in the week; it becomes a full-width colour band (D-040). */
/** `cost`: this meal's share of the week's estimate, e.g. "$24"; `swap`: a cheaper-swap link shown under the row (PR5). */
export function WeekRow({ meal, onPress, tonight, offList, band, cost, swap }: { meal: Meal; onPress: () => void; tonight?: boolean; offList?: boolean; band?: number; cost?: string; swap?: { label: string; onPress: () => void } }) {
  const when =
    meal.slot === 'dinner'
      ? DAY_LABEL[meal.day]
      : `${DAY_SHORT[meal.coversDays[0] ?? 'mon']}–${DAY_SHORT[meal.coversDays[meal.coversDays.length - 1] ?? 'fri']} lunches`;
  const bandStyle = band !== undefined ? [styles.band, { backgroundColor: BANDS[band % BANDS.length] }] : null;
  const row = (
    <Pressable
      testID={`meal-${meal.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${when}${tonight ? ', tonight' : ''}: ${meal.name}. ${mealFacts(meal)}.${cost ? ` About ${cost} of this week’s estimate.` : ''}${offList ? ' Not on your grocery list.' : ''}`}
      accessibilityHint="Opens the recipe"
      onPress={onPress}
      style={({ pressed }) => [styles.row, bandStyle, swap && styles.rowWithSwap, pressed && styles.rowPressed]}
    >
      <MealImage recipeId={meal.recipeId} ingredientIds={ingredientIds(meal)} width={60} radius={radius.thumb} />
      <View style={{ flex: 1 }}>
        <Text variant="caption" tone={tonight ? 'accent' : 'muted'} style={band !== undefined ? { color: '#FFFFFF', opacity: 0.9 } : undefined}>
          {tonight ? `${when} · Tonight` : when}
        </Text>
        <Text variant="bodyStrong">{meal.name}</Text>
        <Text variant="meta" tone="muted" style={band !== undefined ? { color: '#FFFFFF', opacity: 0.9 } : undefined}>{offList ? 'Not on grocery list' : mealFacts(meal)}</Text>
      </View>
      {cost ? (
        <Text variant="label" style={styles.cost} testID={`cost-${meal.id}`}>
          {cost}
        </Text>
      ) : null}
      <View style={styles.chevron}>
        <Icon name="chevron-right" size={20} color={color.ink} />
      </View>
    </Pressable>
  );
  if (!swap) return row;
  return (
    <>
      {row}
      <Pressable accessibilityRole="button" onPress={swap.onPress} style={({ pressed }) => [styles.swapLink, bandStyle, pressed && styles.rowPressed]} testID={`swap-save-${meal.id}`}>
        {/* White, not sun-yellow: yellow falls under 4.5:1 on the brown and green bands. */}
        <Text variant="label" style={styles.swapText}>
          {swap.label}
        </Text>
        <Icon name="chevron-right" size={16} color={color.ink} />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: color.raised, borderRadius: radius.card, overflow: 'hidden' },
  cardPressed: { transform: [{ scale: 0.985 }], opacity: 0.94 },
  cardBody: { padding: space.m },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: MIN_TOUCH, marginTop: space.xs, marginBottom: -space.s },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m - 4, paddingVertical: space.s, paddingHorizontal: space.s, marginHorizontal: -space.s, borderRadius: radius.control, minHeight: 76 },
  rowPressed: { opacity: 0.85 },
  // Full-bleed: cancels the screen's side padding so the colour runs edge to edge.
  band: { marginHorizontal: -(space.m + 4), paddingHorizontal: space.m + 4, borderRadius: 0, marginVertical: 0 },
  cost: { fontVariant: ['tabular-nums'] },
  rowWithSwap: { paddingBottom: 0 },
  swapLink: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: MIN_TOUCH, paddingLeft: 60 + 2 * space.m, paddingBottom: space.xs },
  swapText: { textDecorationLine: 'underline' },
  chevron: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)' },
});
