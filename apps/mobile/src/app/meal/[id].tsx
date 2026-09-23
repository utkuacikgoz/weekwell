import {
  REPAIR_ACTION_LABEL,
  findReplacement,
  formatQuantity,
  getIngredient,
  type Meal,
  type RepairAction,
} from '@weekwell/domain';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner } from '../../components/Banner';
import { Button } from '../../components/Button';
import { ChoiceRow } from '../../components/ChoiceRow';
import { Screen, SectionLabel, TopBar } from '../../components/Layout';
import { MealThumb, mealWhen } from '../../components/MealRow';
import { Text } from '../../components/Text';
import { useStore } from '../../state/store';
import { color, space } from '../../theme/tokens';

const ALLERGEN_LABEL: Record<string, string> = {
  dairy: 'dairy',
  gluten: 'gluten (wheat)',
  tree_nuts: 'tree nuts',
  peanuts: 'peanuts',
  soy: 'soy',
  egg: 'egg',
  fish: 'fish',
  shellfish: 'shellfish',
  sesame: 'sesame',
};

const UNAVAILABLE: Record<RepairAction, string> = {
  swap: 'No other meal fits your choices right now.',
  cheaper: 'This is already the lowest-cost option that fits.',
  more_protein: 'This already has the most protein of the options that fit.',
  faster: 'This is already the quickest option that fits.',
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text variant="meta" tone="muted">{label}</Text>
      <Text variant="bodyStrong">{value}</Text>
    </View>
  );
}

export default function MealDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, analytics, repairMeal, undoSwap, lastSwap, dismissSwap, toggleMealOnList } = useStore();
  const plan = data.plan;
  const meals = useMemo(() => (plan ? [...plan.dinners, ...plan.lunches] : []), [plan]);
  const meal = meals.find((m) => m.id === id);

  useEffect(() => {
    if (meal) analytics?.track('meal_opened', { slot: meal.slot, day: meal.day });
    // Only on open, not after a swap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // A banner from another meal's swap should not show here.
  const swap = lastSwap && lastSwap.next.id === id ? lastSwap : null;

  const options = useMemo(() => {
    if (!plan || !meal) return null;
    return (['swap', 'cheaper', 'more_protein', 'faster'] as RepairAction[]).map((a) => ({ action: a, available: findReplacement(plan, meal.id, a) !== null }));
  }, [plan, meal]);

  if (!plan) return <Redirect href="/onboarding" />;
  if (!meal) return <Redirect href="/week" />;

  const onList = !data.skippedMealIds.includes(meal.id);
  const usedElsewhere = (ingredientId: string): Meal[] => meals.filter((m) => m.id !== meal.id && m.ingredients.some((i) => i.ingredientId === ingredientId));

  return (
    <Screen testID="meal-detail" scrollToTopKey={swap ?? undefined}>
      <TopBar backLabel="Week" />
      {swap ? (
        <Banner tone="info" title={`Swapped to ${swap.next.name}`} testID="swap-banner">
          <Text>
            Was: {swap.previous.name}. {swap.diff.added.length + swap.diff.removed.length + swap.diff.changed.length} grocery items changed.
            {swap.removedChecked > 0 ? ` ${swap.removedChecked} item${swap.removedChecked === 1 ? '' : 's'} you’d checked ${swap.removedChecked === 1 ? 'is' : 'are'} no longer needed.` : ''}
            {swap.changedChecked > 0 ? ` ${swap.changedChecked} checked item${swap.changedChecked === 1 ? '' : 's'} now need${swap.changedChecked === 1 ? 's' : ''} a different amount.` : ''}
          </Text>
          <View style={styles.bannerActions}>
            <Button label="Undo" kind="secondary" onPress={undoSwap} testID="undo-swap" />
            <Button label="Keep" kind="quiet" onPress={dismissSwap} />
          </View>
        </Banner>
      ) : null}

      <View style={styles.hero}>
        <MealThumb size={88} />
        <View style={{ flex: 1 }}>
          <Text variant="label" tone="muted">{mealWhen(meal).toUpperCase()}</Text>
          <Text variant="title" accessibilityRole="header" testID="meal-name">
            {meal.name}
          </Text>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat label="Total time" value={`${meal.totalMinutes} min`} />
        <Stat label="Hands-on" value={`${meal.activeMinutes} min`} />
        <Stat label="Protein (est.)" value={`${meal.protein.value}g / serving`} />
        <Stat label={meal.slot === 'lunch' ? 'Makes' : 'Serves'} value={meal.slot === 'lunch' ? `${meal.servings} lunches` : String(meal.servings)} />
      </View>
      <Text variant="meta" tone="muted">
        Protein is estimated from typical ingredient values, not lab-tested. This is not medical or dietary advice.
      </Text>
      {meal.allergens.length ? (
        <Text variant="meta" style={{ marginTop: space.s }}>
          Contains {meal.allergens.map((a) => ALLERGEN_LABEL[a] ?? a).join(', ')}. Always check package labels.
        </Text>
      ) : (
        <Text variant="meta" tone="muted" style={{ marginTop: space.s }}>
          No common allergens in our ingredient list. Always check package labels.
        </Text>
      )}

      <ChoiceRow
        testID="toggle-on-list"
        mode="checkbox"
        label={onList ? 'On your grocery list' : 'Not on your grocery list'}
        detail={onList ? 'Untick to leave this meal’s ingredients off the list.' : 'Tick to add this meal’s ingredients back.'}
        selected={onList}
        onPress={() => toggleMealOnList(meal.id)}
      />

      <SectionLabel>Ingredients</SectionLabel>
      {meal.ingredients.map((q) => {
        const ing = getIngredient(q.ingredientId);
        const others = ing.staple ? [] : usedElsewhere(q.ingredientId);
        return (
          <View key={q.ingredientId} style={styles.ingredient} accessible accessibilityLabel={`${formatQuantity(q.amount, q.unit)} ${ing.name}${others.length ? `. Also used in ${others.map(mealWhen).join(', ')}` : ''}`}>
            <Text variant="bodyStrong" style={styles.qty}>{formatQuantity(q.amount, q.unit)}</Text>
            <View style={{ flex: 1 }}>
              <Text>{ing.name}</Text>
              {others.length ? <Text variant="meta" tone="accent">Also in {others.map(mealWhen).join(', ')}</Text> : null}
              {ing.staple ? <Text variant="meta" tone="muted">Pantry staple, not on the list</Text> : null}
            </View>
          </View>
        );
      })}

      <SectionLabel>Steps</SectionLabel>
      {meal.steps.map((s, i) => (
        <View key={i} style={styles.step}>
          <Text variant="bodyStrong" style={styles.stepNo}>{i + 1}</Text>
          <Text style={{ flex: 1 }}>{s}</Text>
        </View>
      ))}

      <SectionLabel>Change this meal</SectionLabel>
      <Text variant="meta" tone="muted" style={{ marginBottom: space.s }}>
        Only this meal changes. Everything else in your week stays the same, and you can undo.
      </Text>
      {options?.map(({ action, available }) => (
        <View key={action} style={{ marginBottom: space.s }}>
          <Button
            label={REPAIR_ACTION_LABEL[action]}
            kind={action === 'swap' ? 'primary' : 'secondary'}
            disabled={!available}
            onPress={() => repairMeal(meal.id, action)}
            testID={`repair-${action}`}
          />
          {!available ? <Text variant="meta" tone="muted">{UNAVAILABLE[action]}</Text> : null}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.m, marginTop: space.s },
  stats: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: space.m, borderTopWidth: 1, borderBottomWidth: 1, borderColor: color.divider, paddingVertical: space.s },
  stat: { width: '50%', paddingVertical: space.xs },
  ingredient: { flexDirection: 'row', paddingVertical: space.s, borderBottomWidth: 1, borderBottomColor: color.divider, gap: space.m },
  qty: { width: 88 },
  step: { flexDirection: 'row', gap: space.m, paddingVertical: space.s },
  stepNo: { width: 24 },
  bannerActions: { flexDirection: 'row', gap: space.m, alignItems: 'center', marginTop: space.s },
});
